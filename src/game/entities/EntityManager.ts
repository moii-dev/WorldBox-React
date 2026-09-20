import { Human } from './Human';
import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';
import { Sex } from '../types';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { AnimalManager } from './AnimalManager';

export class EntityManager {
  public humans: Map<string, Human> = new Map();
  public selectedHumanId: string | null = null;
  public maxPopulation: number = Number.POSITIVE_INFINITY;

  constructor() {}

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
    // Only allow placing human on walkable land
    if (!world.isWalkable(tileX, tileY)) {
      return null;
    }

    const human = new Human(tileX, tileY, sex, age, parents);
    this.humans.set(human.id, human);
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

    for (const human of this.humans.values()) {
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

    for (const human of this.humans.values()) {
      if (human.health <= 0) continue;
      const distSq = (human.x - fromX) ** 2 + (human.y - fromY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = human;
      }
    }

    return closest;
  }

  public killHuman(id: string, world?: World): void {
    const human = this.humans.get(id);
    if (!human) return;
    human.health = 0;
    this.removeHuman(id);
  }

  public update(
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    settlementManager: SettlementManager,
    kingdomManager: KingdomManager,
    diplomacyManager: DiplomacyManager,
    animalManager?: AnimalManager,
    deltaTicks: number = 1
  ): void {
    const deadIds: string[] = [];

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
        deltaTicks
      );

      if (!alive) {
        deadIds.push(human.id);
      }
    }

    // Clean up dead humans
    for (const id of deadIds) {
      this.removeHuman(id);
    }
  }

  public clear(): void {
    this.humans.clear();
    this.selectedHumanId = null;
  }
}
