import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { Simulation } from '../src/game/simulation/Simulation';
import { World } from '../src/game/world/World';
import { ResourceManager } from '../src/game/resources/ResourceManager';
import { EntityManager } from '../src/game/entities/EntityManager';
import { EventEmitter } from '../src/game/utils/EventEmitter';
import { SaveManager } from '../src/game/save/SaveManager';
import { HumanState, ResourceType, TileType } from '../src/game/types';
import { SIMULATION_CONFIG } from '../src/game/SimulationConfig';
import { SoundSynthesizer } from '../src/game/audio/SoundSynthesizer';
import { WorldGenerator } from '../src/game/world/WorldGenerator';

beforeEach(() => {
  mock.method(console, 'error', () => {});
  SoundSynthesizer.enabled = false;
});
afterEach(() => mock.restoreAll());

function simulation(size = 32): Simulation {
  return new Simulation(new World({ worldWidth: size, worldHeight: size }), new ResourceManager(), new EntityManager(), new EventEmitter());
}

function fixture() {
  const sim = simulation();
  sim.world.tiles.fill(TileType.LAND);
  sim.world.elevation.fill(0.55);
  sim.world.recalculateAllBorders();
  const settlement = sim.settlementManager.createSettlement('Город', 10, 10);
  const kingdom = sim.kingdomManager.createKingdom('Королевство', settlement.id);
  settlement.kingdomId = kingdom.id;
  const building = sim.buildingManager.placeBuilding('HOUSE', 12, 12, settlement.id, kingdom.id);
  building.isCompleted = true;
  building.constructionProgress = 1;
  settlement.addBuilding(building.id);
  const human = sim.entityManager.createHuman(13, 14, 'FEMALE', 25);
  human.homeId = building.id;
  human.settlementId = settlement.id;
  human.kingdomId = kingdom.id;
  human.state = HumanState.GATHERING;
  settlement.addMember(human.id);
  building.occupants.push(human.id);
  const animal = sim.animalManager.createAnimal('COW', 16, 16);
  const secondAnimal = sim.animalManager.createAnimal('DEER', 18, 18);
  const carcass = sim.animalManager.spawnCarcass('BOAR', 17, 17, 4);
  const resource = sim.resourceManager.addResource(ResourceType.BERRY_BUSH, 7, 7)!;
  resource.foodAmount = resource.amount = 3;
  const ship = sim.shipManager.createShip('FISHING_BOAT', 2, 2, settlement.id, kingdom.id);
  human.inShipId = ship.id;
  ship.passengers.push(human.id);
  settlement.territoryTiles = [{ x: 10, y: 10 }];
  sim.tickCount = 1234;
  const remaps = [
    [human.id, 'human_10000'], [building.id, 'bld_10000'],
    [settlement.id, 'settle_10000'], [kingdom.id, 'kng_10000'],
    [animal.id, 'animal_2'], [secondAnimal.id, 'animal_10000'],
    [carcass.id, 'carcass_10000'], [resource.id, 'res_10000'], [ship.id, 'ship_10000'],
  ];
  let json = JSON.stringify(SaveManager.serializeWorld(sim));
  // Use placeholders so remapping animal_1 to animal_2 cannot rename the second animal.
  remaps.forEach(([old], i) => { json = json.replaceAll(JSON.stringify(old), JSON.stringify(`placeholder_${i}`)); });
  remaps.forEach(([, id], i) => { json = json.replaceAll(JSON.stringify(`placeholder_${i}`), JSON.stringify(id)); });
  return JSON.parse(json);
}

test('restores IDs, relationships, exact positions and immediate spatial lookups', () => {
  const data = fixture();
  const target = simulation();
  const world = target.world;
  const entities = target.entityManager;
  assert.equal(SaveManager.deserializeWorld(data, target), true);
  assert.equal(target.world, world);
  assert.equal(target.entityManager, entities);
  const human = target.entityManager.getHuman('human_10000')!;
  assert.ok(human);
  assert.equal(human.x, data.humans[0].x);
  assert.equal(human.y, data.humans[0].y);
  assert.equal(human.state, HumanState.IDLE);
  assert.equal(target.entityManager.getHumansNear(human.x, human.y, 2)[0], human);
  assert.ok(target.buildingManager.getBuilding(human.homeId!));
  assert.ok(target.settlementManager.getSettlement(human.settlementId!));
  assert.ok(target.kingdomManager.getKingdom(human.kingdomId!));
  assert.ok(target.shipManager.getShip(human.inShipId!));
  assert.equal(target.animalManager.animals.size, 2);
  assert.ok(target.animalManager.findNearestCarcass(17, 17));
  assert.ok(target.animalManager.findNearestAnimal(16, 16));
  assert.equal(target.resourceManager.getResourceAt(7, 7)?.id, 'res_10000');
  assert.equal(target.resourceManager.berryBushCount, 1);
  assert.equal(target.resourceManager.getResourceAt(7, 7)?.foodAmount, 3);
  assert.equal(target.world.totalLandTiles, 32 * 32);
  assert.equal(target.territoryManager.getOwnerKingdomId(10, 10), human.kingdomId);
  assert.equal(target.tickCount, 1234);
  human.inventory.food = 500;
  assert.notEqual(data.humans[0].inventory.food, 500);
});

test('new entities never overwrite sparse IDs restored from a previous session', () => {
  const target = simulation();
  assert.equal(SaveManager.deserializeWorld(fixture(), target), true);
  const maps = [target.entityManager.humans, target.buildingManager.buildings, target.settlementManager.settlements, target.kingdomManager.kingdoms, target.animalManager.animals, target.animalManager.carcasses, target.resourceManager.resources, target.shipManager.ships];
  const sizes = maps.map((map) => map.size);
  target.entityManager.createHuman(1, 1);
  target.buildingManager.placeBuilding('HOUSE', 2, 2);
  target.settlementManager.createSettlement('Новый', 3, 3);
  target.kingdomManager.createKingdom('Новое', 'settle_10000');
  target.animalManager.createAnimal('DEER', 4, 4);
  target.animalManager.spawnCarcass('DEER', 5, 5, 2);
  target.resourceManager.addResource(ResourceType.TREE, 6, 6);
  target.shipManager.createShip('FISHING_BOAT', 1, 1);
  maps.forEach((map, i) => assert.equal(map.size, sizes[i] + 1));
});

for (const [name, damage] of [
  ['empty object', (_d) => ({})],
  ['null', (_d) => null],
  ['unknown version', (d) => ({ ...d, version: 99 })],
  ['different dimensions', (d) => ({ ...d, width: 64 })],
  ['short terrain', (d) => ({ ...d, tiles: [3] })],
  ['invalid tile', (d) => ({ ...d, tiles: d.tiles.map(() => 255) })],
  ['duplicate IDs', (d) => ({ ...d, humans: [d.humans[0], d.humans[0]] })],
  ['invalid animal species', (d) => ({ ...d, animals: [{ ...d.animals[0], species: 'INVALID' }] })],
  ['invalid coordinate', (d) => ({ ...d, humans: [{ ...d.humans[0], x: Number.NaN }] })],
  ['invalid inventory', (d) => ({ ...d, humans: [{ ...d.humans[0], inventory: { food: 'bad' } }] })],
  ['invalid climate', (d) => ({ ...d, climate: { season: 'INVALID' } })],
] as const) {
  test(`rejects ${name} without changing the running world`, () => {
    const target = simulation();
    target.entityManager.createHuman(4, 4);
    const before = SaveManager.exportToJson(target);
    assert.equal(SaveManager.deserializeWorld(damage(fixture()), target), false);
    assert.ok(SaveManager.lastLoadError);
    assert.equal(SaveManager.exportToJson(target), before);
  });
}

test('preparation failures leave the live state untouched', () => {
  const target = simulation();
  const data = fixture();
  const before = SaveManager.exportToJson(target);
  mock.method(World.prototype, 'recalculateAllBorders', () => { throw new Error('test failure'); });
  assert.equal(SaveManager.deserializeWorld(data, target), false);
  assert.equal(SaveManager.exportToJson(target), before);
});

test('repeated loads clear stale selections, effects and indexes, preserving listeners and settings', () => {
  const target = simulation();
  target.entityManager.maxPopulation = 777;
  let births = 0;
  target.entityManager.onHumanBirth(() => { births++; });
  for (let i = 0; i < 3; i++) {
    assert.equal(SaveManager.deserializeWorld(fixture(), target), true);
    assert.equal(target.entityManager.maxPopulation, 777);
    assert.equal(target.entityManager.population, 1);
    assert.equal(target.resourceManager.resources.size, 1);
    assert.equal(target.animalManager.animals.size, 2);
    assert.equal(target.entityManager.selectedHumanId, null);
    target.entityManager.selectedHumanId = 'human_10000';
  }
  assert.equal(births, 0);
  assert.ok(target.entityManager.addHuman(5, 5, target.world, 'MALE', 0, ['human_10000']));
  assert.equal(births, 1);
  assert.doesNotThrow(() => target.update(0.08));
});

test('preserves zero health and zero building capacity', () => {
  const data = fixture();
  data.buildings[0].health = 0;
  data.buildings[0].maxOccupants = 0;
  data.ships[0].health = 0;
  const target = simulation();
  assert.equal(SaveManager.deserializeWorld(data, target), true);
  assert.equal(target.buildingManager.getBuilding('bld_10000')!.health, 0);
  assert.equal(target.buildingManager.getBuilding('bld_10000')!.maxOccupants, 0);
  assert.equal(target.shipManager.getShip('ship_10000')!.health, 0);
});

test('event IDs continue after the highest saved ID, including truncated logs', () => {
  const data = fixture();
  data.events[0].id = 'evt_9000';
  const target = simulation();
  assert.equal(SaveManager.deserializeWorld(data, target), true);
  const event = target.historyManager.logEvent(target.gameYear, 'Продолжение', 'SETTLEMENT_FOUNDED');
  assert.equal(event.id, 'evt_9001');
});

test('generated terrain from every preset passes validation and survives a round trip', () => {
  for (const preset of ['continents', 'archipelago', 'pangea', 'ring', 'empty'] as const) {
    const source = simulation(128);
    WorldGenerator.generate(source.world, source.resourceManager, preset, 12345);
    source.animalManager.spawnInitialEcosystem(source.world);
    const target = simulation(128);
    assert.equal(SaveManager.importFromJson(SaveManager.exportToJson(source), target), true, `${preset}: ${SaveManager.lastLoadError}`);
    assert.deepEqual(target.world.tiles, source.world.tiles);
    assert.equal(target.resourceManager.resources.size, source.resourceManager.resources.size);
    assert.equal(target.animalManager.animals.size, source.animalManager.animals.size);
    assert.doesNotThrow(() => target.update(0.08));
  }
});

test('older saves use configured year length and optional-field defaults', () => {
  const data = fixture();
  data.version = 1;
  data.gameYear = 8;
  delete data.tickCount;
  for (const key of ['animals', 'carcasses', 'ships', 'biomesArray', 'roads', 'roadWear', 'climate', 'populationReports', 'diplomaticPacts']) delete data[key];
  const target = simulation();
  assert.equal(SaveManager.deserializeWorld(data, target), true);
  assert.equal(target.tickCount, 7 * SIMULATION_CONFIG.ticksPerGameYear);
  assert.equal(target.gameYear, 8);
});

test('JSON and local slot entry points share validation', (t) => {
  const data = fixture();
  const target = simulation();
  const storage = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  assert.equal(SaveManager.importFromJson(JSON.stringify(data), target), true);
  assert.equal(SaveManager.saveToSlot(1, target), true);
  target.entityManager.clear();
  assert.equal(SaveManager.loadFromSlot(1, target), true);
  assert.ok(target.entityManager.getHuman('human_10000'));
  storage.set(SaveManager.getSlotKey(1), '{}');
  const before = SaveManager.exportToJson(target);
  assert.equal(SaveManager.loadFromSlot(1, target), false);
  assert.equal(SaveManager.importFromJson('{', target), false);
  assert.equal(SaveManager.exportToJson(target), before);
});
