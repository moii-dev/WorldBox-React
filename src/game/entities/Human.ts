import {
  HumanEntity,
  HumanState,
  Inventory,
  ResourceType,
  Sex,
  LifeStage,
  Profession,
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

  public homeId: string | null = null;
  public settlementId: string | null = null;
  public kingdomId: string | null = null;
  public partnerId: string | null = null;
  public parents: string[] = [];
  public children: string[] = [];

  public kills: number = 0;
  public attackCooldownTimer: number = 0;
  public reproductionCooldown: number = 0;
  public isAttackingAnim: number = 0;
  public hitFlashTimer: number = 0;

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
    if (this.lifeStage === 'CHILD') return this.baseSpeed * 0.75;
    if (this.lifeStage === 'ELDER') return this.baseSpeed * 0.8;
    if (this.profession === 'SOLDIER') return this.baseSpeed * 1.1;
    return this.baseSpeed;
  }

  private calculateLifeStage(age: number): LifeStage {
    if (age <= SIMULATION_CONFIG.childAgeMax) return 'CHILD';
    if (age <= SIMULATION_CONFIG.teenAgeMax) return 'TEEN';
    if (age <= SIMULATION_CONFIG.adultAgeMax) return 'ADULT';
    return 'ELDER';
  }

  public takeDamage(amount: number, attackerId?: string): boolean {
    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 6; // visual damage flash frames

    if (this.health <= 0) {
      return true; // died
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
    deltaTicks: number = 1
  ): boolean {
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

    // Cooldown timers
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTicks;
    if (this.isAttackingAnim > 0) this.isAttackingAnim -= deltaTicks;
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
    deltaTicks: number
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
      // If carrying building supplies and building needs them, go deliver
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

      // If builder, look for building to construct
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

      // Roll: search resource vs wander
      if (Math.random() < 0.65) {
        this.state = HumanState.SEARCHING_RESOURCE;
      } else {
        this.startWandering(world, 8);
      }
    }
  }

  private tryReproduction(entityManager: EntityManager, world: World): void {
    // Look for partner nearby
    let partner: Human | null = null;

    if (this.partnerId) {
      const p = entityManager.getHuman(this.partnerId);
      if (p && p.health > 0 && Math.hypot(this.x - p.x, this.y - p.y) <= SIMULATION_CONFIG.reproductionMaxProximity) {
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
          !this.parents.includes(other.id) &&
          !this.children.includes(other.id) &&
          (this.settlementId === null || other.settlementId === this.settlementId)
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
      // Spawn newborn baby!
      const babyX = Math.floor(this.x);
      const babyY = Math.floor(this.y);
      if (world.isWalkable(babyX, babyY)) {
        const baby = entityManager.addHuman(babyX, babyY, world, undefined, 0, [this.id, partner.id]);
        if (baby) {
          baby.settlementId = this.settlementId;
          baby.kingdomId = this.kingdomId;
          this.children.push(baby.id);
          partner.children.push(baby.id);

          this.reproductionCooldown = SIMULATION_CONFIG.reproductionCooldownTicks;
          partner.reproductionCooldown = SIMULATION_CONFIG.reproductionCooldownTicks;
        }
      }
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
