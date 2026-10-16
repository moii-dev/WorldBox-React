import { HumanState, ResourceType, TileType, WorldSaveData } from '../types';
import { BIOME_ID_LIST } from '../world/World';

type RecordValue = Record<string, any>;
const object = (v: unknown): v is RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const string = (v: unknown): v is string => typeof v === 'string';
const strings = (v: unknown): boolean => Array.isArray(v) && v.every(string);
const nonnegative = (v: unknown): boolean => number(v) && v >= 0;
const inventory = (v: unknown): boolean => object(v) && ['wood', 'stone', 'food'].every((k) => nonnegative(v[k]));
const oneOf = (values: readonly unknown[]) => (v: unknown) => values.includes(v);
const era = oneOf(['PRIMITIVE', 'BRONZE', 'IRON', 'IMPERIAL']);
const species = oneOf(['DEER', 'BOAR', 'WOLF', 'CHICKEN', 'COW']);

/** Runtime checks apply before any live state is touched, including JSON imports. */
export function validateSave(value: unknown, width: number, height: number): asserts value is WorldSaveData {
  const fail = (message: string): never => { throw new Error(message); };
  if (!object(value)) fail('Сохранение должно содержать объект мира.');
  const data = value as RecordValue;
  if (!Number.isInteger(data.version) || data.version < 1 || data.version > 4) {
    fail('Неподдерживаемая версия сохранения.');
  }
  if (data.width !== width || data.height !== height) {
    fail(`Размер сохранения ${data.width} × ${data.height} не совпадает с текущим миром ${width} × ${height}. Создайте мир нужного размера перед загрузкой.`);
  }
  // JSON cannot contain non-finite numbers, but callers may also supply objects directly.
  const safe = (v: unknown): boolean => {
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.every(safe);
    if (object(v)) return Object.entries(v).every(([k, item]) =>
      !['__proto__', 'prototype', 'constructor'].includes(k) && safe(item));
    return v == null || typeof v === 'string' || typeof v === 'boolean';
  };
  if (!safe(data)) fail('Сохранение содержит недопустимые значения.');
  const check = (record: RecordValue, key: string, predicate: (v: any) => boolean, required = false) => {
    if (record[key] === undefined && !required) return;
    if (!predicate(record[key])) fail(`Некорректное поле сохранения: ${key}.`);
  };
  check(data, 'name', string);
  check(data, 'date', string);
  check(data, 'gameYear', (v) => Number.isSafeInteger(v) && v >= 1, true);
  check(data, 'tickCount', (v) => Number.isSafeInteger(v) && v >= 0);
  const grid = (key: string, predicate: (v: any) => boolean, required = false) =>
    check(data, key, (v) => Array.isArray(v) && v.length === width * height && v.every(predicate), required);
  grid('tiles', oneOf(Object.values(TileType).filter(number)), true);
  grid('elevation', (v) => number(v) && v >= 0 && v <= 1, true);
  grid('biomesArray', (v) => Number.isInteger(v) && v >= 0 && v < BIOME_ID_LIST.length);
  grid('roads', oneOf([0, 1, 2]));
  grid('roadWear', (v) => Number.isInteger(v) && v >= 0 && v <= 255);

  const positioned = (v: any): boolean => object(v) && number(v.x) && number(v.y) &&
    v.x >= 0 && v.x < width && v.y >= 0 && v.y < height;
  const lists = ['humans', 'buildings', 'settlements', 'kingdoms', 'animals', 'carcasses', 'resources', 'ships'];
  for (const key of lists) {
    check(data, key, Array.isArray, ['humans', 'buildings', 'settlements', 'kingdoms', 'resources'].includes(key));
    const ids = new Set<string>();
    for (const item of data[key] ?? []) {
      if (!object(item) || !string(item.id) || !item.id || ids.has(item.id)) fail(`Некорректный или повторный ID: ${key}.`);
      ids.add(item.id);
      if (key !== 'kingdoms' && !positioned(item)) fail(`Объект вне карты: ${key}.`);
      for (const field of ['memberIds', 'buildingIds', 'settlementIds', 'occupants', 'parents', 'children', 'passengers', 'atWarWith', 'livestockIds']) {
        check(item, field, strings);
      }
      for (const field of ['settlementId', 'kingdomId', 'homeId', 'partnerId', 'inShipId', 'ownerSettlementId', 'penId']) {
        check(item, field, (v) => v === null || string(v));
      }
      for (const field of ['inventory', 'storage', 'cargo']) check(item, field, inventory);
      for (const field of ['age', 'health', 'maxHealth', 'hunger', 'constructionProgress', 'woodNeeded', 'woodDelivered', 'stoneNeeded', 'stoneDelivered', 'maxOccupants', 'cropProgress', 'techPoints', 'faith', 'shipsCount', 'kills', 'animalsHunted', 'meatAmount', 'decay', 'maxDecay', 'amount', 'maxAmount', 'foodAmount', 'maxFood', 'regenerationRate', 'berryCount', 'speed']) {
        check(item, field, number);
      }
      check(item, 'era', era);
      check(item, 'isCompleted', (v) => typeof v === 'boolean');
      check(item, 'isCoastal', (v) => typeof v === 'boolean');
      check(item, 'isDomesticated', (v) => typeof v === 'boolean');
      check(item, 'territoryTiles', (v) => Array.isArray(v) && v.every((p) => positioned(p) && Number.isInteger(p.x) && Number.isInteger(p.y)));
      check(item, 'relations', (v) => object(v) && Object.values(v).every(number));
      check(item, 'socialBonds', (v) => object(v) && Object.values(v).every((b) => object(b) && number(b.score) && number(b.lastInteractionYear)));
      if (key === 'humans') {
        check(item, 'name', string, true);
        check(item, 'sex', oneOf(['MALE', 'FEMALE']), true);
        for (const field of ['age', 'health', 'maxHealth', 'hunger']) check(item, field, number, true);
        check(item, 'state', oneOf(Object.values(HumanState)), true);
        check(item, 'profession', oneOf(['WORKER', 'WOODCUTTER', 'MINER', 'BUILDER', 'SOLDIER', 'HUNTER', 'FARMER', 'HERDER', 'BLACKSMITH', 'PRIEST', 'SAILOR', 'MERCHANT']), true);
        check(item, 'weapon', oneOf(['FISTS', 'CLUB', 'SPEAR', 'BOW', 'SWORD', 'HALBERD']));
        check(item, 'armor', oneOf(['NONE', 'LEATHER', 'IRON', 'PLATE']));
        check(item, 'colorTheme', (v) => object(v) && ['shirt', 'hair', 'skin', 'pants'].every((k) => string(v[k])));
      }
      if (key === 'buildings') {
        check(item, 'type', oneOf(['HOUSE', 'STORAGE', 'TOWN_HALL', 'FARM', 'ANIMAL_PEN', 'WATCHTOWER', 'DEFENSIVE_WALL', 'BLACKSMITH', 'TEMPLE', 'DOCK']), true);
        for (const field of ['width', 'height']) check(item, field, (v) => Number.isInteger(v) && v > 0 && v <= Math.max(width, height), true);
        if (item.x + item.width > width || item.y + item.height > height) fail('Здание выходит за границы карты.');
        for (const field of ['constructionProgress', 'woodNeeded', 'woodDelivered', 'stoneNeeded', 'stoneDelivered']) check(item, field, number, true);
        check(item, 'isCompleted', (v) => typeof v === 'boolean', true);
        check(item, 'cropStage', oneOf(['PLANTING', 'GROWING', 'READY', 'HARVESTING', 'EMPTY']));
      }
      if (key === 'settlements' || key === 'kingdoms') check(item, 'name', string, true);
      if (key === 'kingdoms') {
        check(item, 'capitalSettlementId', string, true);
        check(item, 'color', string);
        check(item, 'rulerName', string);
        check(item, 'rulerTrait', oneOf(['PEACEFUL', 'CRUEL', 'EXPANSIONIST', 'BUILDER', 'DEVOUT', 'MERCHANT']));
      }
      if (key === 'animals' || key === 'carcasses') check(item, 'species', species, true);
      if (key === 'animals') {
        for (const field of ['age', 'health', 'maxHealth']) check(item, field, number, true);
        check(item, 'state', oneOf(['IDLE', 'WANDERING', 'SEARCHING_FOOD', 'EATING', 'FLEEING', 'CHASING', 'ATTACKING', 'RETURNING_TO_HERD', 'MATING', 'FOLLOWING_HERDER', 'RESTING']));
      }
      if (key === 'carcasses') for (const field of ['meatAmount', 'decay', 'maxDecay']) check(item, field, number, true);
      if (key === 'resources') {
        check(item, 'type', oneOf(Object.values(ResourceType)), true);
        for (const field of ['variant', 'amount', 'maxAmount']) check(item, field, number, true);
      }
      if (key === 'ships') {
        check(item, 'type', oneOf(['FISHING_BOAT', 'TRADE_SHIP', 'TRANSPORT_SHIP']), true);
        check(item, 'state', oneOf(['IDLE', 'SAILING', 'FISHING', 'COLONIZING', 'TRADING']));
        check(item, 'facing', oneOf(['left', 'right']));
        for (const field of ['targetX', 'targetY']) check(item, field, number, true);
      }
    }
  }
  check(data, 'events', (v) => Array.isArray(v) && v.every((e) => object(e) && string(e.id) && string(e.text) && string(e.type) && number(e.year) && (e.color == null || string(e.color))));
  check(data, 'populationReports', (v) => Array.isArray(v) && v.every((r) => object(r) && ['year', 'births', 'populationStart', 'populationEnd'].every((k) => nonnegative(r[k])) && object(r.deaths) && Object.values(r.deaths).every(nonnegative)));
  check(data, 'diplomaticPacts', (v) => Array.isArray(v) && v.every((p) => object(p) && string(p.id) && string(p.kingdomAId) && string(p.kingdomBId) && ['ALLIANCE', 'TRADE', 'NON_AGGRESSION'].includes(p.type) && number(p.startYear) && number(p.expiresYear)));
  check(data, 'climate', (v) => object(v) && ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'].includes(v.season) && number(v.seasonProgress) && (v.activeCrisis == null || (positioned(v.activeCrisis) && string(v.activeCrisis.id) && ['DROUGHT', 'COLD_SNAP', 'FLOOD', 'HURRICANE', 'EPIDEMIC'].includes(v.activeCrisis.type) && ['radius', 'remainingTicks', 'durationTicks'].every((k) => nonnegative(v.activeCrisis[k])))));
}
