import { World } from '../world/World';
import { Camera } from '../camera/Camera';
import { ResourceManager } from '../resources/ResourceManager';
import { EntityManager } from '../entities/EntityManager';
import { Simulation } from '../simulation/Simulation';
import { Renderer } from '../rendering/Renderer';
import { InputManager } from '../input/InputManager';
import { EventEmitter } from '../utils/EventEmitter';
import { ToolType, WorldGenPreset } from '../types';
import { WorldGenerator } from '../world/WorldGenerator';

export class GameEngine {
  public world: World;
  public camera: Camera;
  public resourceManager: ResourceManager;
  public entityManager: EntityManager;
  public simulation: Simulation;
  public renderer: Renderer;
  public input: InputManager;
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
      this.simulation.territoryManager
    );

    this.input = new InputManager(
      canvas,
      this.camera,
      this.world,
      this.entityManager,
      this.events,
      this.simulation.buildingManager,
      this.simulation.settlementManager,
      this.simulation.kingdomManager
    );

    this.setupListeners();
    this.generateWorld('continents');

    // Spawn starting humans on habitable terrain
    this.spawnInitialPioneers();

    this.startLoop();
  }

  private setupListeners(): void {
    // Sync cursor position and active tools with renderer
    this.events.on('cursorMoved', (pos: { x: number; y: number } | null) => {
      this.renderer.cursorWorldPos = pos;
    });

    this.events.on('toolChanged', (tool: ToolType) => {
      this.setTool(tool);
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

  public setTool(tool: ToolType): void {
    this.input.activeTool = tool;
    this.renderer.activeTool = tool;
    this.events.emit('activeToolChanged', tool);
  }

  public setBrushRadius(radius: number): void {
    const validSizes = [1, 3, 5, 10, 20];
    const clamped = validSizes.includes(radius) ? radius : 5;
    this.input.brushRadius = clamped;
    this.renderer.brushRadius = clamped;
    this.events.emit('brushRadiusChanged', clamped);
  }

  public generateWorld(preset: WorldGenPreset = 'continents'): void {
    this.simulation.clear();
    WorldGenerator.generate(this.world, this.resourceManager, preset);
    this.simulation.emitStats();
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

      // 1. Advance simulation ticks (fixed timestep)
      this.simulation.update(deltaSeconds);

      // 2. Render canvas at native refresh rate
      this.renderer.render(deltaSeconds);

      this.animFrameId = requestAnimationFrame(frame);
    };

    this.animFrameId = requestAnimationFrame(frame);
  }

  public destroy(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.unbindEvents();
    this.resourceManager.clear();
    this.entityManager.clear();
  }
}
