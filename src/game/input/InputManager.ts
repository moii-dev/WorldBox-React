import { Camera } from '../camera/Camera';
import { World } from '../world/World';
import { ToolType, TileType, BuildingType } from '../types';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { EventEmitter } from '../utils/EventEmitter';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private world: World;
  private entityManager: EntityManager;
  public buildingManager?: BuildingManager;
  public settlementManager?: SettlementManager;
  public kingdomManager?: KingdomManager;
  private events: EventEmitter;

  public activeTool: ToolType = 'land';
  public brushRadius: number = 5;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  private isPainting: boolean = false;
  private keysDown: Set<string> = new Set();
  private animationFrameId: number | null = null;
  private lastTime: number = performance.now();

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    world: World,
    entityManager: EntityManager,
    events: EventEmitter,
    buildingManager?: BuildingManager,
    settlementManager?: SettlementManager,
    kingdomManager?: KingdomManager
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.world = world;
    this.entityManager = entityManager;
    this.events = events;
    this.buildingManager = buildingManager;
    this.settlementManager = settlementManager;
    this.kingdomManager = kingdomManager;

    this.bindEvents();
    this.startKeyboardLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public unbindEvents(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keysDown.add(e.code);

    if (e.code === 'Digit1') {
      this.events.emit('toolChanged', 'land');
    } else if (e.code === 'Digit2') {
      this.events.emit('toolChanged', 'human');
    } else if (e.code === 'Space') {
      this.events.emit('togglePause', null);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.button === 1 || e.button === 2 || this.keysDown.has('Space')) {
      this.isDragging = true;
      this.dragStartX = screenX;
      this.dragStartY = screenY;
      this.cameraStartX = this.camera.x;
      this.cameraStartY = this.camera.y;
      return;
    }

    if (e.button === 0) {
      const worldPos = this.camera.screenToWorld(
        screenX,
        screenY,
        this.canvas.width,
        this.canvas.height
      );

      // 1. Check if clicking on Human
      const clickedHuman = this.entityManager.findHumanAt(worldPos.x, worldPos.y, 1.2);
      if (clickedHuman) {
        this.entityManager.selectHuman(clickedHuman.id);
        this.buildingManager?.selectBuilding(null);
        this.events.emit('humanSelected', clickedHuman);
        this.events.emit('buildingSelected', null);
        return;
      }

      // 2. Check if clicking on Building
      if (this.buildingManager) {
        const clickedBuilding = this.buildingManager.findBuildingAt(worldPos.x, worldPos.y);
        if (clickedBuilding) {
          this.buildingManager.selectBuilding(clickedBuilding.id);
          this.entityManager.selectHuman(null);
          this.events.emit('buildingSelected', clickedBuilding);
          this.events.emit('humanSelected', null);
          return;
        }
      }

      // 3. Check if tool is building placement
      if (this.activeTool === 'house' || this.activeTool === 'storage' || this.activeTool === 'town_hall') {
        const tileX = Math.floor(worldPos.x);
        const tileY = Math.floor(worldPos.y);
        const bType: BuildingType =
          this.activeTool === 'house'
            ? 'HOUSE'
            : this.activeTool === 'storage'
            ? 'STORAGE'
            : 'TOWN_HALL';

        if (this.buildingManager) {
          const closestSettlement = this.settlementManager?.findNearestSettlement(tileX, tileY, 25);
          const bld = this.buildingManager.placeBuilding(
            bType,
            tileX,
            tileY,
            closestSettlement ? closestSettlement.id : null,
            closestSettlement ? closestSettlement.kingdomId : null
          );

          if (bld) {
            this.buildingManager.selectBuilding(bld.id);
            this.events.emit('buildingSelected', bld);
          } else {
            this.events.emit('placementFailed', { reason: 'Cannot place building here (blocked or water)' });
          }
        }
        return;
      }

      // 4. Terrain tool
      if (this.isTerrainTool()) {
        this.isPainting = true;
        this.applyTerrainBrush(worldPos.x, worldPos.y);
      } else if (this.activeTool === 'human') {
        const tileX = Math.floor(worldPos.x);
        const tileY = Math.floor(worldPos.y);

        const newHuman = this.entityManager.addHuman(tileX, tileY, this.world);
        if (newHuman) {
          this.entityManager.selectHuman(newHuman.id);
          this.events.emit('humanCreated', newHuman);
          this.events.emit('humanSelected', newHuman);
        } else {
          this.events.emit('placementFailed', { reason: 'Cannot place human on water or obstacles' });
        }
      } else {
        // Deselect
        this.entityManager.selectHuman(null);
        this.buildingManager?.selectBuilding(null);
        this.events.emit('humanSelected', null);
        this.events.emit('buildingSelected', null);
      }
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const inCanvas =
      screenX >= 0 &&
      screenX <= this.canvas.width &&
      screenY >= 0 &&
      screenY <= this.canvas.height;

    const worldPos = inCanvas
      ? this.camera.screenToWorld(screenX, screenY, this.canvas.width, this.canvas.height)
      : null;

    this.events.emit('cursorMoved', worldPos);

    if (this.isDragging) {
      const dxScreen = screenX - this.dragStartX;
      const dyScreen = screenY - this.dragStartY;
      const dxWorld = dxScreen / this.camera.zoom;
      const dyWorld = dyScreen / this.camera.zoom;

      this.camera.setPosition(
        this.cameraStartX - dxWorld,
        this.cameraStartY - dyWorld,
        this.world.width,
        this.world.height
      );
    } else if (this.isPainting && worldPos && this.isTerrainTool()) {
      this.applyTerrainBrush(worldPos.x, worldPos.y);
    }
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
    this.isPainting = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomDelta = e.deltaY < 0 ? 2 : -2;
    this.camera.zoomAt(
      screenX,
      screenY,
      zoomDelta,
      this.canvas.width,
      this.canvas.height,
      this.world.width,
      this.world.height
    );
  };

  private isTerrainTool(): boolean {
    return ['land', 'forest', 'mountain', 'snow', 'sand', 'water'].includes(this.activeTool);
  }

  private applyTerrainBrush(worldX: number, worldY: number): void {
    const centerX = Math.floor(worldX);
    const centerY = Math.floor(worldY);

    if (this.activeTool === 'land') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, 'auto_land');
    } else if (this.activeTool === 'forest') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, TileType.FOREST);
    } else if (this.activeTool === 'mountain') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, TileType.MOUNTAIN);
    } else if (this.activeTool === 'snow') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, TileType.SNOW);
    } else if (this.activeTool === 'sand') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, TileType.SAND);
    } else if (this.activeTool === 'water') {
      this.world.paintCircle(centerX, centerY, this.brushRadius, TileType.WATER);
    }
  }

  private startKeyboardLoop(): void {
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      const panSpeed = (350 / this.camera.zoom) * dt;

      let dx = 0;
      let dy = 0;

      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) dy -= panSpeed;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) dy += panSpeed;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) dx -= panSpeed;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) dx += panSpeed;

      if (dx !== 0 || dy !== 0) {
        this.camera.moveBy(dx, dy, this.world.width, this.world.height);
      }

      if (this.keysDown.has('Equal') || this.keysDown.has('NumpadAdd')) {
        this.camera.zoom = Math.min(this.camera.maxZoom, this.camera.zoom + 20 * dt);
      }
      if (this.keysDown.has('Minus') || this.keysDown.has('NumpadSubtract')) {
        this.camera.zoom = Math.max(this.camera.minZoom, this.camera.zoom - 20 * dt);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }
}
