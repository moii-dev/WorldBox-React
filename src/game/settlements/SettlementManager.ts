import { Settlement } from './Settlement';
import { World } from '../world/World';
import { BuildingManager } from '../buildings/BuildingManager';
import { EntityManager } from '../entities/EntityManager';
import { HistoryManager } from '../history/HistoryManager';
import { SIMULATION_CONFIG } from '../SimulationConfig';
import { Profession } from '../types';

const PREFIXES = [
  'Дубовый', 'Каменный', 'Зеленый', 'Речной', 'Сосновый', 'Железный', 'Волчий', 'Глубокий',
  'Солнечный', 'Высокий', 'Морозный', 'Янтарный', 'Серебряный', 'Штормовой', 'Тенистый', 'Белый',
  'Ясный', 'Ольховый', 'Ясеневый', 'Глиняный', 'Красный', 'Золотой', 'Мшистый', 'Огненный',
  'Кедровый', 'Вороний', 'Ольховый', 'Березовый', 'Ветреный', 'Озерный'
];

const SUFFIXES = [
  ' Дол', ' Брод', ' Причал', ' Пик', ' Холм', ' Рог', ' Порт', ' Лес',
  ' Мост', ' Замок', ' Берег', ' Ручей', ' Ключ', ' Стан', ' Лог', ' Мыс',
  ' Посад', ' Удел', ' Край', ' Острог', ' Плёс', ' Яр', ' Спуск', ' Родник'
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
    const fallback = `Поселение ${this.settlements.size + 1}`;
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
            `Год ${gameYear} — Основано поселение ${settlement.name}!`,
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
      const farms = buildings.filter((b) => b.type === 'FARM');
      const animalPens = buildings.filter((b) => b.type === 'ANIMAL_PEN');
      const completedHouses = houses.filter((h) => h.isCompleted);
      const completedFarms = farms.filter((f) => f.isCompleted);
      const completedPens = animalPens.filter((p) => p.isCompleted);

      // Check housing capacity vs population
      const totalCapacity = completedHouses.length * SIMULATION_CONFIG.houseCapacity;
      const homelessCount = Math.max(0, settlement.population - totalCapacity);

      // 3. Queue new buildings if needed and resources permit
      const unbuiltCount = buildings.filter((b) => !b.isCompleted).length;

      if (unbuiltCount === 0) {
        // Farm priority: ensure at least 1 farm early, and more as population grows
        const desiredFarms = Math.max(1, Math.floor(settlement.population / 4));
        if (farms.length < desiredFarms && settlement.storage.wood >= SIMULATION_CONFIG.farmCost.wood) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 2, 2, 16);
          if (site) {
            const farm = buildingManager.placeBuilding('FARM', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(farm.id);
            settlement.withdrawWood(SIMULATION_CONFIG.farmCost.wood);
          }
        }
        // Animal Pen: if population >= 5, at least 1 pen to herd livestock
        else if (
          animalPens.length < Math.max(1, Math.floor(settlement.population / 8)) &&
          completedHouses.length >= 2 &&
          settlement.storage.wood >= SIMULATION_CONFIG.penCost.wood &&
          settlement.storage.stone >= SIMULATION_CONFIG.penCost.stone
        ) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 3, 3, 18);
          if (site) {
            const pen = buildingManager.placeBuilding('ANIMAL_PEN', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(pen.id);
            settlement.withdrawWood(SIMULATION_CONFIG.penCost.wood);
            settlement.withdrawStone(SIMULATION_CONFIG.penCost.stone);
          }
        }
        // Town Hall priority: if none exists and pop >= 6, build Town Hall
        else if (townHalls.length === 0 && settlement.population >= 6 && settlement.storage.wood >= 20) {
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
        // Blacksmith: if Bronze era or pop >= 8, craft weapons and tools
        else if (
          buildings.filter((b) => b.type === 'BLACKSMITH').length === 0 &&
          (settlement.era !== 'PRIMITIVE' || settlement.population >= 8) &&
          settlement.storage.stone >= 15 &&
          settlement.storage.wood >= 15
        ) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 2, 2, 14);
          if (site) {
            const forge = buildingManager.placeBuilding('BLACKSMITH', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(forge.id);
            settlement.withdrawStone(15);
            settlement.withdrawWood(15);
          }
        }
        // Temple: if faith or Bronze era, generate spiritual unity & divine miracles
        else if (
          buildings.filter((b) => b.type === 'TEMPLE').length === 0 &&
          settlement.era !== 'PRIMITIVE' &&
          settlement.population >= 10 &&
          settlement.storage.stone >= 25 &&
          settlement.storage.wood >= 15
        ) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 3, 3, 16);
          if (site) {
            const temple = buildingManager.placeBuilding('TEMPLE', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(temple.id);
            settlement.withdrawStone(25);
            settlement.withdrawWood(15);
          }
        }
        // Watchtower: military outpost for territory defense
        else if (
          buildings.filter((b) => b.type === 'WATCHTOWER').length < Math.max(1, Math.floor(settlement.population / 12)) &&
          settlement.era !== 'PRIMITIVE' &&
          settlement.storage.stone >= 15 &&
          settlement.storage.wood >= 10
        ) {
          const site = buildingManager.findBuildingSite(world, resourceManager, settlement.x, settlement.y, 2, 2, 18);
          if (site) {
            const tower = buildingManager.placeBuilding('WATCHTOWER', site.x, site.y, settlement.id, settlement.kingdomId);
            settlement.addBuilding(tower.id);
            settlement.withdrawStone(15);
            settlement.withdrawWood(10);
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

      // 4. Profession assignment based on communal survival and food needs
      const members = settlement.memberIds
        .map((id) => entityManager.getHuman(id))
        .filter((h): h is NonNullable<typeof h> => h !== undefined && h.lifeStage !== 'CHILD');

      const totalAdults = members.length;
      if (totalAdults > 0) {
        const atWar = isAtWar(settlement.kingdomId);
        const foodShortage = settlement.storage.food < 20;

        // Target profession counts based on settlement needs
        const targetSoldiers = atWar ? Math.max(2, Math.floor(totalAdults * 0.35)) : (totalAdults >= 5 ? 1 : 0);
        const targetBuilders = unbuiltCount > 0 ? Math.max(1, Math.floor(totalAdults * 0.2)) : 0;
        
        // Food production targets: high priority during food shortage
        const targetFarmers = completedFarms.length > 0 ? Math.min(completedFarms.length * 2, Math.max(1, Math.floor(totalAdults * (foodShortage ? 0.4 : 0.25)))) : 0;
        const targetHunters = Math.max(foodShortage ? 2 : 1, Math.floor(totalAdults * (foodShortage ? 0.35 : 0.2)));
        const targetHerders = completedPens.length > 0 ? 1 : 0;

        let curSoldiers = 0;
        let curBuilders = 0;
        let curFarmers = 0;
        let curHunters = 0;
        let curHerders = 0;
        let curWoodcutters = 0;
        let curMiners = 0;

        for (const h of members) {
          if (curSoldiers < targetSoldiers) {
            h.profession = 'SOLDIER';
            curSoldiers++;
          } else if (foodShortage && curHunters < targetHunters) {
            h.profession = 'HUNTER';
            curHunters++;
          } else if (curFarmers < targetFarmers) {
            h.profession = 'FARMER';
            curFarmers++;
          } else if (curHerders < targetHerders) {
            h.profession = 'HERDER';
            curHerders++;
          } else if (curHunters < targetHunters) {
            h.profession = 'HUNTER';
            curHunters++;
          } else if (curBuilders < targetBuilders) {
            h.profession = 'BUILDER';
            curBuilders++;
          } else if (curWoodcutters < Math.max(1, Math.floor(totalAdults * 0.2))) {
            h.profession = 'WOODCUTTER';
            curWoodcutters++;
          } else if (curMiners < Math.max(1, Math.floor(totalAdults * 0.15))) {
            h.profession = 'MINER';
            curMiners++;
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
