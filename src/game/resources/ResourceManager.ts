import { ResourceNode, ResourceType, TileType } from '../types';
import { World } from '../world/World';
import { FOOD_CONFIG } from '../FoodConfig';

export class ResourceManager {
  public resources: Map<string, ResourceNode> = new Map();
  // Spatial hash: bucketKey -> Set of resource IDs
  private buckets: Map<string, Set<string>> = new Map();
  private readonly bucketSize: number = 16;

  public treeCount: number = 0;
  public stoneCount: number = 0;
  public berryBushCount: number = 0;

  private nextId: number = 1;
  private growthTimer: number = 0;

  constructor() {}

  private getBucketKey(tileX: number, tileY: number): string {
    const bx = Math.floor(tileX / this.bucketSize);
    const by = Math.floor(tileY / this.bucketSize);
    return `${bx}_${by}`;
  }

  public getResourceAt(tileX: number, tileY: number): ResourceNode | null {
    const key = this.getBucketKey(tileX, tileY);
    const ids = this.buckets.get(key);
    if (!ids) return null;

    for (const id of ids) {
      const res = this.resources.get(id);
      if (res && res.x === tileX && res.y === tileY) {
        return res;
      }
    }
    return null;
  }

  public hasResourceAt(tileX: number, tileY: number): boolean {
    return this.getResourceAt(tileX, tileY) !== null;
  }

  public removeResourceAt(tileX: number, tileY: number): boolean {
    const res = this.getResourceAt(tileX, tileY);
    if (res) {
      return this.removeResource(res.id);
    }
    return false;
  }

  public addResource(
    type: ResourceType,
    x: number,
    y: number,
    variantOverride?: number
  ): ResourceNode | null {
    if (this.getResourceAt(x, y)) {
      return null; // Already occupied
    }

    const id = `res_${this.nextId++}`;
    const variant = variantOverride !== undefined ? variantOverride : Math.floor(Math.random() * 4);
    let maxAmount = type === ResourceType.TREE ? 5 : 8;
    let foodAmount: number | undefined;
    let maxFood: number | undefined;
    let regenRate: number | undefined;

    if (type === ResourceType.BERRY_BUSH) {
      maxAmount = FOOD_CONFIG.berryBush.maxFood;
      foodAmount = FOOD_CONFIG.berryBush.initialFood;
      maxFood = FOOD_CONFIG.berryBush.maxFood;
      regenRate = FOOD_CONFIG.berryBush.regenRate;
    }

    const node: ResourceNode = {
      id,
      type,
      x,
      y,
      variant,
      amount: foodAmount !== undefined ? foodAmount : maxAmount,
      maxAmount,
      foodAmount,
      maxFood,
      regenerationRate: regenRate,
    };

    this.resources.set(id, node);

    const bKey = this.getBucketKey(x, y);
    if (!this.buckets.has(bKey)) {
      this.buckets.set(bKey, new Set());
    }
    this.buckets.get(bKey)!.add(id);

    if (type === ResourceType.TREE) {
      this.treeCount++;
    } else if (type === ResourceType.STONE) {
      this.stoneCount++;
    } else if (type === ResourceType.BERRY_BUSH) {
      this.berryBushCount++;
    }

    return node;
  }

  public addBerryBush(x: number, y: number, initialFood?: number): ResourceNode | null {
    const node = this.addResource(ResourceType.BERRY_BUSH, x, y);
    if (node && initialFood !== undefined) {
      node.foodAmount = initialFood;
      node.amount = initialFood;
      node.berryCount = initialFood;
    }
    return node;
  }

  public addTree(x: number, y: number, amount?: number): ResourceNode | null {
    const node = this.addResource(ResourceType.TREE, x, y);
    if (node && amount !== undefined) {
      node.amount = amount;
      node.maxAmount = amount;
    }
    return node;
  }

  public addStone(x: number, y: number, amount?: number): ResourceNode | null {
    const node = this.addResource(ResourceType.STONE, x, y);
    if (node && amount !== undefined) {
      node.amount = amount;
      node.maxAmount = amount;
    }
    return node;
  }

  public findNearby(x: number, y: number, radius: number): ResourceNode[] {
    const result: ResourceNode[] = [];
    const minBx = Math.floor((x - radius) / this.bucketSize);
    const maxBx = Math.floor((x + radius) / this.bucketSize);
    const minBy = Math.floor((y - radius) / this.bucketSize);
    const maxBy = Math.floor((y + radius) / this.bucketSize);
    const radiusSq = radius * radius;

    for (let by = minBy; by <= maxBy; by++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        const bucket = this.buckets.get(`${bx}_${by}`);
        if (!bucket) continue;
        for (const id of bucket) {
          const res = this.resources.get(id);
          if (!res) continue;
          const dx = res.x - x;
          const dy = res.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            result.push(res);
          }
        }
      }
    }
    return result;
  }

  public removeResource(id: string): boolean {
    const res = this.resources.get(id);
    if (!res) return false;

    this.resources.delete(id);
    const bKey = this.getBucketKey(res.x, res.y);
    const bucket = this.buckets.get(bKey);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) {
        this.buckets.delete(bKey);
      }
    }

    if (res.type === ResourceType.TREE) {
      this.treeCount = Math.max(0, this.treeCount - 1);
    } else if (res.type === ResourceType.STONE) {
      this.stoneCount = Math.max(0, this.stoneCount - 1);
    } else if (res.type === ResourceType.BERRY_BUSH) {
      this.berryBushCount = Math.max(0, this.berryBushCount - 1);
    }

    return true;
  }

  public harvestResource(id: string, amount: number = 1): { harvested: number; depleted: boolean } {
    const res = this.resources.get(id);
    if (!res) return { harvested: 0, depleted: true };

    if (res.type === ResourceType.BERRY_BUSH) {
      return { harvested: this.harvestBerryBush(id, amount), depleted: false };
    }

    const actualHarvest = Math.min(res.amount, amount);
    res.amount -= actualHarvest;

    const depleted = res.amount <= 0;
    if (depleted) {
      this.removeResource(id);
    }

    return { harvested: actualHarvest, depleted };
  }

  /**
   * Harvest berries from a berry bush without destroying the bush entity
   */
  public harvestBerryBush(id: string, amount: number = 1): number {
    const res = this.resources.get(id);
    if (!res || res.type !== ResourceType.BERRY_BUSH) return 0;

    const currentFood = res.foodAmount ?? res.amount;
    const harvested = Math.min(currentFood, amount);
    const remaining = Math.max(0, currentFood - harvested);
    res.foodAmount = remaining;
    res.amount = remaining;
    return harvested;
  }

  /**
   * Fast spatial query for the nearest berry bush, optionally requiring available berries
   */
  public findNearestBerryBush(
    fromX: number,
    fromY: number,
    mustHaveFood: boolean = true,
    maxSearchDistance: number = 32
  ): ResourceNode | null {
    const minBx = Math.floor((fromX - maxSearchDistance) / this.bucketSize);
    const maxBx = Math.floor((fromX + maxSearchDistance) / this.bucketSize);
    const minBy = Math.floor((fromY - maxSearchDistance) / this.bucketSize);
    const maxBy = Math.floor((fromY + maxSearchDistance) / this.bucketSize);

    let nearest: ResourceNode | null = null;
    let minDistanceSq = maxSearchDistance * maxSearchDistance;

    for (let by = minBy; by <= maxBy; by++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        const bucket = this.buckets.get(`${bx}_${by}`);
        if (!bucket) continue;

        for (const id of bucket) {
          const res = this.resources.get(id);
          if (!res || res.type !== ResourceType.BERRY_BUSH) continue;
          if (mustHaveFood && ((res.foodAmount ?? res.amount) <= 0)) continue;

          const dx = res.x - fromX;
          const dy = res.y - fromY;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            nearest = res;
          }
        }
      }
    }

    return nearest;
  }

  /**
   * Fast spatial query for the nearest resource around (x, y)
   */
  public findNearestResource(
    fromX: number,
    fromY: number,
    filterType: ResourceType | null = null,
    maxSearchDistance: number = 32
  ): ResourceNode | null {
    const minBx = Math.floor((fromX - maxSearchDistance) / this.bucketSize);
    const maxBx = Math.floor((fromX + maxSearchDistance) / this.bucketSize);
    const minBy = Math.floor((fromY - maxSearchDistance) / this.bucketSize);
    const maxBy = Math.floor((fromY + maxSearchDistance) / this.bucketSize);

    let nearest: ResourceNode | null = null;
    let minDistanceSq = maxSearchDistance * maxSearchDistance;

    for (let by = minBy; by <= maxBy; by++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        const bucket = this.buckets.get(`${bx}_${by}`);
        if (!bucket) continue;

        for (const id of bucket) {
          const res = this.resources.get(id);
          if (!res) continue;
          if (filterType && res.type !== filterType) continue;

          const dx = res.x - fromX;
          const dy = res.y - fromY;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            nearest = res;
          }
        }
      }
    }

    return nearest;
  }

  /**
   * Query resources in viewport or area for efficient rendering
   */
  public getResourcesInArea(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): ResourceNode[] {
    const result: ResourceNode[] = [];
    const minBx = Math.floor(minX / this.bucketSize);
    const maxBx = Math.floor(maxX / this.bucketSize);
    const minBy = Math.floor(minY / this.bucketSize);
    const maxBy = Math.floor(maxY / this.bucketSize);

    for (let by = minBy; by <= maxBy; by++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        const bucket = this.buckets.get(`${bx}_${by}`);
        if (!bucket) continue;

        for (const id of bucket) {
          const res = this.resources.get(id);
          if (res && res.x >= minX && res.x <= maxX && res.y >= minY && res.y <= maxY) {
            result.push(res);
          }
        }
      }
    }

    return result;
  }

  /**
   * Natural gradual resource generation across land biomes
   */
  public updateNaturalGrowth(world: World): void {
    if (world.totalLandTiles < 10) return;

    this.growthTimer++;
    if (this.growthTimer < 3) return;
    this.growthTimer = 0;

    const attempts = Math.min(12, Math.ceil(world.totalLandTiles / 180));

    for (let i = 0; i < attempts; i++) {
      const rx = Math.floor(Math.random() * world.width);
      const ry = Math.floor(Math.random() * world.height);

      const tile = world.getTile(rx, ry);
      if (!world.isWalkable(rx, ry)) continue;
      if (tile === TileType.SAND) continue; // Keep beaches clean

      // Check if spot already occupied
      if (this.getResourceAt(rx, ry)) continue;

      // Check local density: count resources in 5x5 radius
      const nearbyRes = this.getResourcesInArea(rx - 2, ry - 2, rx + 2, ry + 2);
      const densityLimit = tile === TileType.FOREST ? 4 : 2;
      if (nearbyRes.length >= densityLimit) {
        continue;
      }

      if (tile === TileType.FOREST) {
        // Trees and berry bushes in forests
        const rand = Math.random();
        if (rand < 0.75) {
          this.addResource(ResourceType.TREE, rx, ry, Math.floor(Math.random() * 3));
        } else if (this.berryBushCount < FOOD_CONFIG.berryBush.maxGlobalBushes) {
          this.addResource(ResourceType.BERRY_BUSH, rx, ry);
        }
      } else if (tile === TileType.MOUNTAIN) {
        // 85% stone boulders in mountains
        this.addResource(ResourceType.STONE, rx, ry);
      } else if (tile === TileType.SNOW) {
        // Frosted pine trees or snowy stone
        if (Math.random() < 0.5) {
          this.addResource(ResourceType.TREE, rx, ry, 3); // Variant 3 is snowy pine
        } else {
          this.addResource(ResourceType.STONE, rx, ry);
        }
      } else if (tile === TileType.LAND) {
        // Plains: balanced trees, stone, and berry bushes
        const rand = Math.random();
        if (rand < 0.45) {
          this.addResource(ResourceType.TREE, rx, ry);
        } else if (rand < 0.75) {
          this.addResource(ResourceType.STONE, rx, ry);
        } else if (this.berryBushCount < FOOD_CONFIG.berryBush.maxGlobalBushes) {
          this.addResource(ResourceType.BERRY_BUSH, rx, ry);
        }
      }
    }

    // Regenerate berries on existing bushes
    for (const res of this.resources.values()) {
      if (res.type === ResourceType.BERRY_BUSH && res.foodAmount !== undefined && res.maxFood !== undefined) {
        if (res.foodAmount < res.maxFood) {
          res.foodAmount = Math.min(res.maxFood, res.foodAmount + (res.regenerationRate ?? 0.015));
          res.amount = res.foodAmount;
        }
      }
    }
  }

  public clear(): void {
    this.resources.clear();
    this.buckets.clear();
    this.treeCount = 0;
    this.stoneCount = 0;
    this.berryBushCount = 0;
  }
}
