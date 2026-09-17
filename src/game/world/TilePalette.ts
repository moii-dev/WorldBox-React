import { TileType } from '../types';

export interface TileColorConfig {
  base: string[];
  name: string;
  isWater: boolean;
  isWalkable: boolean;
  elevation: number;
}

export interface WaterDepthTier {
  name: string;
  maxDistance: number;
  primary: string;
  variant: string;
  highlight: string;
}

/**
 * 5-tier calibrated pixel-art ocean palette:
 * Shallow Lagoon -> Coastal Azure -> Mid Ocean -> Deep Ocean -> Abyssal Depth
 */
export const WATER_DEPTH_TIERS: WaterDepthTier[] = [
  {
    name: 'Shallow Lagoon',
    maxDistance: 2.2,
    primary: '#38bdf8', // Vibrant clear coastal turquoise
    variant: '#2baedc', // Soft deeper turquoise
    highlight: '#7dd3fc',
  },
  {
    name: 'Coastal Azure',
    maxDistance: 6.0,
    primary: '#1e88d0', // Rich sunny coastal azure
    variant: '#1a7cb8',
    highlight: '#60a5fa',
  },
  {
    name: 'Mid Ocean',
    maxDistance: 12.5,
    primary: '#15609e', // Classic balanced ocean blue
    variant: '#13548c',
    highlight: '#3b82f6',
  },
  {
    name: 'Deep Ocean',
    maxDistance: 25.0,
    primary: '#0e3e72', // Rich deep sea navy
    variant: '#0c3664',
    highlight: '#2563eb',
  },
  {
    name: 'Abyssal Depth',
    maxDistance: 9999,
    primary: '#082245', // Deep calm midnight ocean
    variant: '#071b38',
    highlight: '#1d4ed8',
  },
];

/**
 * Maps water distance from shore + gentle low-frequency noise to cohesive pixel-art color
 * with soft ordered dithering at transitions.
 */
export function getWaterColor(distance: number, variation: number, x: number, y: number): string {
  // Low-frequency noise modulation (-3..+3 scaled to -1.35..+1.35 tiles)
  const effDist = Math.max(0.1, distance + variation * 0.42);
  const dither = ((x + y) & 1) === 0;

  if (effDist <= 2.2) {
    if (effDist > 1.7 && dither) {
      return variation > 0 ? WATER_DEPTH_TIERS[1].primary : WATER_DEPTH_TIERS[1].variant;
    }
    return variation > 0 ? WATER_DEPTH_TIERS[0].primary : WATER_DEPTH_TIERS[0].variant;
  }

  if (effDist <= 6.0) {
    if (effDist > 5.2 && dither) {
      return variation > 0 ? WATER_DEPTH_TIERS[2].primary : WATER_DEPTH_TIERS[2].variant;
    }
    return variation > 0 ? WATER_DEPTH_TIERS[1].primary : WATER_DEPTH_TIERS[1].variant;
  }

  if (effDist <= 12.5) {
    if (effDist > 11.5 && dither) {
      return variation > 0 ? WATER_DEPTH_TIERS[3].primary : WATER_DEPTH_TIERS[3].variant;
    }
    return variation > 0 ? WATER_DEPTH_TIERS[2].primary : WATER_DEPTH_TIERS[2].variant;
  }

  if (effDist <= 25.0) {
    if (effDist > 23.5 && dither) {
      return variation > 0 ? WATER_DEPTH_TIERS[4].primary : WATER_DEPTH_TIERS[4].variant;
    }
    return variation > 0 ? WATER_DEPTH_TIERS[3].primary : WATER_DEPTH_TIERS[3].variant;
  }

  return variation > 0 ? WATER_DEPTH_TIERS[4].primary : WATER_DEPTH_TIERS[4].variant;
}

export const BIOME_CONFIGS: Record<TileType, TileColorConfig> = {
  [TileType.WATER]: {
    name: 'Deep Ocean',
    base: ['#0e3e72', '#0c3664', '#082245', '#071b38'],
    isWater: true,
    isWalkable: false,
    elevation: 0.1,
  },
  [TileType.SHALLOW_WATER]: {
    name: 'Shallow Water',
    base: ['#38bdf8', '#2baedc', '#1e88d0', '#1a7cb8'],
    isWater: true,
    isWalkable: false,
    elevation: 0.35,
  },
  [TileType.SAND]: {
    name: 'Beach & Sand',
    base: ['#c9a865', '#d4b372', '#debfa4', '#ccad69'],
    isWater: false,
    isWalkable: true,
    elevation: 0.45,
  },
  [TileType.LAND]: {
    name: 'Plains',
    base: ['#3e7d2b', '#488d33', '#539e3b', '#41842e'],
    isWater: false,
    isWalkable: true,
    elevation: 0.55,
  },
  [TileType.FOREST]: {
    name: 'Dense Forest',
    base: ['#1f531c', '#276223', '#1b4718', '#2d6e29'],
    isWater: false,
    isWalkable: true,
    elevation: 0.65,
  },
  [TileType.MOUNTAIN]: {
    name: 'Mountain Peak',
    base: ['#596473', '#687485', '#4d5765', '#768394'],
    isWater: false,
    isWalkable: true,
    elevation: 0.8,
  },
  [TileType.SNOW]: {
    name: 'Snow & Frost',
    base: ['#e6edf4', '#f1f5f9', '#d7e2ec', '#cad6e3'],
    isWater: false,
    isWalkable: true,
    elevation: 0.95,
  },
  [TileType.LAVA]: {
    name: 'Lava',
    base: ['#c2410c', '#ea580c', '#f97316'],
    isWater: false,
    isWalkable: false,
    elevation: 0.5,
  },
  [TileType.SWAMP]: {
    name: 'Swamp',
    base: ['#365314', '#3f6212', '#4d7c0f'],
    isWater: false,
    isWalkable: true,
    elevation: 0.48,
  },
};

export const TILE_COLORS: Record<TileType, string[]> = Object.fromEntries(
  Object.entries(BIOME_CONFIGS).map(([k, v]) => [Number(k), v.base])
) as Record<TileType, string[]>;

// Shoreline & Coast transition palette
export const SHORE_COLORS = {
  wetSand: '#b59350',
  drySand: '#d4b372',
  foamLine: '#e0f2fe',
  foamShadow: '#7dd3fc',
  shallowWater: '#2d7dc9',
  cliffShadow: 'rgba(20, 25, 35, 0.4)',
  snowEdge: 'rgba(240, 248, 255, 0.75)',
};
