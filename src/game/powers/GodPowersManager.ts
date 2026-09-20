import { World } from '../world/World';
import { TileType } from '../types';
import { ResourceManager } from '../resources/ResourceManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { EntityManager } from '../entities/EntityManager';
import { AnimalManager } from '../entities/AnimalManager';
import { HistoryManager } from '../history/HistoryManager';
import { UndoManager } from '../history/UndoManager';
import { Camera } from '../camera/Camera';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { FireSystem } from './FireSystem';
import { VFXSystem } from './VFXSystem';

export class GodPowersManager {
  public fireSystem: FireSystem;
  public vfxSystem: VFXSystem;

  constructor() {
    this.fireSystem = new FireSystem();
    this.vfxSystem = new VFXSystem();
  }

  public clear(): void {
    this.fireSystem.clear();
    this.vfxSystem.clear();
  }

  public update(
    dt: number,
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    deltaTicks: number = 1
  ): void {
    this.fireSystem.update(
      world,
      resourceManager,
      buildingManager,
      entityManager,
      animalManager,
      deltaTicks
    );
    this.vfxSystem.update(dt, this.fireSystem.getActiveFires());
  }

  // ==========================================
  // 1. CATACLYSMS (КАТАКЛИЗМЫ)
  // ==========================================

  /**
   * Lightning strike
   */
  public strikeLightning(
    x: number,
    y: number,
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    camera: Camera,
    undoManager?: UndoManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playLightning();
    camera.addShake(5.0, 0.4);
    this.vfxSystem.addLightning(x, y);
    this.vfxSystem.addFloatingText('⚡ МОЛНИЯ!', x, y - 0.5, '#fef08a');

    // 1. Damage humans
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= 2.5) {
        const dmg = dist <= 1.0 ? 150 : Math.round(75 * (1 - dist / 2.5));
        entityManager.damageHuman(human.id, dmg);
      }
    }

    // 2. Damage animals
    if (animalManager) {
      for (const animal of animalManager.animals.values()) {
        const dist = Math.hypot(animal.x - x, animal.y - y);
        if (dist <= 2.5) {
          const dmg = dist <= 1.0 ? 120 : Math.round(60 * (1 - dist / 2.5));
          animal.takeDamage(dmg, undefined, animalManager);
        }
      }
    }

    // 3. Damage buildings
    if (buildingManager) {
      for (const bld of buildingManager.buildings.values()) {
        const bldCenterX = bld.x + bld.width / 2;
        const bldCenterY = bld.y + bld.height / 2;
        const dist = Math.hypot(bldCenterX - x, bldCenterY - y);
        if (dist <= 3.0) {
          bld.health = (bld.health ?? bld.maxHealth ?? 100) - 90;
          if (bld.health <= 0) {
            buildingManager.demolishBuilding(bld.id, world);
          }
        }
      }
    }

    // 4. Ignite flammable vegetation and scorch ground
    this.fireSystem.igniteArea(x, y, 1.8, world, resourceManager, false);

    // Scorch direct hit tile
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (world.isInBounds(tx, ty)) {
      const curTile = world.getTile(tx, ty);
      if (curTile === TileType.FOREST) {
        const res = resourceManager.getResourceAt(tx, ty);
        if (res) resourceManager.removeResource(res.id);
        world.setTile(tx, ty, TileType.LAND, 0.52, undoManager);
      }
    }

    historyManager.logEvent(
      year,
      `Божественный гнев: удар молнии испепелил сектор (${Math.round(x)}, ${Math.round(y)})`,
      'CATACLYSM',
      '#facc15'
    );
  }

  /**
   * Meteor impact
   */
  public spawnMeteor(
    targetX: number,
    targetY: number,
    world: World,
    resourceManager: ResourceManager,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    camera: Camera,
    undoManager?: UndoManager,
    year: number = 1
  ): void {
    this.vfxSystem.addMeteor(targetX, targetY, (ix, iy) => {
      // Impact trigger!
      SoundSynthesizer.playExplosion(1.5);
      camera.addShake(12.0, 0.9);
      this.vfxSystem.addExplosion(ix, iy, 5.5, '#f97316');
      this.vfxSystem.addFloatingText('☄️ МЕТЕОРИТ!', ix, iy - 1, '#ea580c');

      // 1. Crater terrain alteration
      const rCrater = 3.5;
      const rInt = Math.ceil(rCrater);

      if (undoManager) undoManager.beginStroke('Падение метеорита');

      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dx = -rInt; dx <= rInt; dx++) {
          const dist = Math.hypot(dx, dy);
          const px = Math.floor(ix + dx);
          const py = Math.floor(iy + dy);

          if (dist <= rCrater && world.isInBounds(px, py)) {
            // Remove any resources in blast
            const res = resourceManager.getResourceAt(px, py);
            if (res) resourceManager.removeResource(res.id);

            if (dist <= 1.3) {
              // Molten core: Lava!
              world.setTile(px, py, TileType.LAVA, 0.45, undoManager);
            } else if (dist <= 2.2) {
              // Deep crater floor: Sand / charred rock
              world.setTile(px, py, TileType.SAND, 0.48, undoManager);
            } else {
              // Crater rim: Mountain rock
              world.setTile(px, py, TileType.MOUNTAIN, 0.72, undoManager);
            }
          }
        }
      }

      // 2. Heavy blast damage to humans & animals + knockback
      for (const human of entityManager.humans.values()) {
        const dist = Math.hypot(human.x - ix, human.y - iy);
        if (dist <= 5.0) {
          const died = entityManager.damageHuman(human.id, 220);
          // Push away
          if (!died && dist > 0.1) {
            human.x += ((human.x - ix) / dist) * 1.5;
            human.y += ((human.y - iy) / dist) * 1.5;
          }
        }
      }

      if (animalManager) {
        for (const animal of animalManager.animals.values()) {
          const dist = Math.hypot(animal.x - ix, animal.y - iy);
          if (dist <= 5.0) {
            animal.takeDamage(200, undefined, animalManager);
          }
        }
      }

      // 3. Obliterate buildings
      if (buildingManager) {
        for (const bld of buildingManager.buildings.values()) {
          const bldCenterX = bld.x + bld.width / 2;
          const bldCenterY = bld.y + bld.height / 2;
          const dist = Math.hypot(bldCenterX - ix, bldCenterY - iy);
          if (dist <= 5.0) {
            buildingManager.demolishBuilding(bld.id, world);
          }
        }
      }

      // 4. Scatter fires around perimeter
      this.fireSystem.igniteArea(ix, iy, 4.5, world, resourceManager, false);

      historyManager.logEvent(
        year,
        `Катаклизм! С небес рухнул метеорит, образовав кратер с озером лавы на (${Math.round(ix)}, ${Math.round(iy)})!`,
        'CATACLYSM',
        '#ea580c'
      );
    });
  }

  /**
   * Earthquake
   */
  public triggerEarthquake(
    centerX: number,
    centerY: number,
    world: World,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    camera: Camera,
    undoManager?: UndoManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playEarthquake();
    camera.addShake(8.0, 1.2);
    this.vfxSystem.addEarthquake(centerX, centerY, 6.0);
    this.vfxSystem.addFloatingText('🌋 ЗЕМЛЕТРЯСЕНИЕ!', centerX, centerY - 1, '#b45309');

    // 1. Structural damage to buildings
    if (buildingManager) {
      for (const bld of buildingManager.buildings.values()) {
        const bldCenterX = bld.x + bld.width / 2;
        const bldCenterY = bld.y + bld.height / 2;
        const dist = Math.hypot(bldCenterX - centerX, bldCenterY - centerY);
        if (dist <= 6.5) {
          const dmg = 80 + Math.floor(Math.random() * 80);
          bld.health = (bld.health ?? bld.maxHealth ?? 100) - dmg;
          if (bld.health <= 0) {
            buildingManager.demolishBuilding(bld.id, world);
          }
        }
      }
    }

    // 2. Shake humans & animals
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - centerX, human.y - centerY);
      if (dist <= 6.5) {
        entityManager.damageHuman(human.id, 35);
        human.hitFlashTimer = 10;
      }
    }

    if (animalManager) {
      for (const animal of animalManager.animals.values()) {
        const dist = Math.hypot(animal.x - centerX, animal.y - centerY);
        if (dist <= 6.5) {
          animal.takeDamage(35, undefined, animalManager);
        }
      }
    }

    // 3. Terrain fracture along fault lines
    if (undoManager) undoManager.beginStroke('Землетрясение');
    const fissureTiles = 8;
    for (let i = 0; i < fissureTiles; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 1 + Math.random() * 5;
      const fx = Math.floor(centerX + Math.cos(ang) * d);
      const fy = Math.floor(centerY + Math.sin(ang) * d);
      if (world.isInBounds(fx, fy)) {
        const curTile = world.getTile(fx, fy);
        if (curTile === TileType.LAND || curTile === TileType.FOREST) {
          world.setTile(fx, fy, TileType.MOUNTAIN, 0.75, undoManager);
        }
      }
    }

    historyManager.logEvent(
      year,
      `Мощное землетрясение сотрясло земли в секторе (${Math.round(centerX)}, ${Math.round(centerY)}), разрушив здания!`,
      'CATACLYSM',
      '#d97706'
    );
  }

  /**
   * Start forest fire
   */
  public startFire(
    x: number,
    y: number,
    world: World,
    resourceManager: ResourceManager,
    historyManager: HistoryManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playFireIgnite();
    const count = this.fireSystem.igniteArea(x, y, 2.5, world, resourceManager, false);
    this.vfxSystem.addFloatingText('🔥 ПОЖАР!', x, y - 0.5, '#f97316');

    if (count > 0) {
      historyManager.logEvent(
        year,
        `Вспыхнул лесной пожар в секторе (${Math.round(x)}, ${Math.round(y)})! Огонь стремительно распространяется!`,
        'CATACLYSM',
        '#ef4444'
      );
    }
  }

  // ==========================================
  // 2. BLESSINGS (БЛАГОСЛОВЕНИЯ)
  // ==========================================

  /**
   * Healing rain
   */
  public castHealingRain(
    x: number,
    y: number,
    world: World,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playHealRain();
    const radius = 5.0;
    this.vfxSystem.addRainArea(x, y, radius, 6.0);
    this.vfxSystem.addFloatingText('🌧️ ЦЕЛЕБНЫЙ ДОЖДЬ', x, y - 0.5, '#38bdf8');

    // 1. Extinguish fires
    this.fireSystem.extinguishArea(x, y, radius, world);

    // 2. Heal humans to 100%, restore hunger
    let healedHumans = 0;
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= radius) {
        human.health = human.maxHealth;
        human.hunger = 100;
        human.starvationTicks = 0;
        healedHumans++;
      }
    }

    // 3. Heal animals
    if (animalManager) {
      for (const animal of animalManager.animals.values()) {
        const dist = Math.hypot(animal.x - x, animal.y - y);
        if (dist <= radius) {
          animal.health = animal.maxHealth;
          animal.hunger = 100;
        }
      }
    }

    // 4. Instantly ripen crops on farms in radius
    if (buildingManager) {
      for (const bld of buildingManager.buildings.values()) {
        if (bld.type === 'FARM' && bld.isCompleted) {
          const dist = Math.hypot(bld.x - x, bld.y - y);
          if (dist <= radius) {
            bld.cropStage = 'READY';
            bld.cropProgress = 1.0;
          }
        }
      }
    }

    historyManager.logEvent(
      year,
      `Благословение: целебный дождь исцелил ${healedHumans} жителей, созрели посевы и потушены пожары!`,
      'BLESSING',
      '#38bdf8'
    );
  }

  /**
   * Divine Shield
   */
  public castDivineShield(
    x: number,
    y: number,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playShield();
    const radius = 4.5;
    this.vfxSystem.addExplosion(x, y, radius, '#fde047', true);
    this.vfxSystem.addFloatingText('🛡️ БОЖЕСТВЕННЫЙ ЩИТ!', x, y - 0.5, '#facc15');

    let shieldedCount = 0;
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= radius) {
        human.divineShieldTimer = 45; // 45 seconds of invulnerability
        shieldedCount++;
      }
    }

    if (animalManager) {
      for (const animal of animalManager.animals.values()) {
        const dist = Math.hypot(animal.x - x, animal.y - y);
        if (dist <= radius) {
          animal.divineShieldTimer = 45;
        }
      }
    }

    historyManager.logEvent(
      year,
      `Благодать: божественный щит укрыл ${shieldedCount} существ от любого урона на 45 секунд!`,
      'BLESSING',
      '#eab308'
    );
  }

  /**
   * Rejuvenation: restore youth to elderly/adults
   */
  public castRejuvenate(
    x: number,
    y: number,
    entityManager: EntityManager,
    historyManager: HistoryManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playRejuvenate();
    const radius = 4.5;
    this.vfxSystem.addExplosion(x, y, radius, '#4ade80', true);
    this.vfxSystem.addFloatingText('✨ ОМОЛОЖЕНИЕ!', x, y - 0.5, '#22c55e');

    let rejuvenated = 0;
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= radius) {
        if (human.age > 24) {
          human.age = 20 + Math.floor(Math.random() * 3);
          human.lifeStage = 'ADULT';
          human.health = human.maxHealth;
          human.hunger = 100;
          // Restore youthful hair color if elder gray
          if (human.colorTheme.hair === '#e2e8f0') {
            const naturalHairs = ['#451a03', '#78350f', '#d97706', '#18181b', '#b45309'];
            human.colorTheme.hair = naturalHairs[Math.floor(Math.random() * naturalHairs.length)];
          }
          rejuvenated++;
        }
      }
    }

    historyManager.logEvent(
      year,
      `Чудо молодости: ${rejuvenated} жителей вернули юность и силу предков!`,
      'BLESSING',
      '#10b981'
    );
  }

  /**
   * Warrior boost: divine wrath
   */
  public castWarriorBoost(
    x: number,
    y: number,
    entityManager: EntityManager,
    historyManager: HistoryManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playWarriorBoost();
    const radius = 4.5;
    this.vfxSystem.addExplosion(x, y, radius, '#dc2626', true);
    this.vfxSystem.addFloatingText('⚔️ БОЖЕСТВЕННАЯ ЯРОСТЬ!', x, y - 0.5, '#ef4444');

    let boosted = 0;
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= radius) {
        human.warriorBoostTimer = 45; // 45 seconds of double attack and rapid speed
        boosted++;
      }
    }

    historyManager.logEvent(
      year,
      `Благословение: ${boosted} воинов обрели божественную ярость (+100% урона, +скорость)!`,
      'BLESSING',
      '#dc2626'
    );
  }

  // ==========================================
  // 3. BOMBS & MAGIC (БОМБЫ И МАГИЯ)
  // ==========================================

  /**
   * Throw grenade
   */
  public throwGrenade(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    world: World,
    buildingManager: BuildingManager,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    camera: Camera,
    undoManager?: UndoManager
  ): void {
    SoundSynthesizer.playGrenadeTick();
    this.vfxSystem.addGrenade(fromX, fromY, targetX, targetY, false, (gx, gy) => {
      SoundSynthesizer.playExplosion(0.85);
      camera.addShake(6.0, 0.45);
      this.vfxSystem.addExplosion(gx, gy, 3.2, '#f59e0b');
      this.vfxSystem.addFloatingText('💥 ВЗРЫВ!', gx, gy - 0.5, '#f59e0b');

      // Blast damage in radius 3.0
      for (const human of entityManager.humans.values()) {
        const dist = Math.hypot(human.x - gx, human.y - gy);
        if (dist <= 3.0) {
          entityManager.damageHuman(human.id, 120);
        }
      }

      if (animalManager) {
        for (const animal of animalManager.animals.values()) {
          const dist = Math.hypot(animal.x - gx, animal.y - gy);
          if (dist <= 3.0) {
            animal.takeDamage(100, undefined, animalManager);
          }
        }
      }

      if (buildingManager) {
        for (const bld of buildingManager.buildings.values()) {
          const bldCenterX = bld.x + bld.width / 2;
          const bldCenterY = bld.y + bld.height / 2;
          const dist = Math.hypot(bldCenterX - gx, bldCenterY - gy);
          if (dist <= 3.2) {
            bld.health = (bld.health ?? bld.maxHealth ?? 100) - 130;
            if (bld.health <= 0) {
              buildingManager.demolishBuilding(bld.id, world);
            }
          }
        }
      }

      // Small crater
      const tx = Math.floor(gx);
      const ty = Math.floor(gy);
      if (world.isInBounds(tx, ty)) {
        world.setTile(tx, ty, TileType.SAND, 0.48, undoManager);
      }
    });
  }

  /**
   * Throw napalm
   */
  public throwNapalm(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    world: World,
    resourceManager: ResourceManager,
    camera: Camera
  ): void {
    SoundSynthesizer.playNapalm();
    this.vfxSystem.addGrenade(fromX, fromY, targetX, targetY, true, (nx, ny) => {
      SoundSynthesizer.playExplosion(1.0);
      camera.addShake(7.0, 0.5);
      this.vfxSystem.addExplosion(nx, ny, 4.0, '#c084fc');
      this.vfxSystem.addFloatingText('🔥 НАПАЛМ!', nx, ny - 0.5, '#a855f7');

      // Intense persistent napalm flames over radius 3.5
      this.fireSystem.igniteArea(nx, ny, 3.5, world, resourceManager, true);
    });
  }

  /**
   * Freeze area: cryo blizzard
   */
  public castFreeze(
    x: number,
    y: number,
    world: World,
    entityManager: EntityManager,
    animalManager: AnimalManager,
    historyManager: HistoryManager,
    camera: Camera,
    undoManager?: UndoManager,
    year: number = 1
  ): void {
    SoundSynthesizer.playFreeze();
    camera.addShake(3.0, 0.3);
    const radius = 4.0;
    this.vfxSystem.addExplosion(x, y, radius, '#38bdf8', true);
    this.vfxSystem.addFloatingText('❄️ ЗАМОРОЗКА!', x, y - 0.5, '#0ea5e9');

    // 1. Extinguish all fires immediately
    this.fireSystem.extinguishArea(x, y, radius, world);

    // 2. Freeze water into snow/ice and cool lava
    const rInt = Math.ceil(radius);
    if (undoManager) undoManager.beginStroke('Заморозка территории');

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = Math.floor(x + dx);
          const py = Math.floor(y + dy);
          if (world.isInBounds(px, py)) {
            const curTile = world.getTile(px, py);
            if (curTile === TileType.WATER || curTile === TileType.SHALLOW_WATER) {
              world.setTile(px, py, TileType.SNOW, 0.6, undoManager);
            } else if (curTile === TileType.LAVA) {
              world.setTile(px, py, TileType.MOUNTAIN, 0.75, undoManager);
            }
          }
        }
      }
    }

    // 3. Freeze humans in ice blocks
    let frozenCount = 0;
    for (const human of entityManager.humans.values()) {
      const dist = Math.hypot(human.x - x, human.y - y);
      if (dist <= radius) {
        human.frozenTimer = 18; // 18 seconds frozen
        frozenCount++;
      }
    }

    // 4. Freeze animals in ice blocks
    if (animalManager) {
      for (const animal of animalManager.animals.values()) {
        const dist = Math.hypot(animal.x - x, animal.y - y);
        if (dist <= radius) {
          animal.frozenTimer = 18;
        }
      }
    }

    historyManager.logEvent(
      year,
      `Великая стужа: воды скованы льдом, ${frozenCount} существ застыли во льду!`,
      'MAGIC',
      '#38bdf8'
    );
  }
}
