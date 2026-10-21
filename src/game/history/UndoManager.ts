import { World } from '../world/World';
import { EntityManager } from '../entities/EntityManager';
import { AnimalManager } from '../entities/AnimalManager';
import { ResourceManager } from '../resources/ResourceManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { TileType, AnimalSpecies } from '../types';
import { Human } from '../entities/Human';
import { Animal } from '../entities/Animal';

export interface TileChange {
  index: number;
  prevTile: TileType;
  prevElevation: number;
  newTile: TileType;
  newElevation: number;
}

export type UndoAction =
  | {
      type: 'TERRAIN_STROKE';
      changes: TileChange[];
      label?: string;
    }
  | {
      type: 'SPAWN_HUMAN';
      humanIds: string[];
      locations: { id: string; x: number; y: number }[];
    }
  | {
      type: 'SPAWN_ANIMAL';
      animalIds: string[];
      species: AnimalSpecies;
      locations: { id: string; x: number; y: number }[];
    }
  | {
      type: 'PLACE_RESOURCE';
      resourceId: string;
      resType: string;
      x: number;
      y: number;
    }
  | {
      type: 'PLACE_BUILDING';
      buildingId: string;
      buildingType?: any;
      x?: number;
      y?: number;
      settlementId?: string | null;
      kingdomId?: string | null;
    }
  | {
      type: 'ERASE';
      tileChanges?: TileChange[];
      removedEntityIds?: string[];
      removedResourceNodes?: { id: string; type: any; x: number; y: number; amount: number }[];
      removedHumans?: { id: string; x: number; y: number; name?: string; sex?: any; age?: number; profession?: any; inventory?: any }[];
      removedAnimals?: { id: string; species: AnimalSpecies; x: number; y: number; isDomesticated?: boolean; ownerSettlementId?: string | null }[];
    };

export class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxHistory: number = 40;

  // Active stroke recording buffer
  private currentStroke: Map<number, TileChange> | null = null;
  private currentStrokeLabel: string | null = null;

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.currentStrokeLabel = null;
  }

  public beginStroke(label?: string): void {
    this.currentStroke = new Map();
    this.currentStrokeLabel = label || null;
  }

  public recordHumanAdded(human: Human): void {
    this.pushAction({
      type: 'SPAWN_HUMAN',
      humanIds: [human.id],
      locations: [{ id: human.id, x: human.x, y: human.y }],
    });
  }

  public recordAnimalAdded(animal: Animal): void {
    this.pushAction({
      type: 'SPAWN_ANIMAL',
      animalIds: [animal.id],
      species: animal.species,
      locations: [{ id: animal.id, x: animal.x, y: animal.y }],
    });
  }

  public recordBuildingAdded(building: any): void {
    this.pushAction({
      type: 'PLACE_BUILDING',
      buildingId: building.id,
      buildingType: building.type,
      x: building.x,
      y: building.y,
      settlementId: building.settlementId,
      kingdomId: building.kingdomId,
    });
  }

  public recordHumanRemoved(human: Human): void {
    this.pushAction({
      type: 'ERASE',
      removedHumans: [{
        id: human.id,
        x: human.x,
        y: human.y,
        name: human.name,
        sex: human.sex,
        age: human.age,
        profession: human.profession,
        inventory: { ...human.inventory },
      }],
    });
  }

  public recordAnimalRemoved(animal: Animal): void {
    this.pushAction({
      type: 'ERASE',
      removedAnimals: [{
        id: animal.id,
        species: animal.species,
        x: animal.x,
        y: animal.y,
        isDomesticated: animal.isDomesticated,
        ownerSettlementId: animal.ownerSettlementId,
      }],
    });
  }

  public recordTileChange(
    index: number,
    prevTile: TileType,
    prevElevation: number,
    newTile: TileType,
    newElevation: number
  ): void {
    if (!this.currentStroke) return;
    if (this.currentStroke.has(index)) {
      // Keep original prevTile from start of stroke, update newTile
      const existing = this.currentStroke.get(index)!;
      existing.newTile = newTile;
      existing.newElevation = newElevation;
    } else {
      this.currentStroke.set(index, {
        index,
        prevTile,
        prevElevation,
        newTile,
        newElevation,
      });
    }
  }

  public endStroke(): void {
    if (!this.currentStroke || this.currentStroke.size === 0) {
      this.currentStroke = null;
      return;
    }

    const changes = Array.from(this.currentStroke.values()).filter(
      (c) => c.prevTile !== c.newTile || Math.abs(c.prevElevation - c.newElevation) > 0.01
    );

    if (changes.length > 0) {
      this.pushAction({
        type: 'TERRAIN_STROKE',
        changes,
      });
    }

    this.currentStroke = null;
  }

  public pushAction(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo when new action is taken
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(
    world: World,
    entityManager?: EntityManager,
    animalManager?: AnimalManager,
    resourceManager?: ResourceManager,
    buildingManager?: BuildingManager
  ): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;

    if (action.type === 'TERRAIN_STROKE') {
      for (const change of action.changes) {
        const x = change.index % world.width;
        const y = Math.floor(change.index / world.width);
        world.setTile(x, y, change.prevTile, change.prevElevation);
      }
      world.recalculateWaterDepth();
      world.recalculateAllBorders();
    } else if (action.type === 'SPAWN_HUMAN' && entityManager) {
      for (const id of action.humanIds) {
        entityManager.removeHuman(id);
      }
    } else if (action.type === 'SPAWN_ANIMAL' && animalManager) {
      for (const id of action.animalIds) {
        animalManager.removeAnimal(id);
      }
    } else if (action.type === 'PLACE_RESOURCE' && resourceManager) {
      resourceManager.removeResource(action.resourceId);
    } else if (action.type === 'PLACE_BUILDING' && buildingManager) {
      buildingManager.removeBuilding(action.buildingId);
    } else if (action.type === 'ERASE') {
      if (action.tileChanges) {
        for (const change of action.tileChanges) {
          const x = change.index % world.width;
          const y = Math.floor(change.index / world.width);
          world.setTile(x, y, change.prevTile, change.prevElevation);
        }
        world.recalculateWaterDepth();
        world.recalculateAllBorders();
      }
      if (action.removedResourceNodes && resourceManager) {
        for (const r of action.removedResourceNodes) {
          resourceManager.addResource(r.type, r.x, r.y);
        }
      }
      if (action.removedHumans && entityManager) {
        for (const h of action.removedHumans) {
          const restored = entityManager.createHuman(Math.floor(h.x), Math.floor(h.y), h.sex, h.age);
          if (h.id) {
            entityManager.humans.delete(restored.id);
            restored.restoreId(h.id);
            entityManager.humans.set(restored.id, restored);
          }
          if (h.name) restored.name = h.name;
          if (h.profession) restored.profession = h.profession;
          if (h.inventory) restored.inventory = { ...h.inventory };
        }
      }
      if (action.removedAnimals && animalManager) {
        for (const a of action.removedAnimals) {
          const restored = animalManager.createAnimal(a.species, a.x, a.y, undefined, a.isDomesticated, a.ownerSettlementId);
          if (a.id) {
            animalManager.animals.delete(restored.id);
            restored.restoreId(a.id);
            animalManager.animals.set(restored.id, restored);
          }
        }
      }
    }

    this.redoStack.push(action);
    return true;
  }

  public redo(
    world: World,
    entityManager?: EntityManager,
    animalManager?: AnimalManager,
    resourceManager?: ResourceManager,
    buildingManager?: BuildingManager
  ): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    if (action.type === 'TERRAIN_STROKE') {
      for (const change of action.changes) {
        const x = change.index % world.width;
        const y = Math.floor(change.index / world.width);
        world.setTile(x, y, change.newTile, change.newElevation);
      }
      world.recalculateWaterDepth();
      world.recalculateAllBorders();
    } else if (action.type === 'SPAWN_HUMAN' && entityManager) {
      for (const loc of action.locations) {
        entityManager.addHuman(loc.x, loc.y, world);
      }
    } else if (action.type === 'SPAWN_ANIMAL' && animalManager) {
      for (const loc of action.locations) {
        animalManager.addAnimal(action.species, loc.x, loc.y);
      }
    } else if (action.type === 'PLACE_RESOURCE' && resourceManager) {
      resourceManager.addResource(action.resType as any, action.x, action.y);
    } else if (action.type === 'PLACE_BUILDING' && buildingManager) {
      if (action.buildingType && action.x !== undefined && action.y !== undefined) {
        const bld = buildingManager.placeBuilding(action.buildingType, action.x, action.y, action.settlementId, action.kingdomId);
        if (bld && action.buildingId) {
          buildingManager.buildings.delete(bld.id);
          bld.restoreId(action.buildingId);
          buildingManager.buildings.set(bld.id, bld);
        }
      }
    } else if (action.type === 'ERASE') {
      if (action.tileChanges) {
        for (const change of action.tileChanges) {
          const x = change.index % world.width;
          const y = Math.floor(change.index / world.width);
          world.setTile(x, y, change.newTile, change.newElevation);
        }
        world.recalculateWaterDepth();
        world.recalculateAllBorders();
      }
      if (action.removedResourceNodes && resourceManager) {
        for (const r of action.removedResourceNodes) {
          resourceManager.removeResource(r.id);
        }
      }
      if (action.removedHumans && entityManager) {
        for (const h of action.removedHumans) {
          entityManager.removeHuman(h.id);
        }
      }
      if (action.removedAnimals && animalManager) {
        for (const a of action.removedAnimals) {
          animalManager.removeAnimal(a.id);
        }
      }
    }

    this.undoStack.push(action);
    return true;
  }
}
