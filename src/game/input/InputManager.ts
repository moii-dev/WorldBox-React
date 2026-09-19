import { Camera } from '../camera/Camera';
import { World } from '../world/World';
import { TileType, BuildingType, AnimalSpecies } from '../types';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { AnimalManager } from '../entities/AnimalManager';
import { ResourceManager } from '../resources/ResourceManager';
import { EventEmitter } from '../utils/EventEmitter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { BiomeRegistry } from '../world/BiomeRegistry';
import { UndoManager } from '../history/UndoManager';
import { HistoryManager } from '../history/HistoryManager';
import { GodPowersManager } from '../powers/GodPowersManager';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private world: World;
  private entityManager: EntityManager;
  public buildingManager?: BuildingManager;
  public settlementManager?: SettlementManager;
  public kingdomManager?: KingdomManager;
  public animalManager?: AnimalManager;
  public resourceManager?: ResourceManager;
  public undoManager?: UndoManager;
  public historyManager?: HistoryManager;
  public godPowersManager?: GodPowersManager;
  private events: EventEmitter;

  public activeTool: string = 'grassland';
  public brushRadius: number = 5;
  public brushHardness: number = 1.0;
  public eraseLandToWater: boolean = false;

  private isDraggingCamera: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private lastDragScreenX: number = 0;
  private lastDragScreenY: number = 0;
  private lastDragTime: number = performance.now();
  private dragVelocityX: number = 0;
  private dragVelocityY: number = 0;

  // Box selection marquee
  private isBoxSelecting: boolean = false;
  private selectScreenStartX: number = 0;
  private selectScreenStartY: number = 0;
  private selectWorldStartX: number = 0;
  private selectWorldStartY: number = 0;

  // Spacebar pan hold
  private isSpaceDown: boolean = false;
  private previousToolBeforeSpace: string | null = null;

  // Painting & Drag-spawning
  private isPainting: boolean = false;
  private lastSpawnTime: number = 0;

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
    kingdomManager?: KingdomManager,
    animalManager?: AnimalManager,
    resourceManager?: ResourceManager,
    undoManager?: UndoManager,
    historyManager?: HistoryManager,
    godPowersManager?: GodPowersManager
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.world = world;
    this.entityManager = entityManager;
    this.events = events;
    this.buildingManager = buildingManager;
    this.settlementManager = settlementManager;
    this.kingdomManager = kingdomManager;
    this.animalManager = animalManager;
    this.resourceManager = resourceManager;
    this.undoManager = undoManager;
    this.historyManager = historyManager;
    this.godPowersManager = godPowersManager;

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

  private isTextInputActive(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.isTextInputActive(e)) return;

    this.keysDown.add(e.code);

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault();
      if (e.shiftKey) {
        this.events.emit('redoRequested', null);
      } else {
        this.events.emit('undoRequested', null);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
      e.preventDefault();
      this.events.emit('redoRequested', null);
      return;
    }

    // Spacebar temporary pan mode
    if (e.code === 'Space' && !this.isSpaceDown) {
      e.preventDefault();
      this.isSpaceDown = true;
      if (this.activeTool !== 'move') {
        this.previousToolBeforeSpace = this.activeTool;
        this.setActiveTool('move', false);
      }
      return;
    }

    // Quick Tool Shortcuts
    if (e.code === 'KeyV') {
      this.setActiveTool('select');
    } else if (e.code === 'KeyI') {
      this.setActiveTool('inspect');
    } else if (e.code === 'KeyE') {
      this.setActiveTool('eraser');
    } else if (e.code === 'KeyH') {
      this.setActiveTool('human');
    } else if (e.code === 'KeyB') {
      this.setActiveTool('grassland');
    } else if (e.code === 'BracketLeft') {
      // Decrease brush size
      this.events.emit('stepBrushSize', -1);
    } else if (e.code === 'BracketRight') {
      // Increase brush size
      this.events.emit('stepBrushSize', 1);
    } else if (e.code === 'Escape') {
      this.clearSelection();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);

    if (e.code === 'Space') {
      this.isSpaceDown = false;
      if (this.previousToolBeforeSpace) {
        this.setActiveTool(this.previousToolBeforeSpace, false);
        this.previousToolBeforeSpace = null;
      }
    }
  };

  public setActiveTool(toolId: string, recordRecent: boolean = true): void {
    this.activeTool = toolId;
    if (recordRecent) {
      ToolRegistry.recordRecent(toolId);
    }
    this.events.emit('toolChanged', toolId);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Pan / Move initiation: Middle click (1), Right click (2), Space held, or 'move' tool with Left click (0)
    if (e.button === 1 || e.button === 2 || this.isSpaceDown || (e.button === 0 && this.activeTool === 'move')) {
      this.isDraggingCamera = true;
      this.dragStartX = screenX;
      this.dragStartY = screenY;
      this.cameraStartX = this.camera.x;
      this.cameraStartY = this.camera.y;
      this.lastDragScreenX = screenX;
      this.lastDragScreenY = screenY;
      this.lastDragTime = performance.now();
      this.camera.vx = 0;
      this.camera.vy = 0;
      return;
    }

    if (e.button !== 0) return;

    const worldPos = this.camera.screenToWorld(screenX, screenY, this.canvas.width, this.canvas.height);

    // 1. SELECT TOOL
    if (this.activeTool === 'select') {
      this.isBoxSelecting = true;
      this.selectScreenStartX = screenX;
      this.selectScreenStartY = screenY;
      this.selectWorldStartX = worldPos.x;
      this.selectWorldStartY = worldPos.y;
      return;
    }

    // 2. INSPECT TOOL
    if (this.activeTool === 'inspect') {
      this.handleInspect(worldPos.x, worldPos.y);
      return;
    }

    // 3. ERASER TOOL
    if (this.activeTool === 'eraser') {
      this.isPainting = true;
      this.undoManager?.beginStroke('Erase Area');
      this.applyEraser(worldPos.x, worldPos.y);
      return;
    }

    // 4. BIOME / TERRAIN TOOLS
    if (BiomeRegistry.isBiome(this.activeTool)) {
      this.isPainting = true;
      this.undoManager?.beginStroke(`Paint ${this.activeTool}`);
      this.applyBiomeBrush(worldPos.x, worldPos.y);
      return;
    }

    // 5. CREATURE TOOLS
    if (
      this.activeTool === 'human' ||
      this.activeTool === 'deer' ||
      this.activeTool === 'boar' ||
      this.activeTool === 'wolf' ||
      this.activeTool === 'chicken' ||
      this.activeTool === 'cow'
    ) {
      this.isPainting = true;
      this.undoManager?.beginStroke(`Spawn ${this.activeTool}`);
      this.spawnCreature(worldPos.x, worldPos.y, e.shiftKey);
      return;
    }

    // 6. RESOURCE TOOLS
    if (this.activeTool === 'tree' || this.activeTool === 'berry_bush' || this.activeTool === 'stone') {
      this.isPainting = true;
      this.undoManager?.beginStroke(`Place ${this.activeTool}`);
      this.placeResource(worldPos.x, worldPos.y);
      return;
    }

    // 7. BUILDING TOOLS
    if (
      this.activeTool === 'house' ||
      this.activeTool === 'storage' ||
      this.activeTool === 'town_hall' ||
      this.activeTool === 'farm' ||
      this.activeTool === 'animal_pen'
    ) {
      this.placeBuilding(worldPos.x, worldPos.y);
      return;
    }

    // 8. DIVINE TOOLS (Катаклизмы, Благословения, Бомбы и Магия)
    const divineTools = [
      'lightning',
      'meteor',
      'earthquake',
      'fire',
      'heal_rain',
      'divine_shield',
      'rejuvenate',
      'warrior_boost',
      'grenade',
      'napalm',
      'freeze',
    ];
    if (divineTools.includes(this.activeTool)) {
      if (this.activeTool === 'fire') {
        this.isPainting = true;
      }
      this.applyDivinePower(worldPos.x, worldPos.y);
      return;
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

    // 1. Camera Panning with Velocity Tracking
    if (this.isDraggingCamera) {
      const now = performance.now();
      const dt = Math.max(0.001, (now - this.lastDragTime) / 1000);

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

      // Track pan velocity for inertia release
      const stepDxScreen = screenX - this.lastDragScreenX;
      const stepDyScreen = screenY - this.lastDragScreenY;
      this.dragVelocityX = -(stepDxScreen / this.camera.zoom) / dt;
      this.dragVelocityY = -(stepDyScreen / this.camera.zoom) / dt;

      this.lastDragScreenX = screenX;
      this.lastDragScreenY = screenY;
      this.lastDragTime = now;
      return;
    }

    // 2. Box Select Marquee dragging
    if (this.isBoxSelecting) {
      const dist = Math.hypot(screenX - this.selectScreenStartX, screenY - this.selectScreenStartY);
      if (dist > 4) {
        this.events.emit('selectionMarqueeChanged', {
          startX: this.selectScreenStartX,
          startY: this.selectScreenStartY,
          currentX: screenX,
          currentY: screenY,
        });
      }
      return;
    }

    // 3. Continuous painting & throttled drag placement
    if (this.isPainting && worldPos) {
      if (BiomeRegistry.isBiome(this.activeTool)) {
        this.applyBiomeBrush(worldPos.x, worldPos.y);
      } else if (this.activeTool === 'eraser') {
        this.applyEraser(worldPos.x, worldPos.y);
      } else if (this.activeTool === 'fire') {
        const now = performance.now();
        if (now - this.lastSpawnTime > 70) {
          this.lastSpawnTime = now;
          this.applyDivinePower(worldPos.x, worldPos.y);
        }
      } else {
        const now = performance.now();
        if (now - this.lastSpawnTime > 160) {
          this.lastSpawnTime = now;
          if (
            this.activeTool === 'human' ||
            this.activeTool === 'deer' ||
            this.activeTool === 'boar' ||
            this.activeTool === 'wolf' ||
            this.activeTool === 'chicken' ||
            this.activeTool === 'cow'
          ) {
            this.spawnCreature(worldPos.x, worldPos.y, false);
          } else if (this.activeTool === 'tree' || this.activeTool === 'berry_bush' || this.activeTool === 'stone') {
            this.placeResource(worldPos.x, worldPos.y);
          }
        }
      }
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    // 1. Camera drag release with inertia
    if (this.isDraggingCamera) {
      this.isDraggingCamera = false;
      const timeSinceLastDrag = performance.now() - this.lastDragTime;
      if (timeSinceLastDrag < 80) {
        this.camera.vx = Math.max(-120, Math.min(120, this.dragVelocityX * 0.75));
        this.camera.vy = Math.max(-120, Math.min(120, this.dragVelocityY * 0.75));
      } else {
        this.camera.vx = 0;
        this.camera.vy = 0;
      }
    }

    // 2. Complete box selection or click selection
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.events.emit('selectionMarqueeChanged', null);

      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const dist = Math.hypot(screenX - this.selectScreenStartX, screenY - this.selectScreenStartY);

      if (dist > 6) {
        // Box Selection Area
        const endWorld = this.camera.screenToWorld(screenX, screenY, this.canvas.width, this.canvas.height);
        const minX = Math.min(this.selectWorldStartX, endWorld.x);
        const maxX = Math.max(this.selectWorldStartX, endWorld.x);
        const minY = Math.min(this.selectWorldStartY, endWorld.y);
        const maxY = Math.max(this.selectWorldStartY, endWorld.y);

        const foundHumans = this.entityManager.getHumans().filter((h) => h.x >= minX && h.x <= maxX && h.y >= minY && h.y <= maxY);
        const foundAnimals = this.animalManager ? this.animalManager.getAnimals().filter((a) => a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY) : [];

        const selectedIds = new Set<string>();
        foundHumans.forEach((h) => selectedIds.add(h.id));
        foundAnimals.forEach((a) => selectedIds.add(a.id));

        this.events.emit('multipleSelected', {
          humans: foundHumans,
          animals: foundAnimals,
          count: foundHumans.length + foundAnimals.length,
          selectedIds,
        });
      } else {
        // Single Click Selection
        this.handleSingleSelect(this.selectWorldStartX, this.selectWorldStartY);
      }
    }

    // 3. Complete paint stroke
    if (this.isPainting) {
      this.isPainting = false;
      this.undoManager?.endStroke();
    }
  };

  private handleSingleSelect(worldX: number, worldY: number): void {
    // 1. Check Human
    const human = this.entityManager.findHumanAt(worldX, worldY, 1.4);
    if (human) {
      this.entityManager.selectHuman(human.id);
      this.buildingManager?.selectBuilding(null);
      this.animalManager?.selectAnimal(null);
      this.events.emit('humanSelected', human);
      this.events.emit('buildingSelected', null);
      this.events.emit('animalSelected', null);
      this.events.emit('singleSelected', { type: 'human', entity: human, id: human.id });
      return;
    }

    // 2. Check Animal
    if (this.animalManager) {
      const animal = this.animalManager.findAnimalAt(worldX, worldY, 1.4);
      if (animal) {
        this.animalManager.selectAnimal(animal.id);
        this.entityManager.selectHuman(null);
        this.buildingManager?.selectBuilding(null);
        this.events.emit('animalSelected', animal);
        this.events.emit('humanSelected', null);
        this.events.emit('buildingSelected', null);
        this.events.emit('singleSelected', { type: 'animal', entity: animal, id: animal.id });
        return;
      }
    }

    // 3. Check Building
    if (this.buildingManager) {
      const building = this.buildingManager.findBuildingAt(worldX, worldY);
      if (building) {
        this.buildingManager.selectBuilding(building.id);
        this.entityManager.selectHuman(null);
        this.animalManager?.selectAnimal(null);
        this.events.emit('buildingSelected', building);
        this.events.emit('humanSelected', null);
        this.events.emit('animalSelected', null);
        this.events.emit('singleSelected', { type: 'building', entity: building, id: building.id });
        return;
      }
    }

    // Nothing selected -> clear selection
    this.clearSelection();
  }

  private handleInspect(worldX: number, worldY: number): void {
    // Inspect without changing world
    const tileX = Math.floor(worldX);
    const tileY = Math.floor(worldY);

    const human = this.entityManager.findHumanAt(worldX, worldY, 1.4);
    if (human) {
      this.events.emit('inspectData', { category: 'human', data: human });
      return;
    }

    const animal = this.animalManager?.findAnimalAt(worldX, worldY, 1.4);
    if (animal) {
      this.events.emit('inspectData', { category: 'animal', data: animal });
      return;
    }

    const building = this.buildingManager?.findBuildingAt(worldX, worldY);
    if (building) {
      this.events.emit('inspectData', { category: 'building', data: building });
      return;
    }

    // Inspect Tile & Biome
    const biomeId = this.world.getBiomeAt(tileX, tileY);
    const biomeDef = BiomeRegistry.get(biomeId);
    const tileType = this.world.getTile(tileX, tileY);
    const elev = this.world.getElevation(tileX, tileY);

    this.events.emit('inspectData', {
      category: 'tile',
      data: {
        x: tileX,
        y: tileY,
        biome: biomeDef ? biomeDef.name : biomeId,
        elevation: Math.round(elev * 100),
        isWalkable: this.world.isWalkable(tileX, tileY),
        foodMult: biomeDef?.foodMultiplier ?? 1.0,
        temp: biomeDef?.temperature ?? 'Temperate',
      },
    });
  }

  private clearSelection(): void {
    this.entityManager.selectHuman(null);
    this.buildingManager?.selectBuilding(null);
    this.animalManager?.selectAnimal(null);
    this.events.emit('humanSelected', null);
    this.events.emit('buildingSelected', null);
    this.events.emit('animalSelected', null);
    this.events.emit('selectionCleared', null);
  }

  private applyBiomeBrush(worldX: number, worldY: number): void {
    this.world.paintBiome(
      worldX,
      worldY,
      this.brushRadius,
      this.activeTool,
      this.brushHardness,
      this.undoManager
    );
  }

  private applyEraser(worldX: number, worldY: number): void {
    const r = Math.max(0.5, this.brushRadius / 2);

    // Erase humans
    const humans = this.entityManager.getHumans();
    for (let i = humans.length - 1; i >= 0; i--) {
      const h = humans[i];
      if (Math.hypot(h.x - worldX, h.y - worldY) <= r) {
        if (this.undoManager) this.undoManager.recordHumanRemoved(h);
        this.entityManager.removeHuman(h.id);
      }
    }

    // Erase animals
    if (this.animalManager) {
      const animals = this.animalManager.getAnimals();
      for (let i = animals.length - 1; i >= 0; i--) {
        const a = animals[i];
        if (Math.hypot(a.x - worldX, a.y - worldY) <= r) {
          if (this.undoManager) this.undoManager.recordAnimalRemoved(a);
          this.animalManager.killAnimal(a);
        }
      }
    }

    // Erase buildings
    if (this.buildingManager) {
      const blds = this.buildingManager.getBuildings();
      for (let i = blds.length - 1; i >= 0; i--) {
        const b = blds[i];
        if (Math.hypot(b.x - worldX, b.y - worldY) <= r) {
          this.buildingManager.demolishBuilding(b.id, this.world);
        }
      }
    }

    // Erase resources
    if (this.resourceManager) {
      const minX = Math.max(0, Math.floor(worldX - r));
      const maxX = Math.min(this.world.width - 1, Math.ceil(worldX + r));
      const minY = Math.max(0, Math.floor(worldY - r));
      const maxY = Math.min(this.world.height - 1, Math.ceil(worldY + r));

      for (let ty = minY; ty <= maxY; ty++) {
        for (let tx = minX; tx <= maxX; tx++) {
          if (Math.hypot(tx - worldX, ty - worldY) <= r) {
            this.resourceManager.removeResourceAt(tx, ty);
          }
        }
      }
    }

    // Optionally turn land to water
    if (this.eraseLandToWater) {
      this.world.paintCircle(worldX, worldY, this.brushRadius, TileType.WATER, this.undoManager);
    }
  }

  private spawnCreature(worldX: number, worldY: number, spawnGroup: boolean): void {
    const tileX = Math.floor(worldX);
    const tileY = Math.floor(worldY);

    const toolDef = ToolRegistry.get(this.activeTool);
    const maxGroup =
      typeof toolDef?.spawnGroupSize === 'object' && toolDef.spawnGroupSize !== null
        ? toolDef.spawnGroupSize.max
        : typeof toolDef?.spawnGroupSize === 'number'
        ? toolDef.spawnGroupSize
        : 4;
    const groupCount = spawnGroup ? maxGroup : 1;

    let spawned = 0;
    const candidates = [
      { x: tileX, y: tileY },
      { x: tileX + 1, y: tileY },
      { x: tileX - 1, y: tileY },
      { x: tileX, y: tileY + 1 },
      { x: tileX, y: tileY - 1 },
      { x: tileX + 1, y: tileY + 1 },
      { x: tileX - 1, y: tileY - 1 },
      { x: tileX + 2, y: tileY },
      { x: tileX, y: tileY + 2 },
    ];

    for (const c of candidates) {
      if (spawned >= groupCount) break;
      if (this.world.isWalkable(c.x, c.y)) {
        if (this.activeTool === 'human') {
          const human = this.entityManager.addHuman(c.x, c.y, this.world);
          if (human) {
            if (this.undoManager) this.undoManager.recordHumanAdded(human);
            spawned++;
            if (spawned === 1) {
              this.entityManager.selectHuman(human.id);
              this.events.emit('humanSelected', human);
            }
          }
        } else if (this.animalManager) {
          const species = this.activeTool.toUpperCase() as AnimalSpecies;
          const animal = this.animalManager.addAnimal(species, c.x + 0.5, c.y + 0.5);
          if (animal) {
            if (this.undoManager) this.undoManager.recordAnimalAdded(animal);
            spawned++;
            if (spawned === 1) {
              this.animalManager.selectAnimal(animal.id);
              this.events.emit('animalSelected', animal);
            }
          }
        }
      }
    }
  }

  private placeResource(worldX: number, worldY: number): void {
    const tileX = Math.floor(worldX);
    const tileY = Math.floor(worldY);

    if (!this.world.isWalkable(tileX, tileY)) return;
    if (this.resourceManager?.hasResourceAt(tileX, tileY)) return;

    if (this.activeTool === 'tree') {
      this.resourceManager?.addTree(tileX, tileY, 30);
    } else if (this.activeTool === 'berry_bush') {
      this.resourceManager?.addBerryBush(tileX, tileY, 5);
    } else if (this.activeTool === 'stone') {
      this.resourceManager?.addStone(tileX, tileY, 50);
    }
  }

  private placeBuilding(worldX: number, worldY: number): void {
    const tileX = Math.floor(worldX);
    const tileY = Math.floor(worldY);

    if (!this.world.isWalkable(tileX, tileY)) return;

    const bType: BuildingType =
      this.activeTool === 'house'
        ? 'HOUSE'
        : this.activeTool === 'storage'
        ? 'STORAGE'
        : this.activeTool === 'town_hall'
        ? 'TOWN_HALL'
        : this.activeTool === 'farm'
        ? 'FARM'
        : 'ANIMAL_PEN';

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
        this.events.emit('placementFailed', { reason: 'Нельзя разместить постройку здесь (место занято или вода)' });
      }
    }
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomDelta = e.deltaY < 0 ? 2.5 : -2.5;
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

  /**
   * Execute divine powers on click or target
   */
  private applyDivinePower(worldX: number, worldY: number): void {
    if (!this.godPowersManager) return;
    const year = 1;

    switch (this.activeTool) {
      case 'lightning':
        this.godPowersManager.strikeLightning(
          worldX,
          worldY,
          this.world,
          this.resourceManager!,
          this.buildingManager!,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          this.camera,
          this.undoManager,
          year
        );
        break;

      case 'meteor':
        this.godPowersManager.spawnMeteor(
          worldX,
          worldY,
          this.world,
          this.resourceManager!,
          this.buildingManager!,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          this.camera,
          this.undoManager,
          year
        );
        break;

      case 'earthquake':
        this.godPowersManager.triggerEarthquake(
          worldX,
          worldY,
          this.world,
          this.buildingManager!,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          this.camera,
          this.undoManager,
          year
        );
        break;

      case 'fire':
        this.godPowersManager.startFire(
          worldX,
          worldY,
          this.world,
          this.resourceManager!,
          this.historyManager!,
          year
        );
        break;

      case 'heal_rain':
        this.godPowersManager.castHealingRain(
          worldX,
          worldY,
          this.world,
          this.buildingManager!,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          year
        );
        break;

      case 'divine_shield':
        this.godPowersManager.castDivineShield(
          worldX,
          worldY,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          year
        );
        break;

      case 'rejuvenate':
        this.godPowersManager.castRejuvenate(
          worldX,
          worldY,
          this.entityManager,
          this.historyManager!,
          year
        );
        break;

      case 'warrior_boost':
        this.godPowersManager.castWarriorBoost(
          worldX,
          worldY,
          this.entityManager,
          this.historyManager!,
          year
        );
        break;

      case 'grenade': {
        const fromX = worldX - 3.5;
        const fromY = worldY - 4.5;
        this.godPowersManager.throwGrenade(
          fromX,
          fromY,
          worldX,
          worldY,
          this.world,
          this.buildingManager!,
          this.entityManager,
          this.animalManager!,
          this.camera,
          this.undoManager
        );
        break;
      }

      case 'napalm': {
        const fromX = worldX - 3.5;
        const fromY = worldY - 4.5;
        this.godPowersManager.throwNapalm(
          fromX,
          fromY,
          worldX,
          worldY,
          this.world,
          this.resourceManager!,
          this.camera
        );
        break;
      }

      case 'freeze':
        this.godPowersManager.castFreeze(
          worldX,
          worldY,
          this.world,
          this.entityManager,
          this.animalManager!,
          this.historyManager!,
          this.camera,
          this.undoManager,
          year
        );
        break;
    }
  }
}
