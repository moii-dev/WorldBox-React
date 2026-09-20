import {
  AnimalEntity,
  AnimalSpecies,
  AnimalState,
  Sex,
  TileType,
} from '../types';
import { World } from '../world/World';
import { FOOD_CONFIG } from '../FoodConfig';
import { AnimalManager } from './AnimalManager';
import { EntityManager } from './EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';

export class Animal implements AnimalEntity {
  public id: string;
  public species: AnimalSpecies;
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public health: number;
  public maxHealth: number;
  public hunger: number;
  public age: number;
  public sex: Sex;
  public state: AnimalState;
  public speed: number;
  public damage: number;
  public attackCooldown: number;
  public attackTimer: number = 0;
  public isDomesticated: boolean;
  public ownerSettlementId: string | null;
  public penId: string | null;
  public fearOfHumans: number = 0;

  public get assignedPenId(): string | null {
    return this.penId;
  }
  public set assignedPenId(val: string | null) {
    this.penId = val;
  }

  public groupId: string | null;
  public facing: 'left' | 'right' = 'right';
  public walkFrame: number = 0;
  public hitFlashTimer: number = 0;
  public attackAnimTimer: number = 0;
  public reproductionCooldown: number = 0;
  public stateTimer: number = 0;
  public targetEntityId: string | null = null;
  public path: { x: number; y: number }[] = [];
  public divineShieldTimer: number = 0;
  public frozenTimer: number = 0;

  constructor(
    id: string,
    species: AnimalSpecies,
    x: number,
    y: number,
    sex?: Sex,
    isDomesticated: boolean = false,
    ownerSettlementId: string | null = null,
    penId: string | null = null
  ) {
    const spec = FOOD_CONFIG.species[species];
    this.id = id;
    this.species = species;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.maxHealth = spec.maxHealth;
    this.health = spec.maxHealth;
    this.hunger = 70 + Math.random() * 30; // Starts well fed
    this.age = 2 + Math.floor(Math.random() * 4);
    this.sex = sex || (Math.random() < 0.5 ? 'MALE' : 'FEMALE');
    this.state = 'IDLE';
    this.speed = spec.speed;
    this.damage = spec.damage;
    this.attackCooldown = spec.attackCooldown;
    this.isDomesticated = isDomesticated;
    this.ownerSettlementId = ownerSettlementId;
    this.penId = penId;
    this.groupId = null;
    this.stateTimer = Math.floor(Math.random() * 40);
  }

  public takeDamage(amount: number, attackerId?: string, animalManager?: AnimalManager): boolean {
    if (this.divineShieldTimer > 0) {
      this.hitFlashTimer = 4;
      return false; // Immune with divine shield!
    }
    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 6;

    if (this.health <= 0) {
      if (animalManager) {
        animalManager.onAnimalDied(this);
      }
      return true;
    }

    if (attackerId) {
      // Retaliate or flee
      if (this.species === 'BOAR' || this.species === 'WOLF') {
        this.targetEntityId = attackerId;
        this.state = 'ATTACKING';
      } else {
        this.state = 'FLEEING';
        this.stateTimer = 60;
      }
    }

    return false;
  }

  public update(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    tickCount: number
  ): void {
    // If animal has 0 HP, it must die and be removed immediately
    if (this.health <= 0) {
      animalManager.onAnimalDied(this);
      return;
    }

    // Divine status timers
    if (this.divineShieldTimer > 0) {
      this.divineShieldTimer = Math.max(0, this.divineShieldTimer - 0.04);
    }
    if (this.frozenTimer > 0) {
      this.frozenTimer = Math.max(0, this.frozenTimer - 0.04);
      return; // Frozen solid! Cannot move or act
    }

    // Aging: increment age every 100 ticks (1 game year)
    if (tickCount % 100 === 0) {
      this.age++;
    }

    // Hunger decay
    this.hunger = Math.max(0, this.hunger - 0.025);
    if (this.hunger <= 0) {
      this.health = Math.max(0, this.health - 0.1);
      if (this.health <= 0) {
        animalManager.onAnimalDied(this);
        return;
      }
    }

    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
    }
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer--;
    }
    if (this.attackTimer > 0) {
      this.attackTimer--;
    }

    // Throttled high-level AI decisions
    if (this.stateTimer > 0) {
      this.stateTimer--;
    }

    // State Machine Dispatch
    switch (this.state) {
      case 'IDLE':
        this.updateIdle(world, animalManager, entityManager);
        break;
      case 'WANDERING':
        this.updateWandering(world, animalManager, entityManager);
        break;
      case 'SEARCHING_FOOD':
        this.updateSearchingFood(world, animalManager);
        break;
      case 'EATING':
        this.updateEating();
        break;
      case 'FLEEING':
        this.updateFleeing(world, animalManager, entityManager);
        break;
      case 'CHASING':
        this.updateChasing(world, animalManager, entityManager);
        break;
      case 'ATTACKING':
        this.updateAttacking(world, animalManager, entityManager);
        break;
      case 'MATING':
        this.updateMating(animalManager);
        break;
      case 'FOLLOWING_HERDER':
      case 'RETURNING_TO_HERD':
      case 'RESTING':
      default:
        this.updateIdle(world, animalManager, entityManager);
        break;
    }

    // Move along path or towards targetX, targetY
    this.moveTowardsTarget(world);
  }

  private updateIdle(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): void {
    // Check for predators or threats
    if (this.checkPredatorThreats(world, animalManager, entityManager)) {
      return;
    }

    // Predators look for prey
    if (this.species === 'WOLF' && this.hunger < 75) {
      const prey = animalManager.findNearestPrey(this.x, this.y, 12);
      if (prey) {
        this.targetEntityId = prey.id;
        this.state = 'CHASING';
        this.targetX = prey.x;
        this.targetY = prey.y;
        return;
      }

      // Or lone human
      const human = entityManager.findNearestHuman(this.x, this.y, 9);
      if (human && human.health < 40) {
        this.targetEntityId = human.id;
        this.state = 'CHASING';
        this.targetX = human.x;
        this.targetY = human.y;
        return;
      }
    }

    // Hunger check: look for food / graze
    if (this.hunger < 50) {
      this.state = 'SEARCHING_FOOD';
      this.stateTimer = 40;
      return;
    }

    // Mating check
    if (
      this.hunger > 60 &&
      this.reproductionCooldown <= 0 &&
      this.age >= 2 &&
      this.sex === 'FEMALE' &&
      Math.random() < 0.05
    ) {
      const mate = animalManager.findNearbyMate(this);
      if (mate) {
        this.targetEntityId = mate.id;
        mate.targetEntityId = this.id;
        this.state = 'MATING';
        mate.state = 'MATING';
        this.stateTimer = 120; // Longer birth / mating process
        mate.stateTimer = 120;
        return;
      }
    }

    // Transition from idle to wander
    if (this.stateTimer <= 0) {
      this.pickWanderTarget(world);
      this.state = 'WANDERING';
      this.stateTimer = 50 + Math.floor(Math.random() * 50);
    }
  }

  private updateWandering(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): void {
    if (this.checkPredatorThreats(world, animalManager, entityManager)) {
      return;
    }

    const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    if (distToTarget < 0.6 || this.stateTimer <= 0) {
      this.state = 'IDLE';
      this.stateTimer = 30 + Math.floor(Math.random() * 40);
    }
  }

  private updateSearchingFood(world: World, animalManager: AnimalManager): void {
    // Carnivores seek carcasses or prey
    if (this.species === 'WOLF') {
      const carcass = animalManager.findNearestCarcass(this.x, this.y, 14);
      if (carcass) {
        this.targetX = carcass.x;
        this.targetY = carcass.y;
        const dist = Math.hypot(carcass.x - this.x, carcass.y - this.y);
        if (dist < 1.0) {
          animalManager.harvestCarcass(carcass.id, 1);
          this.hunger = Math.min(100, this.hunger + FOOD_CONFIG.nutrition.MEAT);
          this.state = 'EATING';
          this.stateTimer = 25;
          return;
        }
      } else {
        // Switch to chasing live prey
        this.state = 'IDLE';
      }
      return;
    }

    // Herbivores: graze on current tile if land/forest/plains
    const tile = world.getTile(Math.floor(this.x), Math.floor(this.y));
    if (tile === TileType.LAND || tile === TileType.FOREST) {
      this.state = 'EATING';
      this.stateTimer = 30;
      this.hunger = Math.min(100, this.hunger + 30);
    } else {
      this.pickWanderTarget(world);
      this.state = 'WANDERING';
    }
  }

  private updateEating(): void {
    if (this.stateTimer <= 0) {
      this.state = 'IDLE';
      this.stateTimer = 40;
    }
  }

  private updateFleeing(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): void {
    // Fast sprint away from threat
    if (this.stateTimer <= 0) {
      this.state = 'IDLE';
      this.stateTimer = 30;
    }
  }

  private updateChasing(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): void {
    if (!this.targetEntityId) {
      this.state = 'IDLE';
      return;
    }

    // Check animal prey
    const preyAnimal = animalManager.getAnimal(this.targetEntityId);
    if (preyAnimal && preyAnimal.health > 0) {
      this.targetX = preyAnimal.x;
      this.targetY = preyAnimal.y;
      const dist = Math.hypot(preyAnimal.x - this.x, preyAnimal.y - this.y);

      // Prey notices and flees!
      if (preyAnimal.state !== 'FLEEING') {
        preyAnimal.state = 'FLEEING';
        preyAnimal.stateTimer = 60;
        const dx = preyAnimal.x - this.x;
        const dy = preyAnimal.y - this.y;
        preyAnimal.targetX = Math.max(2, Math.min(world.width - 3, preyAnimal.x + dx * 2));
        preyAnimal.targetY = Math.max(2, Math.min(world.height - 3, preyAnimal.y + dy * 2));
      }

      if (dist < 1.2) {
        this.state = 'ATTACKING';
      }
      return;
    }

    // Check human target
    const human = entityManager.getHuman(this.targetEntityId);
    if (human && human.health > 0) {
      this.targetX = human.x;
      this.targetY = human.y;
      const dist = Math.hypot(human.x - this.x, human.y - this.y);
      if (dist < 1.2) {
        this.state = 'ATTACKING';
      }
      return;
    }

    // Target lost or dead
    this.targetEntityId = null;
    this.state = 'IDLE';
  }

  private updateAttacking(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): void {
    if (!this.targetEntityId) {
      this.state = 'IDLE';
      return;
    }

    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackCooldown;
      this.attackAnimTimer = 8;

      // Attack target animal
      const prey = animalManager.getAnimal(this.targetEntityId);
      if (prey && prey.health > 0) {
        const killed = prey.takeDamage(this.damage, this.id, animalManager);
        if (killed || prey.health <= 0) {
          animalManager.onAnimalDied(prey);
          this.hunger = Math.min(100, this.hunger + FOOD_CONFIG.nutrition.MEAT);
          this.targetEntityId = null;
          this.state = 'EATING';
          this.stateTimer = 35;
          return;
        }
      }

      // Attack target human
      const human = entityManager.getHuman(this.targetEntityId);
      if (human && human.health > 0) {
        if (entityManager.damageHuman(human.id, this.damage, this.id)) {
          this.targetEntityId = null;
          this.state = 'IDLE';
          return;
        }
      }
    }

    this.state = 'CHASING';
  }

  private updateMating(animalManager: AnimalManager): void {
    const mate = this.targetEntityId ? animalManager.getAnimal(this.targetEntityId) : null;
    if (!mate || mate.health <= 0) {
      this.state = 'IDLE';
      this.stateTimer = 20;
      this.targetEntityId = null;
      return;
    }

    const dist = Math.hypot(mate.x - this.x, mate.y - this.y);
    const sameTile =
      Math.floor(this.x) === Math.floor(mate.x) &&
      Math.floor(this.y) === Math.floor(mate.y);

    const onExactSamePixel = sameTile && dist <= 0.25;

    if (!onExactSamePixel) {
      // Must reach the exact same pixel
      this.targetX = mate.x;
      this.targetY = mate.y;
      if (dist < 0.5) {
        mate.x = this.x;
        mate.y = this.y;
      }
      return; // Do not advance birth timer until on the same pixel
    }

    // Keep locked together on same pixel while mating / giving birth
    mate.x = this.x;
    mate.y = this.y;
    this.stateTimer--;

    if (this.stateTimer <= 0) {
      const spec = FOOD_CONFIG.species[this.species];
      this.reproductionCooldown = spec.reproductionCooldown;
      mate.reproductionCooldown = spec.reproductionCooldown;
      animalManager.spawnOffspring(this);
      this.state = 'IDLE';
      this.stateTimer = 30;
      this.targetEntityId = null;
      mate.state = 'IDLE';
      mate.stateTimer = 30;
      mate.targetEntityId = null;
    }
  }

  private checkPredatorThreats(
    world: World,
    animalManager: AnimalManager,
    entityManager: EntityManager
  ): boolean {
    if (this.species === 'WOLF') return false; // Wolves don't flee easily

    // Deer & Chickens flee from humans and wolves
    const fleeDist = this.species === 'DEER' ? 6.5 : 4.0;
    const wolf = animalManager.findNearestPredator(this.x, this.y, fleeDist + 2);
    const human = !this.isDomesticated
      ? entityManager.findNearestHuman(this.x, this.y, fleeDist)
      : null;

    const threat = wolf || human;
    if (threat) {
      const dx = this.x - threat.x;
      const dy = this.y - threat.y;
      const len = Math.hypot(dx, dy) || 1;

      this.targetX = Math.max(2, Math.min(world.width - 3, this.x + (dx / len) * 8));
      this.targetY = Math.max(2, Math.min(world.height - 3, this.y + (dy / len) * 8));
      this.state = 'FLEEING';
      this.stateTimer = 45;
      return true;
    }

    return false;
  }

  private pickWanderTarget(world: World): void {
    const range = this.isDomesticated ? 3 : 8;
    for (let attempts = 0; attempts < 6; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * range;
      const tx = Math.floor(this.x + Math.cos(angle) * dist);
      const ty = Math.floor(this.y + Math.sin(angle) * dist);

      if (world.isWalkable(tx, ty)) {
        this.targetX = tx + 0.5;
        this.targetY = ty + 0.5;
        return;
      }
    }
  }

  private moveTowardsTarget(world: World): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.25) {
      return;
    }

    const currentSpeed =
      this.state === 'FLEEING' || this.state === 'CHASING'
        ? FOOD_CONFIG.species[this.species].runSpeed
        : this.speed;

    const step = Math.min(dist, currentSpeed);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;

    if (world.isWalkable(Math.floor(nx), Math.floor(ny))) {
      this.x = nx;
      this.y = ny;
      this.facing = dx >= 0 ? 'right' : 'left';
      this.walkFrame = (this.walkFrame + 0.15) % 4;
    } else {
      // Obstructed: pick a new wander target next time
      this.targetX = this.x;
      this.targetY = this.y;
    }
  }
}
