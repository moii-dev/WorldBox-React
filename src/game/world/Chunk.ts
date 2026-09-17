import { TileType } from '../types';

export class Chunk {
  public readonly chunkX: number;
  public readonly chunkY: number;
  public readonly size: number;
  public dirty: boolean = true;
  public landTileCount: number = 0;

  constructor(chunkX: number, chunkY: number, size: number = 16) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.size = size;
  }

  get minTileX(): number {
    return this.chunkX * this.size;
  }

  get minTileY(): number {
    return this.chunkY * this.size;
  }

  get maxTileX(): number {
    return (this.chunkX + 1) * this.size - 1;
  }

  get maxTileY(): number {
    return (this.chunkY + 1) * this.size - 1;
  }
}
