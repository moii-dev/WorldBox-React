import { DeathCause, PopulationReport } from '../types';

/** Keeps compact annual census data and prevents runaway autonomous births under load. */
export class PopulationManager {
  private reports: PopulationReport[] = [];
  private current: PopulationReport | null = null;
  private lowTpsSeconds = 0;
  private healthyTpsSeconds = 0;
  public dynamicPopulationCap = Number.POSITIVE_INFINITY;

  public beginYear(year: number, population: number): void {
    if (this.current?.year === year) return;
    if (this.current) {
      this.current.populationEnd = population;
      this.reports.push(this.current);
      if (this.reports.length > 100) this.reports.shift();
    }
    this.current = {
      year,
      births: 0,
      deaths: {},
      populationStart: population,
      populationEnd: population,
    };
  }

  public recordBirth(): void {
    if (this.current) this.current.births++;
  }

  public recordDeath(cause: DeathCause): void {
    if (!this.current) return;
    this.current.deaths[cause] = (this.current.deaths[cause] ?? 0) + 1;
  }

  public updateGovernor(
    deltaSeconds: number,
    tps: number,
    population: number,
    configuredMaximum: number
  ): number {
    if (!Number.isFinite(this.dynamicPopulationCap)) {
      this.dynamicPopulationCap = configuredMaximum;
    }

    if (tps < 22) {
      this.lowTpsSeconds += deltaSeconds;
      this.healthyTpsSeconds = 0;
      if (this.lowTpsSeconds >= 5) {
        this.dynamicPopulationCap = Math.min(this.dynamicPopulationCap, population);
      }
    } else if (tps >= 24) {
      this.healthyTpsSeconds += deltaSeconds;
      this.lowTpsSeconds = 0;
      if (this.healthyTpsSeconds >= 10 && this.dynamicPopulationCap < configuredMaximum) {
        this.dynamicPopulationCap = Math.min(configuredMaximum, this.dynamicPopulationCap + Math.max(1, Math.ceil(configuredMaximum * 0.05)));
        this.healthyTpsSeconds = 0;
      }
    }

    return this.dynamicPopulationCap;
  }

  public getLatestReport(population: number): PopulationReport | null {
    if (!this.current) return this.reports.at(-1) ?? null;
    return { ...this.current, populationEnd: population, deaths: { ...this.current.deaths } };
  }

  public getReports(population: number): PopulationReport[] {
    const latest = this.getLatestReport(population);
    return latest ? [...this.reports, latest] : [...this.reports];
  }

  public setReports(reports: PopulationReport[] | undefined, year: number, population: number): void {
    this.reports = (reports ?? []).slice(-100).map((report) => ({ ...report, deaths: { ...report.deaths } }));
    this.current = null;
    this.beginYear(year, population);
  }

  public reset(population: number = 0): void {
    this.reports = [];
    this.current = null;
    this.lowTpsSeconds = 0;
    this.healthyTpsSeconds = 0;
    this.dynamicPopulationCap = Number.POSITIVE_INFINITY;
    this.beginYear(1, population);
  }
}
