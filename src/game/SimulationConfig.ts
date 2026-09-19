/**
 * Simulation Balance & Configuration Constants
 * Centralized settings to avoid magic numbers throughout the codebase.
 */
export const SIMULATION_CONFIG = {
  // Time & Aging
  // At 25 TPS base speed, 100 ticks = 4 seconds per game year
  ticksPerGameYear: 100,
  
  // Life stages (in game years)
  childAgeMax: 12,
  teenAgeMax: 17,
  adultAgeMax: 59,
  elderAgeMin: 60,
  maxAgeMin: 75,
  maxAgeMax: 92,

  // Reproduction
  reproductionCooldownTicks: 350, // ~14 seconds cooldown between births
  reproductionMinAge: 18,
  reproductionMaxAge: 55,
  reproductionMaxProximity: 6.0, // tiles distance to find partner
  basePartnerChance: 0.15, // chance during idle to seek partner
  baseConceptionChance: 0.5,
  birthDurationTicks: 150, // Longer child birth / gestation process (~6 seconds at 25 TPS)
  samePixelProximityThreshold: 0.25, // Required distance to be on the exact same pixel

  // Building costs & specs
  houseCost: { wood: 15, stone: 5 },
  storageCost: { wood: 20, stone: 10 },
  townHallCost: { wood: 35, stone: 20 },
  farmCost: { wood: 10, stone: 0 },
  penCost: { wood: 20, stone: 8 },
  houseCapacity: 4,
  penCapacity: 8,

  // Hunter & Farmer combat & tool specs
  hunterHealth: 55,
  hunterDamage: 9,
  hunterAttackCooldownTicks: 26,
  hunterRange: 3.2, // Bow/spear hunting range

  // Settlement founding requirements
  settlementMinPop: 4,
  settlementMinHouses: 1,
  settlementProximityRadius: 18, // tiles radius to cluster humans

  // Kingdom founding requirements
  kingdomMinPop: 10,
  kingdomMinBuildings: 3,

  // Colonization (expanding kingdom to new settlements)
  colonizationMinCapitalPop: 14,
  colonizationMinHouses: 4,
  colonizationPartySize: 2,
  colonizationMinDistance: 28,

  // Territory expansion
  territoryExpansionIntervalTicks: 40,
  maxTerritoryPerSettlement: 120,

  // Combat & Military
  maxHealth: 50,
  soldierHealth: 70,
  soldierDamage: 12,
  civilianDamage: 4,
  soldierAttackCooldownTicks: 22,
  civilianAttackCooldownTicks: 35,
  attackRange: 1.4, // tiles

  // Diplomacy & War
  diplomacyCheckIntervalTicks: 150, // ~6 seconds
  warThreshold: -65,
  hostileThreshold: -35,
  friendlyThreshold: 35,
  alliedThreshold: 75,
  peaceMinWarDurationTicks: 300, // min war length before peace talks
  peaceCasualtyThreshold: 8, // casualties pushing toward peace
  territoryProximityBorderFriction: 0.8, // relations decay when borders touch
  
  // Natural resource spawn & regeneration
  resourceRegenIntervalTicks: 400,
  
  // AI update throttling
  aiUpdateBatchSize: 30, // max humans updating deep decisions per tick
};
