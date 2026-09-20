import { World } from '../world/World';
import { TileType } from '../types';
import { ResourceManager } from '../resources/ResourceManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { EntityManager } from '../entities/EntityManager';
import { AnimalManager } from '../entities/AnimalManager';

export interface FireCell {
  index: number;
  x: number;
  y: number;
  fuel: number;
  maxFuel: number;
  intensity: number;
  isNapalm?: boolean;
}

export class FireSystem {
  private fires: Map<number, FireCell> = new Map();
  private spreadTimer: number = 0;

  public get activeFireCount(): number {
    return this.fires.size;
  }

  public getActiveFires(): FireCell[] {
    return Array.from(this.fires.values());
  }

  public isBurning(x: number, y: number, world: World): boolean {
    if (!world.isInBounds(x, y)) return false;
    return this.fires.has(world.getIndex(x, y));
  }

  /**
   * Check if a tile type is flammable
   */
  public isTileFlammable(type: TileType): boolean {
    return (
      type === TileType.FOREST ||
      type === TileType.LAND ||
      type === TileType.SWAMP
    );
  }

  /**
   * Ignite a specific tile
   */
  public igniteTile(
    x: number,
    y: number,
    world: World,
    resourceManager?: ResourceManager,
    isNapalm: boolean = false
  ): boolean {
    if (!world.isInBounds(x, y)) return false;

    const idx = world.getIndex(x, y);
    if (this.fires.has(idx)) {
      // Re-fuel existing fire
      const cell = this.fires.get(idx)!;
      cell.fuel = Math.max(cell.fuel, isNapalm ? 350 : 200);
      return false;
    }

    const tileType = world.tiles[idx];
    if (tileType === TileType.WATER || tileType === TileType.SHALLOW_WATER) {
      return false;
    }

    // Snow melts into land when ignited
    if (tileType === TileType.SNOW) {
      world.setTileDirect(x, y, TileType.LAND, 0.55);
      return false;
    }

    const hasResource = resourceManager ? !!resourceManager.getResourceAt(x, y) : false;
    const isFlammable = this.isTileFlammable(tileType) || hasResource || isNapalm;

    if (!isFlammable && !isNapalm) {
      return false;
    }

    let fuel = 150;
    if (tileType === TileType.FOREST) fuel = 260;
    else if (tileType === TileType.SWAMP) fuel = 180;
    else if (tileType === TileType.LAND) fuel = 120;
    if (isNapalm) fuel *= 1.8;

    this.fires.set(idx, {
      index: idx,
      x,
      y,
      fuel,
      maxFuel: fuel,
      intensity: isNapalm ? 2.5 : tileType === TileType.FOREST ? 2.0 : 1.0,
      isNapalm,
    });

    return true;
  }

  /**
   * Ignite an area with radius
   */
  public igniteArea(
    cx: number,
    cy: number,
    radius: number,
    world: World,
    resourceManager?: ResourceManager,
    isNapalm: boolean = false
  ): number {
    let count = 0;
    const rInt = Math.ceil(radius);
    const rSq = radius * radius;

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          const tx = Math.floor(cx + dx);
          const ty = Math.floor(cy + dy);
          if (this.igniteTile(tx, ty, world, resourceManager, isNapalm)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  /**
   * Extinguish an area (used by heal rain, freeze, water)
   */
  public extinguishArea(cx: number, cy: number, radius: number, world: World): number {
    let extinguished = 0;
    const rInt = Math.ceil(radius);
    const rSq = radius * radius;

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          const tx = Math.floor(cx + dx);
          const ty = Math.floor(cy + dy);
          if (world.isInBounds(tx, ty)) {
            const idx = world.getIndex(tx, ty);
            if (this.fires.delete(idx)) {
              extinguished++;
            }
          }
        }
      }
    }
    return extinguished;
  }

  /**
   * Clear all fires
   */
  public clear(): void {
    this.fires.clear();
  }

  /**
   * Simulation update loop
   */
  public update(
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    deltaTicks: number = 1
  ): void {
    if (this.fires.size === 0) return;

    this.spreadTimer += deltaTicks;
    const shouldCheckSpread = this.spreadTimer >= 4;
    if (shouldCheckSpread) {
      this.spreadTimer = 0;
    }

    const toRemove: number[] = [];
    const newIgnitions: { x: number; y: number; isNapalm: boolean }[] = [];

    // Cardinal + diagonal neighbor offsets
    const neighbors = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
    ];

    for (const fire of this.fires.values()) {
      fire.fuel -= deltaTicks;

      // 1. Fire damage to creatures on this tile
      if (Math.random() < 0.25 * deltaTicks) {
        // Humans
        for (const human of entityManager.humans.values()) {
          const distSq = (human.x - (fire.x + 0.5)) ** 2 + (human.y - (fire.y + 0.5)) ** 2;
          if (distSq < 1.2) {
            entityManager.damageHuman(human.id, 12);
          }
        }
        // Animals
        if (animalManager) {
          for (const animal of animalManager.animals.values()) {
            const distSq = (animal.x - (fire.x + 0.5)) ** 2 + (animal.y - (fire.y + 0.5)) ** 2;
            if (distSq < 1.2) {
              animal.takeDamage(15, undefined, animalManager);
            }
          }
        }
      }

      // 2. Fire damage to buildings
      if (buildingManager && Math.random() < 0.15 * deltaTicks) {
        for (const bld of buildingManager.buildings.values()) {
          if (
            fire.x >= bld.x &&
            fire.x < bld.x + bld.width &&
            fire.y >= bld.y &&
            fire.y < bld.y + bld.height
          ) {
            bld.health = (bld.health ?? bld.maxHealth ?? 100) - 8;
            bld.onFireTimer = 5;
            if (bld.health <= 0) {
              buildingManager.demolishBuilding(bld.id, world);
            }
          }
        }
      }

      // 3. Fire spread logic
      if (shouldCheckSpread) {
        const spreadChance = fire.isNapalm ? 0.08 : 0.035;
        if (Math.random() < spreadChance) {
          const n = neighbors[Math.floor(Math.random() * neighbors.length)];
          const nx = fire.x + n.dx;
          const ny = fire.y + n.dy;
          if (world.isInBounds(nx, ny)) {
            const nIdx = world.getIndex(nx, ny);
            if (!this.fires.has(nIdx)) {
              const nType = world.tiles[nIdx];
              const nRes = resourceManager.getResourceAt(nx, ny);
              if (this.isTileFlammable(nType) || nRes || fire.isNapalm) {
                newIgnitions.push({ x: nx, y: ny, isNapalm: !!fire.isNapalm });
              }
            }
          }
        }
      }

      // 4. Burned out
      if (fire.fuel <= 0) {
        toRemove.push(fire.index);

        // Consume tree or bush resource
        const res = resourceManager.getResourceAt(fire.x, fire.y);
        if (res && (res.type === 'TREE' || res.type === 'BERRY_BUSH')) {
          resourceManager.removeResource(res.id);
        }

        // Transform dense forest to charred plains
        const tileType = world.tiles[fire.index];
        if (tileType === TileType.FOREST) {
          world.setTileDirect(fire.x, fire.y, TileType.LAND, 0.52);
        }
      }
    }

    // Apply removals
    for (const idx of toRemove) {
      this.fires.delete(idx);
    }

    // Apply spread ignitions (limit per tick to prevent infinite flood)
    const maxNewIgnitions = 15;
    for (let i = 0; i < Math.min(newIgnitions.length, maxNewIgnitions); i++) {
      const ign = newIgnitions[i];
      this.igniteTile(ign.x, ign.y, world, resourceManager, ign.isNapalm);
    }
  }
}
