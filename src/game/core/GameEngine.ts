import { World } from '../world/World';
import { Camera } from '../camera/Camera';
import { ResourceManager } from '../resources/ResourceManager';
import { EntityManager } from '../entities/EntityManager';
import { Simulation } from '../simulation/Simulation';
import { Renderer } from '../rendering/Renderer';
import { InputManager } from '../input/InputManager';
import { EventEmitter } from '../utils/EventEmitter';
import { WorldGenPreset } from '../types';
import { WorldGenerator } from '../world/WorldGenerator';
import { UndoManager } from '../history/UndoManager';
import { BiomeSystem } from '../world/BiomeSystem';
import { SaveManager, SaveSlotMeta } from '../save/SaveManager';

export class GameEngine {
  public world: World;
  public camera: Camera;
  public resourceManager: ResourceManager;
  public entityManager: EntityManager;
  public simulation: Simulation;
  public renderer: Renderer;
  public input: InputManager;
  public undoManager: UndoManager;
  public biomeSystem: BiomeSystem;
  public events: EventEmitter;

  private isRunning: boolean = false;
  private lastFrameTime: number = performance.now();
  private animFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.events = new EventEmitter();

    this.world = new World();
    // Start camera in middle of world
    this.camera = new Camera(128, 128, 16, 4, 48);
    this.resourceManager = new ResourceManager();
    this.entityManager = new EntityManager();
    this.undoManager = new UndoManager();
    this.biomeSystem = new BiomeSystem();

    this.simulation = new Simulation(
      this.world,
      this.resourceManager,
      this.entityManager,
      this.events
    );

    this.renderer = new Renderer(
      canvas,
      this.world,
      this.camera,
      this.resourceManager,
      this.entityManager,
      this.simulation.buildingManager,
      this.simulation.settlementManager,
      this.simulation.kingdomManager,
      this.simulation.territoryManager,
      this.simulation.animalManager,
      this.simulation.godPowersManager
    );
    this.renderer.roadSystem = this.simulation.roadSystem;
    this.renderer.shipManager = this.simulation.shipManager;
    this.renderer.tradeManager = this.simulation.tradeManager;

    this.input = new InputManager(
      canvas,
      this.camera,
      this.world,
      this.entityManager,
      this.events,
      this.simulation.buildingManager,
      this.simulation.settlementManager,
      this.simulation.kingdomManager,
      this.simulation.animalManager,
      this.resourceManager,
      this.undoManager,
      this.simulation.historyManager,
      this.simulation.godPowersManager
    );

    this.setupListeners();
    this.generateWorld('continents');

    this.startLoop();
  }

  private setupListeners(): void {
    // Sync cursor position and active tools with renderer
    this.events.on('cursorMoved', (pos: { x: number; y: number } | null) => {
      this.renderer.cursorWorldPos = pos;
    });

    this.events.on('toolChanged', (tool: string) => {
      this.setTool(tool);
    });

    this.events.on('selectionMarqueeChanged', (marquee: any) => {
      this.renderer.selectionMarquee = marquee;
    });

    this.events.on('multipleSelected', (data: { selectedIds: Set<string>; count: number }) => {
      this.renderer.selectedEntityIds = data.selectedIds;
    });

    this.events.on('singleSelected', (data: { id: string }) => {
      this.renderer.selectedEntityIds = new Set([data.id]);
    });

    this.events.on('selectionCleared', () => {
      this.renderer.selectedEntityIds.clear();
    });

    this.events.on('undoRequested', () => {
      this.undo();
    });

    this.events.on('redoRequested', () => {
      this.redo();
    });

    this.events.on('stepBrushSize', (direction: number) => {
      const sizes = [1, 3, 5, 10, 20, 30, 50];
      const cur = this.input.brushRadius;
      let idx = sizes.indexOf(cur);
      if (idx === -1) idx = 2; // default 5
      const nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + direction));
      this.setBrushRadius(sizes[nextIdx]);
    });

    this.events.on('togglePause', () => {
      this.simulation.togglePause();
    });

    this.events.on('togglePoliticalMap', () => {
      this.renderer.showPoliticalMap = !this.renderer.showPoliticalMap;
      this.events.emit('politicalMapToggled', this.renderer.showPoliticalMap);
    });
  }

  public spawnInitialPioneers(): void {
    let spawned = 0;
    for (let y = 110; y < 150 && spawned < 6; y += 2) {
      for (let x = 110; x < 150 && spawned < 6; x += 2) {
        if (this.world.isWalkable(x, y) && this.world.getBorderMask(x, y) === 0) {
          const sex = spawned % 2 === 0 ? 'MALE' : 'FEMALE';
          this.entityManager.addHuman(x, y, this.world, sex, 20 + (spawned % 8));
          spawned++;
        }
      }
    }
  }

  public setTool(toolId: string): void {
    this.input.activeTool = toolId;
    this.renderer.activeTool = toolId;
    this.events.emit('activeToolChanged', toolId);
  }

  public setBrushRadius(radius: number): void {
    const validSizes = [1, 3, 5, 10, 20, 30, 50];
    const clamped = validSizes.includes(radius) ? radius : 5;
    this.input.brushRadius = clamped;
    this.renderer.brushRadius = clamped;
    this.events.emit('brushRadiusChanged', clamped);
  }

  public setBrushHardness(hardness: number): void {
    const clamped = Math.max(0.1, Math.min(1.0, hardness));
    this.input.brushHardness = clamped;
    this.renderer.brushHardness = clamped;
    this.events.emit('brushHardnessChanged', clamped);
  }

  public setEraseLandToWater(eraseToWater: boolean): void {
    this.input.eraseLandToWater = eraseToWater;
    this.events.emit('eraseLandToWaterChanged', eraseToWater);
  }

  public undo(): boolean {
    const success = this.undoManager.undo(
      this.world,
      this.entityManager,
      this.simulation.animalManager,
      this.resourceManager,
      this.simulation.buildingManager
    );
    this.emitHistoryState();
    return success;
  }

  public redo(): boolean {
    const success = this.undoManager.redo(
      this.world,
      this.entityManager,
      this.simulation.animalManager,
      this.resourceManager,
      this.simulation.buildingManager
    );
    this.emitHistoryState();
    return success;
  }

  private emitHistoryState(): void {
    this.events.emit('historyChanged', {
      canUndo: this.undoManager.canUndo(),
      canRedo: this.undoManager.canRedo(),
    });
  }

  public generateWorld(preset: WorldGenPreset = 'continents'): void {
    this.simulation.clear();
    this.undoManager.clear();
    WorldGenerator.generate(this.world, this.resourceManager, preset);
    this.simulation.animalManager.spawnInitialEcosystem(this.world);
    this.spawnInitialPioneers();
    this.simulation.emitStats();
    this.emitHistoryState();
  }

  public togglePause(): void {
    this.simulation.togglePause();
  }

  public setSpeed(speed: number): void {
    this.simulation.setSpeed(speed);
  }

  public clearWorld(): void {
    this.simulation.clear();
    this.undoManager.clear();
    this.generateWorld('empty');
    this.emitHistoryState();
  }

  public slaughterAnimal(animalId: string): void {
    const animal = this.simulation.animalManager.getAnimal(animalId);
    if (animal) {
      this.simulation.animalManager.killAnimal(animal);
      this.simulation.animalManager.selectAnimal(null);
      this.events.emit('animalSelected', null);
    }
  }

  public domesticateAnimal(animalId: string): void {
    const animal = this.simulation.animalManager.getAnimal(animalId);
    if (animal) {
      animal.isDomesticated = true;
      animal.fearOfHumans = 0;
      // Try to assign to nearest settlement pen if available
      const closestPen = this.simulation.buildingManager.findNearestBuilding(
        animal.x,
        animal.y,
        'ANIMAL_PEN',
        30
      );
      if (closestPen && (!closestPen.livestockIds || closestPen.livestockIds.length < (closestPen.livestockCapacity ?? 8))) {
        animal.assignedPenId = closestPen.id;
        if (!closestPen.livestockIds) closestPen.livestockIds = [];
        closestPen.livestockIds.push(animal.id);
      }
    }
  }

  public resize(width: number, height: number): void {
    this.renderer.canvas.width = width;
    this.renderer.canvas.height = height;
  }

  private startLoop(): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const frame = (time: number) => {
      if (!this.isRunning) return;

      const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = time;

      // 1. Advance camera velocity / inertia
      this.camera.update(deltaSeconds, this.world.width, this.world.height);

      // 2. Advance natural biome adaptation (spawns resources in matching biomes)
      this.biomeSystem.update(
        this.world,
        this.resourceManager,
        this.simulation.buildingManager
      );

      // 3. Advance simulation ticks (fixed timestep)
      this.simulation.update(deltaSeconds);

      // 4. Render canvas at native refresh rate
      this.renderer.render(deltaSeconds);

      this.animFrameId = requestAnimationFrame(frame);
    };

    this.animFrameId = requestAnimationFrame(frame);
  }

  public getSaveSlots(): SaveSlotMeta[] {
    return SaveManager.getSlots();
  }

  public saveWorldToSlot(slot: number, name?: string): boolean {
    const ok = SaveManager.saveToSlot(slot, this.simulation, name);
    if (ok) {
      this.events.emit('worldSaved', { slot });
    }
    return ok;
  }

  public loadWorldFromSlot(slot: number): boolean {
    const ok = SaveManager.loadFromSlot(slot, this.simulation);
    if (ok) {
      this.renderer.roadSystem = this.simulation.roadSystem;
      this.renderer.shipManager = this.simulation.shipManager;
      this.renderer.tradeManager = this.simulation.tradeManager;
      this.events.emit('worldLoaded', { slot });
    }
    return ok;
  }

  public exportWorldJson(): string {
    return SaveManager.exportToJson(this.simulation);
  }

  public importWorldJson(json: string): boolean {
    const ok = SaveManager.importFromJson(json, this.simulation);
    if (ok) {
      this.renderer.roadSystem = this.simulation.roadSystem;
      this.renderer.shipManager = this.simulation.shipManager;
      this.renderer.tradeManager = this.simulation.tradeManager;
      this.events.emit('worldLoaded', { slot: -1 });
    }
    return ok;
  }

  public destroy(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.unbindEvents();
    this.resourceManager.clear();
    this.entityManager.clear();
    this.undoManager.clear();
  }
}
