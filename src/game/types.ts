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
}

export enum ResourceType {
  TREE = 'TREE',
  STONE = 'STONE',
}

export type Sex = 'MALE' | 'FEMALE';

export type LifeStage = 'CHILD' | 'TEEN' | 'ADULT' | 'ELDER';

export type Profession = 'WORKER' | 'WOODCUTTER' | 'MINER' | 'BUILDER' | 'SOLDIER';

export type BuildingType = 'HOUSE' | 'STORAGE' | 'TOWN_HALL';

export type DiplomaticStatus = 'ALLIED' | 'FRIENDLY' | 'NEUTRAL' | 'TENSE' | 'HOSTILE' | 'WAR';

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
  | 'inspect';

export type WorldGenPreset = 'continents' | 'archipelago' | 'pangea' | 'ring' | 'empty';

export interface ResourceNode {
  id: string;
  type: ResourceType;
  x: number; // tile x
  y: number; // tile y
  variant: number;
  amount: number;
  maxAmount: number;
}

export interface Inventory {
  wood: number;
  stone: number;
  food: number;
}

export interface HumanEntity {
  id: string;
  name: string;
  sex: Sex;
  age: number; // in game years
  lifeStage: LifeStage;
  health: number;
  maxHealth: number;
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
  
  homeId: string | null;
  settlementId: string | null;
  kingdomId: string | null;
  partnerId: string | null;
  parents: string[];
  children: string[];
  
  kills: number;
  path: { x: number; y: number }[];
  stateTimer: number; // in seconds or ticks
  walkFrame: number;
  facing: 'left' | 'right';
  gatherProgress: number; // 0 to 1
  buildProgress: number; // 0 to 1
  attackCooldownTimer: number;
  isAttackingAnim: number; // timer for sword swing / attack visual
  hitFlashTimer: number; // timer for taking damage visual
  
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
}

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
    | 'MAJOR_BATTLE';
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
  
  trees: number;
  stone: number;
  landTiles: number;
  waterTiles: number;
  simSpeed: number; // 0, 1, 2, 4
  isPaused: boolean;
  tickCount: number;
  fps: number;
  tps: number;
  biomes: BiomeBreakdown;
}

export interface GameConfig {
  worldWidth: number; // in tiles e.g. 256
  worldHeight: number; // in tiles e.g. 256
  chunkSize: number; // in tiles e.g. 16 or 32
  tileSize: number; // base tile render size e.g. 16
  minZoom: number;
  maxZoom: number;
}
