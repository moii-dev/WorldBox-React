import { World } from '../world/World';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SIMULATION_CONFIG } from '../SimulationConfig';

export class TerritoryManager {
  private width: number;
  private height: number;
  // Map index -> kingdomId
  public tileOwners: Map<number, string> = new Map();
  // KingdomId -> Set of tile indices
  public kingdomTiles: Map<string, Set<number>> = new Map();

  constructor(worldWidth: number, worldHeight: number) {
    this.width = worldWidth;
    this.height = worldHeight;
  }

  public getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  public getOwnerKingdomId(x: number, y: number): string | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tileOwners.get(this.getIndex(x, y)) || null;
  }

  public setTileOwner(x: number, y: number, kingdomId: string | null): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = this.getIndex(x, y);
    const prevOwner = this.tileOwners.get(idx);

    if (prevOwner) {
      const prevSet = this.kingdomTiles.get(prevOwner);
      if (prevSet) prevSet.delete(idx);
    }

    if (kingdomId) {
      this.tileOwners.set(idx, kingdomId);
      let set = this.kingdomTiles.get(kingdomId);
      if (!set) {
        set = new Set();
        this.kingdomTiles.set(kingdomId, set);
      }
      set.add(idx);
    } else {
      this.tileOwners.delete(idx);
    }
  }

  public getKingdomTerritoryCount(kingdomId: string): number {
    const set = this.kingdomTiles.get(kingdomId);
    return set ? set.size : 0;
  }

  /**
   * Gradual expansion of kingdom borders around settlements and buildings
   */
  public updateTerritoryExpansion(
    world: World,
    settlementManager: SettlementManager,
    kingdomManager: KingdomManager,
    buildingManager: BuildingManager
  ): void {
    for (const settlement of settlementManager.settlements.values()) {
      if (!settlement.kingdomId) continue;
      const kingdomId = settlement.kingdomId;
      const kingdom = kingdomManager.getKingdom(kingdomId);
      if (!kingdom) continue;

      // Ensure settlement center and buildings have claim
      this.claimTileIfValid(world, settlement.x, settlement.y, kingdomId);

      for (const bId of settlement.buildingIds) {
        const b = buildingManager.getBuilding(bId);
        if (b) {
          for (let dy = 0; dy < b.height; dy++) {
            for (let dx = 0; dx < b.width; dx++) {
              this.claimTileIfValid(world, b.x + dx, b.y + dy, kingdomId);
            }
          }
        }
      }

      // Expand 1-2 frontier tiles adjacent to current territory
      const currentTiles = this.kingdomTiles.get(kingdomId);
      if (!currentTiles || currentTiles.size === 0) continue;

      if (currentTiles.size >= SIMULATION_CONFIG.maxTerritoryPerSettlement * kingdom.settlementIds.length) {
        continue;
      }

      // Sample a random existing tile from territory to grow from
      const sampleSize = Math.min(8, currentTiles.size);
      let count = 0;
      for (const tileIdx of currentTiles) {
        if (count++ > sampleSize) break;

        const tx = tileIdx % this.width;
        const ty = Math.floor(tileIdx / this.width);

        const neighbors = [
          { x: tx, y: ty - 1 },
          { x: tx + 1, y: ty },
          { x: tx, y: ty + 1 },
          { x: tx - 1, y: ty },
        ];

        for (const n of neighbors) {
          if (
            world.isInBounds(n.x, n.y) &&
            world.isWalkable(n.x, n.y) &&
            !this.tileOwners.has(this.getIndex(n.x, n.y))
          ) {
            // Check distance to settlement center (don't expand infinitely far)
            const dist = Math.hypot(n.x - settlement.x, n.y - settlement.y);
            if (dist <= 18) {
              this.setTileOwner(n.x, n.y, kingdomId);
              break;
            }
          }
        }
      }
    }

    // Sync counts to kingdoms
    for (const kingdom of kingdomManager.kingdoms.values()) {
      kingdom.territoryCount = this.getKingdomTerritoryCount(kingdom.id);
    }
  }

  private claimTileIfValid(world: World, x: number, y: number, kingdomId: string): void {
    if (world.isInBounds(x, y) && world.isWalkable(x, y)) {
      this.setTileOwner(x, y, kingdomId);
    }
  }

  public clear(): void {
    this.tileOwners.clear();
    this.kingdomTiles.clear();
  }
}
