import { Kingdom } from './Kingdom';
import { SettlementManager } from '../settlements/SettlementManager';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { HistoryManager } from '../history/HistoryManager';
import { SIMULATION_CONFIG } from '../SimulationConfig';

const KINGDOM_TITLES = [
  'Королевство', 'Царство', 'Империя', 'Княжество',
  'Герцогство', 'Владение', 'Республика', 'Держава'
];

const KINGDOM_ROOTS = [
  'Вален', 'Арден', 'Камнепад', 'Зеленолесье', 'Дубрава', 'Железный Пик',
  'Морозный Пик', 'Солнечный Хребет', 'Вороний Холм', 'Драконий Лес', 'Буревест', 'Эльдория',
  'Норволд', 'Серебряный Дол', 'Высокогорье', 'Ветродол', 'Белокаменск'
];

const KINGDOM_COLORS = [
  '#ef4444', // Crimson
  '#3b82f6', // Royal Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber Gold
  '#8b5cf6', // Imperial Purple
  '#06b6d4', // Teal
  '#ec4899', // Rose
  '#84cc16', // Lime
];

export class KingdomManager {
  public kingdoms: Map<string, Kingdom> = new Map();
  public selectedKingdomId: string | null = null;
  private usedNames: Set<string> = new Set();
  private colorIndex: number = 0;

  constructor() {}

  public get count(): number {
    return this.kingdoms.size;
  }

  public getKingdom(id: string): Kingdom | undefined {
    return this.kingdoms.get(id);
  }

  public generateName(): string {
    for (let attempts = 0; attempts < 100; attempts++) {
      const title = KINGDOM_TITLES[Math.floor(Math.random() * KINGDOM_TITLES.length)];
      const root = KINGDOM_ROOTS[Math.floor(Math.random() * KINGDOM_ROOTS.length)];
      const candidate = `${title} ${root}`;
      if (!this.usedNames.has(candidate)) {
        this.usedNames.add(candidate);
        return candidate;
      }
    }
    const fallback = `Королевство ${this.kingdoms.size + 1}`;
    this.usedNames.add(fallback);
    return fallback;
  }

  public getNextColor(): string {
    const color = KINGDOM_COLORS[this.colorIndex % KINGDOM_COLORS.length];
    this.colorIndex++;
    return color;
  }

  public createKingdom(name: string, capitalSettlementId: string): Kingdom {
    const color = this.getNextColor();
    const kingdom = new Kingdom(name, color, capitalSettlementId);
    this.kingdoms.set(kingdom.id, kingdom);
    return kingdom;
  }

  public removeKingdom(id: string): boolean {
    if (this.selectedKingdomId === id) {
      this.selectedKingdomId = null;
    }
    return this.kingdoms.delete(id);
  }

  /**
   * Check if any independent settlement qualifies to form a Kingdom
   */
  public checkForNewKingdoms(
    settlementManager: SettlementManager,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    for (const settlement of settlementManager.settlements.values()) {
      if (settlement.kingdomId !== null) continue;

      const completedBuildings = settlement.buildingIds.filter((bId) => {
        const b = buildingManager.getBuilding(bId);
        return b && b.isCompleted;
      });

      if (
        settlement.population >= SIMULATION_CONFIG.kingdomMinPop &&
        completedBuildings.length >= SIMULATION_CONFIG.kingdomMinBuildings
      ) {
        const name = this.generateName();
        const kingdom = this.createKingdom(name, settlement.id);

        settlement.kingdomId = kingdom.id;

        // Assign kingdom to all members
        for (const memberId of settlement.memberIds) {
          const h = entityManager.getHuman(memberId);
          if (h) {
            h.kingdomId = kingdom.id;
          }
        }

        // Assign kingdom to all settlement buildings
        for (const bId of settlement.buildingIds) {
          const b = buildingManager.getBuilding(bId);
          if (b) {
            b.kingdomId = kingdom.id;
          }
        }

        historyManager.logEvent(
          gameYear,
          `Год ${gameYear} — Основано ${kingdom.name} со столицей в поселении ${settlement.name}!`,
          'KINGDOM_CREATED',
          kingdom.color
        );
      }
    }
  }

  /**
   * Synchronize kingdom populations, settlements, and military strength
   */
  public updateKingdoms(settlementManager: SettlementManager, entityManager: EntityManager): void {
    for (const kingdom of this.kingdoms.values()) {
      // 1. Keep valid settlements
      kingdom.settlementIds = kingdom.settlementIds.filter(
        (sId) => settlementManager.getSettlement(sId) !== undefined
      );

      // If no settlements remain, kingdom collapses
      if (kingdom.settlementIds.length === 0) {
        this.kingdoms.delete(kingdom.id);
        continue;
      }

      // 2. Count total population and soldiers
      let totalPop = 0;
      let totalSoldiers = 0;

      for (const sId of kingdom.settlementIds) {
        const settlement = settlementManager.getSettlement(sId);
        if (settlement) {
          totalPop += settlement.population;
          for (const mId of settlement.memberIds) {
            const h = entityManager.getHuman(mId);
            if (h && h.profession === 'SOLDIER') {
              totalSoldiers++;
            }
          }
        }
      }

      kingdom.population = totalPop;
      kingdom.militaryStrength = totalSoldiers;
    }
  }

  public clear(): void {
    this.kingdoms.clear();
    this.usedNames.clear();
    this.colorIndex = 0;
    this.selectedKingdomId = null;
  }
}
