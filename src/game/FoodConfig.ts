/**
 * Food, Hunger, Animal, and Farming Configuration
 */
export const FOOD_CONFIG = {
  // Hunger balance
  hungerMax: 100,
  hungerDecayRate: 0.035, // ~0.875 hunger per second at 25 TPS (~114s from 100 to 0)
  hungerDecayPerTick: 0.035,
  starvationDamage: 0.25, // Damage per tick when hunger is 0
  starvationDamagePerTick: 0.25,
  starvationDamageThreshold: 1,
  starvationWarningThreshold: 25,
  eatingThreshold: 60,

  // Hunger thresholds
  satiatedMin: 70,
  normalMin: 40,
  hungryMin: 20,
  starvingMin: 1,

  // Food nutrition values (hunger restored per 1 unit of food)
  nutrition: {
    BERRIES: 25,
    MEAT: 50,
    FARM_FOOD: 35,
    BREAD: 35,
    GENERIC: 30,
  },

  // Berry Bushes
  berryBush: {
    maxFood: 5,
    initialFood: 5,
    harvestAmount: 1,
    regenRate: 0.015, // food regenerated per tick
    maxGlobalBushes: 140,
  },

  // Carcasses
  carcass: {
    decayRate: 0.12, // decay per tick
    maxDecay: 100,
  },

  // Farms
  farm: {
    growthTicks: 300, // ticks for crops to fully ripen
    harvestYield: 8,  // food units per harvest
  },

  // Animal Pens
  pen: {
    capacity: 10,
    cost: { wood: 20, stone: 8 },
  },

  // Species configuration
  species: {
    DEER: {
      name: 'Deer',
      maxHealth: 35,
      speed: 0.075,
      runSpeed: 0.11,
      damage: 0,
      attackCooldown: 40,
      meatYield: 4,
      isDomesticable: false,
      isPredator: false,
      fleeRadius: 7,
      packSize: 4,
      popCap: 45,
      reproductionCooldown: 500,
      matingDistance: 3,
    },
    BOAR: {
      name: 'Boar',
      maxHealth: 55,
      speed: 0.055,
      runSpeed: 0.09,
      damage: 8,
      attackCooldown: 30,
      meatYield: 5,
      isDomesticable: false,
      isPredator: false,
      aggroRadius: 4.5,
      popCap: 30,
      reproductionCooldown: 600,
      matingDistance: 3,
    },
    WOLF: {
      name: 'Wolf',
      maxHealth: 60,
      speed: 0.07,
      runSpeed: 0.115,
      damage: 11,
      attackCooldown: 25,
      meatYield: 3,
      isDomesticable: false,
      isPredator: true,
      huntRadius: 10,
      packSize: 4,
      popCap: 24,
      reproductionCooldown: 700,
      matingDistance: 3,
    },
    CHICKEN: {
      name: 'Chicken',
      maxHealth: 15,
      speed: 0.04,
      runSpeed: 0.065,
      damage: 1,
      attackCooldown: 40,
      meatYield: 2,
      isDomesticable: true,
      isPredator: false,
      popCap: 50,
      reproductionCooldown: 300,
      matingDistance: 2.5,
    },
    COW: {
      name: 'Cow',
      maxHealth: 110,
      speed: 0.035,
      runSpeed: 0.055,
      damage: 4,
      attackCooldown: 45,
      meatYield: 10,
      isDomesticable: true,
      isPredator: false,
      popCap: 35,
      reproductionCooldown: 750,
      matingDistance: 3,
    },
  },

  // Spawning & Ecosystem intervals
  ecosystemSpawnIntervalTicks: 150,
  animalAIThrottleTicks: 2, // AI decision frequency for animal brains
  hunterRiskThreshold: 0.35, // Min hunter health fraction before fleeing animal combat

  // Hunter combat and search parameters
  hunter: {
    riskThreshold: 0.35,
    attackRange: 2.0,
    attackCooldownTicks: 20,
    damage: 15,
    searchRadius: 30,
  },
};
