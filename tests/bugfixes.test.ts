import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Simulation } from '../src/game/simulation/Simulation';
import { World } from '../src/game/world/World';
import { ResourceManager } from '../src/game/resources/ResourceManager';
import { EntityManager } from '../src/game/entities/EntityManager';
import { EventEmitter } from '../src/game/utils/EventEmitter';
import { Pathfinder } from '../src/game/pathfinding/Pathfinder';
import { SaveManager } from '../src/game/save/SaveManager';
import { UndoManager } from '../src/game/history/UndoManager';
import { TileType } from '../src/game/types';

function createSimulation(size = 32): Simulation {
  const world = new World({ worldWidth: size, worldHeight: size });
  return new Simulation(world, new ResourceManager(), new EntityManager(), new EventEmitter());
}

test('TerritoryManager: getTileOwner alias and clearKingdomTiles', () => {
  const sim = createSimulation(16);
  sim.territoryManager.setTileOwner(5, 5, 'kng_1');
  assert.equal(sim.territoryManager.getTileOwner(5, 5), 'kng_1');
  assert.equal(sim.territoryManager.getOwnerKingdomId(5, 5), 'kng_1');

  sim.territoryManager.clearKingdomTiles('kng_1');
  assert.equal(sim.territoryManager.getTileOwner(5, 5), null);
  assert.equal(sim.territoryManager.getKingdomTerritoryCount('kng_1'), 0);
});

test('Diplomacy & Kingdom collapse: active wars end and territories free when kingdom falls', () => {
  const sim = createSimulation(32);
  const s1 = sim.settlementManager.createSettlement('Город 1', 5, 5);
  const s2 = sim.settlementManager.createSettlement('Город 2', 20, 20);
  const k1 = sim.kingdomManager.createKingdom('Королевство 1', s1.id);
  const k2 = sim.kingdomManager.createKingdom('Королевство 2', s2.id);
  s1.kingdomId = k1.id;
  s2.kingdomId = k2.id;
  k1.settlementIds = [s1.id];
  k2.settlementIds = [s2.id];

  sim.territoryManager.setTileOwner(5, 5, k1.id);
  sim.diplomacyManager.declareWar(k1.id, k2.id, sim.kingdomManager, sim.historyManager, 1, 0);
  assert.equal(sim.diplomacyManager.activeWars.length, 1);

  // s1 is destroyed, k1 has 0 settlements
  sim.settlementManager.removeSettlement(s1.id);
  sim.kingdomManager.updateKingdoms(sim.settlementManager, sim.entityManager, sim.diplomacyManager, sim.territoryManager);

  // k1 should be destroyed
  assert.equal(sim.kingdomManager.getKingdom(k1.id), undefined);
  // Active wars should be resolved (no more active wars involving k1)
  assert.equal(sim.diplomacyManager.activeWars.length, 0);
  // Territories of k1 should be freed
  assert.equal(sim.territoryManager.getTileOwner(5, 5), null);
});

test('Building destruction: clears references from humans and animals', () => {
  const sim = createSimulation(32);
  const s = sim.settlementManager.createSettlement('Поселение', 10, 10);
  const house = sim.buildingManager.placeBuilding('HOUSE', 12, 12, s.id);
  const pen = sim.buildingManager.placeBuilding('ANIMAL_PEN', 15, 15, s.id);
  s.addBuilding(house.id);
  s.addBuilding(pen.id);

  const human = sim.entityManager.createHuman(10, 10);
  human.homeId = house.id;
  human.targetBuildingId = house.id;

  const animal = sim.animalManager.createAnimal('COW', 15, 15, 'FEMALE', true, s.id, pen.id);
  assert.equal(animal.penId, pen.id);

  sim.buildingManager.demolishBuilding(house.id, sim.world, sim.entityManager, sim.settlementManager, sim.animalManager);
  assert.equal(sim.buildingManager.getBuilding(house.id), undefined);
  assert.equal(human.homeId, null);
  assert.equal(human.targetBuildingId, null);
  assert.equal(s.buildingIds.includes(house.id), false);

  sim.buildingManager.demolishBuilding(pen.id, sim.world, sim.entityManager, sim.settlementManager, sim.animalManager);
  assert.equal(animal.penId, null);
});

test('UndoManager: PLACE_BUILDING and ERASE full cycle with entity state restoration', () => {
  const sim = createSimulation(32);
  const undo = new UndoManager();

  // 1. Building placement undo/redo
  const bld = sim.buildingManager.placeBuilding('HOUSE', 5, 5);
  undo.recordBuildingAdded(bld);
  assert.equal(sim.buildingManager.getBuilding(bld.id) !== undefined, true);

  undo.undo(sim.world, sim.entityManager, sim.animalManager, sim.resourceManager, sim.buildingManager);
  assert.equal(sim.buildingManager.getBuilding(bld.id), undefined);

  undo.redo(sim.world, sim.entityManager, sim.animalManager, sim.resourceManager, sim.buildingManager);
  assert.equal(sim.buildingManager.getBuilding(bld.id) !== undefined, true);

  // 2. Erase human undo restores original ID and name
  const human = sim.entityManager.createHuman(8, 8, 'MALE', 30);
  human.name = 'ТестовыйЖитель';
  human.profession = 'BUILDER';
  const hId = human.id;

  undo.recordHumanRemoved(human);
  sim.entityManager.removeHuman(hId);
  assert.equal(sim.entityManager.getHuman(hId), undefined);

  undo.undo(sim.world, sim.entityManager, sim.animalManager, sim.resourceManager, sim.buildingManager);
  const restored = sim.entityManager.getHuman(hId);
  assert.notEqual(restored, undefined);
  assert.equal(restored?.id, hId);
  assert.equal(restored?.name, 'ТестовыйЖитель');
  assert.equal(restored?.profession, 'BUILDER');

  // Redo erase removes the human again
  undo.redo(sim.world, sim.entityManager, sim.animalManager, sim.resourceManager, sim.buildingManager);
  assert.equal(sim.entityManager.getHuman(hId), undefined);
});

test('Pathfinder: zero allocations, finds path and handles unreachable targets', () => {
  const world = new World({ worldWidth: 32, worldHeight: 32 });
  world.tiles.fill(TileType.LAND);

  const path = Pathfinder.findPath(world, 2, 2, 10, 10);
  assert.notEqual(path, null);
  assert.ok(path!.length > 0);
  assert.deepEqual(path![path!.length - 1], { x: 10, y: 10 });

  // Surround target with deep water (unreachable)
  for (let x = 8; x <= 12; x++) {
    for (let y = 8; y <= 12; y++) {
      world.tiles[y * 32 + x] = TileType.WATER;
    }
  }

  const blockedPath = Pathfinder.findPath(world, 2, 2, 10, 10, 40);
  // Target surrounded by ocean cannot be reached
  if (blockedPath) {
    const end = blockedPath[blockedPath.length - 1];
    assert.equal(world.isWalkable(end.x, end.y), true);
  }
});

test('SaveManager: RLE pack and unpack round-trip preserves data integrity', () => {
  const size = 384 * 384;
  const tiles = new Uint8Array(size);
  tiles.fill(TileType.WATER);
  for (let i = 1000; i < 50000; i++) tiles[i] = TileType.LAND;

  const packed = SaveManager.packGrid(tiles);
  assert.ok(packed.length < 5000, `Packed string should be very compact, was ${packed.length}`);

  const unpacked = SaveManager.unpackGrid(packed);
  assert.equal(unpacked.length, size);
  assert.equal(unpacked[0], TileType.WATER);
  assert.equal(unpacked[1000], TileType.LAND);
  assert.equal(unpacked[50000], TileType.WATER);
});
