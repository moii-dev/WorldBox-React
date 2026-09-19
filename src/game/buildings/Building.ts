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

  public health: number = 100;
  public maxHealth: number = 100;
  public onFireTimer: number = 0;

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
      this.maxHealth = 100;
    } else if (type === 'STORAGE') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = SIMULATION_CONFIG.storageCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.storageCost.stone;
      this.maxOccupants = 0;
      this.maxHealth = 150;
    } else if (type === 'FARM') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = SIMULATION_CONFIG.farmCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.farmCost.stone;
      this.maxOccupants = 0;
      this.cropStage = 'PLANTING';
      this.cropProgress = 0;
      this.maxHealth = 80;
    } else if (type === 'ANIMAL_PEN') {
      this.width = 3;
      this.height = 3;
      this.woodNeeded = SIMULATION_CONFIG.penCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.penCost.stone;
      this.maxOccupants = 0;
      this.livestockIds = [];
      this.maxHealth = 120;
    } else if (type === 'WATCHTOWER') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = 20;
      this.stoneNeeded = 15;
      this.maxOccupants = 2;
      this.maxHealth = 250;
    } else if (type === 'DEFENSIVE_WALL') {
      this.width = 1;
      this.height = 1;
      this.woodNeeded = 5;
      this.stoneNeeded = 15;
      this.maxOccupants = 0;
      this.maxHealth = 350;
    } else if (type === 'BLACKSMITH') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = 25;
      this.stoneNeeded = 25;
      this.maxOccupants = 2;
      this.maxHealth = 200;
    } else if (type === 'TEMPLE') {
      this.width = 3;
      this.height = 3;
      this.woodNeeded = 35;
      this.stoneNeeded = 35;
      this.maxOccupants = 4;
      this.maxHealth = 350;
    } else if (type === 'DOCK') {
      this.width = 2;
      this.height = 2;
      this.woodNeeded = 30;
      this.stoneNeeded = 10;
      this.maxOccupants = 2;
      this.maxHealth = 200;
    } else {
      // TOWN_HALL
      this.width = 3;
      this.height = 3;
      this.woodNeeded = SIMULATION_CONFIG.townHallCost.wood;
      this.stoneNeeded = SIMULATION_CONFIG.townHallCost.stone;
      this.maxOccupants = 0;
      this.maxHealth = 300;
    }
    this.health = this.maxHealth;
  }

  // Farm-specific state
  public cropStage?: 'PLANTING' | 'GROWING' | 'READY' | 'HARVESTING' | 'EMPTY';
  public cropProgress?: number;

  // Animal Pen-specific state
  public livestockIds?: string[];
  public maxLivestock: number = 8;

  public get livestockCapacity(): number {
    return this.maxLivestock;
  }

  public updateFarm(growthSpeed: number = 0.004): void {
    if (this.type !== 'FARM' || !this.isCompleted) return;

    if (this.cropStage === 'PLANTING') {
      this.cropStage = 'GROWING';
      this.cropProgress = 0;
    } else if (this.cropStage === 'GROWING') {
      this.cropProgress = Math.min(1.0, (this.cropProgress || 0) + growthSpeed);
      if (this.cropProgress >= 1.0) {
        this.cropStage = 'READY';
      }
    }
  }

  public harvestCrops(): number {
    if (this.type !== 'FARM' || this.cropStage !== 'READY') return 0;
    this.cropStage = 'PLANTING';
    this.cropProgress = 0;
    return 6; // food units produced
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
