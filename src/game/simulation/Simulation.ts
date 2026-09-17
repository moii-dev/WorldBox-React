import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { TerritoryManager } from '../world/TerritoryManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { HistoryManager } from '../history/HistoryManager';
import { SimulationStats } from '../types';
import { EventEmitter } from '../utils/EventEmitter';
import { SIMULATION_CONFIG } from '../SimulationConfig';

export class Simulation {
  public world: World;
  public resourceManager: ResourceManager;
  public entityManager: EntityManager;
  public buildingManager: BuildingManager;
  public settlementManager: SettlementManager;
  public kingdomManager: KingdomManager;
  public territoryManager: TerritoryManager;
  public diplomacyManager: DiplomacyManager;
  public historyManager: HistoryManager;
  public events: EventEmitter;

  public speed: number = 1; // 0 = pause, 1 = 1x, 2 = 2x, 4 = 4x
  public isPaused: boolean = false;
  public tickRate: number = 25; // 25 ticks per second base
  public readonly timeStep: number; // seconds per tick

  private accumulator: number = 0;
  private tickCount: number = 0;
  private lastStatsEmitTime: number = 0;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;
  private currentTps: number = 25;
  private tpsCounter: number = 0;

  constructor(
    world: World,
    resourceManager: ResourceManager,
    entityManager: EntityManager,
    events: EventEmitter
  ) {
    this.world = world;
    this.resourceManager = resourceManager;
    this.entityManager = entityManager;
    this.events = events;
    this.timeStep = 1 / this.tickRate;

    // Initialize civilization managers
    this.historyManager = new HistoryManager(events);
    this.buildingManager = new BuildingManager();
    this.settlementManager = new SettlementManager();
    this.kingdomManager = new KingdomManager();
    this.territoryManager = new TerritoryManager(world.width, world.height);
    this.diplomacyManager = new DiplomacyManager();

    this.historyManager.logEvent(
      1,
      'A new world awakens. Primitive tribes wander across the land in search of fertile grounds.',
      'SETTLEMENT_FOUNDED',
      '#60a5fa'
    );
  }

  public setSpeed(speedMultiplier: number): void {
    if (speedMultiplier === 0) {
      this.isPaused = true;
      this.speed = 0;
    } else {
      this.isPaused = false;
      this.speed = speedMultiplier;
    }
    this.events.emit('speedChanged', { speed: this.speed, isPaused: this.isPaused });
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.events.emit('speedChanged', { speed: this.speed, isPaused: this.isPaused });
  }

  public update(deltaSeconds: number): void {
    // Track FPS
    this.fpsCounter++;
    this.fpsTimer += deltaSeconds;
    if (this.fpsTimer >= 1.0) {
      this.currentFps = Math.round(this.fpsCounter / this.fpsTimer);
      this.currentTps = Math.round(this.tpsCounter / this.fpsTimer);
      this.fpsCounter = 0;
      this.tpsCounter = 0;
      this.fpsTimer = 0;
    }

    if (this.isPaused || this.speed === 0) {
      this.checkStatsEmit();
      return;
    }

    // Effective elapsed time adjusted for speed
    const effectiveDelta = deltaSeconds * this.speed;
    this.accumulator += effectiveDelta;

    // Prevent spiral of death on lag spikes (max 10 ticks per frame)
    const maxTicksPerFrame = 10;
    let ticksProcessed = 0;

    while (this.accumulator >= this.timeStep && ticksProcessed < maxTicksPerFrame) {
      this.step();
      this.accumulator -= this.timeStep;
      this.tickCount++;
      this.tpsCounter++;
      ticksProcessed++;
    }

    if (ticksProcessed >= maxTicksPerFrame) {
      // Discard accumulated time to keep rendering smooth
      this.accumulator = 0;
    }

    if (this.world.isWaterDirty) {
      this.world.recalculateWaterDepth();
    }

    this.checkStatsEmit();
  }

  private step(): void {
    const gameYear = 1 + Math.floor(this.tickCount / SIMULATION_CONFIG.ticksPerGameYear);

    // 1. Natural resources growth / respawn
    this.resourceManager.updateNaturalGrowth(this.world);

    // 2. Human entities lifecycle, movement, professions, construction, and combat
    this.entityManager.update(
      this.world,
      this.resourceManager,
      this.buildingManager,
      this.settlementManager,
      this.kingdomManager,
      this.diplomacyManager,
      1
    );

    // 3. Periodic civilization checks to prevent heavy computation every single tick
    if (this.tickCount % 50 === 0) {
      this.settlementManager.checkForNewSettlements(
        this.world,
        this.entityManager,
        this.buildingManager,
        this.historyManager,
        gameYear
      );

      this.kingdomManager.checkForNewKingdoms(
        this.settlementManager,
        this.entityManager,
        this.buildingManager,
        this.historyManager,
        gameYear
      );

      this.diplomacyManager.updateDiplomacy(
        this.kingdomManager,
        this.settlementManager,
        this.historyManager,
        gameYear,
        this.tickCount
      );
    }

    if (this.tickCount % 25 === 0) {
      const isAtWar = (kingdomId: string | null) => {
        if (!kingdomId) return false;
        const k = this.kingdomManager.getKingdom(kingdomId);
        return k ? k.isAtWar() : false;
      };

      this.settlementManager.updateSettlements(
        this.world,
        this.entityManager,
        this.buildingManager,
        this.resourceManager,
        isAtWar
      );

      this.kingdomManager.updateKingdoms(this.settlementManager, this.entityManager);
    }

    if (this.tickCount % SIMULATION_CONFIG.territoryExpansionIntervalTicks === 0) {
      this.territoryManager.updateTerritoryExpansion(
        this.world,
        this.settlementManager,
        this.kingdomManager,
        this.buildingManager
      );
    }
  }

  private checkStatsEmit(): void {
    const now = performance.now();
    // Emit stats every 200ms
    if (now - this.lastStatsEmitTime > 200) {
      this.lastStatsEmitTime = now;
      this.emitStats();
    }
  }

  public emitStats(): void {
    const gameYear = 1 + Math.floor(this.tickCount / SIMULATION_CONFIG.ticksPerGameYear);

    const stats: SimulationStats = {
      population: this.entityManager.population,
      childrenCount: this.entityManager.childrenCount,
      adultsCount: this.entityManager.adultsCount,
      eldersCount: this.entityManager.eldersCount,
      soldiersCount: this.entityManager.soldiersCount,
      settlementsCount: this.settlementManager.settlements.size,
      kingdomsCount: this.kingdomManager.kingdoms.size,
      buildingsCount: this.buildingManager.buildings.size,
      activeWarsCount: this.diplomacyManager.activeWars.length,
      gameYear,

      trees: this.resourceManager.treeCount,
      stone: this.resourceManager.stoneCount,
      landTiles: this.world.totalLandTiles,
      waterTiles: this.world.totalWaterTiles,

      fps: this.currentFps,
      tps: this.currentTps,
      simSpeed: this.speed,
      isPaused: this.isPaused,
      tickCount: this.tickCount,

      biomes: { ...this.world.biomes },
    };

    this.events.emit('statsUpdated', stats);
  }

  public clear(): void {
    this.resourceManager.clear();
    this.entityManager.clear();
    this.buildingManager.clear();
    this.settlementManager.settlements.clear();
    this.kingdomManager.clear();
    this.territoryManager.clear();
    this.historyManager.clear();
    this.tickCount = 0;
    this.accumulator = 0;
  }
}
