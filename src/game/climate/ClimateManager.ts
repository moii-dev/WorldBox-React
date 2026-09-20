import { BuildingManager } from '../buildings/BuildingManager';
import { EntityManager } from '../entities/EntityManager';
import { HistoryManager } from '../history/HistoryManager';
import {
  ClimateCrisis,
  ClimateCrisisType,
  ClimateState,
  Season,
} from '../types';
import { World } from '../world/World';

const SEASONS: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
const SEASON_TICKS = 25;
const YEAR_TICKS = SEASON_TICKS * SEASONS.length;
const CRISIS_DURATION_TICKS = SEASON_TICKS * 2;

const SEASON_LABELS: Record<Season, string> = {
  SPRING: 'Весна',
  SUMMER: 'Лето',
  AUTUMN: 'Осень',
  WINTER: 'Зима',
};

const CRISIS_LABELS: Record<ClimateCrisisType, string> = {
  DROUGHT: 'засуха',
  COLD_SNAP: 'сильные морозы',
  FLOOD: 'наводнение',
  HURRICANE: 'ураган',
  EPIDEMIC: 'эпидемия',
};

/** Seasonal modifiers and short-lived regional crises. Terrain is never permanently changed. */
export class ClimateManager {
  private crisisCounter = 1;
  public state: ClimateState = {
    season: 'SPRING',
    seasonProgress: 0,
    activeCrisis: null,
  };

  public get resourceGrowthMultiplier(): number {
    if (this.state.activeCrisis?.type === 'DROUGHT') return 0.3;
    if (this.state.season === 'SPRING') return 1.25;
    if (this.state.season === 'WINTER') return 0.45;
    return 1;
  }

  public get farmGrowthMultiplier(): number {
    if (this.state.activeCrisis?.type === 'DROUGHT') return 0.35;
    if (this.state.season === 'SPRING') return 1.2;
    if (this.state.season === 'WINTER') return 0.2;
    return 1;
  }

  public get hungerMultiplier(): number {
    let multiplier = this.state.season === 'WINTER' ? 1.25 : 1;
    if (this.state.activeCrisis?.type === 'COLD_SNAP') multiplier *= 1.2;
    return multiplier;
  }

  public update(
    tickCount: number,
    world: World,
    entityManager: EntityManager,
    buildingManager: BuildingManager,
    historyManager: HistoryManager,
    gameYear: number
  ): void {
    const season = SEASONS[Math.floor((tickCount % YEAR_TICKS) / SEASON_TICKS)];
    this.state.seasonProgress = (tickCount % SEASON_TICKS) / SEASON_TICKS;

    if (season !== this.state.season) {
      this.state.season = season;
      historyManager.logEvent(gameYear, `Началась ${SEASON_LABELS[season].toLowerCase()}.`, 'RELATION_CHANGE', '#93c5fd');
      if (!this.state.activeCrisis && Math.random() < 0.06) {
        this.startRandomCrisis(world, historyManager, gameYear);
      }
    }

    const crisis = this.state.activeCrisis;
    if (!crisis) return;

    crisis.remainingTicks--;
    if (tickCount % 10 === 0) {
      this.applyCrisisEffects(crisis, entityManager, buildingManager);
    }

    if (crisis.remainingTicks <= 0) {
      historyManager.logEvent(gameYear, `Региональное бедствие «${CRISIS_LABELS[crisis.type]}» закончилось.`, 'CATACLYSM', '#86efac');
      this.state.activeCrisis = null;
    }
  }

  private startRandomCrisis(world: World, historyManager: HistoryManager, gameYear: number): void {
    const types: ClimateCrisisType[] = ['DROUGHT', 'COLD_SNAP', 'FLOOD', 'HURRICANE', 'EPIDEMIC'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.floor(Math.random() * world.width) + 0.5;
    const y = Math.floor(Math.random() * world.height) + 0.5;
    this.state.activeCrisis = {
      id: `climate_${this.crisisCounter++}`,
      type,
      x,
      y,
      radius: type === 'HURRICANE' ? 10 : 8,
      remainingTicks: CRISIS_DURATION_TICKS,
      durationTicks: CRISIS_DURATION_TICKS,
    };
    historyManager.logEvent(gameYear, `В регионе начались ${CRISIS_LABELS[type]}.`, type === 'EPIDEMIC' ? 'FAMINE' : 'CATACLYSM', '#60a5fa');
  }

  private applyCrisisEffects(
    crisis: ClimateCrisis,
    entityManager: EntityManager,
    buildingManager: BuildingManager
  ): void {
    const radiusSq = crisis.radius * crisis.radius;
    for (const human of entityManager.humans.values()) {
      const distSq = (human.x - crisis.x) ** 2 + (human.y - crisis.y) ** 2;
      if (distSq > radiusSq) continue;
      if (crisis.type === 'EPIDEMIC') entityManager.damageHuman(human.id, 2, undefined, 'DISEASE');
      if (crisis.type === 'FLOOD') entityManager.damageHuman(human.id, 3, undefined, 'FLOOD');
      if (crisis.type === 'HURRICANE') entityManager.damageHuman(human.id, 4, undefined, 'HURRICANE');
    }

    if (crisis.type !== 'HURRICANE') return;
    for (const building of buildingManager.buildings.values()) {
      const cx = building.x + building.width / 2;
      const cy = building.y + building.height / 2;
      if ((cx - crisis.x) ** 2 + (cy - crisis.y) ** 2 <= radiusSq) {
        building.health = Math.max(0, (building.health ?? building.maxHealth ?? 100) - 5);
      }
    }
  }

  public getState(): ClimateState {
    return {
      ...this.state,
      activeCrisis: this.state.activeCrisis ? { ...this.state.activeCrisis } : null,
    };
  }

  public setState(state?: Partial<ClimateState>): void {
    this.state = {
      season: state?.season ?? 'SPRING',
      seasonProgress: state?.seasonProgress ?? 0,
      activeCrisis: state?.activeCrisis ? { ...state.activeCrisis } : null,
    };
  }

  public clear(): void {
    this.crisisCounter = 1;
    this.state = { season: 'SPRING', seasonProgress: 0, activeCrisis: null };
  }
}
