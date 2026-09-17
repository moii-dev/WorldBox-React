import { Building } from './Building';
import { BuildingType } from '../types';
import { World } from '../world/World';
import { ResourceManager } from '../resources/ResourceManager';

export class BuildingManager {
  public buildings: Map<string, Building> = new Map();
  public selectedBuildingId: string | null = null;

  constructor() {}

  public get count(): number {
    return this.buildings.size;
  }

  public get completedCount(): number {
    let count = 0;
    for (const b of this.buildings.values()) {
      if (b.isCompleted) count++;
    }
    return count;
  }

  public getBuilding(id: string): Building | undefined {
    return this.buildings.get(id);
  }

  public selectBuilding(id: string | null): void {
    this.selectedBuildingId = id;
  }

  public getSelectedBuilding(): Building | null {
    if (!this.selectedBuildingId) return null;
    return this.buildings.get(this.selectedBuildingId) || null;
  }

  public getBuildingsInArea(minX: number, minY: number, maxX: number, maxY: number): Building[] {
    const list: Building[] = [];
    for (const b of this.buildings.values()) {
      if (b.x + b.width >= minX && b.x <= maxX && b.y + b.height >= minY && b.y <= maxY) {
        list.push(b);
      }
    }
    return list;
  }

  public findBuildingAt(tileX: number, tileY: number): Building | null {
    for (const b of this.buildings.values()) {
      if (tileX >= b.x && tileX < b.x + b.width && tileY >= b.y && tileY < b.y + b.height) {
        return b;
      }
    }
    return null;
  }

  /**
   * Check if a rectangular area is valid for placing a building
   */
  public canPlaceBuilding(
    world: World,
    resourceManager: ResourceManager,
    bx: number,
    by: number,
    w: number,
    h: number
  ): boolean {
    // Check world bounds and walkability
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = bx + dx;
        const ty = by + dy;
        if (!world.isInBounds(tx, ty) || !world.isWalkable(tx, ty)) {
          return false;
        }
        // Don't place on water borders or natural resources
        if (resourceManager.getResourceAt(tx, ty) !== null) {
          return false;
        }
      }
    }

    // Check collision with existing buildings (with 1 tile padding)
    for (const b of this.buildings.values()) {
      const overlapX = !(bx + w + 1 <= b.x || bx >= b.x + b.width + 1);
      const overlapY = !(by + h + 1 <= b.y || by >= b.y + b.height + 1);
      if (overlapX && overlapY) {
        return false;
      }
    }

    return true;
  }

  /**
   * Search for a free spot near center (nearX, nearY)
   */
  public findBuildingSite(
    world: World,
    resourceManager: ResourceManager,
    nearX: number,
    nearY: number,
    width: number,
    height: number,
    maxRadius: number = 16
  ): { x: number; y: number } | null {
    const cx = Math.floor(nearX);
    const cy = Math.floor(nearY);

    for (let r = 2; r <= maxRadius; r += 2) {
      for (let attempts = 0; attempts < 16; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = r + Math.random() * 2;
        const testX = Math.floor(cx + Math.cos(angle) * dist);
        const testY = Math.floor(cy + Math.sin(angle) * dist);

        if (this.canPlaceBuilding(world, resourceManager, testX, testY, width, height)) {
          return { x: testX, y: testY };
        }
      }
    }

    return null;
  }

  public placeBuilding(
    typeOrX: BuildingType | number,
    xOrY: number,
    yOrType: number | BuildingType,
    settlementOrWorld?: any,
    kingdomOrSettlement?: any,
    maybeKingdom?: any
  ): Building {
    let type: BuildingType;
    let x: number;
    let y: number;
    let settlementId: string | null = null;
    let kingdomId: string | null = null;

    if (typeof typeOrX === 'string') {
      // (type, x, y, settlementId, kingdomId)
      type = typeOrX;
      x = xOrY;
      y = yOrType as number;
      settlementId = settlementOrWorld || null;
      kingdomId = kingdomOrSettlement || null;
    } else {
      // (x, y, type, world, settlementId, kingdomId)
      x = typeOrX;
      y = xOrY;
      type = yOrType as BuildingType;
      settlementId = kingdomOrSettlement || null;
      kingdomId = maybeKingdom || null;
    }

    const building = new Building(type, x, y, settlementId, kingdomId);
    this.buildings.set(building.id, building);
    return building;
  }

  public removeBuilding(id: string): boolean {
    if (this.selectedBuildingId === id) {
      this.selectedBuildingId = null;
    }
    return this.buildings.delete(id);
  }

  /**
   * Find incomplete building needing resources or labor closest to (x, y)
   */
  public findUnfinishedBuilding(
    x: number,
    y: number,
    settlementId?: string | null,
    needingResources: boolean = true
  ): Building | null {
    let closest: Building | null = null;
    let minDistSq = Infinity;

    for (const b of this.buildings.values()) {
      if (b.isCompleted) continue;
      if (settlementId !== undefined && b.settlementId !== settlementId) continue;

      if (needingResources && !b.needsResources()) continue;
      if (!needingResources && !b.isReadyForLabor()) continue;

      const dx = b.x + b.width / 2 - x;
      const dy = b.y + b.height / 2 - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = b;
      }
    }

    return closest;
  }

  /**
   * Find available house with room for an occupant
   */
  public findAvailableHouse(settlementId: string | null, nearX: number, nearY: number): Building | null {
    let bestHouse: Building | null = null;
    let minDistSq = Infinity;

    for (const b of this.buildings.values()) {
      if (b.type !== 'HOUSE' || !b.isCompleted) continue;
      if (settlementId !== null && b.settlementId !== settlementId) continue;
      if (b.occupants.length >= b.maxOccupants) continue;

      const dx = b.x - nearX;
      const dy = b.y - nearY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestHouse = b;
      }
    }

    return bestHouse;
  }

  public clear(): void {
    this.buildings.clear();
    this.selectedBuildingId = null;
  }
}
