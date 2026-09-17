import { BuildingEntity, BuildingType } from '../types';
import { SIMULATION_CONFIG } from '../SimulationConfig';

export class Building implements BuildingEntity {
  public id: string;
  public type: BuildingType;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public settlementId: string | null = null;
  public kingdomId: string | null = null;

  public constructionProgress: number = 0; // 0 to 1
  public isCompleted: boolean = false;
  public woodNeeded: number;
  public woodDelivered: number = 0;
  public stoneNeeded: number;
  public stoneDelivered: number = 0;

  public occupants: string[] = [];
  public maxOccupants: number = 4;

  public captureProgress: number = 0;
  public capturingKingdomId: string | null = null;

  private static idCounter: number = 1;

  constructor(type: BuildingType, x: number, y: number, settlementId: string | null = null, kingdomId: string | null = null) {
    this.id = `bld_${Building.idCounter++}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.settlementId = settlementId;
    this.kingdomId = kingdomId;

    if (type === 'HOUSE') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = SIMULATION_CONFIG.houseCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.houseCost.stone;
      this.maxOccupants = SIMULATION_CONFIG.houseCapacity;
    } else if (type === 'STORAGE') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = SIMULATION_CONFIG.storageCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.storageCost.stone;
      this.maxOccupants = 0;
    } else {
      // TOWN_HALL
      this.width = 3;
      this.height = 3;
      this.woodNeeded = SIMULATION_CONFIG.townHallCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.townHallCost.stone;
      this.maxOccupants = 0;
    }
  }

  public deliverWood(amount: number): number {
    const needed = this.woodNeeded - this.woodDelivered;
    const delivered = Math.min(needed, amount);
    this.woodDelivered += delivered;
    this.updateProgress();
    return delivered;
  }

  public deliverStone(amount: number): number {
    const needed = this.stoneNeeded - this.stoneDelivered;
    const delivered = Math.min(needed, amount);
    this.stoneDelivered += delivered;
    this.updateProgress();
    return delivered;
  }

  public advanceWork(workAmount: number = 0.05): void {
    if (this.woodDelivered >= this.woodNeeded && this.stoneDelivered >= this.stoneNeeded) {
      this.constructionProgress = Math.min(1.0, this.constructionProgress + workAmount);
      if (this.constructionProgress >= 1.0) {
        this.isCompleted = true;
      }
    }
  }

  private updateProgress(): void {
    const matProgress =
      ((this.woodDelivered / Math.max(1, this.woodNeeded)) +
        (this.stoneDelivered / Math.max(1, this.stoneNeeded))) *
      0.4;
    this.constructionProgress = Math.max(this.constructionProgress, matProgress);
  }

  public needsResources(): boolean {
    return this.woodDelivered < this.woodNeeded || this.stoneDelivered < this.stoneNeeded;
  }

  public isReadyForLabor(): boolean {
    return this.woodDelivered >= this.woodNeeded && this.stoneDelivered >= this.stoneNeeded && !this.isCompleted;
  }
}
