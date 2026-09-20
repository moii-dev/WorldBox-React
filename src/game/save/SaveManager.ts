import { WorldSaveData } from '../types';
import type { Simulation } from '../simulation/Simulation';

export interface SaveSlotMeta {
  slot: number;
  exists: boolean;
  name: string;
  date: string;
  year: number;
  population: number;
  kingdomsCount: number;
}

export class SaveManager {
  private static readonly STORAGE_PREFIX = 'godsim_save_slot_';

  public static getSlotKey(slot: number): string {
    return `${SaveManager.STORAGE_PREFIX}${slot}`;
  }

  public static getSlots(): SaveSlotMeta[] {
    const slots: SaveSlotMeta[] = [];
    for (let i = 1; i <= 3; i++) {
      const raw = localStorage.getItem(SaveManager.getSlotKey(i));
      if (!raw) {
        slots.push({
          slot: i,
          exists: false,
          name: `Слот ${i} (Пусто)`,
          date: '-',
          year: 1,
          population: 0,
          kingdomsCount: 0,
        });
      } else {
        try {
          const data: WorldSaveData = JSON.parse(raw);
          slots.push({
            slot: i,
            exists: true,
            name: data.name || `Мир (Слот ${i})`,
            date: data.date || '',
            year: data.gameYear || 1,
            population: data.humans?.length || 0,
            kingdomsCount: data.kingdoms?.length || 0,
          });
        } catch {
          slots.push({
            slot: i,
            exists: false,
            name: `Слот ${i} (Ошибка данных)`,
            date: '-',
            year: 1,
            population: 0,
            kingdomsCount: 0,
          });
        }
      }
    }
    return slots;
  }

  public static serializeWorld(sim: Simulation, name: string = 'Мой Мир'): WorldSaveData {
    const world = sim.world;

    // Serialize arrays
    const tilesArr = Array.from(world.tiles);
    const elevationArr = Array.from(world.elevation);
    const biomesArr = Array.from(world.biomesArray);
    const roadsArr = sim.roadSystem ? Array.from(sim.roadSystem.roads) : [];
    const roadWearArr = sim.roadSystem ? Array.from(sim.roadSystem.wear) : [];

    const humans = Array.from(sim.entityManager.humans.values()).map((h) => ({
      id: h.id,
      name: h.name,
      sex: h.sex,
      age: h.age,
      health: h.health,
      maxHealth: h.maxHealth,
      hunger: h.hunger,
      profession: h.profession,
      state: h.state,
      inventory: h.inventory,
      x: h.x,
      y: h.y,
      settlementId: h.settlementId,
      kingdomId: h.kingdomId,
      homeId: h.homeId,
      partnerId: h.partnerId,
      parents: h.parents,
      children: h.children,
      kills: h.kills,
      animalsHunted: h.animalsHunted,
      colorTheme: h.colorTheme,
      weapon: h.weapon,
      armor: h.armor,
      faith: h.faith,
      inShipId: h.inShipId,
    }));

    const buildings = Array.from(sim.buildingManager.buildings.values()).map((b) => ({
      id: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      settlementId: b.settlementId,
      kingdomId: b.kingdomId,
      constructionProgress: b.constructionProgress,
      isCompleted: b.isCompleted,
      woodNeeded: b.woodNeeded,
      woodDelivered: b.woodDelivered,
      stoneNeeded: b.stoneNeeded,
      stoneDelivered: b.stoneDelivered,
      occupants: b.occupants,
      maxOccupants: b.maxOccupants,
      health: b.health,
      maxHealth: b.maxHealth,
      cropStage: b.cropStage,
      cropProgress: b.cropProgress,
      livestockIds: b.livestockIds,
    }));

    const settlements = Array.from(sim.settlementManager.settlements.values()).map((s) => ({
      id: s.id,
      name: s.name,
      x: s.x,
      y: s.y,
      kingdomId: s.kingdomId,
      memberIds: s.memberIds,
      buildingIds: s.buildingIds,
      storage: s.storage,
      territoryTiles: s.territoryTiles,
      era: s.era,
      techPoints: s.techPoints,
      faith: s.faith,
      isCoastal: s.isCoastal,
      shipsCount: s.shipsCount,
    }));

    const kingdoms = Array.from(sim.kingdomManager.kingdoms.values()).map((k) => ({
      id: k.id,
      name: k.name,
      color: k.color,
      capitalSettlementId: k.capitalSettlementId,
      settlementIds: k.settlementIds,
      relations: k.relations,
      atWarWith: k.atWarWith,
      rulerName: k.rulerName,
      rulerTrait: k.rulerTrait,
      era: k.era,
      faith: k.faith,
    }));

    const animals = Array.from(sim.animalManager.animals.values()).map((a) => ({
      id: a.id,
      species: a.species,
      x: a.x,
      y: a.y,
      health: a.health,
      maxHealth: a.maxHealth,
      age: a.age,
      isDomesticated: a.isDomesticated,
      ownerSettlementId: a.ownerSettlementId,
      penId: a.penId,
      state: a.state,
    }));

    const carcasses = Array.from(sim.animalManager.carcasses.values()).map((c) => ({
      id: c.id,
      species: c.species,
      x: c.x,
      y: c.y,
      meatAmount: c.meatAmount,
      decay: c.decay,
      maxDecay: c.maxDecay,
    }));

    const resources = Array.from(sim.resourceManager.resources.values()).map((r) => ({
      id: r.id,
      type: r.type,
      x: r.x,
      y: r.y,
      variant: r.variant,
      amount: r.amount,
      maxAmount: r.maxAmount,
    }));

    const ships = sim.shipManager
      ? Array.from(sim.shipManager.ships.values()).map((s) => ({
          id: s.id,
          type: s.type,
          x: s.x,
          y: s.y,
          targetX: s.targetX,
          targetY: s.targetY,
          settlementId: s.settlementId,
          kingdomId: s.kingdomId,
          passengers: s.passengers,
          cargo: s.cargo,
          state: s.state,
          health: s.health,
          maxHealth: s.maxHealth,
          speed: s.speed,
          facing: s.facing,
        }))
      : [];

    const now = new Date();
    const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return {
      version: 3,
      name,
      date: dateStr,
      gameYear: sim.gameYear,
      tickCount: sim.tickCount,
      width: world.width,
      height: world.height,
      tiles: tilesArr,
      elevation: elevationArr,
      biomesArray: biomesArr,
      roads: roadsArr,
      roadWear: roadWearArr,
      humans,
      buildings,
      settlements,
      kingdoms,
      animals,
      carcasses,
      resources,
      ships,
      events: sim.historyManager.getEvents(),
      populationReports: sim.populationManager.getReports(sim.entityManager.population),
      climate: sim.climateManager.getState(),
      diplomaticPacts: Array.from(sim.diplomacyManager.pacts.values()),
    };
  }

  public static saveToSlot(slot: number, sim: Simulation, name?: string): boolean {
    try {
      const data = SaveManager.serializeWorld(sim, name || `Мир Эпоха ${sim.gameYear}`);
      localStorage.setItem(SaveManager.getSlotKey(slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save to slot:', e);
      return false;
    }
  }

  public static loadFromSlot(slot: number, sim: Simulation): boolean {
    try {
      const raw = localStorage.getItem(SaveManager.getSlotKey(slot));
      if (!raw) return false;
      const data: WorldSaveData = JSON.parse(raw);
      return SaveManager.deserializeWorld(data, sim);
    } catch (e) {
      console.error('Failed to load from slot:', e);
      return false;
    }
  }

  public static deserializeWorld(data: WorldSaveData, sim: Simulation): boolean {
    try {
      const world = sim.world;

      // 1. Restore terrain
      if (data.tiles && data.tiles.length === world.width * world.height) {
        world.tiles.set(new Uint8Array(data.tiles));
      }
      if (data.elevation && data.elevation.length === world.width * world.height) {
        world.elevation.set(new Float32Array(data.elevation));
      }
      if (data.biomesArray && data.biomesArray.length === world.width * world.height) {
        world.biomesArray.set(new Uint8Array(data.biomesArray));
      }

      // 2. Restore roads
      if (sim.roadSystem && data.roads && data.roads.length === world.width * world.height) {
        sim.roadSystem.roads.set(new Uint8Array(data.roads));
      }
      if (sim.roadSystem && data.roadWear && data.roadWear.length === world.width * world.height) {
        sim.roadSystem.wear.set(new Uint8Array(data.roadWear));
      }

      // 3. Clear existing state
      sim.entityManager.humans.clear();
      sim.buildingManager.buildings.clear();
      sim.settlementManager.settlements.clear();
      sim.kingdomManager.kingdoms.clear();
      sim.diplomacyManager.clear();
      sim.animalManager.animals.clear();
      sim.animalManager.carcasses.clear();
      sim.resourceManager.resources.clear();
      if (sim.shipManager) sim.shipManager.clear();

      // 4. Restore Kingdoms
      for (const kData of data.kingdoms || []) {
        const k = sim.kingdomManager.createKingdom(kData.name, kData.capitalSettlementId);
        k.id = kData.id;
        if (kData.color) k.color = kData.color;
        k.settlementIds = kData.settlementIds || [];
        k.relations = kData.relations || {};
        k.atWarWith = kData.atWarWith || [];
        k.rulerName = kData.rulerName || 'Правитель';
        k.rulerTrait = kData.rulerTrait || 'PEACEFUL';
        k.era = kData.era || 'PRIMITIVE';
        k.faith = kData.faith || 0;
      }

      // 5. Restore Settlements
      for (const sData of data.settlements || []) {
        const s = sim.settlementManager.createSettlement(sData.name, sData.x, sData.y, sData.kingdomId);
        s.id = sData.id;
        s.memberIds = sData.memberIds || [];
        s.buildingIds = sData.buildingIds || [];
        s.storage = sData.storage || { wood: 20, stone: 10, food: 30 };
        s.territoryTiles = sData.territoryTiles || [];
        s.era = sData.era || 'PRIMITIVE';
        s.techPoints = sData.techPoints || 0;
        s.faith = sData.faith || 0;
        s.isCoastal = sData.isCoastal || false;
        s.shipsCount = sData.shipsCount || 0;
      }

      // 6. Restore Buildings
      for (const bData of data.buildings || []) {
        const b = sim.buildingManager.placeBuilding(bData.type, bData.x, bData.y, bData.settlementId, bData.kingdomId);
        b.id = bData.id;
        b.width = bData.width;
        b.height = bData.height;
        b.constructionProgress = bData.constructionProgress;
        b.isCompleted = bData.isCompleted;
        b.woodNeeded = bData.woodNeeded;
        b.woodDelivered = bData.woodDelivered;
        b.stoneNeeded = bData.stoneNeeded;
        b.stoneDelivered = bData.stoneDelivered;
        b.occupants = bData.occupants || [];
        b.maxOccupants = bData.maxOccupants || 4;
        b.health = bData.health || 100;
        b.maxHealth = bData.maxHealth || 100;
        b.cropStage = bData.cropStage;
        b.cropProgress = bData.cropProgress;
        b.livestockIds = bData.livestockIds;
      }

      // 7. Restore Humans
      for (const hData of data.humans || []) {
        const h = sim.entityManager.createHuman(hData.x, hData.y, hData.sex, hData.age, hData.parents);
        h.id = hData.id;
        h.name = hData.name;
        h.health = hData.health;
        h.maxHealth = hData.maxHealth;
        h.hunger = hData.hunger;
        h.profession = hData.profession;
        h.state = hData.state;
        h.inventory = hData.inventory || { wood: 0, stone: 0, food: 0 };
        h.settlementId = hData.settlementId;
        h.kingdomId = hData.kingdomId;
        h.homeId = hData.homeId;
        h.partnerId = hData.partnerId;
        h.children = hData.children || [];
        h.kills = hData.kills || 0;
        h.animalsHunted = hData.animalsHunted || 0;
        h.colorTheme = hData.colorTheme;
        h.weapon = hData.weapon || 'CLUB';
        h.armor = hData.armor || 'NONE';
        h.faith = hData.faith || 0;
        h.inShipId = hData.inShipId || null;
      }

      // 8. Restore Animals & Carcasses
      for (const aData of data.animals || []) {
        const a = sim.animalManager.createAnimal(aData.species, aData.x, aData.y);
        a.id = aData.id;
        a.health = aData.health;
        a.maxHealth = aData.maxHealth;
        a.age = aData.age;
        a.isDomesticated = aData.isDomesticated;
        a.ownerSettlementId = aData.ownerSettlementId;
        a.penId = aData.penId;
        a.state = aData.state;
      }

      for (const cData of data.carcasses || []) {
        sim.animalManager.carcasses.set(cData.id, {
          id: cData.id,
          species: cData.species,
          x: cData.x,
          y: cData.y,
          meatAmount: cData.meatAmount,
          decay: cData.decay,
          maxDecay: cData.maxDecay,
        });
      }

      // 9. Restore Resources
      for (const rData of data.resources || []) {
        sim.resourceManager.resources.set(rData.id, {
          id: rData.id,
          type: rData.type,
          x: rData.x,
          y: rData.y,
          variant: rData.variant,
          amount: rData.amount,
          maxAmount: rData.maxAmount,
        });
      }

      // 10. Restore Ships
      if (sim.shipManager && data.ships) {
        for (const sData of data.ships) {
          const ship = sim.shipManager.createShip(sData.type, sData.x, sData.y, sData.settlementId, sData.kingdomId);
          ship.id = sData.id;
          ship.targetX = sData.targetX;
          ship.targetY = sData.targetY;
          ship.passengers = sData.passengers || [];
          ship.cargo = sData.cargo || { wood: 0, stone: 0, food: 0 };
          ship.state = sData.state || 'IDLE';
          ship.health = sData.health || 100;
          ship.maxHealth = sData.maxHealth || 100;
          ship.speed = sData.speed || 0.08;
          ship.facing = sData.facing || 'right';
        }
      }

      // 11. Restore History & Stats
      if (data.events && Array.isArray(data.events)) {
        sim.historyManager.setEvents(data.events);
      }

      sim.populationManager.setReports(
        data.populationReports,
        1 + Math.floor((data.tickCount ?? 0) / 100),
        sim.entityManager.population
      );
      sim.climateManager.setState(data.climate);
      sim.diplomacyManager.setPacts(data.diplomaticPacts);

      sim.tickCount = data.tickCount ?? ((data.gameYear || 1) - 1) * 750;

      return true;
    } catch (e) {
      console.error('Failed to deserialize world data:', e);
      return false;
    }
  }

  public static exportToJson(sim: Simulation): string {
    const data = SaveManager.serializeWorld(sim);
    return JSON.stringify(data, null, 2);
  }

  public static importFromJson(jsonString: string, sim: Simulation): boolean {
    try {
      const data: WorldSaveData = JSON.parse(jsonString);
      return SaveManager.deserializeWorld(data, sim);
    } catch {
      return false;
    }
  }

  public static exportToJsonFile(sim: Simulation, fileName?: string): void {
    const data = SaveManager.serializeWorld(sim);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `worldbox_year_${sim.gameYear}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static importFromJsonFile(file: File, sim: Simulation): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data: WorldSaveData = JSON.parse(content);
          const success = SaveManager.deserializeWorld(data, sim);
          resolve(success);
        } catch {
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }
}
