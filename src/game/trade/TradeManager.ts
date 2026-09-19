import { CaravanEntity, Inventory } from '../types';
import { SettlementManager } from '../settlements/SettlementManager';
import { DiplomacyManager } from '../diplomacy/DiplomacyManager';
import { HistoryManager } from '../history/HistoryManager';
import { RoadSystem } from '../roads/RoadSystem';

export class TradeManager {
  public caravans: Map<string, CaravanEntity> = new Map();
  private tradeCheckTimer: number = 200;
  private static idCounter: number = 1;

  constructor() {}

  public getCaravans(): CaravanEntity[] {
    return Array.from(this.caravans.values());
  }

  public update(
    settlementManager: SettlementManager,
    diplomacyManager: DiplomacyManager,
    historyManager: HistoryManager,
    roadSystem: RoadSystem,
    gameYear: number,
    deltaTicks: number = 1
  ): void {
    // 1. Move active caravans
    for (const caravan of this.caravans.values()) {
      const fromS = settlementManager.getSettlement(caravan.fromSettlementId);
      const toS = settlementManager.getSettlement(caravan.toSettlementId);

      if (!fromS || !toS) {
        this.caravans.delete(caravan.id);
        continue;
      }

      const dx = caravan.targetX - caravan.x;
      const dy = caravan.targetY - caravan.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.8) {
        // Caravan arrived at destination
        toS.depositWood(caravan.cargo.wood);
        toS.depositStone(caravan.cargo.stone);
        toS.depositFood(caravan.cargo.food);

        // Turn around and take return trade goods back to home
        const returnWood = toS.withdrawWood(10);
        const returnStone = toS.withdrawStone(10);
        const returnFood = toS.withdrawFood(10);

        fromS.depositWood(returnWood);
        fromS.depositStone(returnStone);
        fromS.depositFood(returnFood);

        this.caravans.delete(caravan.id);
        continue;
      }

      // Step along path
      const roadSpeed = roadSystem.getSpeedMultiplier(Math.floor(caravan.x), Math.floor(caravan.y));
      const step = 0.07 * roadSpeed * deltaTicks;
      caravan.x += (dx / dist) * Math.min(dist, step);
      caravan.y += (dy / dist) * Math.min(dist, step);

      // Record footsteps for road creation
      roadSystem.recordFootstep(Math.floor(caravan.x), Math.floor(caravan.y));
    }

    // 2. Dispatch new caravans between allied/friendly settlements
    this.tradeCheckTimer -= deltaTicks;
    if (this.tradeCheckTimer <= 0) {
      this.tradeCheckTimer = 250; // Every ~10 seconds
      this.dispatchTradeCaravans(settlementManager, diplomacyManager, historyManager, gameYear);
    }
  }

  private dispatchTradeCaravans(
    settlementManager: SettlementManager,
    diplomacyManager: DiplomacyManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    const settlements = Array.from(settlementManager.settlements.values());
    if (settlements.length < 2 || this.caravans.size >= 4) return;

    for (let i = 0; i < settlements.length; i++) {
      const sA = settlements[i];
      if (sA.population < 5) continue;

      for (let j = i + 1; j < settlements.length; j++) {
        const sB = settlements[j];
        if (sB.population < 5) continue;

        // Check diplomacy
        if (sA.kingdomId && sB.kingdomId && sA.kingdomId !== sB.kingdomId) {
          const status = diplomacyManager.getStatus(sA.kingdomId, sB.kingdomId);
          if (status === 'WAR' || status === 'HOSTILE' || status === 'TENSE') continue;
        }

        const dist = Math.hypot(sA.x - sB.x, sA.y - sB.y);
        if (dist > 70) continue; // Overland trade distance cap

        // Check if either has surplus
        if (sA.storage.wood > 50 || sA.storage.food > 60 || sA.storage.stone > 40) {
          const cargo: Inventory = {
            wood: sA.storage.wood > 50 ? sA.withdrawWood(15) : 0,
            stone: sA.storage.stone > 40 ? sA.withdrawStone(10) : 0,
            food: sA.storage.food > 60 ? sA.withdrawFood(15) : 0,
          };

          const caravan: CaravanEntity = {
            id: `caravan_${TradeManager.idCounter++}`,
            merchantId: `merchant_${TradeManager.idCounter}`,
            fromSettlementId: sA.id,
            toSettlementId: sB.id,
            x: sA.x,
            y: sA.y,
            targetX: sB.x,
            targetY: sB.y,
            cargo,
            progress: 0,
          };

          this.caravans.set(caravan.id, caravan);

          historyManager.logEvent(
            gameYear,
            `Год ${gameYear} — 🐫 Торговый караван отправился из ${sA.name} в ${sB.name}!`,
            'TRADE_ESTABLISHED',
            '#f59e0b'
          );
          return;
        }
      }
    }
  }

  public clear(): void {
    this.caravans.clear();
  }
}
