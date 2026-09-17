import { ResourceNode, ResourceType, TileType } from '../types';
import { World } from '../world/World';

export class ResourceManager {
  public resources: Map<string, ResourceNode> = new Map();
  // Spatial hash: bucketKey -> Set of resource IDs
  private buckets: Map<string, Set<string>> = new Map();
  private readonly bucketSize: number = 16;

  public treeCount: number = 0;
  public stoneCount: number = 0;

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
    const maxAmount = type === ResourceType.TREE ? 5 : 8;

    const node: ResourceNode = {
      id,
      type,
      x,
      y,
      variant,
      amount: maxAmount,
      maxAmount,
    };

    this.resources.set(id, node);

    const bKey = this.getBucketKey(x, y);
    if (!this.buckets.has(bKey)) {
      this.buckets.set(bKey, new Set());
    }
    this.buckets.get(bKey)!.add(id);

    if (type === ResourceType.TREE) {
      this.treeCount++;
    } else {
      this.stoneCount++;
    }

    return node;
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
    } else {
      this.stoneCount = Math.max(0, this.stoneCount - 1);
    }

    return true;
  }

  public harvestResource(id: string, amount: number = 1): { harvested: number; depleted: boolean } {
    const res = this.resources.get(id);
    if (!res) return { harvested: 0, depleted: true };

    const actualHarvest = Math.min(res.amount, amount);
    res.amount -= actualHarvest;

    const depleted = res.amount <= 0;
    if (depleted) {
      this.removeResource(id);
    }

    return { harvested: actualHarvest, depleted };
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
        // 90% trees in forests
        this.addResource(ResourceType.TREE, rx, ry, Math.floor(Math.random() * 3));
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
        // Plains: balanced
        if (Math.random() < 0.65) {
          this.addResource(ResourceType.TREE, rx, ry);
        } else {
          this.addResource(ResourceType.STONE, rx, ry);
        }
      }
    }
  }

  public clear(): void {
    this.resources.clear();
    this.buckets.clear();
    this.treeCount = 0;
    this.stoneCount = 0;
  }
}
