import { SettlementEntity } from '../types';

export class Settlement implements SettlementEntity {
  public id: string;
  public name: string;
  public x: number; // center x
  public y: number; // center y
  public kingdomId: string | null = null;
  public memberIds: string[] = [];
  public buildingIds: string[] = [];
  public storage = {
    wood: 25,
    stone: 15,
    food: 40,
  };
  public territoryTiles: { x: number; y: number }[] = [];
  public lastColonizationYear: number = 0;
  public captureTimer: number = 0; // if enemy soldiers occupy town hall

  private static idCounter: number = 1;

  constructor(name: string, x: number, y: number, kingdomId: string | null = null) {
    this.id = `settle_${Settlement.idCounter++}`;
    this.name = name;
    this.x = x;
    this.y = y;
    this.kingdomId = kingdomId;
  }

  public get population(): number {
    return this.memberIds.length;
  }

  public addMember(humanId: string): void {
    if (!this.memberIds.includes(humanId)) {
      this.memberIds.push(humanId);
    }
  }

  public removeMember(humanId: string): void {
    const idx = this.memberIds.indexOf(humanId);
    if (idx !== -1) {
      this.memberIds.splice(idx, 1);
    }
  }

  public addBuilding(buildingId: string): void {
    if (!this.buildingIds.includes(buildingId)) {
      this.buildingIds.push(buildingId);
    }
  }

  public removeBuilding(buildingId: string): void {
    const idx = this.buildingIds.indexOf(buildingId);
    if (idx !== -1) {
      this.buildingIds.splice(idx, 1);
    }
  }

  public depositWood(amount: number): void {
    this.storage.wood += amount;
  }

  public depositStone(amount: number): void {
    this.storage.stone += amount;
  }

  public depositFood(amount: number): void {
    this.storage.food += amount;
  }

  public withdrawWood(amount: number): number {
    const available = Math.min(this.storage.wood, amount);
    this.storage.wood -= available;
    return available;
  }

  public withdrawStone(amount: number): number {
    const available = Math.min(this.storage.stone, amount);
    this.storage.stone -= available;
    return available;
  }
}
