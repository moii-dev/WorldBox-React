export enum TileType {
  WATER = 0,
  SHALLOW_WATER = 1,
  SAND = 2,
  LAND = 3,
  FOREST = 4,
  MOUNTAIN = 5,
  SNOW = 6,
  LAVA = 7,
  SWAMP = 8,
}

export enum HumanState {
  IDLE = 'IDLE',
  WANDERING = 'WANDERING',
  SEARCHING_RESOURCE = 'SEARCHING_RESOURCE',
  MOVING_TO_RESOURCE = 'MOVING_TO_RESOURCE',
  GATHERING = 'GATHERING',
  BUILDING = 'BUILDING',
  DELIVERING_RESOURCES = 'DELIVERING_RESOURCES',
  SOCIALIZING = 'SOCIALIZING',
  PATROLLING = 'PATROLLING',
  ATTACKING = 'ATTACKING',
  FLEEING = 'FLEEING',
  COLONIZING = 'COLONIZING',
  SEARCHING_FOOD = 'SEARCHING_FOOD',
  EATING = 'EATING',
  HUNTING = 'HUNTING',
  FARMING = 'FARMING',
  HERDING = 'HERDING',
}

export enum ResourceType {
  TREE = 'TREE',
  STONE = 'STONE',
  BERRY_BUSH = 'BERRY_BUSH',
}

export type Sex = 'MALE' | 'FEMALE';

export type LifeStage = 'CHILD' | 'TEEN' | 'ADULT' | 'ELDER';

export type Profession =
  | 'WORKER'
  | 'WOODCUTTER'
  | 'MINER'
  | 'BUILDER'
  | 'SOLDIER'
  | 'HUNTER'
  | 'FARMER'
  | 'HERDER'
  | 'BLACKSMITH'
  | 'PRIEST'
  | 'SAILOR'
  | 'MERCHANT';

export type BuildingType =
  | 'HOUSE'
  | 'STORAGE'
  | 'TOWN_HALL'
  | 'FARM'
  | 'ANIMAL_PEN'
  | 'WATCHTOWER'
  | 'DEFENSIVE_WALL'
  | 'BLACKSMITH'
  | 'TEMPLE'
  | 'DOCK';

export type EraType = 'PRIMITIVE' | 'BRONZE' | 'IRON' | 'IMPERIAL';
export type Era = EraType;

export type WeaponType = 'FISTS' | 'CLUB' | 'SPEAR' | 'BOW' | 'SWORD' | 'HALBERD';

export type ArmorType = 'NONE' | 'LEATHER' | 'IRON' | 'PLATE';

export type RulerTrait =
  | 'PEACEFUL'
  | 'CRUEL'
  | 'EXPANSIONIST'
  | 'BUILDER'
  | 'DEVOUT'
  | 'MERCHANT';

export type ShipType = 'FISHING_BOAT' | 'TRADE_SHIP' | 'TRANSPORT_SHIP';

export type ShipState = 'IDLE' | 'SAILING' | 'FISHING' | 'COLONIZING' | 'TRADING';

export type RoadType = 'NONE' | 'DIRT' | 'PAVED';

export interface ShipEntity {
  id: string;
  type: ShipType;
  x: number; // world float
  y: number;
  targetX: number;
  targetY: number;
  settlementId: string | null;
  kingdomId: string | null;
  passengers: string[]; // human ids
  cargo: Inventory;
  state: ShipState;
  health: number;
  maxHealth: number;
  speed: number;
  facing: 'left' | 'right';
  path: { x: number; y: number }[];
  sailTimer: number;
  colonizationTarget?: { x: number; y: number; islandName?: string };
}

export interface CaravanEntity {
  id: string;
  merchantId: string;
  fromSettlementId: string;
  toSettlementId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  cargo: Inventory;
  progress: number;
}

export interface ArrowProjectile {
  id: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  targetEntityId: string | null;
  damage: number;
  speed: number;
  progress: number; // 0 to 1
  kingdomId?: string | null;
}

export type AnimalSpecies = 'DEER' | 'BOAR' | 'WOLF' | 'CHICKEN' | 'COW';

export type AnimalState =
  | 'IDLE'
  | 'WANDERING'
  | 'SEARCHING_FOOD'
  | 'EATING'
  | 'FLEEING'
  | 'CHASING'
  | 'ATTACKING'
  | 'RETURNING_TO_HERD'
  | 'MATING'
  | 'FOLLOWING_HERDER'
  | 'RESTING';

export type FoodSourceType = 'BERRIES' | 'MEAT' | 'FARM_FOOD';

export type DiplomaticStatus = 'ALLIED' | 'FRIENDLY' | 'NEUTRAL' | 'TENSE' | 'HOSTILE' | 'WAR';

export type DeathCause =
  | 'OLD_AGE'
  | 'STARVATION'
  | 'COMBAT'
  | 'PREDATOR'
  | 'FIRE'
  | 'LIGHTNING'
  | 'METEOR'
  | 'EARTHQUAKE'
  | 'GRENADE'
  | 'DISEASE'
  | 'FLOOD'
  | 'HURRICANE'
  | 'PLAYER_INTERVENTION';

export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type ClimateCrisisType = 'DROUGHT' | 'COLD_SNAP' | 'FLOOD' | 'HURRICANE' | 'EPIDEMIC';
export type DiplomaticPactType = 'TRADE' | 'NON_AGGRESSION' | 'ALLIANCE';

export interface PopulationReport {
  year: number;
  births: number;
  deaths: Partial<Record<DeathCause, number>>;
  populationStart: number;
  populationEnd: number;
}

export interface ClimateCrisis {
  id: string;
  type: ClimateCrisisType;
  x: number;
  y: number;
  radius: number;
  remainingTicks: number;
  durationTicks: number;
}

export interface ClimateState {
  season: Season;
  seasonProgress: number;
  activeCrisis: ClimateCrisis | null;
}

export interface DiplomaticPact {
  id: string;
  type: DiplomaticPactType;
  kingdomAId: string;
  kingdomBId: string;
  startYear: number;
  expiresYear: number;
}

export type ToolType =
  | 'land'
  | 'forest'
  | 'mountain'
  | 'snow'
  | 'sand'
  | 'water'
  | 'human'
  | 'house'
  | 'storage'
  | 'town_hall'
  | 'farm'
  | 'animal_pen'
  | 'dock'
  | 'temple'
  | 'blacksmith'
  | 'watchtower'
  | 'wall'
  | 'fishing_boat'
  | 'transport_ship'
  | 'berry_bush'
  | 'deer'
  | 'boar'
  | 'wolf'
  | 'chicken'
  | 'cow'
  | 'inspect'
  | 'lightning'
  | 'meteor'
  | 'earthquake'
  | 'fire'
  | 'heal_rain'
  | 'divine_shield'
  | 'rejuvenate'
  | 'warrior_boost'
  | 'blessing_faith'
  | 'grenade'
  | 'napalm'
  | 'freeze';

export type WorldGenPreset = 'continents' | 'archipelago' | 'pangea' | 'ring' | 'empty';

export interface ResourceNode {
  id: string;
  type: ResourceType;
  x: number; // tile x
  y: number; // tile y
  variant: number;
  amount: number;
  maxAmount: number;
  foodAmount?: number;
  maxFood?: number;
  regenerationRate?: number;
  berryCount?: number;
}

export interface Inventory {
  wood: number;
  stone: number;
  food: number;
}

export interface CarcassEntity {
  id: string;
  species: AnimalSpecies;
  x: number;
  y: number;
  meatAmount: number;
  decay: number;
  maxDecay: number;
}

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  hunger: number;
  age: number; // game years
  sex: Sex;
  state: AnimalState;
  speed: number;
  damage: number;
  attackCooldown: number;
  isDomesticated: boolean;
  ownerSettlementId: string | null;
  penId: string | null;
  groupId: string | null;
  facing: 'left' | 'right';
  walkFrame: number;
  hitFlashTimer: number;
  attackAnimTimer: number;
  targetEntityId: string | null;
  divineShieldTimer?: number;
  frozenTimer?: number;
}

export interface HumanEntity {
  id: string;
  name: string;
  sex: Sex;
  age: number; // in game years
  lifeStage: LifeStage;
  health: number;
  maxHealth: number;
  hunger: number; // 0 (starving) to 100 (satiated)
  state: HumanState;
  profession: Profession;
  inventory: Inventory;
  
  x: number; // world float coordinates
  y: number;
  targetX: number;
  targetY: number;
  targetResourceId: string | null;
  targetBuildingId: string | null;
  targetEnemyId: string | null;
  targetAnimalId?: string | null;
  
  homeId: string | null;
  settlementId: string | null;
  kingdomId: string | null;
  partnerId: string | null;
  parents: string[];
  children: string[];
  birthTimer?: number;
  isExpecting?: boolean;
  courtingTargetId?: string | null;
  
  kills: number;
  animalsHunted: number;
  weapon?: WeaponType;
  armor?: ArmorType;
  faith?: number;
  inShipId?: string | null;
  path: { x: number; y: number }[];
  stateTimer: number; // in seconds or ticks
  walkFrame: number;
  facing: 'left' | 'right';
  gatherProgress: number; // 0 to 1
  buildProgress: number; // 0 to 1
  attackCooldownTimer: number;
  isAttackingAnim: number; // timer for sword swing / attack visual
  hitFlashTimer: number; // timer for taking damage visual
  divineShieldTimer?: number;
  warriorBoostTimer?: number;
  frozenTimer?: number;

  colorTheme: {
    shirt: string;
    hair: string;
    skin: string;
    pants: string;
  };
}

export interface BuildingEntity {
  id: string;
  type: BuildingType;
  x: number; // tile x (top-left)
  y: number; // tile y (top-left)
  width: number;
  height: number;
  settlementId: string | null;
  kingdomId: string | null;
  
  constructionProgress: number; // 0 to 1
  isCompleted: boolean;
  woodNeeded: number;
  woodDelivered: number;
  stoneNeeded: number;
  stoneDelivered: number;
  
  occupants: string[];
  maxOccupants: number;
  
  captureProgress: number; // 0 to 1
  capturingKingdomId: string | null;

  // Farm specific
  cropStage?: 'PLANTING' | 'GROWING' | 'READY' | 'HARVESTING' | 'EMPTY';
  cropProgress?: number; // 0 to 1

  // Animal Pen specific
  livestockIds?: string[];
  livestockCapacity?: number;
  maxLivestock?: number;

  health?: number;
  maxHealth?: number;
  onFireTimer?: number;
}

export type Animal = AnimalEntity;

export interface SettlementEntity {
  id: string;
  name: string;
  x: number; // center world tile x
  y: number; // center world tile y
  kingdomId: string | null;
  population: number;
  memberIds: string[];
  buildingIds: string[];
  storage: {
    wood: number;
    stone: number;
    food: number;
  };
  territoryTiles: { x: number; y: number }[];
  foodProductionRate?: number;
  foodConsumptionRate?: number;
  daysOfFoodRemaining?: number;
  livestock?: { chickens: number; cows: number };
  famineStatus?: 'NORMAL' | 'SHORTAGE' | 'FAMINE';
  
  // Tech, Culture, Seafaring
  era?: EraType;
  techPoints?: number;
  faith?: number;
  shipsCount?: number;
  docksCount?: number;
  watchtowersCount?: number;
  isCoastal?: boolean;
}

export interface KingdomEntity {
  id: string;
  name: string;
  color: string; // hex color
  capitalSettlementId: string;
  settlementIds: string[];
  population: number;
  territoryCount: number;
  militaryStrength: number;
  relations: Record<string, number>; // otherKingdomId -> -100 to 100
  atWarWith: string[];
  
  // Ruler & Culture
  rulerName?: string;
  rulerTrait?: RulerTrait;
  era?: EraType;
  faith?: number;
}

export interface WarEntity {
  id: string;
  kingdomAId: string;
  kingdomBId: string;
  startTime: number; // game year
  casualtiesA: number;
  casualtiesB: number;
  capturedSettlements: number;
  status: 'ACTIVE' | 'PEACE';
}

export interface WorldEvent {
  id: string;
  year: number;
  text: string;
  type:
    | 'SETTLEMENT_FOUNDED'
    | 'KINGDOM_CREATED'
    | 'RELATION_CHANGE'
    | 'WAR_DECLARED'
    | 'PEACE_SIGNED'
    | 'SETTLEMENT_CAPTURED'
    | 'MAJOR_BATTLE'
    | 'FAMINE'
    | 'DOMESTICATION'
    | 'PREDATOR_ATTACK'
    | 'CATACLYSM'
    | 'BLESSING'
    | 'MAGIC'
    | 'ERA_ADVANCED'
    | 'TECH_BREAKTHROUGH'
    | 'DIVINE_BLESSING'
    | 'CONSTRUCTION_FINISHED'
    | 'EXPEDITION_LAUNCHED'
    | 'COLONY_ESTABLISHED'
    | 'TRADE_ESTABLISHED'
    | 'PRAYER_OFFERED';
  color?: string;
}

export interface CameraState {
  x: number; // center world coordinate
  y: number;
  zoom: number; // pixels per tile (e.g. 4 to 48)
  minZoom: number;
  maxZoom: number;
}

export interface BiomeBreakdown {
  water: number;
  shallowWater: number;
  sand: number;
  plains: number;
  forest: number;
  mountain: number;
  snow: number;
}

export interface SimulationStats {
  population: number;
  childrenCount: number;
  adultsCount: number;
  eldersCount: number;
  soldiersCount: number;
  settlementsCount: number;
  kingdomsCount: number;
  buildingsCount: number;
  activeWarsCount: number;
  gameYear: number;
  
  // Resources & Food
  trees: number;
  stone: number;
  totalFood: number;
  berryBushes: number;
  farmsCount: number;
  pensCount: number;

  // New Features Stats
  shipsCount?: number;
  roadsCount?: number;
  faithTotal?: number;
  currentEra?: EraType;

  // Animals & Ecosystem
  animalsCount: number;
  wildAnimalsCount: number;
  domesticAnimalsCount: number;
  deerCount: number;
  boarCount: number;
  wolfCount: number;
  chickenCount: number;
  cowCount: number;
  carcassesCount: number;

  landTiles: number;
  waterTiles: number;
  simSpeed: number; // 0, 1, 2, 4
  isPaused: boolean;
  tickCount: number;
  fps: number;
  tps: number;
  biomes: BiomeBreakdown;
  season?: Season;
  activeCrisis?: ClimateCrisisType | null;
  dynamicPopulationCap?: number;
  latestPopulationReport?: PopulationReport | null;
}

export interface WorldSaveData {
  version: number;
  name: string;
  date: string;
  gameYear: number;
  tickCount: number;
  width: number;
  height: number;
  tiles: number[]; // serialized uint8array
  elevation: number[]; // serialized float32array
  biomesArray: number[];
  roads?: number[]; // uint8array
  roadWear?: number[];
  humans: any[];
  buildings: any[];
  settlements: any[];
  kingdoms: any[];
  animals: any[];
  carcasses: any[];
  resources: any[];
  ships?: any[];
  events: WorldEvent[];
  populationReports?: PopulationReport[];
  climate?: ClimateState;
  diplomaticPacts?: DiplomaticPact[];
  stats?: Partial<SimulationStats>;
}

export interface GameConfig {
  worldWidth: number; // in tiles e.g. 256
  worldHeight: number; // in tiles e.g. 256
  chunkSize: number; // in tiles e.g. 16 or 32
  tileSize: number; // base tile render size e.g. 16
  minZoom: number;
  maxZoom: number;
}
