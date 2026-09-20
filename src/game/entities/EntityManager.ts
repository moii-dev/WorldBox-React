import { Human } from './Human';
import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';
import { DeathCause, Sex } from '../types';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { AnimalManager } from './AnimalManager';

export class EntityManager {
  public humans: Map<string, Human> = new Map();
  public selectedHumanId: string | null = null;
  public maxPopulation: number = Number.POSITIVE_INFINITY;
  /** Runtime ceiling used only for newborns; manual placement still uses maxPopulation. */
  public dynamicPopulationCap: number = Number.POSITIVE_INFINITY;
  private buckets: Map<string, Set<string>> = new Map();
  private readonly bucketSize = 16;
  private deathListeners = new Set<(cause: DeathCause) => void>();
  private birthListeners = new Set<() => void>();
  private deepDecisionCursor = 0;

  constructor() {}

  public onHumanDeath(listener: (cause: DeathCause) => void): () => void {
    this.deathListeners.add(listener);
    return () => this.deathListeners.delete(listener);
  }

  public onHumanBirth(listener: () => void): () => void {
    this.birthListeners.add(listener);
    return () => this.birthListeners.delete(listener);
  }

  private getBucketKey(x: number, y: number): string {
    return `${Math.floor(x / this.bucketSize)}_${Math.floor(y / this.bucketSize)}`;
  }

  private rebuildBuckets(): void {
    this.buckets.clear();
    for (const human of this.humans.values()) {
      const key = this.getBucketKey(human.x, human.y);
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = new Set();
        this.buckets.set(key, bucket);
      }
      bucket.add(human.id);
    }
  }

  private nearbyHumans(x: number, y: number, distance: number): Iterable<Human> {
    const result: Human[] = [];
    const minX = Math.floor((x - distance) / this.bucketSize);
    const maxX = Math.floor((x + distance) / this.bucketSize);
    const minY = Math.floor((y - distance) / this.bucketSize);
    const maxY = Math.floor((y + distance) / this.bucketSize);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        const bucket = this.buckets.get(`${bx}_${by}`);
        if (!bucket) continue;
        for (const id of bucket) {
          const human = this.humans.get(id);
          if (human) result.push(human);
        }
      }
    }
    return result;
  }

  public getHumansNear(x: number, y: number, distance: number): Human[] {
    return Array.from(this.nearbyHumans(x, y, distance));
  }

  private addToBucket(human: Human): void {
    const key = this.getBucketKey(human.x, human.y);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new Set();
      this.buckets.set(key, bucket);
    }
    bucket.add(human.id);
  }

  public get population(): number {
    return this.humans.size;
  }

  public get childrenCount(): number {
    let count = 0;
    for (const h of this.humans.values()) {
      if (h.lifeStage === 'CHILD') count++;
    }
    return count;
  }

  public get adultsCount(): number {
    let count = 0;
    for (const h of this.humans.values()) {
      if (h.lifeStage === 'ADULT' || h.lifeStage === 'TEEN') count++;
    }
    return count;
  }

  public get eldersCount(): number {
    let count = 0;
    for (const h of this.humans.values()) {
      if (h.lifeStage === 'ELDER') count++;
    }
    return count;
  }

  public get soldiersCount(): number {
    let count = 0;
    for (const h of this.humans.values()) {
      if (h.profession === 'SOLDIER') count++;
    }
    return count;
  }

  public addHuman(
    tileX: number,
    tileY: number,
    world: World,
    sex?: Sex,
    age?: number,
    parents?: string[]
  ): Human | null {
    if (this.population >= this.maxPopulation) {
      return null;
    }
    if (age === 0 && parents?.length && this.population >= this.dynamicPopulationCap) {
      return null;
    }
    // Only allow placing human on walkable land
    if (!world.isWalkable(tileX, tileY)) {
      return null;
    }

    const human = new Human(tileX, tileY, sex, age, parents);
    this.humans.set(human.id, human);
    this.addToBucket(human);
    if (age === 0 && parents?.length) {
      this.birthListeners.forEach((listener) => listener());
    }
    return human;
  }

  public createHuman(
    tileX: number,
    tileY: number,
    sex?: Sex,
    age?: number,
    parents?: string[]
  ): Human {
    const human = new Human(tileX, tileY, sex, age, parents);
    this.humans.set(human.id, human);
    this.addToBucket(human);
    return human;
  }

  public removeHuman(id: string): boolean {
    if (this.selectedHumanId === id) {
      this.selectedHumanId = null;
    }
    return this.humans.delete(id);
  }

  public getHuman(id: string): Human | undefined {
    return this.humans.get(id);
  }

  public getHumans(): Human[] {
    return Array.from(this.humans.values());
  }

  public getSelectedHuman(): Human | null {
    if (!this.selectedHumanId) return null;
    return this.humans.get(this.selectedHumanId) || null;
  }

  public selectHuman(id: string | null): void {
    this.selectedHumanId = id;
  }

  public findHumanAt(worldX: number, worldY: number, tolerance: number = 0.8): Human | null {
    let closest: Human | null = null;
    let minDistSq = tolerance * tolerance;

    for (const human of this.nearbyHumans(worldX, worldY, tolerance)) {
      const dx = human.x - worldX;
      const dy = human.y - worldY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = human;
      }
    }

    return closest;
  }

  public findNearestHuman(fromX: number, fromY: number, maxDistance: number = 16): Human | null {
    let closest: Human | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (const human of this.nearbyHumans(fromX, fromY, maxDistance)) {
      if (human.health <= 0) continue;
      const distSq = (human.x - fromX) ** 2 + (human.y - fromY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = human;
      }
    }

    return closest;
  }

  public killHuman(id: string, cause: DeathCause = 'PLAYER_INTERVENTION'): boolean {
    const human = this.humans.get(id);
    if (!human) return false;
    human.health = 0;
    const removed = this.removeHuman(id);
    if (removed) this.deathListeners.forEach((listener) => listener(cause));
    return removed;
  }

  /**
   * Apply damage and immediately remove a human who dies.
   * Keeping this in the manager prevents zero-health humans from staying in the world
   * after damage from powers, fire, or animals.
   */
  public damageHuman(id: string, amount: number, attackerId?: string, cause: DeathCause = 'COMBAT'): boolean {
    const human = this.humans.get(id);
    if (!human) return false;

    const died = human.takeDamage(amount, attackerId);
    if (died) {
      this.killHuman(id, cause);
    }
    return died;
  }

  public update(
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    settlementManager: SettlementManager,
    kingdomManager: KingdomManager,
    diplomacyManager: DiplomacyManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1,
    hungerMultiplier: number = 1
  ): void {
    const deadIds: string[] = [];
    this.rebuildBuckets();
    const throttleDecisions = this.population > 240;
    const deepDecisionIds = new Set<string>();
    if (throttleDecisions) {
      const ids = Array.from(this.humans.keys());
      const budget = Math.min(30, ids.length);
      for (let i = 0; i < budget; i++) {
        deepDecisionIds.add(ids[(this.deepDecisionCursor + i) % ids.length]);
      }
      this.deepDecisionCursor = (this.deepDecisionCursor + budget) % Math.max(1, ids.length);
    }

    for (const human of this.humans.values()) {
      const alive = human.update(
        world,
        resourceManager,
        buildingManager,
        settlementManager,
        kingdomManager,
        diplomacyManager,
        this,
        animalManager,
        deltaTicks,
        !throttleDecisions || deepDecisionIds.has(human.id),
        hungerMultiplier
      );

      if (!alive) {
        deadIds.push(human.id);
      }
    }

    // Clean up dead humans
    for (const id of deadIds) {
      const human = this.humans.get(id);
      this.killHuman(id, human?.deathCause ?? 'STARVATION');
    }
  }

  public clear(): void {
    this.humans.clear();
    this.buckets.clear();
    this.selectedHumanId = null;
  }
}
