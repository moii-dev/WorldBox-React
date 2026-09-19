import { KingdomEntity } from '../types';

export class Kingdom implements KingdomEntity {
  public id: string;
  public name: string;
  public color: string;
  public capitalSettlementId: string;
  public settlementIds: string[] = [];
  public population: number = 0;
  public territoryCount: number = 0;
  public militaryStrength: number = 0;
  public relations: Record<string, number> = {};
  public atWarWith: string[] = [];

  // Ruler, Era, Culture
  public rulerName: string = 'Правитель';
  public rulerTrait: 'PEACEFUL' | 'CRUEL' | 'EXPANSIONIST' | 'BUILDER' | 'DEVOUT' | 'MERCHANT' = 'PEACEFUL';
  public era: 'PRIMITIVE' | 'BRONZE' | 'IRON' | 'IMPERIAL' = 'PRIMITIVE';
  public faith: number = 0;

  private static idCounter: number = 1;
  private static rulerFirstNames = ['Ярослав', 'Святополк', 'Владимир', 'Олег', 'Игорь', 'Всеволод', 'Мстислав', 'Рюрик', 'Добрыня', 'Борис', 'Глеб', 'Даниил'];
  private static rulerTitles = ['Мудрый', 'Грозный', 'Строитель', 'Храбрый', 'Великий', 'Благочестивый', 'Мореплаватель', 'Справедливый'];
  private static traits: ('PEACEFUL' | 'CRUEL' | 'EXPANSIONIST' | 'BUILDER' | 'DEVOUT' | 'MERCHANT')[] = [
    'PEACEFUL', 'CRUEL', 'EXPANSIONIST', 'BUILDER', 'DEVOUT', 'MERCHANT'
  ];

  constructor(name: string, color: string, capitalSettlementId: string) {
    this.id = `kng_${Kingdom.idCounter++}`;
    this.name = name;
    this.color = color;
    this.capitalSettlementId = capitalSettlementId;
    this.settlementIds = [capitalSettlementId];

    // Generate random ruler and trait
    const fn = Kingdom.rulerFirstNames[Math.floor(Math.random() * Kingdom.rulerFirstNames.length)];
    const title = Kingdom.rulerTitles[Math.floor(Math.random() * Kingdom.rulerTitles.length)];
    this.rulerName = `${fn} ${title}`;
    this.rulerTrait = Kingdom.traits[Math.floor(Math.random() * Kingdom.traits.length)];
  }

  public addSettlement(settlementId: string): void {
    if (!this.settlementIds.includes(settlementId)) {
      this.settlementIds.push(settlementId);
    }
  }

  public removeSettlement(settlementId: string): void {
    const idx = this.settlementIds.indexOf(settlementId);
    if (idx !== -1) {
      this.settlementIds.splice(idx, 1);
    }
    // If capital lost, reassign capital if another settlement exists
    if (this.capitalSettlementId === settlementId && this.settlementIds.length > 0) {
      this.capitalSettlementId = this.settlementIds[0];
    }
  }

  public getRelation(otherKingdomId: string): number {
    if (this.relations[otherKingdomId] === undefined) {
      this.relations[otherKingdomId] = 0; // neutral default
    }
    return this.relations[otherKingdomId];
  }

  public setRelation(otherKingdomId: string, value: number): void {
    this.relations[otherKingdomId] = Math.max(-100, Math.min(100, value));
  }

  public modifyRelation(otherKingdomId: string, delta: number): number {
    const current = this.getRelation(otherKingdomId);
    const updated = Math.max(-100, Math.min(100, current + delta));
    this.relations[otherKingdomId] = updated;
    return updated;
  }

  public isAtWar(): boolean {
    return this.atWarWith.length > 0;
  }

  public isAtWarWith(otherKingdomId: string): boolean {
    return this.atWarWith.includes(otherKingdomId);
  }

  public declareWar(otherKingdomId: string): void {
    if (!this.atWarWith.includes(otherKingdomId)) {
      this.atWarWith.push(otherKingdomId);
      this.setRelation(otherKingdomId, -90);
    }
  }

  public endWar(otherKingdomId: string): void {
    const idx = this.atWarWith.indexOf(otherKingdomId);
    if (idx !== -1) {
      this.atWarWith.splice(idx, 1);
      this.setRelation(otherKingdomId, -30); // post-war peace starts tense
    }
  }
}
