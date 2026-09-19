import { RoadType } from '../types';
import { World } from '../world/World';

export class RoadSystem {
  public readonly width: number;
  public readonly height: number;
  public roads: Uint8Array; // 0 = none, 1 = dirt, 2 = paved
  public wear: Uint8Array;  // foot traffic accumulation

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.roads = new Uint8Array(width * height);
    this.wear = new Uint8Array(width * height);
  }

  public getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  public getRoadType(x: number, y: number): RoadType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'NONE';
    const val = this.roads[this.getIndex(x, y)];
    if (val === 1) return 'DIRT';
    if (val === 2) return 'PAVED';
    return 'NONE';
  }

  public getSpeedMultiplier(x: number, y: number): number {
    const r = this.getRoadType(x, y);
    if (r === 'PAVED') return 1.6;
    if (r === 'DIRT') return 1.35;
    return 1.0;
  }

  /**
   * Called when a human or animal steps on a tile
   */
  public recordFootstep(x: number, y: number, isSettlementCenter: boolean = false, isAdvancedEra: boolean = false): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = this.getIndex(x, y);

    // Wear accumulates
    if (this.wear[idx] < 255) {
      this.wear[idx]++;
    }

    // Progression:
    // Foot traffic >= 20 -> DIRT path
    if (this.roads[idx] === 0 && this.wear[idx] >= 18) {
      this.roads[idx] = 1;
    }
    // High traffic or paved city era -> PAVED road
    else if (this.roads[idx] === 1 && (this.wear[idx] >= 80 || (isSettlementCenter && isAdvancedEra))) {
      this.roads[idx] = 2;
    }
  }

  public paveTile(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.roads[this.getIndex(x, y)] = 2;
  }

  public clear(): void {
    this.roads.fill(0);
    this.wear.fill(0);
  }

  public countRoads(): number {
    let count = 0;
    for (let i = 0; i < this.roads.length; i++) {
      if (this.roads[i] > 0) count++;
    }
    return count;
  }
}
