import { ShipEntity, ShipType, ShipState, Inventory } from '../types';
import { World } from '../world/World';
import { SettlementManager } from '../settlements/SettlementManager';
import { EntityManager } from '../entities/EntityManager';
import { HistoryManager } from '../history/HistoryManager';

export class Ship implements ShipEntity {
  public id: string;
  public type: ShipType;
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public settlementId: string | null = null;
  public kingdomId: string | null = null;
  public passengers: string[] = [];
  public cargo: Inventory = { wood: 0, stone: 0, food: 0 };
  public state: ShipState = 'IDLE';
  public health: number = 100;
  public maxHealth: number = 100;
  public speed: number = 0.08;
  public facing: 'left' | 'right' = 'right';
  public path: { x: number; y: number }[] = [];
  public sailTimer: number = 0;
  public colonizationTarget?: { x: number; y: number; islandName?: string };
  public tradePartnerSettlementId?: string | null = null;
  public fishCooldown: number = 0;

  private static idCounter: number = 1;

  constructor(
    type: ShipType,
    x: number,
    y: number,
    settlementId: string | null = null,
    kingdomId: string | null = null
  ) {
    this.id = `ship_${Ship.idCounter++}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.settlementId = settlementId;
    this.kingdomId = kingdomId;

    if (type === 'FISHING_BOAT') {
      this.speed = 0.07;
      this.maxHealth = 80;
    } else if (type === 'TRADE_SHIP') {
      this.speed = 0.09;
      this.maxHealth = 150;
    } else {
      // TRANSPORT_SHIP
      this.speed = 0.085;
      this.maxHealth = 200;
    }
    this.health = this.maxHealth;
  }

  public update(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    historyManager: HistoryManager,
    gameYear: number,
    deltaTicks: number = 1
  ): boolean {
    this.sailTimer += deltaTicks * 0.1;

    // Synchronize passenger positions to the ship
    for (const pId of this.passengers) {
      const p = entityManager.getHuman(pId);
      if (p) {
        p.x = this.x;
        p.y = this.y;
        p.inShipId = this.id;
      }
    }

    // State logic
    switch (this.state) {
      case 'IDLE':
        this.updateIdle(world, settlementManager, entityManager);
        break;

      case 'SAILING':
      case 'COLONIZING':
      case 'TRADING':
        this.updateMovement(world, settlementManager, entityManager, historyManager, gameYear, deltaTicks);
        break;

      case 'FISHING':
        this.updateFishing(world, settlementManager, deltaTicks);
        break;
    }

    return this.health > 0;
  }

  private updateIdle(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager
  ): void {
    if (this.type === 'FISHING_BOAT') {
      // Find nearby water tile to fish
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 10;
      const tx = Math.floor(this.x + Math.cos(angle) * dist);
      const ty = Math.floor(this.y + Math.sin(angle) * dist);

      if (world.isInBounds(tx, ty) && world.isWater(world.getTile(tx, ty))) {
        this.targetX = tx + 0.5;
        this.targetY = ty + 0.5;
        this.state = 'SAILING';
      }
    } else if (this.type === 'TRANSPORT_SHIP' && this.colonizationTarget) {
      this.targetX = this.colonizationTarget.x;
      this.targetY = this.colonizationTarget.y;
      this.state = 'COLONIZING';
    } else if (this.type === 'TRADE_SHIP' && this.tradePartnerSettlementId) {
      const partner = settlementManager.getSettlement(this.tradePartnerSettlementId);
      if (partner) {
        this.targetX = partner.x;
        this.targetY = partner.y;
        this.state = 'TRADING';
      }
    }
  }

  private updateMovement(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    historyManager: HistoryManager,
    gameYear: number,
    deltaTicks: number
  ): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1.0) {
      // Arrived at destination
      if (this.state === 'COLONIZING') {
        this.disembarkAndColonize(world, settlementManager, entityManager, historyManager, gameYear);
      } else if (this.state === 'TRADING') {
        this.completeTrade(settlementManager);
      } else if (this.type === 'FISHING_BOAT') {
        if (this.cargo.food >= 15) {
          // Unload food to home settlement
          if (this.settlementId) {
            const s = settlementManager.getSettlement(this.settlementId);
            if (s) {
              s.depositFood(this.cargo.food);
              this.cargo.food = 0;
            }
          }
          this.state = 'IDLE';
        } else {
          this.state = 'FISHING';
          this.fishCooldown = 30 + Math.floor(Math.random() * 40);
        }
      } else {
        this.state = 'IDLE';
      }
      return;
    }

    // Move directly or via simple water step
    const step = Math.min(dist, this.speed * deltaTicks);
    const nextX = this.x + (dx / dist) * step;
    const nextY = this.y + (dy / dist) * step;

    // Check water passability
    const tileType = world.getTile(Math.floor(nextX), Math.floor(nextY));
    if (world.isWater(tileType) || (dist <= 1.8 && this.state === 'COLONIZING')) {
      this.x = nextX;
      this.y = nextY;
      this.facing = dx >= 0 ? 'right' : 'left';
    } else {
      // Hit land edge: if colonizing and close to destination, disembark!
      if (this.state === 'COLONIZING' && dist < 4) {
        this.disembarkAndColonize(world, settlementManager, entityManager, historyManager, gameYear);
      } else {
        // Try gentle deviation
        const altX = this.x + (dy / dist) * step * 0.7;
        const altY = this.y - (dx / dist) * step * 0.7;
        if (world.isInBounds(Math.floor(altX), Math.floor(altY)) && world.isWater(world.getTile(Math.floor(altX), Math.floor(altY)))) {
          this.x = altX;
          this.y = altY;
        } else {
          this.state = 'IDLE';
        }
      }
    }
  }

  private updateFishing(world: World, settlementManager: SettlementManager, deltaTicks: number): void {
    this.fishCooldown -= deltaTicks;
    if (this.fishCooldown <= 0) {
      // Catch fish!
      this.cargo.food += 5;
      if (this.cargo.food >= 15) {
        // Return to home settlement dock
        if (this.settlementId) {
          const s = settlementManager.getSettlement(this.settlementId);
          if (s) {
            // Find water tile near settlement
            const shore = this.findNearestWaterTile(world, s.x, s.y);
            if (shore) {
              this.targetX = shore.x + 0.5;
              this.targetY = shore.y + 0.5;
              this.state = 'SAILING';
              return;
            }
          }
        }
        this.state = 'IDLE';
      } else {
        this.fishCooldown = 25 + Math.floor(Math.random() * 30);
      }
    }
  }

  private disembarkAndColonize(
    world: World,
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    // Find walkable landing spot on land
    let landTile = this.findNearestLandTile(world, Math.floor(this.x), Math.floor(this.y));
    if (!landTile) {
      landTile = { x: Math.floor(this.x), y: Math.floor(this.y) };
    }

    // Found new settlement on new land/island!
    const newName = settlementManager.generateName();
    const newSettlement = settlementManager.createSettlement(
      newName,
      landTile.x,
      landTile.y,
      this.kingdomId
    );

    newSettlement.depositWood(30 + this.cargo.wood);
    newSettlement.depositStone(15 + this.cargo.stone);
    newSettlement.depositFood(40 + this.cargo.food);
    this.cargo = { wood: 0, stone: 0, food: 0 };

    // Disembark passengers
    for (const pId of this.passengers) {
      const p = entityManager.getHuman(pId);
      if (p) {
        p.x = landTile.x + (Math.random() - 0.5);
        p.y = landTile.y + (Math.random() - 0.5);
        p.settlementId = newSettlement.id;
        p.kingdomId = this.kingdomId;
        p.inShipId = null;
        newSettlement.addMember(p.id);
      }
    }
    this.passengers = [];

    // Re-assign ship home to new colony
    this.settlementId = newSettlement.id;
    this.colonizationTarget = undefined;
    this.state = 'IDLE';

    historyManager.logEvent(
      gameYear,
      `Год ${gameYear} — ⛵ Морская экспедиция основала заморскую колонию ${newSettlement.name}!`,
      'COLONY_ESTABLISHED',
      '#06b6d4'
    );
  }

  private completeTrade(settlementManager: SettlementManager): void {
    if (this.tradePartnerSettlementId) {
      const partner = settlementManager.getSettlement(this.tradePartnerSettlementId);
      if (partner) {
        partner.depositWood(this.cargo.wood);
        partner.depositStone(this.cargo.stone);
        partner.depositFood(this.cargo.food);
        // Take goods back in exchange
        this.cargo.wood = partner.withdrawWood(15);
        this.cargo.stone = partner.withdrawStone(10);
        this.cargo.food = partner.withdrawFood(10);
      }
    }
    // Return to home settlement
    if (this.settlementId) {
      const home = settlementManager.getSettlement(this.settlementId);
      if (home) {
        this.targetX = home.x;
        this.targetY = home.y;
        this.tradePartnerSettlementId = null;
        this.state = 'SAILING';
        return;
      }
    }
    this.state = 'IDLE';
  }

  private findNearestWaterTile(world: World, cx: number, cy: number): { x: number; y: number } | null {
    for (let r = 1; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = cx + dx;
          const ty = cy + dy;
          if (world.isInBounds(tx, ty) && world.isWater(world.getTile(tx, ty))) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    return null;
  }

  private findNearestLandTile(world: World, cx: number, cy: number): { x: number; y: number } | null {
    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (world.isInBounds(tx, ty) && world.isWalkable(tx, ty)) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    return null;
  }
}
