import {
  HumanEntity,
  HumanState,
  Inventory,
  ResourceType,
  Sex,
  LifeStage,
  Profession,
  WeaponType,
  ArmorType,
} from '../types';
import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { SIMULATION_CONFIG } from '../SimulationConfig';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { EntityManager } from './EntityManager';
import { AnimalManager } from './AnimalManager';
import { FOOD_CONFIG } from '../FoodConfig';

const MALE_NAMES = [
  'Arthur', 'Torin', 'Goran', 'Finn', 'Silas',
  'Bram', 'Rowan', 'Kael', 'Jarek', 'Leif',
  'Vance', 'Alden', 'Cedric', 'Gareth', 'Osric',
  'Ragnar', 'Thorne', 'Dorian', 'Lucan', 'Elden',
];

const FEMALE_NAMES = [
  'Elena', 'Mira', 'Lyra', 'Cora', 'Aria',
  'Dara', 'Maeve', 'Sari', 'Talia', 'Isla',
  'Freya', 'Nora', 'Astrid', 'Gwen', 'Selene',
  'Brigid', 'Kira', 'Vala', 'Elspeth', 'Rowena',
];

const SHIRT_COLORS = [
  '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#e11d48', '#059669', '#4f46e5', '#7c3aed'
];
const HAIR_COLORS = ['#451a03', '#78350f', '#d97706', '#18181b', '#b45309', '#9ca3af', '#fef08a'];
const SKIN_COLORS = ['#fed7aa', '#fde047', '#fbcfe8', '#f5d0b5', '#d4a373', '#8d5b4c'];
const PANTS_COLORS = ['#1e293b', '#334155', '#475569', '#374151', '#1f2937'];

export class Human implements HumanEntity {
  public id: string;
  public name: string;
  public sex: Sex;
  public age: number;
  public lifeStage: LifeStage;
  public health: number;
  public maxHealth: number;
  public hunger: number = 85;
  public maxHunger: number = 100;
  public starvationTicks: number = 0;
  public eatingAnimTimer: number = 0;
  public profession: Profession = 'WORKER';
  public state: HumanState = HumanState.IDLE;
  public inventory: Inventory = { wood: 0, stone: 0, food: 0 };
  public path: { x: number; y: number }[] = [];
  public stateTimer: number = 0;
  public walkFrame: number = 0;
  public facing: 'left' | 'right' = 'right';
  public gatherProgress: number = 0;
  public buildProgress: number = 0;

  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public targetResourceId: string | null = null;
  public targetBuildingId: string | null = null;
  public targetEnemyId: string | null = null;
  public targetAnimalId: string | null = null;
  public targetCarcassId: string | null = null;
  public targetFarmId: string | null = null;

  public homeId: string | null = null;
  public settlementId: string | null = null;
  public kingdomId: string | null = null;
  public partnerId: string | null = null;
  public parents: string[] = [];
  public children: string[] = [];
  public birthTimer: number = 0;
  public isExpecting: boolean = false;
  public courtingTargetId: string | null = null;

  public kills: number = 0;
  public animalsHunted: number = 0;
  public weapon: WeaponType = 'FISTS';
  public armor: ArmorType = 'NONE';
  public faith: number = 0;
  public inShipId: string | null = null;

  public get tileX(): number {
    return Math.floor(this.x);
  }

  public get tileY(): number {
    return Math.floor(this.y);
  }

  public get isMoving(): boolean {
    return (
      this.path.length > 0 ||
      Math.abs(this.targetX - this.x) > 0.1 ||
      Math.abs(this.targetY - this.y) > 0.1
    );
  }

  public attackCooldownTimer: number = 0;
  public reproductionCooldown: number = 0;
  public isAttackingAnim: number = 0;
  public hitFlashTimer: number = 0;
  public divineShieldTimer: number = 0;
  public warriorBoostTimer: number = 0;
  public frozenTimer: number = 0;

  public colorTheme: {
    shirt: string;
    hair: string;
    skin: string;
    pants: string;
  };

  private static idCounter: number = 1;
  private readonly baseSpeed: number = 0.06;

  constructor(
    tileX: number,
    tileY: number,
    sex?: Sex,
    age?: number,
    parents?: string[]
  ) {
    this.id = `human_${Human.idCounter++}`;
    this.sex = sex || (Math.random() < 0.5 ? 'MALE' : 'FEMALE');
    this.name =
      this.sex === 'MALE'
        ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
        : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];

    this.age = age !== undefined ? age : 18 + Math.floor(Math.random() * 12);
    this.lifeStage = this.calculateLifeStage(this.age);

    this.maxHealth = SIMULATION_CONFIG.maxHealth;
    this.health = this.maxHealth;

    this.x = tileX + 0.5;
    this.y = tileY + 0.5;
    this.targetX = tileX;
    this.targetY = tileY;

    if (parents) {
      this.parents = [...parents];
    }

    this.colorTheme = {
      shirt: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
      hair: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      skin: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
      pants: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
    };

    this.stateTimer = 1 + Math.random() * 2;
  }

  public get moveSpeed(): number {
    if (this.frozenTimer > 0) return 0;
    let spd = this.baseSpeed;
    if (this.lifeStage === 'CHILD') spd *= 0.75;
    else if (this.lifeStage === 'ELDER') spd *= 0.8;
    else if (this.profession === 'SOLDIER') spd *= 1.1;
    if (this.warriorBoostTimer > 0) spd *= 1.5;
    return spd;
  }

  private calculateLifeStage(age: number): LifeStage {
    if (age <= SIMULATION_CONFIG.childAgeMax) return 'CHILD';
    if (age <= SIMULATION_CONFIG.teenAgeMax) return 'TEEN';
    if (age <= SIMULATION_CONFIG.adultAgeMax) return 'ADULT';
    return 'ELDER';
  }

  public takeDamage(amount: number, attackerId?: string): boolean {
    if (this.divineShieldTimer > 0) {
      this.hitFlashTimer = 4;
      return false; // Immune with divine shield!
    }
    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 6; // visual damage flash frames

    if (this.health <= 0) {
      return true; // died
    }

    if (this.state === HumanState.SOCIALIZING) {
      this.isExpecting = false;
      this.courtingTargetId = null;
      this.birthTimer = 0;
    }

    // Retaliate or flee if surprised
    if (attackerId && this.state !== HumanState.ATTACKING) {
      if (this.profession === 'SOLDIER' || (this.lifeStage === 'ADULT' && Math.random() < 0.5)) {
        this.targetEnemyId = attackerId;
        this.state = HumanState.ATTACKING;
      } else {
        this.state = HumanState.FLEEING;
        this.stateTimer = 4;
      }
    }

    return false;
  }

  public update(
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    settlementManager: SettlementManager,
    kingdomManager: KingdomManager,
    diplomacyManager: DiplomacyManager,
    entityManager: EntityManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): boolean {
    // Divine status effects timers
    const dtSeconds = deltaTicks * 0.04;
    if (this.divineShieldTimer > 0) {
      this.divineShieldTimer = Math.max(0, this.divineShieldTimer - dtSeconds);
    }
    if (this.warriorBoostTimer > 0) {
      this.warriorBoostTimer = Math.max(0, this.warriorBoostTimer - dtSeconds);
    }
    if (this.frozenTimer > 0) {
      this.frozenTimer = Math.max(0, this.frozenTimer - dtSeconds);
      // Frozen in solid ice! Cannot age or act
      return true;
    }

    // 1. Advance aging
    this.age += (1 / SIMULATION_CONFIG.ticksPerGameYear) * deltaTicks;
    const prevStage = this.lifeStage;
    this.lifeStage = this.calculateLifeStage(this.age);

    // Turn elders' hair white/gray
    if (this.lifeStage === 'ELDER' && prevStage !== 'ELDER') {
      this.colorTheme.hair = '#e2e8f0';
    }

    // Elder natural mortality check
    if (this.age >= SIMULATION_CONFIG.maxAgeMin) {
      const mortalityChance = (this.age - SIMULATION_CONFIG.maxAgeMin) * 0.0003 * deltaTicks;
      if (Math.random() < mortalityChance) {
        return false; // Died of old age
      }
    }

    // Hunger decay
    this.hunger = Math.max(0, this.hunger - FOOD_CONFIG.hungerDecayPerTick * deltaTicks);

    // Starvation mechanics
    if (this.hunger <= FOOD_CONFIG.starvationDamageThreshold) {
      this.starvationTicks += deltaTicks;
      this.health -= FOOD_CONFIG.starvationDamagePerTick * deltaTicks;
      if (Math.random() < 0.08) {
        this.hitFlashTimer = 4;
      }
      if (this.health <= 0) {
        return false; // Died of starvation!
      }
    } else {
      this.starvationTicks = 0;
    }

    // Eating check when hungry
    if (
      this.hunger < FOOD_CONFIG.eatingThreshold &&
      this.state !== HumanState.ATTACKING &&
      this.state !== HumanState.FLEEING
    ) {
      // 1. Check personal inventory
      if (this.inventory.food > 0) {
        this.inventory.food--;
        this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_CONFIG.nutrition.BREAD);
        this.eatingAnimTimer = 15;
      }
      // 2. Check settlement communal food storage
      else if (this.settlementId) {
        const settlement = settlementManager.getSettlement(this.settlementId);
        if (settlement && settlement.storage.food > 0) {
          const eaten = settlement.withdrawFood(1);
          if (eaten > 0) {
            this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_CONFIG.nutrition.BREAD);
            this.eatingAnimTimer = 15;
          }
        }
      }

      // 3. If starving (< 25) and no food found, prioritize searching for food!
      if (
        this.hunger < FOOD_CONFIG.starvationWarningThreshold &&
        this.state !== HumanState.SEARCHING_FOOD &&
        this.state !== HumanState.HUNTING &&
        this.state !== HumanState.FARMING
      ) {
        this.state = HumanState.SEARCHING_FOOD;
        this.stateTimer = 1.5;
      }
    }

    // Cooldown timers
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTicks;
    if (this.isAttackingAnim > 0) this.isAttackingAnim -= deltaTicks;
    if (this.eatingAnimTimer > 0) this.eatingAnimTimer -= deltaTicks;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= deltaTicks;
    if (this.reproductionCooldown > 0) this.reproductionCooldown -= deltaTicks;

    // Check bounds / water displacement
    const currentTileX = Math.floor(this.x);
    const currentTileY = Math.floor(this.y);
    if (!world.isWalkable(currentTileX, currentTileY)) {
      this.rescueToLand(world);
      return true;
    }

    // Find a home if homeless
    if (!this.homeId && this.lifeStage !== 'CHILD' && Math.random() < 0.05) {
      const house = buildingManager.findAvailableHouse(this.settlementId, currentTileX, currentTileY);
      if (house) {
        house.occupants.push(this.id);
        this.homeId = house.id;
      }
    }

    // 2. High priority combat check for soldiers during war
    if (this.profession === 'SOLDIER' && this.state !== HumanState.ATTACKING) {
      if (this.kingdomId) {
        const kingdom = kingdomManager.getKingdom(this.kingdomId);
        if (kingdom && kingdom.isAtWar()) {
          const enemy = this.findNearbyEnemy(entityManager, kingdomManager, 16);
          if (enemy) {
            this.targetEnemyId = enemy.id;
            this.state = HumanState.ATTACKING;
          }
        }
      }
    }

    // 3. State Machine dispatch
    switch (this.state) {
      case HumanState.IDLE:
        this.updateIdle(
          world,
          resourceManager,
          buildingManager,
          settlementManager,
          kingdomManager,
          entityManager,
          animalManager,
          deltaTicks
        );
        break;

      case HumanState.WANDERING:
        this.updateMovement(world, deltaTicks);
        break;

      case HumanState.SEARCHING_RESOURCE:
        this.updateSearching(world, resourceManager);
        break;

      case HumanState.MOVING_TO_RESOURCE:
        this.updateMovementToResource(world, resourceManager, deltaTicks);
        break;

      case HumanState.GATHERING:
        this.updateGathering(resourceManager, deltaTicks);
        break;

      case HumanState.SEARCHING_FOOD:
        this.updateSearchingFood(world, resourceManager, animalManager, deltaTicks);
        break;

      case HumanState.EATING:
        this.updateEatingState(deltaTicks);
        break;

      case HumanState.HUNTING:
        this.updateHunting(world, animalManager, deltaTicks);
        break;

      case HumanState.FARMING:
        this.updateFarming(world, buildingManager, deltaTicks);
        break;

      case HumanState.HERDING:
        this.updateHerding(world, buildingManager, animalManager, deltaTicks);
        break;

      case HumanState.BUILDING:
        this.updateBuilding(buildingManager, deltaTicks);
        break;

      case HumanState.DELIVERING_RESOURCES:
        this.updateDelivering(world, buildingManager, settlementManager, deltaTicks);
        break;

      case HumanState.ATTACKING:
        this.updateAttacking(world, entityManager, diplomacyManager, deltaTicks);
        break;

      case HumanState.PATROLLING:
        this.updatePatrolling(world, settlementManager, deltaTicks);
        break;

      case HumanState.FLEEING:
        this.updateFleeing(world, deltaTicks);
        break;

      case HumanState.SOCIALIZING:
        this.updateSocializing(world, entityManager, deltaTicks);
        break;

      default:
        this.state = HumanState.IDLE;
        break;
    }

    return true; // Still alive
  }

  private updateIdle(
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    settlementManager: SettlementManager,
    kingdomManager: KingdomManager,
    entityManager: EntityManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): void {
    this.stateTimer -= 0.05 * deltaTicks;

    // Reproduction opportunity during idle
    if (
      this.reproductionCooldown <= 0 &&
      this.age >= SIMULATION_CONFIG.reproductionMinAge &&
      this.age <= SIMULATION_CONFIG.reproductionMaxAge
    ) {
      this.tryReproduction(entityManager, world);
    }

    if (this.stateTimer <= 0) {
      // 1. If carrying food and has a settlement, deliver food to storage
      if (this.inventory.food > 0 && this.settlementId) {
        const settlement = settlementManager.getSettlement(this.settlementId);
        if (settlement) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), settlement.x, settlement.y, 80);
          if (path) {
            this.path = path;
            this.state = HumanState.DELIVERING_RESOURCES;
            return;
          }
        }
      }

      // 2. If carrying building supplies and building needs them, go deliver
      if (this.inventory.wood > 0 || this.inventory.stone > 0) {
        const unfinished = buildingManager.findUnfinishedBuilding(this.x, this.y, this.settlementId, true);
        if (unfinished) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), unfinished.x, unfinished.y, 80);
          if (path) {
            this.targetBuildingId = unfinished.id;
            this.path = path;
            this.state = HumanState.DELIVERING_RESOURCES;
            return;
          }
        }
      }

      // 3. HUNTER: track wild animals or carcasses
      if (this.profession === 'HUNTER' && animalManager) {
        const carcass = animalManager.findNearestCarcass(this.x, this.y, 24);
        if (carcass) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), Math.floor(carcass.x), Math.floor(carcass.y), 80);
          if (path) {
            this.targetCarcassId = carcass.id;
            this.path = path;
            this.state = HumanState.HUNTING;
            return;
          }
        }

        const prey = animalManager.findNearestPrey(this.x, this.y, 24);
        if (prey) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), Math.floor(prey.x), Math.floor(prey.y), 80);
          if (path) {
            this.targetAnimalId = prey.id;
            this.path = path;
            this.state = HumanState.HUNTING;
            return;
          }
        }
      }

      // 4. FARMER: work on farm crops
      if (this.profession === 'FARMER') {
        const readyFarm = buildingManager.findFarmReadyForHarvest(this.settlementId);
        let farmToTend = readyFarm;
        if (!farmToTend) {
          for (const b of buildingManager.buildings.values()) {
            if (b.type === 'FARM' && b.isCompleted && (!this.settlementId || b.settlementId === this.settlementId)) {
              farmToTend = b;
              break;
            }
          }
        }
        if (farmToTend) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), farmToTend.x, farmToTend.y, 80);
          if (path) {
            this.targetFarmId = farmToTend.id;
            this.path = path;
            this.state = HumanState.FARMING;
            this.stateTimer = 4;
            return;
          }
        }
      }

      // 5. HERDER: tend animal pen
      if (this.profession === 'HERDER' && animalManager) {
        const pen = buildingManager.findAnimalPen(this.settlementId);
        if (pen) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), pen.x, pen.y, 80);
          if (path) {
            this.targetBuildingId = pen.id;
            this.path = path;
            this.state = HumanState.HERDING;
            this.stateTimer = 4;
            return;
          }
        }
      }

      // 6. If builder, look for building to construct
      if (this.profession === 'BUILDER') {
        const readyBuilding = buildingManager.findUnfinishedBuilding(this.x, this.y, this.settlementId, false);
        if (readyBuilding) {
          const path = Pathfinder.findPath(world, Math.floor(this.x), Math.floor(this.y), readyBuilding.x, readyBuilding.y, 80);
          if (path) {
            this.targetBuildingId = readyBuilding.id;
            this.path = path;
            this.state = HumanState.BUILDING;
            this.stateTimer = 4;
            return;
          }
        }
      }

      // Soldiers patrol
      if (this.profession === 'SOLDIER') {
        this.state = HumanState.PATROLLING;
        this.stateTimer = 3 + Math.random() * 3;
        this.startWandering(world, 10);
        return;
      }

      // Children stay near home/parents
      if (this.lifeStage === 'CHILD') {
        this.startWandering(world, 4);
        return;
      }

      // Hungry civilian searches for food
      if (this.hunger < 50) {
        this.state = HumanState.SEARCHING_FOOD;
        this.stateTimer = 2;
        return;
      }

      // Roll: search resource vs wander
      if (Math.random() < 0.65) {
        this.state = HumanState.SEARCHING_RESOURCE;
      } else {
        this.startWandering(world, 8);
      }
    }
  }

  private tryReproduction(entityManager: EntityManager, world: World): void {
    if (this.reproductionCooldown > 0 || this.isExpecting || this.hunger < 40 || this.health < 40) {
      return;
    }
    // Moderate frequency check so courting doesn't monopolize workers
    if (this.sex !== 'FEMALE' && Math.random() < 0.7) {
      return;
    }

    // Look for partner nearby
    let partner: Human | null = null;

    if (this.partnerId) {
      const p = entityManager.getHuman(this.partnerId);
      if (
        p &&
        p.health > 30 &&
        p.hunger > 30 &&
        p.reproductionCooldown <= 0 &&
        !p.isExpecting &&
        p.state !== HumanState.ATTACKING &&
        p.state !== HumanState.FLEEING &&
        Math.hypot(this.x - p.x, this.y - p.y) <= SIMULATION_CONFIG.reproductionMaxProximity
      ) {
        partner = p;
      }
    } else {
      // Search for opposite sex adult
      for (const other of entityManager.humans.values()) {
        if (
          other.id !== this.id &&
          other.sex !== this.sex &&
          other.lifeStage === 'ADULT' &&
          other.partnerId === null &&
          other.reproductionCooldown <= 0 &&
          !other.isExpecting &&
          other.hunger > 30 &&
          other.health > 30 &&
          other.state !== HumanState.ATTACKING &&
          other.state !== HumanState.FLEEING &&
          !this.parents.includes(other.id) &&
          !this.children.includes(other.id) &&
          (this.settlementId === null || other.settlementId === null || other.settlementId === this.settlementId)
        ) {
          const dist = Math.hypot(this.x - other.x, this.y - other.y);
          if (dist <= SIMULATION_CONFIG.reproductionMaxProximity) {
            partner = other;
            this.partnerId = other.id;
            other.partnerId = this.id;
            break;
          }
        }
      }
    }

    if (partner && Math.random() < SIMULATION_CONFIG.baseConceptionChance) {
      // Initiate longer courting & birth process
      this.state = HumanState.SOCIALIZING;
      partner.state = HumanState.SOCIALIZING;
      this.courtingTargetId = partner.id;
      partner.courtingTargetId = this.id;
      this.isExpecting = true;
      partner.isExpecting = true;
      this.birthTimer = SIMULATION_CONFIG.birthDurationTicks;
      partner.birthTimer = SIMULATION_CONFIG.birthDurationTicks;

      // Both path towards meeting together on the exact same tile
      const curX = Math.floor(this.x);
      const curY = Math.floor(this.y);
      const partX = Math.floor(partner.x);
      const partY = Math.floor(partner.y);

      const pathToMother = Pathfinder.findPath(world, partX, partY, curX, curY, 60);
      if (pathToMother) {
        partner.path = pathToMother;
      }
      this.path = [];
    }
  }

  private updateSocializing(
    world: World,
    entityManager: EntityManager,
    deltaTicks: number
  ): void {
    if (!this.courtingTargetId) {
      this.state = HumanState.IDLE;
      this.isExpecting = false;
      this.birthTimer = 0;
      return;
    }

    const partner = entityManager.getHuman(this.courtingTargetId);
    if (
      !partner ||
      partner.health <= 0 ||
      (partner.state !== HumanState.SOCIALIZING && partner.courtingTargetId !== this.id)
    ) {
      // Partner was lost, died, or interrupted
      this.courtingTargetId = null;
      this.isExpecting = false;
      this.birthTimer = 0;
      this.state = HumanState.IDLE;
      this.stateTimer = 1.5;
      return;
    }

    // Distance calculation between parents
    const dist = Math.hypot(partner.x - this.x, partner.y - this.y);
    const sameTile =
      Math.floor(this.x) === Math.floor(partner.x) &&
      Math.floor(this.y) === Math.floor(partner.y);

    const onExactSamePixel = sameTile && dist <= SIMULATION_CONFIG.samePixelProximityThreshold;

    if (!onExactSamePixel) {
      // Parents must be on the exact same pixel!
      if (dist < 0.6) {
        // Very close - snap to the exact same sub-pixel position
        partner.x = this.x;
        partner.y = this.y;
        this.path = [];
        partner.path = [];
      } else {
        // Move towards partner to meet
        if (this.path.length === 0 || Math.random() < 0.05) {
          const p = Pathfinder.findPath(
            world,
            Math.floor(this.x),
            Math.floor(this.y),
            Math.floor(partner.x),
            Math.floor(partner.y),
            60
          );
          if (p) {
            this.path = p;
          }
        }
        this.stepPath(deltaTicks);
        // While not on the same pixel, birth timer does not progress
        return;
      }
    }

    // Both parents are on the EXACT SAME PIXEL:
    // Face each other and remain synchronized on the pixel
    partner.x = this.x;
    partner.y = this.y;
    if (this.sex === 'FEMALE') {
      this.facing = 'left';
      partner.facing = 'right';
    } else {
      this.facing = 'right';
      partner.facing = 'left';
    }

    // Progress the birth/gestation duration
    this.birthTimer -= deltaTicks;
    partner.birthTimer = this.birthTimer;

    // When the prolonged birth process completes, spawn the baby only if still on the same pixel
    if (this.birthTimer <= 0) {
      const finalDist = Math.hypot(partner.x - this.x, partner.y - this.y);
      const isStillOnSamePixel =
        Math.floor(this.x) === Math.floor(partner.x) &&
        Math.floor(this.y) === Math.floor(partner.y) &&
        finalDist <= SIMULATION_CONFIG.samePixelProximityThreshold;

      if (isStillOnSamePixel && this.sex === 'FEMALE') {
        const babyTileX = Math.floor(this.x);
        const babyTileY = Math.floor(this.y);

        if (world.isWalkable(babyTileX, babyTileY)) {
          const baby = entityManager.addHuman(
            babyTileX,
            babyTileY,
            world,
            undefined,
            0,
            [this.id, partner.id]
          );

          if (baby) {
            // Newborn appears on the exact same pixel
            baby.x = this.x;
            baby.y = this.y;
            baby.settlementId = this.settlementId || partner.settlementId;
            baby.kingdomId = this.kingdomId || partner.kingdomId;

            this.children.push(baby.id);
            partner.children.push(baby.id);

            this.reproductionCooldown = SIMULATION_CONFIG.reproductionCooldownTicks;
            partner.reproductionCooldown = SIMULATION_CONFIG.reproductionCooldownTicks;
          }
        }
      }

      // Finish socialization for this cycle
      this.isExpecting = false;
      partner.isExpecting = false;
      this.courtingTargetId = null;
      partner.courtingTargetId = null;
      this.birthTimer = 0;
      partner.birthTimer = 0;

      this.state = HumanState.IDLE;
      partner.state = HumanState.IDLE;
      this.stateTimer = 2;
      partner.stateTimer = 2;
    }
  }

  private findNearbyEnemy(
    entityManager: EntityManager,
    kingdomManager: KingdomManager,
    maxDistance: number
  ): Human | null {
    if (!this.kingdomId) return null;
    const myKingdom = kingdomManager.getKingdom(this.kingdomId);
    if (!myKingdom) return null;

    let closest: Human | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (const other of entityManager.humans.values()) {
      if (other.id === this.id || other.health <= 0) continue;
      if (!other.kingdomId || other.kingdomId === this.kingdomId) continue;

      if (myKingdom.isAtWarWith(other.kingdomId)) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = other;
        }
      }
    }

    return closest;
  }

  private updateAttacking(
    world: World,
    entityManager: EntityManager,
    diplomacyManager: DiplomacyManager,
    deltaTicks: number
  ): void {
    if (!this.targetEnemyId) {
      this.state = HumanState.IDLE;
      return;
    }

    const enemy = entityManager.getHuman(this.targetEnemyId);
    if (!enemy || enemy.health <= 0) {
      this.targetEnemyId = null;
      this.state = HumanState.IDLE;
      return;
    }

    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
    this.facing = enemy.x > this.x ? 'right' : 'left';

    if (dist <= SIMULATION_CONFIG.attackRange) {
      // In melee range!
      if (this.attackCooldownTimer <= 0) {
        const dmg =
          this.profession === 'SOLDIER'
            ? SIMULATION_CONFIG.soldierDamage
            : SIMULATION_CONFIG.civilianDamage;

        this.isAttackingAnim = 8;
        this.attackCooldownTimer =
          this.profession === 'SOLDIER'
            ? SIMULATION_CONFIG.soldierAttackCooldownTicks
            : SIMULATION_CONFIG.civilianAttackCooldownTicks;

        const died = enemy.takeDamage(dmg, this.id);
        if (died) {
          this.kills++;
          if (enemy.kingdomId) {
            diplomacyManager.recordCasualty(enemy.kingdomId);
          }
          entityManager.removeHuman(enemy.id);
          this.targetEnemyId = null;
          this.state = HumanState.IDLE;
        }
      }
    } else {
      // Path towards enemy
      const curX = Math.floor(this.x);
      const curY = Math.floor(this.y);
      const enemyTileX = Math.floor(enemy.x);
      const enemyTileY = Math.floor(enemy.y);

      if (this.path.length === 0 || Math.random() < 0.08) {
        const path = Pathfinder.findPath(world, curX, curY, enemyTileX, enemyTileY, 60);
        if (path) {
          this.path = path;
        } else {
          // Cannot reach enemy
          this.targetEnemyId = null;
          this.state = HumanState.IDLE;
          return;
        }
      }

      this.stepPath(deltaTicks);
    }
  }

  private updateBuilding(buildingManager: BuildingManager, deltaTicks: number): void {
    if (!this.targetBuildingId) {
      this.state = HumanState.IDLE;
      return;
    }

    const building = buildingManager.getBuilding(this.targetBuildingId);
    if (!building || building.isCompleted) {
      this.targetBuildingId = null;
      this.state = HumanState.IDLE;
      return;
    }

    this.stateTimer -= 0.05 * deltaTicks;
    this.buildProgress = Math.sin(this.stateTimer * 6) * 0.5 + 0.5;

    // Advance labor
    building.advanceWork(0.015 * deltaTicks);

    if (building.isCompleted || this.stateTimer <= 0) {
      this.targetBuildingId = null;
      this.state = HumanState.IDLE;
      this.buildProgress = 0;
      this.stateTimer = 1.5;
    }
  }

  private updateDelivering(
    world: World,
    buildingManager: BuildingManager,
    settlementManager: SettlementManager,
    deltaTicks: number
  ): void {
    // Deliver food to settlement warehouse
    if (this.inventory.food > 0 && this.settlementId) {
      const settlement = settlementManager.getSettlement(this.settlementId);
      if (settlement) {
        const dist = Math.hypot(this.x - settlement.x, this.y - settlement.y);
        if (dist <= 2.5 || this.path.length === 0) {
          settlement.depositFood(this.inventory.food);
          this.inventory.food = 0;
          this.state = HumanState.IDLE;
          this.stateTimer = 1.2;
          return;
        } else {
          this.stepPath(deltaTicks);
          return;
        }
      }
    }

    if (!this.targetBuildingId) {
      this.state = HumanState.IDLE;
      return;
    }

    const building = buildingManager.getBuilding(this.targetBuildingId);
    if (!building || building.isCompleted) {
      this.targetBuildingId = null;
      this.state = HumanState.IDLE;
      return;
    }

    const dist = Math.hypot(this.x - (building.x + building.width / 2), this.y - (building.y + building.height / 2));

    if (dist <= 2.2 || this.path.length === 0) {
      // Deliver materials!
      if (this.inventory.wood > 0) {
        const delivered = building.deliverWood(this.inventory.wood);
        this.inventory.wood -= delivered;
      }
      if (this.inventory.stone > 0) {
        const delivered = building.deliverStone(this.inventory.stone);
        this.inventory.stone -= delivered;
      }

      this.targetBuildingId = null;
      this.state = HumanState.IDLE;
      this.stateTimer = 1;
    } else {
      this.stepPath(deltaTicks);
    }
  }

  private updateSearchingFood(
    world: World,
    resourceManager: ResourceManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): void {
    const curX = Math.floor(this.x);
    const curY = Math.floor(this.y);

    // 1. Look for nearby berry bushes with berries
    const bush = resourceManager.findNearestBerryBush(curX, curY, true, 20);
    if (bush) {
      const dist = Math.hypot(this.x - (bush.x + 0.5), this.y - (bush.y + 0.5));
      if (dist <= 1.5) {
        const harvested = resourceManager.harvestBerryBush(bush.id, 2);
        if (harvested > 0) {
          this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_CONFIG.nutrition.BERRIES);
          this.inventory.food += Math.max(0, harvested - 1);
          this.state = HumanState.EATING;
          this.stateTimer = 2;
          this.eatingAnimTimer = 20;
          return;
        }
      } else {
        if (this.path.length === 0 || Math.random() < 0.05) {
          const path = Pathfinder.findPath(world, curX, curY, bush.x, bush.y, 60);
          if (path) {
            this.path = path;
          }
        }
        this.stepPath(deltaTicks);
        return;
      }
    }

    // 2. Look for nearby animal carcasses to scavenge meat
    if (animalManager) {
      const carcass = animalManager.findNearestCarcass(curX, curY, 20);
      if (carcass) {
        const dist = Math.hypot(this.x - carcass.x, this.y - carcass.y);
        if (dist <= 1.5) {
          const meat = animalManager.harvestCarcass(carcass.id, 2);
          if (meat > 0) {
            this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_CONFIG.nutrition.MEAT);
            this.inventory.food += Math.max(0, meat - 1);
            this.state = HumanState.EATING;
            this.stateTimer = 2;
            this.eatingAnimTimer = 20;
            return;
          }
        } else {
          if (this.path.length === 0 || Math.random() < 0.05) {
            const path = Pathfinder.findPath(world, curX, curY, Math.floor(carcass.x), Math.floor(carcass.y), 60);
            if (path) {
              this.path = path;
            }
          }
          this.stepPath(deltaTicks);
          return;
        }
      }
    }

    // If nothing found immediately, wander or forage
    this.startWandering(world, 6);
  }

  private updateEatingState(deltaTicks: number): void {
    this.stateTimer -= 0.05 * deltaTicks;
    if (this.stateTimer <= 0) {
      // If carrying remaining food and belonging to a settlement, go deliver surplus
      if (this.inventory.food > 0 && this.settlementId) {
        this.state = HumanState.DELIVERING_RESOURCES;
      } else {
        this.state = HumanState.IDLE;
        this.stateTimer = 1;
      }
    }
  }

  private updateHunting(
    world: World,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): void {
    if (!animalManager) {
      this.state = HumanState.IDLE;
      return;
    }

    // 1. If targeting a carcass: move to harvest it
    if (this.targetCarcassId) {
      const carcass = animalManager.carcasses.get(this.targetCarcassId);
      if (!carcass) {
        this.targetCarcassId = null;
        this.state = HumanState.IDLE;
        return;
      }

      const dist = Math.hypot(this.x - carcass.x, this.y - carcass.y);
      if (dist <= 1.5) {
        const meat = animalManager.harvestCarcass(carcass.id, 3);
        if (meat > 0) {
          this.inventory.food += meat;
          this.targetCarcassId = null;
          if (this.hunger < 50) {
            this.inventory.food--;
            this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_CONFIG.nutrition.MEAT);
            this.state = HumanState.EATING;
            this.stateTimer = 1.5;
            this.eatingAnimTimer = 20;
          } else {
            this.state = HumanState.DELIVERING_RESOURCES;
          }
          return;
        }
      } else {
        this.stepPath(deltaTicks);
        return;
      }
    }

    // 2. If targeting an animal: hunt it!
    if (this.targetAnimalId) {
      const animal = animalManager.getAnimal(this.targetAnimalId);
      if (!animal || animal.health <= 0) {
        // Animal died or escaped; check if carcass dropped nearby
        const carcass = animalManager.findNearestCarcass(this.x, this.y, 6);
        if (carcass) {
          this.targetCarcassId = carcass.id;
          this.targetAnimalId = null;
          return;
        }
        this.targetAnimalId = null;
        this.state = HumanState.IDLE;
        return;
      }

      const dist = Math.hypot(this.x - animal.x, this.y - animal.y);
      this.facing = animal.x > this.x ? 'right' : 'left';

      // Hunter combat range (ranged bow or spear strike)
      if (dist <= FOOD_CONFIG.hunter.attackRange) {
        if (this.attackCooldownTimer <= 0) {
          this.isAttackingAnim = 8;
          this.attackCooldownTimer = FOOD_CONFIG.hunter.attackCooldownTicks;
          const died = animal.takeDamage(FOOD_CONFIG.hunter.damage, this.id);
          if (died) {
            animalManager.onAnimalDied(animal);
            const carcass = animalManager.findNearestCarcass(this.x, this.y, 6);
            if (carcass) {
              this.targetCarcassId = carcass.id;
            }
            this.targetAnimalId = null;
          }
        }
      } else {
        // Step path towards animal
        const curX = Math.floor(this.x);
        const curY = Math.floor(this.y);
        const targetTileX = Math.floor(animal.x);
        const targetTileY = Math.floor(animal.y);

        if (this.path.length === 0 || Math.random() < 0.1) {
          const path = Pathfinder.findPath(world, curX, curY, targetTileX, targetTileY, 60);
          if (path) {
            this.path = path;
          }
        }
        this.stepPath(deltaTicks);
      }
      return;
    }

    this.state = HumanState.IDLE;
  }

  private updateFarming(
    world: World,
    buildingManager: BuildingManager,
    deltaTicks: number = 1
  ): void {
    if (!this.targetFarmId) {
      this.state = HumanState.IDLE;
      return;
    }

    const farm = buildingManager.getBuilding(this.targetFarmId);
    if (!farm || farm.type !== 'FARM' || !farm.isCompleted) {
      this.targetFarmId = null;
      this.state = HumanState.IDLE;
      return;
    }

    const dist = Math.hypot(this.x - (farm.x + farm.width / 2), this.y - (farm.y + farm.height / 2));
    if (dist <= 2.2 || this.path.length === 0) {
      // At farm: harvest or tend crops
      if (farm.cropStage === 'READY') {
        const yieldAmount = farm.harvestCrops();
        if (yieldAmount > 0) {
          this.inventory.food += yieldAmount;
          this.targetFarmId = null;
          this.state = HumanState.DELIVERING_RESOURCES;
          return;
        }
      } else {
        // Tending crops (advances growth slightly faster with farmer care)
        farm.updateFarm(0.008 * deltaTicks);
        this.stateTimer -= 0.05 * deltaTicks;
        if (this.stateTimer <= 0) {
          this.targetFarmId = null;
          this.state = HumanState.IDLE;
          this.stateTimer = 1;
        }
      }
    } else {
      this.stepPath(deltaTicks);
    }
  }

  private updateHerding(
    world: World,
    buildingManager: BuildingManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): void {
    if (!animalManager || !this.settlementId) {
      this.state = HumanState.IDLE;
      return;
    }

    const pen = buildingManager.findAnimalPen(this.settlementId);
    if (!pen) {
      this.state = HumanState.IDLE;
      return;
    }

    const dist = Math.hypot(this.x - (pen.x + pen.width / 2), this.y - (pen.y + pen.height / 2));
    if (dist <= 2.5 || this.path.length === 0) {
      // 1. Check if pen has domestic animals
      const domesticAnimals = animalManager.findDomesticAnimals(this.settlementId, pen.id);

      // Overpopulation in pen: slaughter 1 for meat!
      if (domesticAnimals.length >= 6) {
        const oldestAnimal = domesticAnimals.reduce((prev, curr) => (curr.age > prev.age ? curr : prev), domesticAnimals[0]);
        const meat = animalManager.slaughterAnimal(oldestAnimal.id);
        if (meat > 0) {
          this.inventory.food += meat;
          this.state = HumanState.DELIVERING_RESOURCES;
          return;
        }
      }

      // 2. Look for wild docile animal nearby to domesticate
      const wildAnimal = animalManager.findNearestAnimal(this.x, this.y, null, 14);
      if (wildAnimal && !wildAnimal.isDomesticated && (wildAnimal.species === 'CHICKEN' || wildAnimal.species === 'COW' || wildAnimal.species === 'BOAR')) {
        wildAnimal.isDomesticated = true;
        wildAnimal.ownerSettlementId = this.settlementId;
        wildAnimal.penId = pen.id;
        wildAnimal.targetX = pen.x + 1.5;
        wildAnimal.targetY = pen.y + 1.5;
        wildAnimal.state = 'IDLE';
      }

      this.state = HumanState.IDLE;
      this.stateTimer = 2;
    } else {
      this.stepPath(deltaTicks);
    }
  }

  private updatePatrolling(world: World, settlementManager: SettlementManager, deltaTicks: number): void {
    this.stateTimer -= 0.05 * deltaTicks;
    if (this.stateTimer <= 0) {
      this.state = HumanState.IDLE;
      this.stateTimer = 1;
      return;
    }
    this.stepPath(deltaTicks);
  }

  private updateFleeing(world: World, deltaTicks: number): void {
    this.stateTimer -= 0.05 * deltaTicks;
    if (this.stateTimer <= 0) {
      this.state = HumanState.IDLE;
      return;
    }
    this.stepPath(deltaTicks);
  }

  private startWandering(world: World, maxRadius: number = 8): void {
    const curX = Math.floor(this.x);
    const curY = Math.floor(this.y);

    for (let attempts = 0; attempts < 10; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * (maxRadius - 2);
      const tx = Math.floor(curX + Math.cos(angle) * dist);
      const ty = Math.floor(curY + Math.sin(angle) * dist);

      if (world.isWalkable(tx, ty)) {
        const foundPath = Pathfinder.findPath(world, curX, curY, tx, ty, 80);
        if (foundPath && foundPath.length > 0) {
          this.path = foundPath;
          this.targetX = tx;
          this.targetY = ty;
          this.state = HumanState.WANDERING;
          return;
        }
      }
    }

    this.state = HumanState.IDLE;
    this.stateTimer = 1 + Math.random() * 1.5;
  }

  private updateSearching(world: World, resourceManager: ResourceManager): void {
    const curX = Math.floor(this.x);
    const curY = Math.floor(this.y);

    const typeFilter =
      this.profession === 'WOODCUTTER'
        ? ResourceType.TREE
        : this.profession === 'MINER'
        ? ResourceType.STONE
        : null;

    const nearestRes = resourceManager.findNearestResource(curX, curY, typeFilter, 24);

    if (nearestRes) {
      const path = Pathfinder.findPath(world, curX, curY, nearestRes.x, nearestRes.y, 100);
      if (path) {
        this.targetResourceId = nearestRes.id;
        this.path = path;
        this.state = HumanState.MOVING_TO_RESOURCE;
        return;
      }
    }

    this.startWandering(world, 8);
  }

  private updateMovementToResource(world: World, resourceManager: ResourceManager, deltaTicks: number): void {
    if (this.path.length === 0) {
      if (this.targetResourceId) {
        const res = resourceManager.resources.get(this.targetResourceId);
        if (res) {
          const distToRes = Math.hypot(this.x - (res.x + 0.5), this.y - (res.y + 0.5));
          if (distToRes <= 1.6) {
            this.state = HumanState.GATHERING;
            this.stateTimer = 2.5;
            this.gatherProgress = 0;
            this.facing = res.x + 0.5 > this.x ? 'right' : 'left';
            return;
          }
        }
      }

      this.state = HumanState.IDLE;
      this.stateTimer = 1.5 + Math.random() * 2;
      return;
    }

    this.stepPath(deltaTicks);
  }

  private updateMovement(world: World, deltaTicks: number): void {
    if (this.path.length === 0) {
      this.state = HumanState.IDLE;
      this.stateTimer = 1.5 + Math.random() * 2;
      return;
    }
    this.stepPath(deltaTicks);
  }

  private stepPath(deltaTicks: number): void {
    if (this.path.length === 0) return;

    const nextWaypoint = this.path[0];
    const targetCenterX = nextWaypoint.x + 0.5;
    const targetCenterY = nextWaypoint.y + 0.5;

    const dx = targetCenterX - this.x;
    const dy = targetCenterY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dx !== 0) {
      this.facing = dx > 0 ? 'right' : 'left';
    }

    const step = this.moveSpeed * deltaTicks;

    if (dist <= step) {
      this.x = targetCenterX;
      this.y = targetCenterY;
      this.path.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.walkFrame += 0.2 * deltaTicks;
    }
  }

  private updateGathering(resourceManager: ResourceManager, deltaTicks: number): void {
    if (!this.targetResourceId) {
      this.state = HumanState.IDLE;
      return;
    }

    const res = resourceManager.resources.get(this.targetResourceId);
    if (!res) {
      this.targetResourceId = null;
      this.state = HumanState.IDLE;
      this.stateTimer = 1;
      return;
    }

    this.stateTimer -= 0.05 * deltaTicks;
    this.gatherProgress = Math.min(1, 1 - this.stateTimer / 2.5);

    if (this.stateTimer <= 0) {
      const { harvested } = resourceManager.harvestResource(this.targetResourceId, 1);
      if (harvested > 0) {
        if (res.type === ResourceType.TREE) {
          this.inventory.wood += harvested;
        } else {
          this.inventory.stone += harvested;
        }
      }

      this.targetResourceId = null;
      this.state = HumanState.IDLE;
      this.stateTimer = 1 + Math.random() * 2;
      this.gatherProgress = 0;
    }
  }

  private rescueToLand(world: World): void {
    const curX = Math.floor(this.x);
    const curY = Math.floor(this.y);

    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = curX + dx;
          const ny = curY + dy;
          if (world.isWalkable(nx, ny)) {
            this.x = nx + 0.5;
            this.y = ny + 0.5;
            this.path = [];
            this.state = HumanState.IDLE;
            return;
          }
        }
      }
    }
  }
}
