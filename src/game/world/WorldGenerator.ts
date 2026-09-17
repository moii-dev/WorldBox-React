import { TileType, WorldGenPreset, ResourceType } from '../types';
import { World } from './World';
import { Noise } from './Noise';
import { ResourceManager } from '../resources/ResourceManager';

export class WorldGenerator {
  public static generate(
    world: World,
    resourceManager?: ResourceManager,
    preset: WorldGenPreset = 'continents',
    seed: number = Math.floor(Math.random() * 100000)
  ): void {
    if (preset === 'empty') {
      world.initWorld();
      if (resourceManager) resourceManager.clear();
      return;
    }

    if (resourceManager) resourceManager.clear();

    const elevNoise = new Noise(seed);
    const moistNoise = new Noise(seed + 999);
    const detailNoise = new Noise(seed + 4321);

    const w = world.width;
    const h = world.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.9;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const ny = y / h;

        // Distance from center for radial island falloff
        const dx = (x - centerX) / centerX;
        const dy = (y - centerY) / centerY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        let elevation = 0;
        let moisture = moistNoise.fbm2D(nx * 4, ny * 4, 3, 0.5, 2.0);

        if (preset === 'continents') {
          // 4-octave continent noise with mild center pull
          const raw = elevNoise.fbm2D(nx * 3.5, ny * 3.5, 5, 0.52, 2.1);
          const detail = detailNoise.fbm2D(nx * 8, ny * 8, 3, 0.5, 2.0) * 0.15;
          const falloff = Math.max(0, 1 - Math.pow(distFromCenter * 1.15, 2.2));
          elevation = (raw + detail) * falloff;
        } else if (preset === 'archipelago') {
          // Higher frequency noise for scattered islands
          const raw = elevNoise.fbm2D(nx * 6.5, ny * 6.5, 4, 0.48, 2.2);
          const detail = detailNoise.fbm2D(nx * 12, ny * 12, 3, 0.5, 2.0) * 0.18;
          const falloff = Math.max(0, 1 - Math.pow(distFromCenter * 1.25, 2.5));
          elevation = (raw + detail) * falloff;
        } else if (preset === 'pangea') {
          // Huge central landmass
          const raw = elevNoise.fbm2D(nx * 2.5, ny * 2.5, 5, 0.55, 2.0);
          const falloff = Math.max(0, 1 - Math.pow(distFromCenter * 1.05, 3.0));
          elevation = raw * falloff;
        } else if (preset === 'ring') {
          // Atoll / caldera ring shape
          const ringDist = Math.abs(distFromCenter - 0.55);
          const ringFalloff = Math.max(0, 1 - ringDist * 3.5);
          const raw = elevNoise.fbm2D(nx * 5, ny * 5, 4, 0.5, 2.0);
          elevation = raw * ringFalloff;
        }

        // Assign TileType based on elevation & moisture thresholds
        let type: TileType;

        if (elevation < 0.36) {
          type = TileType.WATER;
        } else if (elevation < 0.43) {
          type = TileType.SHALLOW_WATER;
        } else if (elevation < 0.47) {
          type = TileType.SAND;
        } else if (elevation < 0.68) {
          // Plains vs Forest based on moisture
          if (moisture > 0.48) {
            type = TileType.FOREST;
          } else {
            type = TileType.LAND;
          }
        } else if (elevation < 0.82) {
          type = TileType.MOUNTAIN;
        } else {
          type = TileType.SNOW;
        }

        world.setTileDirect(x, y, type, elevation);
      }
    }

    // Recalculate all shorelines, water depths, and neighbor transition masks
    world.recalculateAllBorders();

    // Populate initial resources naturally for generated map
    if (resourceManager) {
      this.populateResources(world, resourceManager);
    }
  }

  private static populateResources(world: World, resourceManager: ResourceManager): void {
    const w = world.width;
    const h = world.height;

    for (let y = 2; y < h - 2; y += 2) {
      for (let x = 2; x < w - 2; x += 2) {
        const tile = world.getTile(x, y);

        // Don't spawn on water or beaches
        if (tile === TileType.WATER || tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
          continue;
        }

        // Forest: very high density of trees
        if (tile === TileType.FOREST && Math.random() < 0.28) {
          resourceManager.addResource(ResourceType.TREE, x, y);
        }
        // Plains: balanced trees and occasional stone
        else if (tile === TileType.LAND) {
          const rand = Math.random();
          if (rand < 0.07) {
            resourceManager.addResource(ResourceType.TREE, x, y);
          } else if (rand < 0.1) {
            resourceManager.addResource(ResourceType.STONE, x, y);
          }
        }
        // Mountain: high density of stone boulders
        else if (tile === TileType.MOUNTAIN && Math.random() < 0.22) {
          resourceManager.addResource(ResourceType.STONE, x, y);
        }
        // Snow: occasional pine or frosted rock
        else if (tile === TileType.SNOW) {
          const rand = Math.random();
          if (rand < 0.05) {
            resourceManager.addResource(ResourceType.TREE, x, y); // Snowy pine
          } else if (rand < 0.08) {
            resourceManager.addResource(ResourceType.STONE, x, y);
          }
        }
      }
    }
  }
}
