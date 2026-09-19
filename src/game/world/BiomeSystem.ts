import { World } from './World';
import { ResourceManager } from '../resources/ResourceManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { ResourceType, TileType } from '../types';
import { BiomeRegistry, BiomeDefinition } from './BiomeRegistry';

export class BiomeSystem {
  private tickCounter: number = 0;
  private readonly checkIntervalTicks: number = 45;

  public update(
    world: World,
    resourceManager: ResourceManager,
    buildingManager?: BuildingManager
  ): void {
    this.tickCounter++;
    if (this.tickCounter < this.checkIntervalTicks) return;
    this.tickCounter = 0;

    if (world.totalLandTiles === 0) return;

    // Check ~20 random coordinates across the world
    const samples = 24;
    for (let i = 0; i < samples; i++) {
      const rx = Math.floor(Math.random() * world.width);
      const ry = Math.floor(Math.random() * world.height);

      if (!world.isWalkable(rx, ry)) continue;

      // Check if tile already has a resource
      if (resourceManager.hasResourceAt(rx, ry)) continue;

      // Check if tile has building
      if (buildingManager && buildingManager.findBuildingAt(rx, ry)) continue;

      // Check neighbor density (avoid suffocating density)
      const nearbyRes = resourceManager.findNearby(rx, ry, 2.2);
      if (nearbyRes.length >= 2) continue;

      // Determine biome
      const biomeId = world.getBiomeAt(rx, ry);
      const biomeDef = BiomeRegistry.get(biomeId);
      if (!biomeDef) continue;

      const roll = Math.random();

      // Trees
      if (roll < biomeDef.treeDensity * 0.12) {
        resourceManager.addResource(ResourceType.TREE, rx, ry);
        continue;
      }

      // Berry Bushes
      if (roll < (biomeDef.treeDensity + biomeDef.berryDensity) * 0.12) {
        resourceManager.addBerryBush(rx, ry, 5);
        continue;
      }

      // Stone
      if (roll < (biomeDef.treeDensity + biomeDef.berryDensity + biomeDef.rockDensity) * 0.12) {
        resourceManager.addResource(ResourceType.STONE, rx, ry);
      }
    }
  }
}
