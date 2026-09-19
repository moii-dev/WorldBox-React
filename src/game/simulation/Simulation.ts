import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { TerritoryManager } from '../world/TerritoryManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { HistoryManager } from '../history/HistoryManager';
import { AnimalManager } from '../entities/AnimalManager';
import { GodPowersManager } from '../powers/GodPowersManager';
import { RoadSystem } from '../roads/RoadSystem';
import { ShipManager } from '../seafaring/ShipManager';
import { TradeManager } from '../trade/TradeManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { Era, SimulationStats } from '../types';
import { EventEmitter } from '../utils/EventEmitter';
import { SIMULATION_CONFIG } from '../SimulationConfig';

export class Simulation {
  public world: World;
  public resourceManager: ResourceManager;
  public entityManager: EntityManager;
  public animalManager: AnimalManager;
  public buildingManager: BuildingManager;
  public settlementManager: SettlementManager;
  public kingdomManager: KingdomManager;
  public territoryManager: TerritoryManager;
  public diplomacyManager: DiplomacyManager;
  public historyManager: HistoryManager;
  public godPowersManager: GodPowersManager;
  public roadSystem: RoadSystem;
  public shipManager: ShipManager;
  public tradeManager: TradeManager;
  public events: EventEmitter;

  public speed: number = 1; // 0 = pause, 1 = 1x, 2 = 2x, 4 = 4x
  public isPaused: boolean = false;
  public tickRate: number = 25; // 25 ticks per second base
  public readonly timeStep: number; // seconds per tick

  private accumulator: number = 0;
  public tickCount: number = 0;
  public get gameYear(): number {
    return 1 + Math.floor(this.tickCount / SIMULATION_CONFIG.ticksPerGameYear);
  }
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
    this.animalManager = new AnimalManager();
    this.godPowersManager = new GodPowersManager();
    this.roadSystem = new RoadSystem(world.width, world.height);
    this.shipManager = new ShipManager();
    this.tradeManager = new TradeManager();

    this.historyManager.logEvent(
      1,
      'Новый мир пробуждается. Первобытные племена исследуют земли в поисках плодородных угодий.',
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

    // Always advance visual VFX & floating particles even if paused
    this.godPowersManager.vfxSystem.update(deltaSeconds, this.godPowersManager.fireSystem.getActiveFires());

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

    // 2. Agricultural crops growth on farms
    this.buildingManager.updateFarms(0.004);

    // 3. Animal ecosystem updates (behavior, predators, hunting, mating)
    this.animalManager.update(this.world, this.entityManager, this.buildingManager, 1);

    // 4. Human entities lifecycle, hunger, professions, construction, and combat
    this.entityManager.update(
      this.world,
      this.resourceManager,
      this.buildingManager,
      this.settlementManager,
      this.kingdomManager,
      this.diplomacyManager,
      this.animalManager,
      1
    );

    // 5. Fire simulation, burning damage & divine status effects
    this.godPowersManager.update(
      this.timeStep,
      this.world,
      this.resourceManager,
      this.buildingManager,
      this.entityManager,
      this.animalManager,
      1
    );

    // 6. Naval Seafaring, Fishing, Shipping & Island Colonization
    this.shipManager.update(
      this.world,
      this.settlementManager,
      this.entityManager,
      this.buildingManager,
      this.historyManager,
      gameYear,
      1
    );

    // 7. Inter-city Trade Caravans & Merchants
    this.tradeManager.update(
      this.settlementManager,
      this.diplomacyManager,
      this.historyManager,
      this.roadSystem,
      gameYear,
      1
    );

    // 8. Footpath and Cobblestone wear accumulation
    if (this.tickCount % 5 === 0) {
      for (const human of this.entityManager.humans.values()) {
        if (human.isMoving) {
          const k = human.kingdomId ? this.kingdomManager.getKingdom(human.kingdomId) : null;
          const isAdvanced = k ? k.era === 'IRON' || k.era === 'IMPERIAL' : false;
          this.roadSystem.recordFootstep(human.tileX, human.tileY, false, isAdvanced);
        }
      }
    }

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

      // Tech tree, era progression, blacksmithing, faith, and naval shipyards
      this.updateCivilizationProgress(gameYear);
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

    // Calculate total food in storage and carried by humans
    let totalFood = 0;
    for (const s of this.settlementManager.settlements.values()) {
      totalFood += s.storage.food;
    }
    for (const h of this.entityManager.humans.values()) {
      totalFood += h.inventory.food;
    }

    // Animal species counts
    let wildAnimals = 0;
    let domesticAnimals = 0;
    let deerCount = 0;
    let boarCount = 0;
    let wolfCount = 0;
    let chickenCount = 0;
    let cowCount = 0;

    for (const a of this.animalManager.animals.values()) {
      if (a.isDomesticated) domesticAnimals++;
      else wildAnimals++;

      if (a.species === 'DEER') deerCount++;
      else if (a.species === 'BOAR') boarCount++;
      else if (a.species === 'WOLF') wolfCount++;
      else if (a.species === 'CHICKEN') chickenCount++;
      else if (a.species === 'COW') cowCount++;
    }

    let farmsCount = 0;
    let pensCount = 0;
    for (const b of this.buildingManager.buildings.values()) {
      if (b.type === 'FARM') farmsCount++;
      else if (b.type === 'ANIMAL_PEN') pensCount++;
    }

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
      totalFood,
      berryBushes: this.resourceManager.berryBushCount,
      farmsCount,
      pensCount,

      animalsCount: this.animalManager.animals.size,
      wildAnimalsCount: wildAnimals,
      domesticAnimalsCount: domesticAnimals,
      deerCount,
      boarCount,
      wolfCount,
      chickenCount,
      cowCount,
      carcassesCount: this.animalManager.carcasses.size,

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

  /**
   * Advances science & eras, upgrades blacksmith weaponry, generates faith & temples,
   * checks coastal dock placement and launches naval ships.
   */
  private updateCivilizationProgress(gameYear: number): void {
    const eraRank = (era: Era): number => {
      if (era === 'PRIMITIVE') return 0;
      if (era === 'BRONZE') return 1;
      if (era === 'IRON') return 2;
      return 3;
    };

    for (const settlement of this.settlementManager.settlements.values()) {
      // 1. Detect coastal proximity
      let coastalFound = false;
      for (let dy = -6; dy <= 6 && !coastalFound; dy++) {
        for (let dx = -6; dx <= 6 && !coastalFound; dx++) {
          const wx = settlement.x + dx;
          const wy = settlement.y + dy;
          if (this.world.isInBounds(wx, wy) && this.world.isWater(this.world.getTile(wx, wy))) {
            coastalFound = true;
          }
        }
      }
      settlement.isCoastal = coastalFound;

      // 2. Accumulate Technology Points
      let techGained = Math.max(1, Math.floor(settlement.population / 4));
      const buildings = this.buildingManager.getBuildingsForSettlement(settlement.id);
      const hasBlacksmith = buildings.some((b) => b.type === 'BLACKSMITH');
      const hasTemple = buildings.some((b) => b.type === 'TEMPLE');
      const hasDock = buildings.some((b) => b.type === 'DOCK');

      if (hasBlacksmith) techGained += 2;
      if (hasTemple) {
        techGained += 1;
        settlement.faith = (settlement.faith || 0) + 2;
      }
      settlement.techPoints = (settlement.techPoints || 0) + techGained;

      // 3. Era Advancement
      const currentRank = eraRank(settlement.era);
      if (currentRank === 0 && settlement.techPoints >= 100) {
        settlement.era = 'BRONZE';
        SoundSynthesizer.playAnvilForging();
        this.historyManager.logEvent(
          gameYear,
          `Бронзовый век! Поселение «${settlement.name}» открыло бронзовые орудия и укреплённые частоколы.`,
          'TECH_BREAKTHROUGH',
          '#f59e0b'
        );
      } else if (currentRank === 1 && settlement.techPoints >= 300) {
        settlement.era = 'IRON';
        SoundSynthesizer.playTownBell();
        this.historyManager.logEvent(
          gameYear,
          `Железный век! В «${settlement.name}» освоено кузнечное дело, стальные клинки и сторожевые башни.`,
          'TECH_BREAKTHROUGH',
          '#38bdf8'
        );
      } else if (currentRank === 2 && settlement.techPoints >= 700) {
        settlement.era = 'IMPERIAL';
        SoundSynthesizer.playDivineChime();
        this.historyManager.logEvent(
          gameYear,
          `Золотая эпоха Империи! «${settlement.name}» возводит мраморные храмы, мощёные тракты и тяжёлые галеоны.`,
          'TECH_BREAKTHROUGH',
          '#a855f7'
        );
      }

      // Update Kingdom Era
      if (settlement.kingdomId) {
        const kingdom = this.kingdomManager.getKingdom(settlement.kingdomId);
        if (kingdom) {
          if (eraRank(settlement.era) > eraRank(kingdom.era)) {
            kingdom.era = settlement.era;
          }
        }
      }

      // 4. Blacksmith Armaments for Citizens
      if (hasBlacksmith || currentRank >= 1) {
        for (const human of this.entityManager.humans.values()) {
          if (human.settlementId === settlement.id) {
            if (settlement.era === 'BRONZE') {
              if (human.weapon === 'FISTS') human.weapon = 'SPEAR';
              if (human.armor === 'NONE') human.armor = 'LEATHER';
            } else if (settlement.era === 'IRON') {
              if (human.profession === 'SOLDIER' && human.weapon !== 'SWORD') {
                human.weapon = 'SWORD';
                human.armor = 'IRON';
              } else if (human.profession === 'HUNTER' && human.weapon !== 'BOW') {
                human.weapon = 'BOW';
              }
            } else if (settlement.era === 'IMPERIAL') {
              if (human.profession === 'SOLDIER') {
                human.weapon = human.weapon === 'SWORD' ? 'HALBERD' : 'SWORD';
                human.armor = 'PLATE';
              }
            }
          }
        }
      }

      // 5. Faith & Divine Worship
      if (settlement.faith >= 120 && Math.random() < 0.05) {
        settlement.faith -= 50;
        SoundSynthesizer.playDivineChime();
        this.historyManager.logEvent(
          gameYear,
          `Молитвы услышаны! Жители «${settlement.name}» получили благословение небес: исцеление и прилив сил.`,
          'DIVINE_BLESSING',
          '#facc15'
        );
        // Heal citizens of settlement
        for (const human of this.entityManager.humans.values()) {
          if (human.settlementId === settlement.id) {
            human.health = human.maxHealth;
            human.hunger = 100;
          }
        }
      }

      // 6. Coastal Dock & Ship Commissioning
      if (settlement.isCoastal && currentRank >= 1) {
        // Build dock if none exists and settlement has wood
        if (!hasDock && settlement.storage.wood >= 25) {
          for (let r = 2; r <= 6 && !hasDock; r++) {
            for (let dy = -r; dy <= r && !hasDock; dy++) {
              for (let dx = -r; dx <= r && !hasDock; dx++) {
                const tx = settlement.x + dx;
                const ty = settlement.y + dy;
                if (
                  this.world.isInBounds(tx, ty) &&
                  this.world.isWalkable(tx, ty) &&
                  this.buildingManager.canPlaceBuilding(this.world, this.resourceManager, tx, ty, 2, 2)
                ) {
                  // Check if adjacent to water
                  let adjacentWater = false;
                  for (let wy = -1; wy <= 1; wy++) {
                    for (let wx = -1; wx <= 1; wx++) {
                      if (this.world.isInBounds(tx + wx, ty + wy) && this.world.isWater(this.world.getTile(tx + wx, ty + wy))) {
                        adjacentWater = true;
                      }
                    }
                  }
                  if (adjacentWater) {
                    settlement.storage.wood -= 25;
                    const dock = this.buildingManager.placeBuilding('DOCK', tx, ty, settlement.id, settlement.kingdomId);
                    settlement.addBuilding(dock.id);
                    SoundSynthesizer.playWoodChop();
                    this.historyManager.logEvent(
                      gameYear,
                      `В поселении «${settlement.name}» возведена морская верфь и гавань!`,
                      'CONSTRUCTION_FINISHED',
                      '#38bdf8'
                    );
                    break;
                  }
                }
              }
            }
          }
        }

        // Commission ships if dock exists
        const currentShips = Array.from(this.shipManager.ships.values()).filter(
          (s) => s.settlementId === settlement.id
        ).length;
        settlement.shipsCount = currentShips;

        if (hasDock && currentShips < 3 && settlement.storage.wood >= 35) {
          const dockBld = buildings.find((b) => b.type === 'DOCK');
          if (dockBld) {
            let waterX = -1;
            let waterY = -1;
            for (let dy = -2; dy <= 3 && waterX === -1; dy++) {
              for (let dx = -2; dx <= 3 && waterX === -1; dx++) {
                const wx = dockBld.x + dx;
                const wy = dockBld.y + dy;
                if (this.world.isInBounds(wx, wy) && this.world.isWater(this.world.getTile(wx, wy))) {
                  waterX = wx;
                  waterY = wy;
                }
              }
            }

            if (waterX !== -1) {
              settlement.storage.wood -= 35;
              const shipType =
                currentRank >= 2 && currentShips === 2
                  ? 'TRANSPORT_SHIP'
                  : currentRank >= 1 && currentShips === 1
                  ? 'TRADE_SHIP'
                  : 'FISHING_BOAT';

              this.shipManager.createShip(
                shipType,
                waterX,
                waterY,
                settlement.id,
                settlement.kingdomId
              );
              SoundSynthesizer.playBoatSplash();
              this.historyManager.logEvent(
                gameYear,
                `С верфи «${settlement.name}» спущено судно типа ${shipType === 'TRANSPORT_SHIP' ? 'Транспорт колонистов' : shipType === 'TRADE_SHIP' ? 'Торговый когг' : 'Рыбацкая бригантина'}!`,
                'EXPEDITION_LAUNCHED',
                '#0ea5e9'
              );
            }
          }
        }
      }
    }
  }

  public clear(): void {
    this.resourceManager.clear();
    this.entityManager.clear();
    this.animalManager.clear();
    this.buildingManager.clear();
    this.settlementManager.settlements.clear();
    this.kingdomManager.clear();
    this.territoryManager.clear();
    this.historyManager.clear();
    this.roadSystem.roads.fill(0);
    this.roadSystem.wear.fill(0);
    this.shipManager.ships.clear();
    this.tradeManager.caravans.clear();
    this.tickCount = 0;
    this.accumulator = 0;
  }
}
