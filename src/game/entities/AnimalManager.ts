import { AnimalSpecies, CarcassEntity, Sex, TileType } from '../types';
import { World } from '../world/World';
import { FOOD_CONFIG } from '../FoodConfig';
import { Animal } from './Animal';
import { EntityManager } from './EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';

export class AnimalManager {
  public animals: Map<string, Animal> = new Map();
  public carcasses: Map<string, CarcassEntity> = new Map();
  public selectedAnimalId: string | null = null;

  // Spatial hash buckets for fast proximity lookups
  private buckets: Map<string, Set<string>> = new Map();
  private carcassBuckets: Map<string, Set<string>> = new Map();
  private readonly bucketSize: number = 16;

  private nextAnimalId: number = 1;
  private nextCarcassId: number = 1;
  private spawnTimer: number = 0;

  constructor() {}

  private getBucketKey(worldX: number, worldY: number): string {
    const bx = Math.floor(worldX / this.bucketSize);
    const by = Math.floor(worldY / this.bucketSize);
    return `${bx}_${by}`;
  }

  public addAnimal(
    species: AnimalSpecies,
    x: number,
    y: number,
    sex?: Sex,
    isDomesticated: boolean = false,
    ownerSettlementId: string | null = null,
    penId: string | null = null
  ): Animal {
    const id = `animal_${this.nextAnimalId++}`;
    const animal = new Animal(
      id,
      species,
      x,
      y,
      sex,
      isDomesticated,
      ownerSettlementId,
      penId
    );

    this.animals.set(id, animal);

    const bKey = this.getBucketKey(x, y);
    if (!this.buckets.has(bKey)) {
      this.buckets.set(bKey, new Set());
    }
    this.buckets.get(bKey)!.add(id);

    return animal;
  }

  public createAnimal(
    species: AnimalSpecies,
    x: number,
    y: number,
    sex?: Sex,
    isDomesticated: boolean = false,
    ownerSettlementId: string | null = null,
    penId: string | null = null
  ): Animal {
    return this.addAnimal(species, x, y, sex, isDomesticated, ownerSettlementId, penId);
  }

  public removeAnimal(id: string): boolean {
    const animal = this.animals.get(id);
    if (!animal) return false;

    this.animals.delete(id);
    const bKey = this.getBucketKey(animal.x, animal.y);
    const bucket = this.buckets.get(bKey);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) {
        this.buckets.delete(bKey);
      }
    }

    if (this.selectedAnimalId === id) {
      this.selectedAnimalId = null;
    }

    return true;
  }

  public getAnimal(id: string): Animal | undefined {
    return this.animals.get(id);
  }

  public getAnimals(): Animal[] {
    return Array.from(this.animals.values());
  }

  public selectAnimal(id: string | null): void {
    this.selectedAnimalId = id;
  }

  public getSelectedAnimal(): Animal | null {
    if (!this.selectedAnimalId) return null;
    return this.animals.get(this.selectedAnimalId) || null;
  }

  public onAnimalDied(animal: Animal): void {
    if (!this.animals.has(animal.id)) return;
    animal.health = 0;
    const spec = FOOD_CONFIG.species[animal.species];
    this.spawnCarcass(animal.species, animal.x, animal.y, spec.meatYield);
    this.removeAnimal(animal.id);
  }

  public killAnimal(animalOrId: Animal | string): void {
    const animal = typeof animalOrId === 'string' ? this.getAnimal(animalOrId) : animalOrId;
    if (animal) {
      this.onAnimalDied(animal);
    }
  }

  public spawnInitialEcosystem(world: World): void {
    // Populate the newly generated world with initial wildlife packs
    for (let i = 0; i < 6; i++) {
      this.spawnEcosystemAnimals(world);
    }
  }

  public spawnCarcass(
    species: AnimalSpecies,
    x: number,
    y: number,
    meatAmount: number
  ): CarcassEntity {
    const id = `carcass_${this.nextCarcassId++}`;
    const carcass: CarcassEntity = {
      id,
      species,
      x,
      y,
      meatAmount,
      decay: FOOD_CONFIG.carcass.maxDecay,
      maxDecay: FOOD_CONFIG.carcass.maxDecay,
    };

    this.carcasses.set(id, carcass);

    const bKey = this.getBucketKey(x, y);
    if (!this.carcassBuckets.has(bKey)) {
      this.carcassBuckets.set(bKey, new Set());
    }
    this.carcassBuckets.get(bKey)!.add(id);

    return carcass;
  }

  public removeCarcass(id: string): boolean {
    const carcass = this.carcasses.get(id);
    if (!carcass) return false;

    this.carcasses.delete(id);
    const bKey = this.getBucketKey(carcass.x, carcass.y);
    const bucket = this.carcassBuckets.get(bKey);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) {
        this.carcassBuckets.delete(bKey);
      }
    }

    return true;
  }

  public harvestCarcass(id: string, amount: number = 1): number {
    const carcass = this.carcasses.get(id);
    if (!carcass) return 0;

    const harvested = Math.min(carcass.meatAmount, amount);
    carcass.meatAmount -= harvested;

    if (carcass.meatAmount <= 0) {
      this.removeCarcass(id);
    }

    return harvested;
  }

  public slaughterAnimal(animalId: string): number {
    const animal = this.animals.get(animalId);
    if (!animal) return 0;

    const spec = FOOD_CONFIG.species[animal.species];
    const meat = spec.meatYield;
    this.removeAnimal(animalId);
    return meat;
  }

  public spawnOffspring(parent: Animal): Animal | null {
    const child = this.addAnimal(
      parent.species,
      parent.x,
      parent.y,
      Math.random() < 0.5 ? 'MALE' : 'FEMALE',
      parent.isDomesticated,
      parent.ownerSettlementId,
      parent.penId
    );
    child.age = 0;
    child.health = Math.round(parent.maxHealth * 0.5);
    child.reproductionCooldown = FOOD_CONFIG.species[parent.species].reproductionCooldown * 2;
    return child;
  }

  public findNearbyMate(animal: Animal): Animal | null {
    const spec = FOOD_CONFIG.species[animal.species];
    const maxDistSq = spec.matingDistance * spec.matingDistance;

    for (const other of this.animals.values()) {
      if (
        other.id !== animal.id &&
        other.species === animal.species &&
        other.sex !== animal.sex &&
        other.age >= 2 &&
        other.hunger > 50 &&
        other.reproductionCooldown <= 0 &&
        other.isDomesticated === animal.isDomesticated
      ) {
        const distSq = (other.x - animal.x) ** 2 + (other.y - animal.y) ** 2;
        if (distSq < maxDistSq) {
          return other;
        }
      }
    }
    return null;
  }

  public findAnimalAt(worldX: number, worldY: number, radius: number = 1.2): Animal | null {
    let closest: Animal | null = null;
    let minDistSq = radius * radius;

    for (const animal of this.animals.values()) {
      const distSq = (animal.x - worldX) ** 2 + (animal.y - worldY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = animal;
      }
    }
    return closest;
  }

  public findNearestAnimal(
    fromX: number,
    fromY: number,
    filterSpecies: AnimalSpecies | null = null,
    maxDistance: number = 32
  ): Animal | null {
    let nearest: Animal | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (const animal of this.animals.values()) {
      if (filterSpecies && animal.species !== filterSpecies) continue;

      const distSq = (animal.x - fromX) ** 2 + (animal.y - fromY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = animal;
      }
    }
    return nearest;
  }

  public findNearestPrey(fromX: number, fromY: number, maxDistance: number = 16): Animal | null {
    let nearest: Animal | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (const animal of this.animals.values()) {
      if (animal.species === 'WOLF') continue; // Wolves don't hunt wolves

      const distSq = (animal.x - fromX) ** 2 + (animal.y - fromY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = animal;
      }
    }
    return nearest;
  }

  public findNearestPredator(fromX: number, fromY: number, maxDistance: number = 12): Animal | null {
    return this.findNearestAnimal(fromX, fromY, 'WOLF', maxDistance);
  }

  public findNearestCarcass(fromX: number, fromY: number, maxDistance: number = 20): CarcassEntity | null {
    let nearest: CarcassEntity | null = null;
    let minDistSq = maxDistance * maxDistance;

    for (const carcass of this.carcasses.values()) {
      const distSq = (carcass.x - fromX) ** 2 + (carcass.y - fromY) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = carcass;
      }
    }
    return nearest;
  }

  public findDomesticAnimals(settlementId: string, penId: string | null = null): Animal[] {
    const list: Animal[] = [];
    for (const a of this.animals.values()) {
      if (a.isDomesticated && a.ownerSettlementId === settlementId) {
        if (!penId || a.penId === penId) {
          list.push(a);
        }
      }
    }
    return list;
  }

  public update(
    world: World,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    tickCount: number
  ): void {
    // 1. Update Spatial Buckets for animals
    this.buckets.clear();
    for (const animal of this.animals.values()) {
      const bKey = this.getBucketKey(animal.x, animal.y);
      if (!this.buckets.has(bKey)) {
        this.buckets.set(bKey, new Set());
      }
      this.buckets.get(bKey)!.add(animal.id);
    }

    // 2. Update individual animal logic
    for (const animal of Array.from(this.animals.values())) {
      if (animal.health <= 0) {
        this.onAnimalDied(animal);
        continue;
      }
      animal.update(world, this, entityManager, buildingManager, tickCount);
    }

    // 3. Update Carcasses decay
    for (const carcass of Array.from(this.carcasses.values())) {
      carcass.decay -= FOOD_CONFIG.carcass.decayRate;
      if (carcass.decay <= 0) {
        this.removeCarcass(carcass.id);
      }
    }

    // 4. Natural Ecosystem Spawner (spawns wild animals in suitable biomes if population is below cap)
    this.spawnTimer++;
    if (this.spawnTimer >= FOOD_CONFIG.ecosystemSpawnIntervalTicks) {
      this.spawnTimer = 0;
      this.spawnEcosystemAnimals(world);
    }
  }

  private spawnEcosystemAnimals(world: World): void {
    if (world.totalLandTiles < 30) return;

    // Count wild species
    const counts: Record<AnimalSpecies, number> = {
      DEER: 0,
      BOAR: 0,
      WOLF: 0,
      CHICKEN: 0,
      COW: 0,
    };

    for (const a of this.animals.values()) {
      if (!a.isDomesticated) {
        counts[a.species]++;
      }
    }

    const speciesList: AnimalSpecies[] = ['DEER', 'BOAR', 'WOLF', 'CHICKEN', 'COW'];

    for (const sp of speciesList) {
      const spec = FOOD_CONFIG.species[sp];
      if (counts[sp] < spec.popCap) {
        // Try spawning a cluster/pack or single animal
        const clusterSize = sp === 'DEER' || sp === 'WOLF' ? 2 : 1;

        for (let attempt = 0; attempt < 8; attempt++) {
          const rx = Math.floor(Math.random() * world.width);
          const ry = Math.floor(Math.random() * world.height);
          const tile = world.getTile(rx, ry);

          // Biome affinities
          const isSuitable =
            world.isWalkable(rx, ry) &&
            (tile === TileType.LAND ||
              tile === TileType.FOREST ||
              tile === TileType.SWAMP);

          if (isSuitable) {
            for (let c = 0; c < clusterSize; c++) {
              const ox = rx + (Math.random() - 0.5) * 2;
              const oy = ry + (Math.random() - 0.5) * 2;
              if (world.isWalkable(Math.floor(ox), Math.floor(oy))) {
                this.addAnimal(sp, ox + 0.5, oy + 0.5);
              }
            }
            break;
          }
        }
      }
    }
  }

  public clear(): void {
    this.animals.clear();
    this.carcasses.clear();
    this.buckets.clear();
    this.carcassBuckets.clear();
    this.selectedAnimalId = null;
  }
}
