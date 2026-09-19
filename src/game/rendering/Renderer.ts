import { World } from '../world/World';
import { Camera } from '../camera/Camera';
import { ResourceManager } from '../resources/ResourceManager';
import { EntityManager } from '../entities/EntityManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { SettlementManager } from '../settlements/SettlementManager';
import { KingdomManager } from '../kingdoms/KingdomManager';
import { TerritoryManager } from '../world/TerritoryManager';
import { AnimalManager } from '../entities/AnimalManager';
import { GodPowersManager } from '../powers/GodPowersManager';
import { RoadSystem } from '../roads/RoadSystem';
import { ShipManager } from '../seafaring/ShipManager';
import { TradeManager } from '../trade/TradeManager';
import { TileType, ToolType } from '../types';
import { BIOME_CONFIGS, SHORE_COLORS, TILE_COLORS, getWaterColor } from '../world/TilePalette';
import { PixelSprites } from './PixelSprites';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  private world: World;
  private camera: Camera;
  private resourceManager: ResourceManager;
  private entityManager: EntityManager;
  public animalManager?: AnimalManager;
  public buildingManager?: BuildingManager;
  public settlementManager?: SettlementManager;
  public kingdomManager?: KingdomManager;
  public territoryManager?: TerritoryManager;
  public godPowersManager?: GodPowersManager;
  public roadSystem?: RoadSystem;
  public shipManager?: ShipManager;
  public tradeManager?: TradeManager;

  // Animation timer for water waves, tide, and foam
  private animTime: number = 0;

  // Brush / Hover state
  public cursorWorldPos: { x: number; y: number } | null = null;
  public activeTool: string = 'grassland';
  public brushRadius: number = 5;
  public brushHardness: number = 1.0;
  public showPoliticalMap: boolean = false;
  public selectionMarquee: { startX: number; startY: number; currentX: number; currentY: number } | null = null;
  public selectedEntityIds: Set<string> = new Set();

  constructor(
    canvas: HTMLCanvasElement,
    world: World,
    camera: Camera,
    resourceManager: ResourceManager,
    entityManager: EntityManager,
    buildingManager?: BuildingManager,
    settlementManager?: SettlementManager,
    kingdomManager?: KingdomManager,
    territoryManager?: TerritoryManager,
    animalManager?: AnimalManager,
    godPowersManager?: GodPowersManager
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = context;

    this.world = world;
    this.camera = camera;
    this.resourceManager = resourceManager;
    this.entityManager = entityManager;
    this.buildingManager = buildingManager;
    this.settlementManager = settlementManager;
    this.kingdomManager = kingdomManager;
    this.territoryManager = territoryManager;
    this.animalManager = animalManager;
    this.godPowersManager = godPowersManager;
  }

  public render(deltaSeconds: number): void {
    this.animTime += deltaSeconds;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Crisp pixel rendering without blurring
    ctx.imageSmoothingEnabled = false;

    // Clear background with deep ocean color
    ctx.fillStyle = '#082245';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible tile range
    const bounds = this.camera.getVisibleBounds(width, height, this.world.width, this.world.height);
    const zoom = this.camera.zoom;

    // 1. Render Terrain Tiles & Sophisticated Biome Transitions
    this.renderTiles(bounds, width, height, zoom);

    // 1.5 Render Roads & Cobblestone Highways
    if (this.roadSystem) {
      this.renderRoads(bounds, width, height, zoom);
    }

    // 2. Render Shoreline Foam & Coastal Wave Animations
    this.renderCoastlineTide(bounds, width, height, zoom);

    // 3. Render Mountain Relief Shadows
    this.renderElevationRelief(bounds, width, height, zoom);

    // 4. Render Political Map & Borders (if enabled or subtle borders)
    if (this.showPoliticalMap && this.territoryManager && this.kingdomManager) {
      this.renderPoliticalTerritory(bounds, width, height, zoom);
    }

    // 5. Render Grid overlay when zoomed in
    if (zoom >= 24) {
      this.renderGrid(bounds, width, height, zoom);
    }

    // 6. Render Resources, Buildings & Humans sorted by Y coordinate for correct depth layering
    this.renderObjects(bounds, width, height, zoom);

    // 6.5 Render Burning Fires & Divine VFX
    if (this.godPowersManager) {
      this.renderFires(bounds, width, height, zoom);
      this.godPowersManager.vfxSystem.render(this.ctx, this.camera, width, height, zoom);
    }

    // 7. Render Floating Settlement Banners
    if (this.settlementManager && this.kingdomManager) {
      this.renderSettlementBanners(bounds, width, height, zoom);
    }

    // 8. Render Selection Highlights & Marquee Box
    this.renderSelectionHighlights(width, height, zoom);
    this.renderSelectionMarquee();

    // 9. Render Brush / Tool cursor indicator
    this.renderCursor(width, height, zoom);
  }

  private renderTiles(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    const ctx = this.ctx;
    const time = this.animTime;
    const tileSize = Math.ceil(zoom);

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const type = this.world.getTile(tx, ty);
        const noise = this.world.getNoise(tx, ty);
        const palette = TILE_COLORS[type] || TILE_COLORS[TileType.WATER];
        const { screenX, screenY } = this.camera.worldToScreen(tx, ty, canvasW, canvasH);

        const px = Math.floor(screenX);
        const py = Math.floor(screenY);

        if (this.world.isWater(type)) {
          const dist = this.world.getWaterDistance(tx, ty);
          const variation = this.world.getWaterNoise(tx, ty);

          // 1. Stable, cohesive base color based on depth field and large-scale noise
          ctx.fillStyle = getWaterColor(dist, variation, tx, ty);
          ctx.fillRect(px, py, tileSize, tileSize);

          // 2. Very subtle, rare pixel-art wave crests & swells (no random per-tile flickering)
          if (zoom >= 6) {
            const wave =
              Math.sin(tx * 0.18 + ty * 0.12 - time * 0.55) +
              Math.cos(tx * 0.10 - ty * 0.16 + time * 0.38);

            // Rare coherent wave crests on ~2-3% of ocean tiles
            if (wave > 1.76) {
              if (dist <= 3) {
                // Near-shore light caustics / shimmer
                ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.fillRect(px + 1, py + Math.floor(tileSize * 0.5), Math.max(1, tileSize - 2), 1);
              } else if (dist <= 8) {
                // Coastal azure gentle swell
                ctx.fillStyle = 'rgba(224, 242, 254, 0.10)';
                ctx.fillRect(px + 1, py + Math.floor(tileSize * 0.5), Math.max(1, tileSize - 2), 1);
              } else if (dist <= 18) {
                // Mid-ocean faint swell
                ctx.fillStyle = 'rgba(186, 230, 253, 0.05)';
                ctx.fillRect(px + 1, py + Math.floor(tileSize * 0.5), Math.max(1, Math.floor(tileSize * 0.6)), 1);
              } else if (zoom >= 14 && wave > 1.9) {
                // Deep abyssal ocean: calm, barely perceptible 1px glint
                ctx.fillStyle = 'rgba(125, 211, 252, 0.04)';
                ctx.fillRect(px + 1, py + Math.floor(tileSize * 0.5), 1, 1);
              }
            }
          }
        } else if (type === TileType.SAND) {
          // Golden sandy beach with grain texture
          const colorIdx = noise % palette.length;
          ctx.fillStyle = palette[colorIdx];
          ctx.fillRect(px, py, tileSize, tileSize);

          if (zoom >= 14 && (noise % 6 === 0)) {
            ctx.fillStyle = '#e5c48b';
            ctx.fillRect(px + (noise % 8), py + ((noise >> 3) % 8), 1, 1);
          }
        } else if (type === TileType.LAND) {
          // Plains / Grassland
          const colorIdx = noise % palette.length;
          ctx.fillStyle = palette[colorIdx];
          ctx.fillRect(px, py, tileSize, tileSize);

          // Grass tufts / wildflowers
          if (zoom >= 14 && (noise % 4 === 0)) {
            ctx.fillStyle = (noise % 12 === 0) ? '#fef08a' : '#5fae44';
            const dotSize = Math.max(1, Math.floor(zoom / 8));
            ctx.fillRect(px + (noise % 10), py + ((noise >> 2) % 10), dotSize, dotSize);
          }
        } else if (type === TileType.FOREST) {
          // Dense deep emerald woodland floor
          const colorIdx = noise % palette.length;
          ctx.fillStyle = palette[colorIdx];
          ctx.fillRect(px, py, tileSize, tileSize);

          // Leaf litter and moss details
          if (zoom >= 12 && (noise % 3 === 0)) {
            ctx.fillStyle = '#144012';
            ctx.fillRect(px + (noise % 8), py + ((noise >> 2) % 8), Math.max(1, Math.floor(zoom / 7)), 1);
          }
        } else if (type === TileType.MOUNTAIN) {
          // Rugged stone mountain highlands
          const colorIdx = noise % palette.length;
          ctx.fillStyle = palette[colorIdx];
          ctx.fillRect(px, py, tileSize, tileSize);

          // Rocky striations
          if (zoom >= 10) {
            ctx.fillStyle = '#8391a3';
            ctx.fillRect(px + 1, py + 1, Math.max(1, tileSize * 0.4), 1);
            ctx.fillStyle = '#3a4452';
            ctx.fillRect(px + 2, py + tileSize - 2, Math.max(1, tileSize * 0.5), 1);
          }
        } else if (type === TileType.SNOW) {
          // Snow & Ice caps
          const colorIdx = noise % palette.length;
          ctx.fillStyle = palette[colorIdx];
          ctx.fillRect(px, py, tileSize, tileSize);

          // Frost glints
          if (zoom >= 12 && (noise % 7 === 0)) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + (noise % 8), py + ((noise >> 2) % 8), 1, 1);
          }
        }

        // Biome edge blendings (e.g. Grass creeping onto Sand, Forest creeping onto Grass)
        this.renderBiomeTransitions(tx, ty, type, px, py, tileSize, zoom);
      }
    }
  }

  /**
   * Smooth organic transitions between adjacent biomes
   */
  private renderBiomeTransitions(
    tx: number,
    ty: number,
    type: TileType,
    px: number,
    py: number,
    tileSize: number,
    zoom: number
  ): void {
    const ctx = this.ctx;
    const rim = Math.max(1, Math.round(zoom * 0.18));

    // 1. Plains adjacent to Sand -> soft sandy transition rim
    if (type === TileType.LAND) {
      const n = this.world.getTile(tx, ty - 1);
      const e = this.world.getTile(tx + 1, ty);
      const s = this.world.getTile(tx, ty + 1);
      const w = this.world.getTile(tx - 1, ty);

      ctx.fillStyle = 'rgba(212, 179, 114, 0.4)';
      if (n === TileType.SAND) ctx.fillRect(px, py, tileSize, rim);
      if (e === TileType.SAND) ctx.fillRect(px + tileSize - rim, py, rim, tileSize);
      if (s === TileType.SAND) ctx.fillRect(px, py + tileSize - rim, tileSize, rim);
      if (w === TileType.SAND) ctx.fillRect(px, py, rim, tileSize);
    }

    // 2. Forest adjacent to Plains -> leafy edge overhang
    if (type === TileType.FOREST) {
      const n = this.world.getTile(tx, ty - 1);
      const e = this.world.getTile(tx + 1, ty);
      const s = this.world.getTile(tx, ty + 1);
      const w = this.world.getTile(tx - 1, ty);

      ctx.fillStyle = 'rgba(31, 83, 28, 0.6)';
      if (n === TileType.LAND) ctx.fillRect(px, py, tileSize, rim);
      if (e === TileType.LAND) ctx.fillRect(px + tileSize - rim, py, rim, tileSize);
      if (s === TileType.LAND) ctx.fillRect(px, py + tileSize - rim, tileSize, rim);
      if (w === TileType.LAND) ctx.fillRect(px, py, rim, tileSize);
    }

    // 3. Snow adjacent to Mountain -> soft frost fringe
    if (type === TileType.SNOW) {
      const n = this.world.getTile(tx, ty - 1);
      const e = this.world.getTile(tx + 1, ty);
      const s = this.world.getTile(tx, ty + 1);
      const w = this.world.getTile(tx - 1, ty);

      ctx.fillStyle = SHORE_COLORS.snowEdge;
      if (n === TileType.MOUNTAIN) ctx.fillRect(px, py, tileSize, rim);
      if (e === TileType.MOUNTAIN) ctx.fillRect(px + tileSize - rim, py, rim, tileSize);
      if (s === TileType.MOUNTAIN) ctx.fillRect(px, py + tileSize - rim, tileSize, rim);
      if (w === TileType.MOUNTAIN) ctx.fillRect(px, py, rim, tileSize);
    }
  }

  /**
   * Renders natural dynamic ocean tide, wet sand, and pulsing foam along all coastlines
   */
  private renderCoastlineTide(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    const ctx = this.ctx;
    const time = this.animTime;
    const tileSize = Math.ceil(zoom);
    const tidePulse = (Math.sin(time * 1.6) + 1) * 0.5; // 0 to 1 gentle ebb and flow

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const type = this.world.getTile(tx, ty);

        // Coastline is where land/sand borders water
        if (!this.world.isWater(type)) {
          const border = this.world.getBorderMask(tx, ty);
          if (border === 0) continue;

          const { screenX, screenY } = this.camera.worldToScreen(tx, ty, canvasW, canvasH);
          const px = Math.floor(screenX);
          const py = Math.floor(screenY);

          const sandRim = Math.max(1, Math.round(zoom * 0.18));

          // 1. Wet sand border along water contact
          ctx.fillStyle = SHORE_COLORS.wetSand;
          if (border & 1) ctx.fillRect(px, py, tileSize, sandRim);
          if (border & 2) ctx.fillRect(px + tileSize - sandRim, py, sandRim, tileSize);
          if (border & 4) ctx.fillRect(px, py + tileSize - sandRim, tileSize, sandRim);
          if (border & 8) ctx.fillRect(px, py, sandRim, tileSize);

          // 2. Animated soft ocean foam wash onto adjacent water
          if (zoom >= 8) {
            const foamAlpha = 0.22 + tidePulse * 0.22;
            const foamThickness = Math.max(1, Math.round(zoom * 0.08 * (0.8 + tidePulse * 0.4)));

            ctx.fillStyle = `rgba(224, 242, 254, ${foamAlpha})`;

            // North water
            if (border & 1) {
              ctx.fillRect(px, py - foamThickness, tileSize, foamThickness);
            }
            // East water
            if (border & 2) {
              ctx.fillRect(px + tileSize, py, foamThickness, tileSize);
            }
            // South water
            if (border & 4) {
              ctx.fillRect(px, py + tileSize, tileSize, foamThickness);
            }
            // West water
            if (border & 8) {
              ctx.fillRect(px - foamThickness, py, foamThickness, tileSize);
            }

            // Smooth diagonal corner foam
            if ((border & 1) && (border & 2)) {
              ctx.fillRect(px + tileSize, py - foamThickness, foamThickness, foamThickness);
            }
            if ((border & 4) && (border & 2)) {
              ctx.fillRect(px + tileSize, py + tileSize, foamThickness, foamThickness);
            }
            if ((border & 4) && (border & 8)) {
              ctx.fillRect(px - foamThickness, py + tileSize, foamThickness, foamThickness);
            }
            if ((border & 1) && (border & 8)) {
              ctx.fillRect(px - foamThickness, py - foamThickness, foamThickness, foamThickness);
            }
          }
        }
      }
    }
  }

  /**
   * Renders elevation relief: shadow cast on southern/eastern edges of mountains
   */
  private renderElevationRelief(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    const ctx = this.ctx;
    const tileSize = Math.ceil(zoom);
    const shadowSize = Math.max(1, Math.round(zoom * 0.15));

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const type = this.world.getTile(tx, ty);

        if (type === TileType.MOUNTAIN || type === TileType.SNOW) {
          const s = this.world.getTile(tx, ty + 1);
          const e = this.world.getTile(tx + 1, ty);

          const { screenX, screenY } = this.camera.worldToScreen(tx, ty, canvasW, canvasH);
          const px = Math.floor(screenX);
          const py = Math.floor(screenY);

          // If South neighbor is lower elevation, cast drop shadow
          if (s !== TileType.MOUNTAIN && s !== TileType.SNOW) {
            ctx.fillStyle = SHORE_COLORS.cliffShadow;
            ctx.fillRect(px, py + tileSize, tileSize, shadowSize);
          }

          // If East neighbor is lower elevation, cast drop shadow
          if (e !== TileType.MOUNTAIN && e !== TileType.SNOW) {
            ctx.fillStyle = SHORE_COLORS.cliffShadow;
            ctx.fillRect(px + tileSize, py, shadowSize, tileSize);
          }
        }
      }
    }
  }

  private renderGrid(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let tx = bounds.minX; tx <= bounds.maxX + 1; tx++) {
      const { screenX } = this.camera.worldToScreen(tx, 0, canvasW, canvasH);
      const px = Math.floor(screenX);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvasH);
      ctx.stroke();
    }

    for (let ty = bounds.minY; ty <= bounds.maxY + 1; ty++) {
      const { screenY } = this.camera.worldToScreen(0, ty, canvasW, canvasH);
      const py = Math.floor(screenY);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvasW, py);
      ctx.stroke();
    }
  }

  private renderPoliticalTerritory(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    if (!this.territoryManager || !this.kingdomManager) return;
    const ctx = this.ctx;
    const tileSize = Math.ceil(zoom);

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const ownerId = this.territoryManager.getOwnerKingdomId(tx, ty);
        if (!ownerId) continue;

        const kingdom = this.kingdomManager.getKingdom(ownerId);
        if (!kingdom) continue;

        const { screenX, screenY } = this.camera.worldToScreen(tx, ty, canvasW, canvasH);
        const px = Math.floor(screenX);
        const py = Math.floor(screenY);

        // Translucent kingdom color wash
        ctx.fillStyle = `${kingdom.color}35`; // ~21% opacity
        ctx.fillRect(px, py, tileSize, tileSize);

        // Border edge detection: check 4 neighbors
        const nN = this.territoryManager.getOwnerKingdomId(tx, ty - 1) !== ownerId;
        const nS = this.territoryManager.getOwnerKingdomId(tx, ty + 1) !== ownerId;
        const nW = this.territoryManager.getOwnerKingdomId(tx - 1, ty) !== ownerId;
        const nE = this.territoryManager.getOwnerKingdomId(tx + 1, ty) !== ownerId;

        if (nN || nS || nW || nE) {
          ctx.strokeStyle = kingdom.color;
          ctx.lineWidth = Math.max(1.5, Math.round(zoom / 8));
          ctx.beginPath();
          if (nN) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + tileSize, py);
          }
          if (nS) {
            ctx.moveTo(px, py + tileSize);
            ctx.lineTo(px + tileSize, py + tileSize);
          }
          if (nW) {
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + tileSize);
          }
          if (nE) {
            ctx.moveTo(px + tileSize, py);
            ctx.lineTo(px + tileSize, py + tileSize);
          }
          ctx.stroke();
        }
      }
    }
  }

  private renderObjects(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    const ctx = this.ctx;

    // Collect visible resources
    const visibleResources = this.resourceManager.getResourcesInArea(
      bounds.minX,
      bounds.minY,
      bounds.maxX,
      bounds.maxY
    );

    // Collect visible buildings
    const visibleBuildings = this.buildingManager
      ? this.buildingManager.getBuildingsInArea(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
      : [];

    // Collect visible humans
    const visibleHumans: any[] = [];
    for (const human of this.entityManager.humans.values()) {
      if (
        human.x >= bounds.minX - 1 &&
        human.x <= bounds.maxX + 1 &&
        human.y >= bounds.minY - 1 &&
        human.y <= bounds.maxY + 1
      ) {
        visibleHumans.push(human);
      }
    }

    interface DrawableItem {
      yOrder: number;
      draw: () => void;
    }

    const drawables: DrawableItem[] = [];

    // 1. Resources
    for (const res of visibleResources) {
      const { screenX, screenY } = this.camera.worldToScreen(res.x, res.y, canvasW, canvasH);
      drawables.push({
        yOrder: res.y + 0.5,
        draw: () => {
          if (res.type === 'TREE') {
            PixelSprites.drawTree(ctx, res, screenX, screenY, zoom);
          } else if (res.type === 'BERRY_BUSH') {
            PixelSprites.drawBerryBush(ctx, res, screenX, screenY, zoom);
          } else {
            PixelSprites.drawStone(ctx, res, screenX, screenY, zoom);
          }
        },
      });
    }

    // 2. Animal Carcasses
    if (this.animalManager) {
      for (const carcass of this.animalManager.carcasses.values()) {
        if (
          carcass.x >= bounds.minX - 1 &&
          carcass.x <= bounds.maxX + 1 &&
          carcass.y >= bounds.minY - 1 &&
          carcass.y <= bounds.maxY + 1
        ) {
          const { screenX, screenY } = this.camera.worldToScreen(carcass.x, carcass.y, canvasW, canvasH);
          drawables.push({
            yOrder: carcass.y + 0.1,
            draw: () => {
              PixelSprites.drawCarcass(ctx, carcass, screenX, screenY, zoom);
            },
          });
        }
      }
    }

    // 3. Buildings
    const selectedBldId = this.buildingManager?.selectedBuildingId;
    for (const bld of visibleBuildings) {
      const { screenX, screenY } = this.camera.worldToScreen(bld.x, bld.y, canvasW, canvasH);
      const isSelected = bld.id === selectedBldId;
      const kingdom = bld.kingdomId && this.kingdomManager ? this.kingdomManager.getKingdom(bld.kingdomId) : null;
      const kingdomColor = kingdom ? kingdom.color : undefined;

      drawables.push({
        yOrder: bld.y + bld.height,
        draw: () => {
          PixelSprites.drawBuilding(ctx, bld, screenX, screenY, zoom, isSelected, kingdomColor);
        },
      });
    }

    // 4. Animals
    if (this.animalManager) {
      const selectedAnimalId = this.animalManager.selectedAnimalId;
      for (const animal of this.animalManager.animals.values()) {
        if (animal.health <= 0) continue;
        if (
          animal.x >= bounds.minX - 1 &&
          animal.x <= bounds.maxX + 1 &&
          animal.y >= bounds.minY - 1 &&
          animal.y <= bounds.maxY + 1
        ) {
          const { screenX, screenY } = this.camera.worldToScreen(animal.x, animal.y, canvasW, canvasH);
          const isSelected = animal.id === selectedAnimalId;
          drawables.push({
            yOrder: animal.y,
            draw: () => {
              PixelSprites.drawAnimal(ctx, animal, screenX, screenY, zoom, isSelected);
            },
          });
        }
      }
    }

    // 5. Humans
    const selectedId = this.entityManager.selectedHumanId;
    for (const human of visibleHumans) {
      const { screenX, screenY } = this.camera.worldToScreen(human.x, human.y, canvasW, canvasH);
      const isSelected = human.id === selectedId;
      const kingdom = human.kingdomId && this.kingdomManager ? this.kingdomManager.getKingdom(human.kingdomId) : null;
      const kingdomColor = kingdom ? kingdom.color : undefined;

      drawables.push({
        yOrder: human.y,
        draw: () => {
          PixelSprites.drawHuman(ctx, human, screenX, screenY, zoom, isSelected, kingdomColor);
        },
      });
    }

    // 6. Ships & Naval Vessels
    if (this.shipManager) {
      for (const ship of this.shipManager.ships.values()) {
        if (ship.health <= 0) continue;
        if (
          ship.x >= bounds.minX - 2 &&
          ship.x <= bounds.maxX + 2 &&
          ship.y >= bounds.minY - 2 &&
          ship.y <= bounds.maxY + 2
        ) {
          const { screenX, screenY } = this.camera.worldToScreen(ship.x, ship.y, canvasW, canvasH);
          const kingdom = ship.kingdomId && this.kingdomManager ? this.kingdomManager.getKingdom(ship.kingdomId) : null;
          const kingdomColor = kingdom ? kingdom.color : undefined;

          drawables.push({
            yOrder: ship.y + 0.2,
            draw: () => {
              PixelSprites.drawShip(ctx, ship, screenX, screenY, zoom, kingdomColor);
            },
          });
        }
      }
    }

    // 7. Trade Caravans
    if (this.tradeManager) {
      for (const caravan of this.tradeManager.caravans.values()) {
        if (
          caravan.x >= bounds.minX - 1 &&
          caravan.x <= bounds.maxX + 1 &&
          caravan.y >= bounds.minY - 1 &&
          caravan.y <= bounds.maxY + 1
        ) {
          const { screenX, screenY } = this.camera.worldToScreen(caravan.x, caravan.y, canvasW, canvasH);
          drawables.push({
            yOrder: caravan.y,
            draw: () => {
              PixelSprites.drawCaravan(ctx, caravan, screenX, screenY, zoom);
            },
          });
        }
      }
    }

    // Sort by yOrder ascending
    drawables.sort((a, b) => a.yOrder - b.yOrder);

    for (const item of drawables) {
      item.draw();
    }
  }

  /**
   * Renders footpaths and paved cobblestone roads on tiles
   */
  private renderRoads(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    if (!this.roadSystem) return;
    const ctx = this.ctx;

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const roadType = this.roadSystem.getRoadType(tx, ty);
        if (roadType !== 'NONE') {
          const { screenX, screenY } = this.camera.worldToScreen(tx, ty, canvasW, canvasH);
          PixelSprites.drawRoad(ctx, roadType, Math.floor(screenX), Math.floor(screenY), zoom);
        }
      }
    }
  }

  private renderSettlementBanners(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    if (!this.settlementManager || !this.kingdomManager) return;
    const ctx = this.ctx;

    for (const settlement of this.settlementManager.settlements.values()) {
      if (
        settlement.x < bounds.minX - 4 ||
        settlement.x > bounds.maxX + 4 ||
        settlement.y < bounds.minY - 4 ||
        settlement.y > bounds.maxY + 4
      ) {
        continue;
      }

      const { screenX, screenY } = this.camera.worldToScreen(settlement.x, settlement.y, canvasW, canvasH);
      const kingdom = settlement.kingdomId ? this.kingdomManager.getKingdom(settlement.kingdomId) : null;
      const badgeColor = kingdom ? kingdom.color : '#64748b';

      ctx.save();

      // Floating banner
      const bannerY = screenY - 24;
      const label = `${settlement.name} (${settlement.population})`;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(label);
      const textW = textMetrics.width;

      const paddingX = 8;
      const badgeW = textW + paddingX * 2 + 10;
      const badgeH = 20;
      const badgeX = screenX - badgeW / 2;

      // Background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(badgeX, bannerY, badgeW, badgeH, 6);
      ctx.fill();

      // Border with kingdom color
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Kingdom color dot
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.arc(badgeX + 8, bannerY + badgeH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX + 16, bannerY + badgeH / 2);

      ctx.restore();
    }
  }

  private renderSelectionHighlights(canvasW: number, canvasH: number, zoom: number): void {
    if (this.selectedEntityIds.size === 0) return;
    const ctx = this.ctx;
    ctx.save();

    const drawCorners = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      const cl = Math.max(3, Math.min(8, w * 0.3));

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cl);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cl, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + w - cl, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cl);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + w, y + h - cl);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - cl, y + h);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x + cl, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h - cl);
      ctx.stroke();
    };

    // Humans
    for (const h of this.entityManager.getHumans()) {
      if (this.selectedEntityIds.has(h.id)) {
        const { screenX, screenY } = this.camera.worldToScreen(h.x, h.y, canvasW, canvasH);
        drawCorners(screenX - zoom * 0.5, screenY - zoom * 0.9, zoom, zoom * 1.2, '#38bdf8');
      }
    }

    // Animals
    if (this.animalManager) {
      for (const a of this.animalManager.getAnimals()) {
        if (this.selectedEntityIds.has(a.id)) {
          const { screenX, screenY } = this.camera.worldToScreen(a.x, a.y, canvasW, canvasH);
          drawCorners(screenX - zoom * 0.5, screenY - zoom * 0.5, zoom, zoom, '#facc15');
        }
      }
    }

    ctx.restore();
  }

  private renderSelectionMarquee(): void {
    if (!this.selectionMarquee) return;
    const ctx = this.ctx;
    const { startX, startY, currentX, currentY } = this.selectionMarquee;
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(minX, minY, w, h);
    ctx.strokeRect(minX, minY, w, h);
    ctx.restore();
  }

  private renderCursor(canvasW: number, canvasH: number, zoom: number): void {
    if (!this.cursorWorldPos) return;

    const ctx = this.ctx;
    const { x, y } = this.cursorWorldPos;
    const { screenX, screenY } = this.camera.worldToScreen(x, y, canvasW, canvasH);

    ctx.save();

    const tool = this.activeTool;

    if (tool === 'move') {
      // Hand / Move mode cursor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'select') {
      // Select cursor
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(screenX - 9, screenY);
      ctx.lineTo(screenX - 4, screenY);
      ctx.moveTo(screenX + 4, screenY);
      ctx.lineTo(screenX + 9, screenY);
      ctx.moveTo(screenX, screenY - 9);
      ctx.lineTo(screenX - 4, screenY - 4);
      ctx.moveTo(screenX, screenY + 4);
      ctx.lineTo(screenX, screenY + 9);
      ctx.stroke();
    } else if (tool === 'inspect') {
      // Inspect tool
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(screenX + 6, screenY + 6);
      ctx.lineTo(screenX + 11, screenY + 11);
      ctx.stroke();
    } else if (tool === 'eraser') {
      // Eraser tool
      const r = (this.brushRadius / 2) * zoom;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eraser cross
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();
      ctx.moveTo(screenX - 5, screenY - 5);
      ctx.lineTo(screenX + 5, screenY + 5);
      ctx.moveTo(screenX + 5, screenY - 5);
      ctx.lineTo(screenX - 5, screenY + 5);
      ctx.stroke();
    } else if (
      tool === 'human' ||
      tool === 'deer' ||
      tool === 'boar' ||
      tool === 'wolf' ||
      tool === 'chicken' ||
      tool === 'cow'
    ) {
      // Creature tool preview
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const isWalkable = this.world.isWalkable(tileX, tileY);

      const { screenX: tileScreenX, screenY: tileScreenY } = this.camera.worldToScreen(
        tileX,
        tileY,
        canvasW,
        canvasH
      );

      ctx.lineWidth = 2;
      ctx.strokeStyle = isWalkable ? '#22c55e' : '#ef4444';
      ctx.fillStyle = isWalkable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.strokeRect(tileScreenX, tileScreenY, zoom, zoom);
      ctx.fillRect(tileScreenX, tileScreenY, zoom, zoom);

      ctx.fillStyle = isWalkable ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(screenX, screenY, zoom * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'tree' || tool === 'berry_bush' || tool === 'stone') {
      // Resource placement preview
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const isWalkable = this.world.isWalkable(tileX, tileY) && !this.resourceManager.hasResourceAt(tileX, tileY);

      const { screenX: tileScreenX, screenY: tileScreenY } = this.camera.worldToScreen(
        tileX,
        tileY,
        canvasW,
        canvasH
      );

      ctx.lineWidth = 2;
      ctx.strokeStyle = isWalkable ? '#22c55e' : '#ef4444';
      ctx.fillStyle = isWalkable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.strokeRect(tileScreenX, tileScreenY, zoom, zoom);
      ctx.fillRect(tileScreenX, tileScreenY, zoom, zoom);
    } else if (
      tool === 'house' ||
      tool === 'storage' ||
      tool === 'town_hall' ||
      tool === 'farm' ||
      tool === 'animal_pen'
    ) {
      // Building placement preview
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const isWalkable = this.world.isWalkable(tileX, tileY) && !(this.buildingManager && this.buildingManager.findBuildingAt(tileX, tileY));

      const { screenX: tileScreenX, screenY: tileScreenY } = this.camera.worldToScreen(
        tileX,
        tileY,
        canvasW,
        canvasH
      );

      ctx.lineWidth = 2;
      ctx.strokeStyle = isWalkable ? '#22c55e' : '#ef4444';
      ctx.fillStyle = isWalkable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.strokeRect(tileScreenX, tileScreenY, zoom, zoom);
      ctx.fillRect(tileScreenX, tileScreenY, zoom, zoom);
    } else if (
      tool === 'lightning' ||
      tool === 'meteor' ||
      tool === 'earthquake' ||
      tool === 'fire' ||
      tool === 'heal_rain' ||
      tool === 'divine_shield' ||
      tool === 'rejuvenate' ||
      tool === 'warrior_boost' ||
      tool === 'grenade' ||
      tool === 'napalm' ||
      tool === 'freeze'
    ) {
      // Stylized Divine Reticles
      let reticleColor = '#a855f7';
      let reticleRadiusTiles = 3.5;
      let label = 'БОГ';

      if (tool === 'lightning') {
        reticleColor = '#facc15';
        reticleRadiusTiles = 2.0;
        label = '⚡ МОЛНИЯ';
      } else if (tool === 'meteor') {
        reticleColor = '#ea580c';
        reticleRadiusTiles = 4.0;
        label = '☄️ МЕТЕОРИТ';
      } else if (tool === 'earthquake') {
        reticleColor = '#b45309';
        reticleRadiusTiles = 6.0;
        label = '🌋 ЗЕМЛЕТРЯСЕНИЕ';
      } else if (tool === 'fire') {
        reticleColor = '#f97316';
        reticleRadiusTiles = 2.5;
        label = '🔥 ОГОНЬ';
      } else if (tool === 'heal_rain') {
        reticleColor = '#38bdf8';
        reticleRadiusTiles = 5.0;
        label = '🌧️ ДОЖДЬ';
      } else if (tool === 'divine_shield') {
        reticleColor = '#facc15';
        reticleRadiusTiles = 4.5;
        label = '🛡️ ЩИТ';
      } else if (tool === 'rejuvenate') {
        reticleColor = '#10b981';
        reticleRadiusTiles = 4.5;
        label = '✨ МОЛОДОСТЬ';
      } else if (tool === 'warrior_boost') {
        reticleColor = '#ef4444';
        reticleRadiusTiles = 4.5;
        label = '⚔️ ЯРОСТЬ';
      } else if (tool === 'grenade') {
        reticleColor = '#f59e0b';
        reticleRadiusTiles = 3.0;
        label = '💣 ГРАНАТА';
      } else if (tool === 'napalm') {
        reticleColor = '#c084fc';
        reticleRadiusTiles = 3.5;
        label = '🔥 НАПАЛМ';
      } else if (tool === 'freeze') {
        reticleColor = '#0ea5e9';
        reticleRadiusTiles = 4.0;
        label = '❄️ ЗАМОРОЗКА';
      }

      const pixelR = reticleRadiusTiles * zoom;
      const pulse = Math.sin(this.animTime * 6) * 0.15 + 0.85;

      // Outer dashed circle
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, pixelR, 0, Math.PI * 2);
      ctx.stroke();

      // Soft glow area
      ctx.fillStyle = `${reticleColor}22`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, pixelR, 0, Math.PI * 2);
      ctx.fill();

      // Inner pulse ring
      ctx.strokeStyle = `${reticleColor}aa`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, pixelR * 0.45 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX - 8, screenY);
      ctx.lineTo(screenX + 8, screenY);
      ctx.moveTo(screenX, screenY - 8);
      ctx.lineTo(screenX, screenY + 8);
      ctx.stroke();

      // Power title tag above cursor
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(screenX - 45, screenY - pixelR - 18, 90, 15);
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX - 45, screenY - pixelR - 18, 90, 15);
      ctx.fillStyle = reticleColor;
      ctx.fillText(label, screenX, screenY - pixelR - 7);
    } else {
      // Biome / Terrain brush preview
      const r = (this.brushRadius / 2) * zoom;

      let color = '#22c55e'; // default green
      if (tool === 'forest') color = '#15803d';
      else if (tool === 'desert') color = '#eab308';
      else if (tool === 'savanna') color = '#84cc16';
      else if (tool === 'swamp') color = '#4d7c0f';
      else if (tool === 'snow') color = '#f8fafc';
      else if (tool === 'tundra') color = '#94a3b8';
      else if (tool === 'rocky' || tool === 'mountain') color = '#64748b';
      else if (tool === 'beach' || tool === 'sand') color = '#facc15';
      else if (tool === 'water') color = '#38bdf8';

      // Outer dashed circle (falloff limit)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `${color}28`; // translucent fill
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner solid circle if hardness < 1.0
      if (this.brushHardness < 0.99) {
        const innerR = r * this.brushHardness;
        ctx.strokeStyle = `${color}cc`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(screenX, screenY, innerR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(screenX - 4, screenY);
      ctx.lineTo(screenX + 4, screenY);
      ctx.moveTo(screenX, screenY - 4);
      ctx.lineTo(screenX, screenY + 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render all burning tiles
   */
  private renderFires(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    if (!this.godPowersManager) return;
    const activeFires = this.godPowersManager.fireSystem.getActiveFires();
    if (activeFires.length === 0) return;

    for (const fire of activeFires) {
      if (
        fire.x >= bounds.minX - 1 &&
        fire.x <= bounds.maxX + 1 &&
        fire.y >= bounds.minY - 1 &&
        fire.y <= bounds.maxY + 1
      ) {
        const { screenX, screenY } = this.camera.worldToScreen(
          fire.x,
          fire.y,
          canvasW,
          canvasH
        );
        PixelSprites.drawFireTile(
          this.ctx,
          screenX,
          screenY,
          zoom,
          fire.intensity,
          fire.isNapalm ?? false,
          this.animTime
        );
      }
    }
  }
}
