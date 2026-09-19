import { Ship } from './Ship';
import { ShipType } from '../types';
import { World } from '../world/World';
import { SettlementManager } from '../settlements/SettlementManager';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { HistoryManager } from '../history/HistoryManager';

export class ShipManager {
  public ships: Map<string, Ship> = new Map();
  private colonizationCooldown: number = 100;

  constructor() {}

  public get count(): number {
    return this.ships.size;
  }

  public addShip(ship: Ship): void {
    this.ships.set(ship.id, ship);
  }

  public createShip(
    type: ShipType,
    x: number,
    y: number,
    settlementId: string | null = null,
    kingdomId: string | null = null
  ): Ship {
    const ship = new Ship(type, x, y, settlementId, kingdomId);
    this.ships.set(ship.id, ship);
    return ship;
  }

  public removeShip(id: string): boolean {
    return this.ships.delete(id);
  }

  public getShip(id: string): Ship | undefined {
    return this.ships.get(id);
  }

  public getShips(): Ship[] {
    return Array.from(this.ships.values());
  }

  public getShipsInArea(minX: number, minY: number, maxX: number, maxY: number): Ship[] {
    const res: Ship[] = [];
    for (const ship of this.ships.values()) {
      if (ship.x >= minX - 2 && ship.x <= maxX + 2 && ship.y >= minY - 2 && ship.y <= maxY + 2) {
        res.push(ship);
      }
    }
    return res;
  }

  public update(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    historyManager: HistoryManager,
    gameYear: number,
    deltaTicks: number = 1
  ): void {
    // 1. Update existing ships
    for (const ship of this.ships.values()) {
      const alive = ship.update(
        world,
        settlementManager,
        entityManager,
        historyManager,
        gameYear,
        deltaTicks
      );
      if (!alive) {
        this.ships.delete(ship.id);
      }
    }

    // 2. Periodic check for coastal settlement ship production and island colonization
    this.colonizationCooldown -= deltaTicks;
    if (this.colonizationCooldown <= 0) {
      this.colonizationCooldown = 150; // Every ~6 seconds
      this.checkMaritimeActivities(
        world,
        settlementManager,
        entityManager,
        buildingManager,
        historyManager,
        gameYear
      );
    }
  }

  private checkMaritimeActivities(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    for (const settlement of settlementManager.settlements.values()) {
      // Find closest water tile to settlement
      const waterTile = this.findWaterNearSettlement(world, settlement.x, settlement.y, 10);
      if (!waterTile) continue;

      settlement.isCoastal = true;

      // Check existing ships owned by this settlement
      const ownedShips = Array.from(this.ships.values()).filter((s) => s.settlementId === settlement.id);
      settlement.shipsCount = ownedShips.length;

      // 1. Build fishing boat if pop >= 4, storage.wood >= 15 and has < 2 fishing boats
      const fishingBoats = ownedShips.filter((s) => s.type === 'FISHING_BOAT');
      if (fishingBoats.length < 1 && settlement.population >= 4 && settlement.storage.wood >= 15) {
        settlement.withdrawWood(15);
        const boat = this.createShip(
          'FISHING_BOAT',
          waterTile.x + 0.5,
          waterTile.y + 0.5,
          settlement.id,
          settlement.kingdomId
        );
        boat.state = 'IDLE';
        historyManager.logEvent(
          gameYear,
          `Год ${gameYear} — 🛶 В поселении ${settlement.name} спущена на воду первая рыбацкая лодка!`,
          'MAGIC',
          '#38bdf8'
        );
        continue;
      }

      // 2. Island Colonization expedition:
      // If settlement has pop >= 7, storage.wood >= 30, and no active transport ship
      const transportShips = ownedShips.filter((s) => s.type === 'TRANSPORT_SHIP');
      if (transportShips.length === 0 && settlement.population >= 6 && settlement.storage.wood >= 25) {
        // Look for distant island land tile that has no nearby settlement (> 35 tiles away)
        const targetIsland = this.findUncolonizedIsland(world, settlementManager, settlement.x, settlement.y);
        if (targetIsland) {
          // Recruit 2 adult colonists
          const availableHumans = settlement.memberIds
            .map((id) => entityManager.getHuman(id))
            .filter((h): h is NonNullable<typeof h> => h !== undefined && h.lifeStage === 'ADULT' && !h.inShipId);

          if (availableHumans.length >= 2) {
            settlement.withdrawWood(25);
            settlement.withdrawFood(15);
            settlement.withdrawStone(10);

            const ship = this.createShip(
              'TRANSPORT_SHIP',
              waterTile.x + 0.5,
              waterTile.y + 0.5,
              settlement.id,
              settlement.kingdomId
            );

            // Assign passengers
            const colonists = availableHumans.slice(0, 2);
            for (const col of colonists) {
              ship.passengers.push(col.id);
              col.inShipId = ship.id;
              col.x = ship.x;
              col.y = ship.y;
            }

            ship.cargo.wood = 25;
            ship.cargo.food = 25;
            ship.cargo.stone = 10;
            ship.colonizationTarget = { x: targetIsland.x, y: targetIsland.y };
            ship.targetX = targetIsland.x;
            ship.targetY = targetIsland.y;
            ship.state = 'COLONIZING';

            historyManager.logEvent(
              gameYear,
              `Год ${gameYear} — ⛵ Отважные мореплаватели из ${settlement.name} снарядили экспедицию для колонизации дальних островов!`,
              'COLONY_ESTABLISHED',
              '#38bdf8'
            );
          }
        }
      }
    }
  }

  private findWaterNearSettlement(world: World, sx: number, sy: number, maxDist: number): { x: number; y: number } | null {
    for (let r = 1; r <= maxDist; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = sx + dx;
          const ty = sy + dy;
          if (world.isInBounds(tx, ty) && world.isWater(world.getTile(tx, ty))) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    return null;
  }

  private findUncolonizedIsland(
    world: World,
    settlementManager: SettlementManager,
    originX: number,
    originY: number
  ): { x: number; y: number } | null {
    // Check random samples in the world
    for (let attempt = 0; attempt < 25; attempt++) {
      const tx = 10 + Math.floor(Math.random() * (world.width - 20));
      const ty = 10 + Math.floor(Math.random() * (world.height - 20));

      // Must be walkable land
      if (!world.isWalkable(tx, ty)) continue;

      // Must be reasonably distant from origin (> 25 tiles)
      const distToOrigin = Math.hypot(tx - originX, ty - originY);
      if (distToOrigin < 25) continue;

      // Must be surrounded by or border water (island/coastal feel)
      const hasAdjacentWater =
        world.isWater(world.getTile(tx + 1, ty)) ||
        world.isWater(world.getTile(tx - 1, ty)) ||
        world.isWater(world.getTile(tx, ty + 1)) ||
        world.isWater(world.getTile(tx, ty - 1));

      if (!hasAdjacentWater) continue;

      // Must not be close to ANY existing settlement (> 30 tiles)
      const nearestSettlement = settlementManager.findNearestSettlement(tx, ty, 30);
      if (nearestSettlement) continue;

      return { x: tx, y: ty };
    }
    return null;
  }

  public clear(): void {
    this.ships.clear();
  }
}
