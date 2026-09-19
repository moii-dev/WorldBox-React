import { TileType, AnimalSpecies } from '../types';

export interface BiomeStats {
  trees: 'High' | 'Medium' | 'Low' | 'None';
  food: 'High' | 'Medium' | 'Low' | 'None';
  stone: 'High' | 'Medium' | 'Low' | 'None';
  farming: 'High' | 'Medium' | 'Low' | 'Poor';
}

export interface BiomeDefinition {
  id: string;
  name: string;
  symbol: string;
  tileType: TileType;
  baseColor: string;
  variationColors: string[];
  treeDensity: number;
  rockDensity: number;
  berryDensity: number;
  animalSpawnWeights: Partial<Record<AnimalSpecies, number>>;
  movementModifier: number;
  fertility: number;
  farmEfficiency: number;
  stats: BiomeStats;
  icon?: string;
  color?: string;
  description?: string;
  foodMultiplier?: number;
  temperature?: string | number;
}

export class BiomeRegistry {
  private static biomes: Map<string, BiomeDefinition> = new Map();

  static {
    BiomeRegistry.register({
      id: 'grassland',
      name: 'Луга',
      symbol: '🌱',
      tileType: TileType.LAND,
      baseColor: '#3e7d2b',
      variationColors: ['#3e7d2b', '#488d33', '#539e3b', '#41842e'],
      treeDensity: 0.12,
      rockDensity: 0.06,
      berryDensity: 0.18,
      animalSpawnWeights: { DEER: 4, COW: 4, CHICKEN: 3, BOAR: 2, WOLF: 1 },
      movementModifier: 1.0,
      fertility: 1.0,
      farmEfficiency: 1.2,
      stats: { trees: 'Low', food: 'High', stone: 'Low', farming: 'High' },
      description: 'Плодородные луговые равнины с мягким климатом и обилием дичи.',
    });

    BiomeRegistry.register({
      id: 'forest',
      name: 'Лес',
      symbol: '🌲',
      tileType: TileType.FOREST,
      baseColor: '#1f531c',
      variationColors: ['#1f531c', '#276223', '#1b4718', '#2d6e29'],
      treeDensity: 0.60,
      rockDensity: 0.08,
      berryDensity: 0.35,
      animalSpawnWeights: { DEER: 5, BOAR: 4, WOLF: 3, CHICKEN: 2, COW: 1 },
      movementModifier: 0.9,
      fertility: 0.85,
      farmEfficiency: 0.9,
      stats: { trees: 'High', food: 'High', stone: 'Low', farming: 'Medium' },
      description: 'Густая чаща с огромным запасом древесины, грибов и ягод.',
    });

    BiomeRegistry.register({
      id: 'desert',
      name: 'Пустыня',
      symbol: '🏜️',
      tileType: TileType.SAND,
      baseColor: '#d4b372',
      variationColors: ['#c9a865', '#d4b372', '#debfa4', '#ccad69'],
      treeDensity: 0.01,
      rockDensity: 0.08,
      berryDensity: 0.02,
      animalSpawnWeights: { BOAR: 1 },
      movementModifier: 0.95,
      fertility: 0.15,
      farmEfficiency: 0.3,
      stats: { trees: 'None', food: 'Low', stone: 'Low', farming: 'Poor' },
      description: 'Бескрайние песчаные барханы; условия для земледелия крайне скудны.',
    });

    BiomeRegistry.register({
      id: 'savanna',
      name: 'Саванна',
      symbol: '🌾',
      tileType: TileType.LAND,
      baseColor: '#8ca336',
      variationColors: ['#8ca336', '#9eb83e', '#7b8f2d', '#969638'],
      treeDensity: 0.18,
      rockDensity: 0.09,
      berryDensity: 0.14,
      animalSpawnWeights: { COW: 4, DEER: 4, BOAR: 3, WOLF: 2 },
      movementModifier: 1.0,
      fertility: 0.75,
      farmEfficiency: 0.95,
      stats: { trees: 'Medium', food: 'Medium', stone: 'Low', farming: 'Medium' },
      description: 'Просторная степь с золотистой травой, идеальна для выпаса скота.',
    });

    BiomeRegistry.register({
      id: 'swamp',
      name: 'Болото',
      symbol: '🌿',
      tileType: TileType.SWAMP,
      baseColor: '#365314',
      variationColors: ['#365314', '#3f6212', '#4d7c0f', '#2a440d'],
      treeDensity: 0.30,
      rockDensity: 0.04,
      berryDensity: 0.22,
      animalSpawnWeights: { BOAR: 5, CHICKEN: 2 },
      movementModifier: 0.7,
      fertility: 0.6,
      farmEfficiency: 0.5,
      stats: { trees: 'Medium', food: 'Medium', stone: 'Low', farming: 'Low' },
      description: 'Труднопроходимые сырые топи, в которых водятся дикие кабаны.',
    });

    BiomeRegistry.register({
      id: 'snow',
      name: 'Снега',
      symbol: '❄️',
      tileType: TileType.SNOW,
      baseColor: '#e6edf4',
      variationColors: ['#e6edf4', '#f1f5f9', '#d7e2ec', '#cad6e3'],
      treeDensity: 0.06,
      rockDensity: 0.15,
      berryDensity: 0.04,
      animalSpawnWeights: { WOLF: 4, DEER: 2 },
      movementModifier: 0.85,
      fertility: 0.2,
      farmEfficiency: 0.35,
      stats: { trees: 'Low', food: 'Low', stone: 'Medium', farming: 'Poor' },
      description: 'Ледяной покров и снежные шапки; выживать здесь непросто.',
    });

    BiomeRegistry.register({
      id: 'tundra',
      name: 'Тундра',
      symbol: '△',
      tileType: TileType.LAND,
      baseColor: '#758378',
      variationColors: ['#758378', '#829285', '#6a786d', '#8b9b8e'],
      treeDensity: 0.10,
      rockDensity: 0.25,
      berryDensity: 0.08,
      animalSpawnWeights: { WOLF: 3, DEER: 3 },
      movementModifier: 0.9,
      fertility: 0.35,
      farmEfficiency: 0.5,
      stats: { trees: 'Low', food: 'Low', stone: 'High', farming: 'Poor' },
      description: 'Каменистые северные равнины с мхами и стаями волков.',
    });

    BiomeRegistry.register({
      id: 'rocky',
      name: 'Скалы',
      symbol: '◆',
      tileType: TileType.MOUNTAIN,
      baseColor: '#596473',
      variationColors: ['#596473', '#687485', '#4d5765', '#768394'],
      treeDensity: 0.03,
      rockDensity: 0.55,
      berryDensity: 0.02,
      animalSpawnWeights: { WOLF: 2 },
      movementModifier: 0.8,
      fertility: 0.1,
      farmEfficiency: 0.2,
      stats: { trees: 'None', food: 'Low', stone: 'High', farming: 'Poor' },
      description: 'Горные утесы, изобилующие месторождениями ценного камня.',
    });

    BiomeRegistry.register({
      id: 'beach',
      name: 'Пляж',
      symbol: '▱',
      tileType: TileType.SAND,
      baseColor: '#e2c98d',
      variationColors: ['#e2c98d', '#d6bd81', '#ebd49c', '#ccb377'],
      treeDensity: 0.03,
      rockDensity: 0.04,
      berryDensity: 0.03,
      animalSpawnWeights: { CHICKEN: 2 },
      movementModifier: 0.95,
      fertility: 0.25,
      farmEfficiency: 0.4,
      stats: { trees: 'Low', food: 'Low', stone: 'Low', farming: 'Poor' },
      description: 'Тёплый прибрежный песок на границе с морем.',
    });
  }

  public static register(def: BiomeDefinition): void {
    if (!def.icon) def.icon = def.symbol;
    if (!def.color) def.color = def.baseColor;
    if (def.foodMultiplier === undefined) def.foodMultiplier = def.fertility;
    if (def.description === undefined) {
      def.description = `Биом ${def.name}`;
    }
    if (def.temperature === undefined) {
      def.temperature = def.id === 'snow' || def.id === 'tundra' ? 'Морозный' : def.id === 'desert' || def.id === 'lava' ? 'Жаркий' : 'Умеренный';
    }
    BiomeRegistry.biomes.set(def.id, def);
  }

  public static get(id: string): BiomeDefinition | undefined {
    return BiomeRegistry.biomes.get(id);
  }

  public static getAll(): BiomeDefinition[] {
    return Array.from(BiomeRegistry.biomes.values());
  }

  public static has(id: string): boolean {
    return BiomeRegistry.biomes.has(id);
  }

  public static isBiome(id: string): boolean {
    return BiomeRegistry.biomes.has(id);
  }
}
