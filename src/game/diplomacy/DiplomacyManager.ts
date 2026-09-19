import { KingdomManager } from '../kingdoms/KingdomManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { HistoryManager } from '../history/HistoryManager';
import { WarEntity, DiplomaticStatus } from '../types';
import { SIMULATION_CONFIG } from '../SimulationConfig';

export class DiplomacyManager {
  public wars: Map<string, WarEntity> = new Map();
  private warCounter: number = 1;
  private knownPairs: Set<string> = new Set();

  constructor() {}

  public get activeWars(): WarEntity[] {
    return Array.from(this.wars.values()).filter((w) => w.status === 'ACTIVE');
  }

  private getPairKey(a: string, b: string): string {
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  public getStatus(kingdomAId: string, kingdomBId: string, kingdomManager?: KingdomManager): DiplomaticStatus {
    if (kingdomAId === kingdomBId) return 'ALLIED';
    for (const war of this.wars.values()) {
      if (
        war.status === 'ACTIVE' &&
        ((war.kingdomAId === kingdomAId && war.kingdomBId === kingdomBId) ||
          (war.kingdomAId === kingdomBId && war.kingdomBId === kingdomAId))
      ) {
        return 'WAR';
      }
    }
    if (!kingdomManager) return 'NEUTRAL';
    const kA = kingdomManager.getKingdom(kingdomAId);
    if (!kA) return 'NEUTRAL';

    if (kA.isAtWarWith(kingdomBId)) return 'WAR';

    const rel = kA.getRelation(kingdomBId);
    if (rel >= SIMULATION_CONFIG.alliedThreshold) return 'ALLIED';
    if (rel >= SIMULATION_CONFIG.friendlyThreshold) return 'FRIENDLY';
    if (rel <= SIMULATION_CONFIG.warThreshold) return 'WAR';
    if (rel <= SIMULATION_CONFIG.hostileThreshold) return 'HOSTILE';
    if (rel < -15) return 'TENSE';
    return 'NEUTRAL';
  }

  public updateDiplomacy(
    kingdomManager: KingdomManager,
    settlementManager: SettlementManager,
    historyManager: HistoryManager,
    gameYear: number,
    currentTick: number
  ): void {
    const kingdoms = Array.from(kingdomManager.kingdoms.values());
    if (kingdoms.length < 2) return;

    // Check all pairs of kingdoms
    for (let i = 0; i < kingdoms.length; i++) {
      for (let j = i + 1; j < kingdoms.length; j++) {
        const kA = kingdoms[i];
        const kB = kingdoms[j];
        const pairKey = this.getPairKey(kA.id, kB.id);

        // 1. Initial Encounter
        if (!this.knownPairs.has(pairKey)) {
          this.knownPairs.add(pairKey);
          // Initial relation between -10 and +20
          const initialRel = Math.floor(Math.random() * 30) - 10;
          kA.setRelation(kB.id, initialRel);
          kB.setRelation(kA.id, initialRel);

          historyManager.logEvent(
            gameYear,
            `Год ${gameYear} — Государства ${kA.name} и ${kB.name} установили дипломатический контакт.`,
            'RELATION_CHANGE',
            '#38bdf8'
          );
          continue;
        }

        const isWar = kA.isAtWarWith(kB.id);
        const rel = kA.getRelation(kB.id);

        if (isWar) {
          // Find war record
          const war = Array.from(this.wars.values()).find(
            (w) =>
              w.status === 'ACTIVE' &&
              ((w.kingdomAId === kA.id && w.kingdomBId === kB.id) ||
                (w.kingdomAId === kB.id && w.kingdomBId === kA.id))
          );

          if (war) {
            const warDuration = currentTick - war.startTime;
            const totalCasualties = war.casualtiesA + war.casualtiesB;

            // Check for peace conditions
            if (
              warDuration > SIMULATION_CONFIG.peaceMinWarDurationTicks &&
              (totalCasualties >= SIMULATION_CONFIG.peaceCasualtyThreshold || Math.random() < 0.08)
            ) {
              this.signPeace(kA.id, kB.id, kingdomManager, historyManager, gameYear);
            }
          }
        } else {
          // Peacetime dynamics:
          // Distance between closest settlements
          let minSettlementDist = Infinity;
          for (const sAId of kA.settlementIds) {
            const sA = settlementManager.getSettlement(sAId);
            if (!sA) continue;
            for (const sBId of kB.settlementIds) {
              const sB = settlementManager.getSettlement(sBId);
              if (!sB) continue;
              const dist = Math.hypot(sA.x - sB.x, sA.y - sB.y);
              if (dist < minSettlementDist) minSettlementDist = dist;
            }
          }

          // Border tension if close, or gentle normalization
          if (minSettlementDist < 30) {
            // Close borders cause friction
            const delta = -0.5 - Math.random() * 1.5;
            kA.modifyRelation(kB.id, delta);
            kB.modifyRelation(kA.id, delta);
          } else {
            // Slight drift towards neutral / peace
            const delta = rel < 0 ? 0.3 : -0.1;
            kA.modifyRelation(kB.id, delta);
            kB.modifyRelation(kA.id, delta);
          }

          // Check if relations fell below war threshold
          const updatedRel = kA.getRelation(kB.id);
          if (updatedRel <= SIMULATION_CONFIG.warThreshold) {
            this.declareWar(kA.id, kB.id, kingdomManager, historyManager, gameYear, currentTick);
          }
        }
      }
    }
  }

  public declareWar(
    kingdomAId: string,
    kingdomBId: string,
    kingdomManager: KingdomManager,
    historyManager: HistoryManager,
    gameYear: number,
    currentTick: number
  ): WarEntity | null {
    const kA = kingdomManager.getKingdom(kingdomAId);
    const kB = kingdomManager.getKingdom(kingdomBId);
    if (!kA || !kB) return null;

    if (kA.isAtWarWith(kB.id)) return null;

    kA.declareWar(kB.id);
    kB.declareWar(kA.id);

    const war: WarEntity = {
      id: `war_${this.warCounter++}`,
      kingdomAId: kA.id,
      kingdomBId: kB.id,
      startTime: currentTick,
      casualtiesA: 0,
      casualtiesB: 0,
      capturedSettlements: 0,
      status: 'ACTIVE',
    };

    this.wars.set(war.id, war);

    historyManager.logEvent(
      gameYear,
      `Год ${gameYear} — ⚔️ ВОЙНА! ${kA.name} объявляет войну государству ${kB.name}!`,
      'WAR_DECLARED',
      '#ef4444'
    );

    return war;
  }

  public signPeace(
    kingdomAId: string,
    kingdomBId: string,
    kingdomManager: KingdomManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    const kA = kingdomManager.getKingdom(kingdomAId);
    const kB = kingdomManager.getKingdom(kingdomBId);
    if (!kA || !kB) return;

    kA.endWar(kB.id);
    kB.endWar(kA.id);

    const war = Array.from(this.wars.values()).find(
      (w) =>
        w.status === 'ACTIVE' &&
        ((w.kingdomAId === kA.id && w.kingdomBId === kB.id) ||
          (w.kingdomAId === kB.id && w.kingdomBId === kA.id))
    );

    if (war) {
      war.status = 'PEACE';
    }

    historyManager.logEvent(
      gameYear,
      `Год ${gameYear} — 🕊️ Мирный договор: ${kA.name} и ${kB.name} прекратили боевые действия.`,
      'PEACE_SIGNED',
      '#60a5fa'
    );
  }

  public recordCasualty(victimKingdomId: string): void {
    for (const war of this.wars.values()) {
      if (war.status !== 'ACTIVE') continue;
      if (war.kingdomAId === victimKingdomId) {
        war.casualtiesA++;
      } else if (war.kingdomBId === victimKingdomId) {
        war.casualtiesB++;
      }
    }
  }

  public clear(): void {
    this.wars.clear();
    this.knownPairs.clear();
    this.warCounter = 1;
  }
}
