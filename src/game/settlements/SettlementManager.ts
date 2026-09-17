import { Settlement } from './Settlement';
import { World } from '../world/World';
import { BuildingManager } from '../buildings/BuildingManager';
import { EntityManager } from '../entities/EntityManager';
import { HistoryManager } from '../history/HistoryManager';
import { SIMULATION_CONFIG } from '../SimulationConfig';
import { Profession } from '../types';

const PREFIXES = [
  'Oak', 'Stone', 'Green', 'River', 'Pine', 'Iron', 'Wolf', 'Deep',
  'Sun', 'High', 'Frost', 'Amber', 'Silver', 'Storm', 'Shadow', 'White',
  'Fair', 'Bramble', 'Ash', 'Clay', 'Red', 'Gold', 'Moss', 'Ember',
  'Cedar', 'Raven', 'Alder', 'Opal', 'Birch', 'Wind'
];

const SUFFIXES = [
  'vale', 'ford', 'haven', 'crest', 'fall', 'hold', 'wick', 'dale',
  'port', 'gate', 'wood', 'bridge', 'keep', 'borough', 'stead', 'cliff',
  'brook', 'field', 'shire', 'bay', 'glen', 'reach', 'mire', 'mill'
];

export class SettlementManager {
  public settlements: Map<string, Settlement> = new Map();
  public selectedSettlementId: string | null = null;
  private usedNames: Set<string> = new Set();

  constructor() {}

  public get count(): number {
    return this.settlements.size;
  }

  public getSettlement(id: string): Settlement | undefined {
    return this.settlements.get(id);
  }

  public generateName(): string {
    for (let attempts = 0; attempts < 100; attempts++) {
      const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
      const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
      const candidate = `${p}${s}`;
      if (!this.usedNames.has(candidate)) {
        this.usedNames.add(candidate);
        return candidate;
      }
    }
    const fallback = `Settlement ${this.settlements.size + 1}`;
    this.usedNames.add(fallback);
    return fallback;
  }

  public createSettlement(
    name: string,
    x: number,
    y: number,
    kingdomId: string | null = null
  ): Settlement {
    const settlement = new Settlement(name, x, y, kingdomId);
    this.settlements.set(settlement.id, settlement);
    return settlement;
  }

  public removeSettlement(id: string): boolean {
    if (this.selectedSettlementId === id) {
      this.selectedSettlementId = null;
    }
    return this.settlements.delete(id);
  }

  public findNearestSettlement(x: number, y: number, maxDist: number = Infinity): Settlement | null {
    let closest: Settlement | null = null;
    let minDistSq = maxDist * maxDist;

    for (const s of this.settlements.values()) {
      const dx = s.x - x;
      const dy = s.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = s;
      }
    }

    return closest;
  }

  public findSettlementAt(worldX: number, worldY: number, radius: number = 3.0): Settlement | null {
    let best: Settlement | null = null;
    let minDistSq = radius * radius;

    for (const s of this.settlements.values()) {
      const dx = s.x - worldX;
      const dy = s.y - worldY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        best = s;
      }
    }

    return best;
  }

  /**
   * Periodic check: scan for natural clusters of humans living near houses to found settlements
   */
  public checkForNewSettlements(
    world: World,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    // 1. Group humans without settlement
    const unalignedHumans = Array.from(entityManager.humans.values()).filter(
      (h) => h.settlementId === null && h.lifeStage !== 'CHILD'
    );

    if (unalignedHumans.length < SIMULATION_CONFIG.settlementMinPop) return;

    // Cluster search
    for (const human of unalignedHumans) {
      if (human.settlementId !== null) continue;

      // Find nearby unaligned humans
      const cluster = unalignedHumans.filter((other) => {
        if (other.settlementId !== null) return false;
        const dist = Math.hypot(human.x - other.x, human.y - other.y);
        return dist <= SIMULATION_CONFIG.settlementProximityRadius;
      });

      if (cluster.length >= SIMULATION_CONFIG.settlementMinPop) {
        // Check if there is at least one house or construction site nearby
        const nearbyBuildings = Array.from(buildingManager.buildings.values()).filter((b) => {
          const dist = Math.hypot(human.x - (b.x + b.width / 2), human.y - (b.y + b.height / 2));
          return dist <= SIMULATION_CONFIG.settlementProximityRadius;
        });

        // Or if humans have accumulated enough wood & stone to start
        const totalWood = cluster.reduce((sum, h) => sum + h.inventory.wood, 0);
        const totalStone = cluster.reduce((sum, h) => sum + h.inventory.stone, 0);

        if (nearbyBuildings.length >= SIMULATION_CONFIG.settlementMinHouses || (totalWood >= 15 && totalStone >= 5)) {
          // Average position for center
          const avgX = Math.round(cluster.reduce((sum, h) => sum + h.x, 0) / cluster.length);
          const avgY = Math.round(cluster.reduce((sum, h) => sum + h.y, 0) / cluster.length);

          const name = this.generateName();
          const settlement = this.createSettlement(name, avgX, avgY);

          // Assign humans
          for (const member of cluster) {
            member.settlementId = settlement.id;
            settlement.addMember(member.id);
            // Deposit initial supplies into settlement
            settlement.depositWood(member.inventory.wood);
            settlement.depositStone(member.inventory.stone);
            member.inventory.wood = 0;
            member.inventory.stone = 0;
          }

          // Assign nearby unassigned buildings
          for (const b of nearbyBuildings) {
            if (!b.settlementId) {
              b.settlementId = settlement.id;
              settlement.addBuilding(b.id);
            }
          }

          historyManager.logEvent(
            gameYear,
            `Year ${gameYear} — The settlement of ${settlement.name} was founded!`,
            'SETTLEMENT_FOUNDED',
            '#10b981'
          );

          break;
        }
      }
    }
  }

  /**
   * Update settlement infrastructure, building queues, and professions
   */
  public updateSettlements(
    world: World,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    resourceManager: any,
    isAtWar: (kingdomId: string | null) => boolean
  ): void {
    for (const settlement of this.settlements.values()) {
      if (!settlement.memberIds) settlement.memberIds = [];
      if (!settlement.buildingIds) settlement.buildingIds = [];

      // 1. Synchronize alive members
      settlement.memberIds = settlement.memberIds.filter((id) => {
        const h = entityManager.getHuman(id);
        return h !== undefined && h.settlementId === settlement.id;
      });

      // If settlement population drops to 0 and all buildings gone, dismantle
      if (settlement.memberIds.length === 0 && settlement.buildingIds.length === 0) {
        this.settlements.delete(settlement.id);
        continue;
      }

      // 2. Synchronize buildings
      settlement.buildingIds = settlement.buildingIds.filter((id) => buildingManager.getBuilding(id) !== undefined);

      const buildings = settlement.buildingIds.map((id) => buildingManager.getBuilding(id)!).filter(Boolean);
      const houses = buildings.filter((b) => b.type === 'HOUSE');
      const storages = buildings.filter((b) => b.type === 'STORAGE');
      const townHalls = buildings.filter((b) => b.type === 'TOWN_HALL');
      const completedHouses = houses.filter((h) => h.isCompleted);

      // Check housing capacity vs population
      const totalCapacity = completedHouses.length * SIMULATION_CONFIG.houseCapacity;
      const homelessCount = Math.max(0, settlement.population - totalCapacity);

      // 3. Queue new buildings if needed and resources permit
      const unbuiltCount = buildings.filter((b) => !b.isCompleted).length;

      if (unbuiltCount === 0) {
        // Town Hall priority: if none exists and pop >= 6, build Town Hall
        if (townHalls.length === 0 && settlement.population >= 6 && settlement.storage.wood >= 20) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 3, 3, 14);
          if (site) {
            const th = buildingManager.placeBuilding('TOWN_HALL', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(th.id);
            settlement.withdrawWood(Math.min(settlement.storage.wood, 20));
            settlement.withdrawStone(Math.min(settlement.storage.stone, 10));
          }
        }
        // Storage: if >= 2 completed houses and no storage, build storage
        else if (completedHouses.length >= 2 && storages.length === 0 && settlement.storage.wood >= 15) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 2, 2, 12);
          if (site) {
            const st = buildingManager.placeBuilding('STORAGE', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(st.id);
            settlement.withdrawWood(Math.min(settlement.storage.wood, 15));
            settlement.withdrawStone(Math.min(settlement.storage.stone, 5));
          }
        }
        // House: if homeless people exist and we have resources
        else if (homelessCount > 0 || completedHouses.length === 0) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 2, 2, 16);
          if (site) {
            const house = buildingManager.placeBuilding('HOUSE', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(house.id);
            settlement.withdrawWood(Math.min(settlement.storage.wood, 10));
            settlement.withdrawStone(Math.min(settlement.storage.stone, 5));
          }
        }
      }

      // 4. Profession assignment based on communal needs
      const members = settlement.memberIds
        .map((id) => entityManager.getHuman(id))
        .filter((h): h is NonNullable<typeof h> => h !== undefined && h.lifeStage !== 'CHILD');

      const totalAdults = members.length;
      if (totalAdults > 0) {
        const atWar = isAtWar(settlement.kingdomId);
        const soldierRatio = atWar ? 0.35 : 0.15;
        const targetSoldiers = Math.max(atWar ? 2 : 1, Math.floor(totalAdults * soldierRatio));
        const targetBuilders = unbuiltCount > 0 ? Math.max(1, Math.floor(totalAdults * 0.25)) : 0;
        const targetWoodcutters = Math.max(1, Math.floor((totalAdults - targetSoldiers - targetBuilders) * 0.45));
        const targetMiners = Math.max(1, Math.floor((totalAdults - targetSoldiers - targetBuilders) * 0.3));

        let currentSoldiers = 0;
        let currentBuilders = 0;
        let currentWoodcutters = 0;
        let currentMiners = 0;

        for (const h of members) {
          if (currentSoldiers < targetSoldiers) {
            h.profession = 'SOLDIER';
            currentSoldiers++;
          } else if (currentBuilders < targetBuilders) {
            h.profession = 'BUILDER';
            currentBuilders++;
          } else if (currentWoodcutters < targetWoodcutters) {
            h.profession = 'WOODCUTTER';
            currentWoodcutters++;
          } else if (currentMiners < targetMiners) {
            h.profession = 'MINER';
            currentMiners++;
          } else {
            h.profession = 'WORKER';
          }
        }
      }
    }
  }

  public clear(): void {
    this.settlements.clear();
    this.usedNames.clear();
    this.selectedSettlementId = null;
  }
}
