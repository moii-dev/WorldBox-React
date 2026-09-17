import { TileType, GameConfig, BiomeBreakdown } from '../types';
import { Chunk } from './Chunk';
import { Noise } from './Noise';

export const DEFAULT_CONFIG: GameConfig = {
  worldWidth: 256,
  worldHeight: 256,
  chunkSize: 16,
  tileSize: 16,
  minZoom: 4,
  maxZoom: 48,
};

export class World {
  public readonly width: number;
  public readonly height: number;
  public readonly chunkSize: number;
  public readonly chunksX: number;
  public readonly chunksY: number;

  public tiles: Uint8Array;
  public elevation: Float32Array;
  public noise: Uint8Array;
  public borderMasks: Uint8Array;
  public waterDistance: Uint8Array;
  public waterNoise: Int8Array;
  public isWaterDirty: boolean = false;
  private chamferDist: Uint16Array | null = null;

  public chunks: Chunk[][];

  public totalLandTiles: number = 0;
  public totalWaterTiles: number = 0;

  // Track counts for each biome
  public biomes: BiomeBreakdown = {
    water: 0,
    shallowWater: 0,
    sand: 0,
    plains: 0,
    forest: 0,
    mountain: 0,
    snow: 0,
  };

  constructor(config: Partial<GameConfig> = {}) {
    this.width = config.worldWidth ?? DEFAULT_CONFIG.worldWidth;
    this.height = config.worldHeight ?? DEFAULT_CONFIG.worldHeight;
    this.chunkSize = config.chunkSize ?? DEFAULT_CONFIG.chunkSize;
    this.chunksX = Math.ceil(this.width / this.chunkSize);
    this.chunksY = Math.ceil(this.height / this.chunkSize);

    const totalTiles = this.width * this.height;
    this.tiles = new Uint8Array(totalTiles);
    this.elevation = new Float32Array(totalTiles);
    this.noise = new Uint8Array(totalTiles);
    this.borderMasks = new Uint8Array(totalTiles);
    this.waterDistance = new Uint8Array(totalTiles);
    this.waterNoise = new Int8Array(totalTiles);

    // Initialize chunks
    this.chunks = [];
    for (let cy = 0; cy < this.chunksY; cy++) {
      this.chunks[cy] = [];
      for (let cx = 0; cx < this.chunksX; cx++) {
        this.chunks[cy][cx] = new Chunk(cx, cy, this.chunkSize);
      }
    }

    this.initWorld();
  }

  public initWorld(): void {
    const totalTiles = this.width * this.height;
    for (let i = 0; i < totalTiles; i++) {
      this.tiles[i] = TileType.WATER;
      this.elevation[i] = 0.1;
      this.noise[i] = Math.floor(Math.random() * 256);
      this.borderMasks[i] = 0;
      this.waterDistance[i] = 255;
    }

    // Precompute smooth, deterministic low-frequency spatial variation for ocean currents
    const noiseGen = new Noise(1337);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const val = noiseGen.fbm2D(x * 0.035, y * 0.035, 2, 0.5, 2.0);
        this.waterNoise[idx] = Math.round(val * 3); // -3 to +3
      }
    }

    this.totalLandTiles = 0;
    this.totalWaterTiles = totalTiles;
    this.biomes = {
      water: totalTiles,
      shallowWater: 0,
      sand: 0,
      plains: 0,
      forest: 0,
      mountain: 0,
      snow: 0,
    };

    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        this.chunks[cy][cx].landTileCount = 0;
        this.chunks[cy][cx].dirty = true;
      }
    }

    this.recalculateWaterDepth();
  }

  public getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  public isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public getTile(x: number, y: number): TileType {
    if (!this.isInBounds(x, y)) {
      return TileType.WATER;
    }
    return this.tiles[this.getIndex(x, y)];
  }

  public getElevation(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 0;
    return this.elevation[this.getIndex(x, y)];
  }

  public getNoise(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 0;
    return this.noise[this.getIndex(x, y)];
  }

  public getBorderMask(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 0;
    return this.borderMasks[this.getIndex(x, y)];
  }

  public getWaterDistance(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 255;
    return this.waterDistance[this.getIndex(x, y)];
  }

  public getWaterNoise(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 0;
    return this.waterNoise[this.getIndex(x, y)];
  }

  public isWater(type: TileType): boolean {
    return type === TileType.WATER || type === TileType.SHALLOW_WATER;
  }

  public isWalkable(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return false;
    const type = this.tiles[this.getIndex(x, y)];
    // Humans can walk on Sand, Plains (Land), Forest, Mountain, Snow, Swamp
    return (
      type === TileType.LAND ||
      type === TileType.SAND ||
      type === TileType.FOREST ||
      type === TileType.MOUNTAIN ||
      type === TileType.SNOW ||
      type === TileType.SWAMP
    );
  }

  public setTileDirect(x: number, y: number, type: TileType, elevation: number = 0.5): void {
    if (!this.isInBounds(x, y)) return;
    const idx = this.getIndex(x, y);
    this.tiles[idx] = type;
    this.elevation[idx] = elevation;

    const isWalk = this.isWalkable(x, y);
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    if (cx >= 0 && cx < this.chunksX && cy >= 0 && cy < this.chunksY) {
      if (isWalk) this.chunks[cy][cx].landTileCount++;
    }
  }

  public setTile(x: number, y: number, type: TileType, elevation: number = 0.5): boolean {
    if (!this.isInBounds(x, y)) return false;

    const idx = this.getIndex(x, y);
    const prevType = this.tiles[idx];
    if (prevType === type) return false;

    this.tiles[idx] = type;
    this.elevation[idx] = elevation;

    this.updateBiomeCount(prevType, -1);
    this.updateBiomeCount(type, 1);

    const prevWalk = this.isWalkableType(prevType);
    const newWalk = this.isWalkableType(type);

    if (newWalk && !prevWalk) {
      this.totalLandTiles++;
      this.totalWaterTiles--;
    } else if (!newWalk && prevWalk) {
      this.totalLandTiles--;
      this.totalWaterTiles++;
    }

    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    if (cx >= 0 && cx < this.chunksX && cy >= 0 && cy < this.chunksY) {
      const chunk = this.chunks[cy][cx];
      chunk.dirty = true;
      if (newWalk && !prevWalk) chunk.landTileCount++;
      else if (!newWalk && prevWalk) chunk.landTileCount = Math.max(0, chunk.landTileCount - 1);
    }

    if (newWalk !== prevWalk || this.isWater(prevType) !== this.isWater(type)) {
      this.isWaterDirty = true;
    }

    this.updateBordersAround(x, y);
    return true;
  }

  private isWalkableType(type: TileType): boolean {
    return (
      type === TileType.LAND ||
      type === TileType.SAND ||
      type === TileType.FOREST ||
      type === TileType.MOUNTAIN ||
      type === TileType.SNOW ||
      type === TileType.SWAMP
    );
  }

  private updateBiomeCount(type: TileType, delta: number): void {
    switch (type) {
      case TileType.WATER:
        this.biomes.water = Math.max(0, this.biomes.water + delta);
        break;
      case TileType.SHALLOW_WATER:
        this.biomes.shallowWater = Math.max(0, this.biomes.shallowWater + delta);
        break;
      case TileType.SAND:
        this.biomes.sand = Math.max(0, this.biomes.sand + delta);
        break;
      case TileType.LAND:
        this.biomes.plains = Math.max(0, this.biomes.plains + delta);
        break;
      case TileType.FOREST:
        this.biomes.forest = Math.max(0, this.biomes.forest + delta);
        break;
      case TileType.MOUNTAIN:
        this.biomes.mountain = Math.max(0, this.biomes.mountain + delta);
        break;
      case TileType.SNOW:
        this.biomes.snow = Math.max(0, this.biomes.snow + delta);
        break;
    }
  }

  /**
   * Recalculate 8-direction border bitmask for smooth transitions:
   * Bit 0: North
   * Bit 1: East
   * Bit 2: South
   * Bit 3: West
   * Bit 4: North-West
   * Bit 5: North-East
   * Bit 6: South-East
   * Bit 7: South-West
   */
  public updateBorderMaskAt(x: number, y: number): void {
    if (!this.isInBounds(x, y)) return;
    const idx = this.getIndex(x, y);
    const myType = this.tiles[idx];

    let mask = 0;

    const n = this.getTile(x, y - 1);
    const e = this.getTile(x + 1, y);
    const s = this.getTile(x, y + 1);
    const w = this.getTile(x - 1, y);

    const nw = this.getTile(x - 1, y - 1);
    const ne = this.getTile(x + 1, y - 1);
    const se = this.getTile(x + 1, y + 1);
    const sw = this.getTile(x - 1, y + 1);

    // If I am land/sand/forest/mountain/snow: detect water neighbors
    if (!this.isWater(myType)) {
      if (this.isWater(n)) mask |= 1;
      if (this.isWater(e)) mask |= 2;
      if (this.isWater(s)) mask |= 4;
      if (this.isWater(w)) mask |= 8;
      if (this.isWater(nw)) mask |= 16;
      if (this.isWater(ne)) mask |= 32;
      if (this.isWater(se)) mask |= 64;
      if (this.isWater(sw)) mask |= 128;
    } else if (myType === TileType.WATER) {
      // If I am deep water: detect shallow water or land neighbors
      if (!this.isWater(n) || n === TileType.SHALLOW_WATER) mask |= 1;
      if (!this.isWater(e) || e === TileType.SHALLOW_WATER) mask |= 2;
      if (!this.isWater(s) || s === TileType.SHALLOW_WATER) mask |= 4;
      if (!this.isWater(w) || w === TileType.SHALLOW_WATER) mask |= 8;
    } else if (myType === TileType.SHALLOW_WATER) {
      // Detect land neighbors
      if (!this.isWater(n)) mask |= 1;
      if (!this.isWater(e)) mask |= 2;
      if (!this.isWater(s)) mask |= 4;
      if (!this.isWater(w)) mask |= 8;
    }

    this.borderMasks[idx] = mask;
  }

  public updateBordersAround(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.updateBorderMaskAt(x + dx, y + dy);
      }
    }
  }

  public recalculateAllBorders(): void {
    let land = 0;
    let water = 0;
    const b: BiomeBreakdown = {
      water: 0,
      shallowWater: 0,
      sand: 0,
      plains: 0,
      forest: 0,
      mountain: 0,
      snow: 0,
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const type = this.tiles[this.getIndex(x, y)];
        if (this.isWalkableType(type)) land++;
        else water++;

        switch (type) {
          case TileType.WATER:
            b.water++;
            break;
          case TileType.SHALLOW_WATER:
            b.shallowWater++;
            break;
          case TileType.SAND:
            b.sand++;
            break;
          case TileType.LAND:
            b.plains++;
            break;
          case TileType.FOREST:
            b.forest++;
            break;
          case TileType.MOUNTAIN:
            b.mountain++;
            break;
          case TileType.SNOW:
            b.snow++;
            break;
        }

        this.updateBorderMaskAt(x, y);
      }
    }

    this.totalLandTiles = land;
    this.totalWaterTiles = water;
    this.biomes = b;

    for (let cy = 0; cy < this.chunksY; cy++) {
      for (let cx = 0; cx < this.chunksX; cx++) {
        this.chunks[cy][cx].dirty = true;
      }
    }

    this.recalculateWaterDepth();
  }

  /**
   * Fast 2-pass Chamfer distance transform (orthogonal = 10, diagonal = 14)
   * to calculate distance from all water tiles to the nearest land tile.
   * Runs in ~1ms for 256x256 and provides smooth, artifact-free depth contours.
   */
  public recalculateWaterDepth(): void {
    const w = this.width;
    const h = this.height;
    const total = w * h;

    if (!this.chamferDist || this.chamferDist.length !== total) {
      this.chamferDist = new Uint16Array(total);
    }
    const dist = this.chamferDist;
    const INF = 32000;

    let shallowCount = 0;
    let deepCount = 0;

    // Initialize: 0 for land, INF for water
    for (let i = 0; i < total; i++) {
      const type = this.tiles[i];
      if (!this.isWater(type)) {
        dist[i] = 0;
      } else {
        dist[i] = INF;
      }
    }

    // Pass 1: Forward (top-to-bottom, left-to-right)
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x;
        const d = dist[idx];
        if (d === 0) continue;

        let minD = d;
        // Check left
        if (x > 0) {
          const dL = dist[idx - 1] + 10;
          if (dL < minD) minD = dL;
        }
        // Check top-left, top, top-right
        if (y > 0) {
          const topIdx = idx - w;
          const dT = dist[topIdx] + 10;
          if (dT < minD) minD = dT;

          if (x > 0) {
            const dTL = dist[topIdx - 1] + 14;
            if (dTL < minD) minD = dTL;
          }
          if (x < w - 1) {
            const dTR = dist[topIdx + 1] + 14;
            if (dTR < minD) minD = dTR;
          }
        }
        dist[idx] = minD;
      }
    }

    // Pass 2: Backward (bottom-to-top, right-to-left)
    for (let y = h - 1; y >= 0; y--) {
      const rowOffset = y * w;
      for (let x = w - 1; x >= 0; x--) {
        const idx = rowOffset + x;
        const d = dist[idx];
        if (d === 0) continue;

        let minD = d;
        // Check right
        if (x < w - 1) {
          const dR = dist[idx + 1] + 10;
          if (dR < minD) minD = dR;
        }
        // Check bottom-left, bottom, bottom-right
        if (y < h - 1) {
          const btmIdx = idx + w;
          const dB = dist[btmIdx] + 10;
          if (dB < minD) minD = dB;

          if (x > 0) {
            const dBL = dist[btmIdx - 1] + 14;
            if (dBL < minD) minD = dBL;
          }
          if (x < w - 1) {
            const dBR = dist[btmIdx + 1] + 14;
            if (dBR < minD) minD = dBR;
          }
        }
        dist[idx] = minD;
      }
    }

    // Convert to tile distances (0..255) and classify water stats
    for (let i = 0; i < total; i++) {
      const type = this.tiles[i];
      if (this.isWater(type)) {
        const tileDist = Math.min(255, Math.round(dist[i] / 10));
        this.waterDistance[i] = tileDist;
        if (tileDist <= 2) {
          shallowCount++;
          this.tiles[i] = TileType.SHALLOW_WATER;
        } else {
          deepCount++;
          this.tiles[i] = TileType.WATER;
        }
      } else {
        this.waterDistance[i] = 0;
      }
    }

    this.biomes.shallowWater = shallowCount;
    this.biomes.water = deepCount;
    this.isWaterDirty = false;
  }

  /**
   * Paint terrain with elevation-aware biomes or specific biome brush
   */
  public paintCircle(
    centerX: number,
    centerY: number,
    brushRadius: number,
    targetType: TileType | 'auto_land' = 'auto_land'
  ): number {
    const r = Math.max(0.5, brushRadius / 2);
    const rSq = r * r;
    const minX = Math.max(0, Math.floor(centerX - r - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + r + 1));
    const minY = Math.max(0, Math.floor(centerY - r - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + r + 1));

    let changed = 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= rSq) {
          const normDist = Math.sqrt(distSq) / r; // 0 at center, 1 at edge

          let type: TileType;
          let elev: number;

          if (targetType === 'auto_land') {
            // Procedural elevation based on brush distance:
            // Center is higher (mountain/forest/plains), edge is beach/shallow water
            if (brushRadius >= 10) {
              if (normDist < 0.25) {
                type = TileType.SNOW;
                elev = 0.9;
              } else if (normDist < 0.45) {
                type = TileType.MOUNTAIN;
                elev = 0.78;
              } else if (normDist < 0.7) {
                type = TileType.FOREST;
                elev = 0.62;
              } else if (normDist < 0.88) {
                type = TileType.LAND;
                elev = 0.52;
              } else {
                type = TileType.SAND;
                elev = 0.46;
              }
            } else if (brushRadius >= 5) {
              if (normDist < 0.4) {
                type = TileType.FOREST;
                elev = 0.65;
              } else if (normDist < 0.8) {
                type = TileType.LAND;
                elev = 0.52;
              } else {
                type = TileType.SAND;
                elev = 0.46;
              }
            } else {
              // Small brush
              type = normDist < 0.7 ? TileType.LAND : TileType.SAND;
              elev = 0.52;
            }
          } else {
            type = targetType;
            elev = 0.6;
          }

          if (this.setTile(x, y, type, elev)) {
            changed++;
          }
        }
      }
    }

    if (changed > 0 || this.isWaterDirty) {
      this.recalculateWaterDepth();
    }

    return changed;
  }

  private hasAdjacentLand(x: number, y: number): boolean {
    const neighbors = [
      this.getTile(x, y - 1),
      this.getTile(x + 1, y),
      this.getTile(x, y + 1),
      this.getTile(x - 1, y),
    ];
    return neighbors.some((t) => !this.isWater(t));
  }
}
