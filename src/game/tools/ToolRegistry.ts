import { BiomeRegistry } from '../world/BiomeRegistry';

export type ToolCategory = 'MAIN' | 'BIOME' | 'CREATURE' | 'RESOURCE' | 'BUILDING' | 'DIVINE';

export interface ToolDefinition {
  id: string;
  name: string;
  label?: string;
  category: ToolCategory;
  subcategory?: string;
  icon: string; // Emoji, SVG icon name or symbol
  shortcut?: string;
  description: string;
  cursorType: 'hand' | 'select' | 'inspect' | 'brush' | 'creature' | 'resource' | 'building' | 'eraser' | 'divine';
  spawnGroupSize?: { min: number; max: number; label: string };
  data?: any;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static {
    // 1. MAIN TOOLS
    ToolRegistry.register({
      id: 'move',
      name: 'Рука',
      label: 'Рука',
      category: 'MAIN',
      icon: 'Hand',
      shortcut: 'Пробел',
      description: 'Перемещение камеры по миру. Удерживайте пробел или зажмите СКМ.',
      cursorType: 'hand',
    });

    ToolRegistry.register({
      id: 'select',
      name: 'Выбор',
      label: 'Выбор',
      category: 'MAIN',
      icon: 'Pointer',
      shortcut: 'V',
      description: 'Кликните для выбора жителя/объекта или растяните рамку выделения.',
      cursorType: 'select',
    });

    ToolRegistry.register({
      id: 'inspect',
      name: 'Осмотр',
      label: 'Осмотр',
      category: 'MAIN',
      icon: 'Info',
      shortcut: 'I',
      description: 'Просмотр характеристик жителей, животных, зданий и биомов.',
      cursorType: 'inspect',
    });

    ToolRegistry.register({
      id: 'eraser',
      name: 'Ластик',
      label: 'Ластик',
      category: 'MAIN',
      icon: 'Eraser',
      shortcut: 'E',
      description: 'Удаление существ, построек, ресурсов или превращение суши в воду.',
      cursorType: 'eraser',
    });

    // 2. BIOME TOOLS (Data-driven from BiomeRegistry)
    for (const b of BiomeRegistry.getAll()) {
      ToolRegistry.register({
        id: b.id,
        name: b.name,
        label: b.name,
        category: 'BIOME',
        icon: b.symbol,
        shortcut: b.id === 'grassland' ? 'B' : undefined,
        description: `Кисть биома «${b.name}». На воде создаёт сушу; на суше меняет биом.`,
        cursorType: 'brush',
        data: b,
      });
    }

    // 3. CREATURE TOOLS
    ToolRegistry.register({
      id: 'human',
      name: 'Человек',
      label: 'Человек',
      category: 'CREATURE',
      subcategory: 'Люди',
      icon: '👤',
      shortcut: 'H',
      description: 'Создать поселенца. Shift + Клик создаёт группу колонистов.',
      cursorType: 'creature',
      spawnGroupSize: { min: 2, max: 3, label: 'Группа поселенцев' },
    });

    ToolRegistry.register({
      id: 'deer',
      name: 'Олень',
      label: 'Олень',
      category: 'CREATURE',
      subcategory: 'Животные',
      icon: '🦌',
      description: 'Миролюбивое травоядное. Shift + Клик создаёт стадо (3–5).',
      cursorType: 'creature',
      spawnGroupSize: { min: 3, max: 5, label: 'Стадо оленей' },
    });

    ToolRegistry.register({
      id: 'boar',
      name: 'Кабан',
      label: 'Кабан',
      category: 'CREATURE',
      subcategory: 'Животные',
      icon: '🐗',
      description: 'Дикий кабан. Shift + Клик создаёт выводок (2–3).',
      cursorType: 'creature',
      spawnGroupSize: { min: 2, max: 3, label: 'Стая кабанов' },
    });

    ToolRegistry.register({
      id: 'wolf',
      name: 'Волк',
      label: 'Волк',
      category: 'CREATURE',
      subcategory: 'Животные',
      icon: '🐺',
      description: 'Опасный хищник. Shift + Клик создаёт волчью стаю (3–4).',
      cursorType: 'creature',
      spawnGroupSize: { min: 3, max: 4, label: 'Волчья стая' },
    });

    ToolRegistry.register({
      id: 'chicken',
      name: 'Курица',
      label: 'Курица',
      category: 'CREATURE',
      subcategory: 'Животные',
      icon: '🐔',
      description: 'Домашняя птица. Shift + Клик создаёт стайку кур (4–6).',
      cursorType: 'creature',
      spawnGroupSize: { min: 4, max: 6, label: 'Стайка кур' },
    });

    ToolRegistry.register({
      id: 'cow',
      name: 'Корова',
      label: 'Корова',
      category: 'CREATURE',
      subcategory: 'Животные',
      icon: '🐮',
      description: 'Домашний скот. Shift + Клик создаёт стадо коров (2–4).',
      cursorType: 'creature',
      spawnGroupSize: { min: 2, max: 4, label: 'Стадо коров' },
    });

    // 4. RESOURCE TOOLS
    ToolRegistry.register({
      id: 'tree',
      name: 'Дерево',
      label: 'Дерево',
      category: 'RESOURCE',
      subcategory: 'Природа',
      icon: '🌲',
      shortcut: 'R',
      description: 'Взрослое дерево для добычи строительной древесины.',
      cursorType: 'resource',
    });

    ToolRegistry.register({
      id: 'berry_bush',
      name: 'Куст ягод',
      label: 'Куст ягод',
      category: 'RESOURCE',
      subcategory: 'Природа',
      icon: '🍇',
      description: 'Дикий кустарник со съедобными ягодами для сбора пищи.',
      cursorType: 'resource',
    });

    ToolRegistry.register({
      id: 'stone',
      name: 'Каменная жила',
      label: 'Каменная жила',
      category: 'RESOURCE',
      subcategory: 'Природа',
      icon: '🪨',
      description: 'Залежи природного камня для строительства и каменоломен.',
      cursorType: 'resource',
    });

    // 5. BUILDING TOOLS
    ToolRegistry.register({
      id: 'house',
      name: 'Жилой дом',
      label: 'Жилой дом',
      category: 'BUILDING',
      icon: '🏠',
      description: 'Жилище для сна и отдыха жителей поселения.',
      cursorType: 'building',
    });

    ToolRegistry.register({
      id: 'storage',
      name: 'Склад',
      label: 'Склад',
      category: 'BUILDING',
      icon: '📦',
      description: 'Общественное хранилище древесины, камня и провизии.',
      cursorType: 'building',
    });

    ToolRegistry.register({
      id: 'town_hall',
      name: 'Ратуша',
      label: 'Ратуша',
      category: 'BUILDING',
      icon: '🏛️',
      description: 'Центр власти поселения для координации жителей и королевства.',
      cursorType: 'building',
    });

    ToolRegistry.register({
      id: 'farm',
      name: 'Ферма',
      label: 'Ферма',
      category: 'BUILDING',
      icon: '🌾',
      description: 'Поле с посевами для стабильного сбора зерна и снабжения едой.',
      cursorType: 'building',
    });

    ToolRegistry.register({
      id: 'animal_pen',
      name: 'Загон для скота',
      label: 'Загон для скота',
      category: 'BUILDING',
      icon: '🐮',
      description: 'Огороженный загон для содержания и откорма домашних животных.',
      cursorType: 'building',
    });

    // 6. DIVINE TOOLS (Катаклизмы, Благословения, Бомбы и Магия)
    // --- Катаклизмы ---
    ToolRegistry.register({
      id: 'lightning',
      name: 'Молния',
      label: 'Молния',
      category: 'DIVINE',
      subcategory: 'Катаклизмы',
      icon: '⚡',
      shortcut: 'L',
      description: 'Разрушительный разряд молнии с небес: наносит мощный урон и поджигает местность.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'meteor',
      name: 'Метеорит',
      label: 'Метеорит',
      category: 'DIVINE',
      subcategory: 'Катаклизмы',
      icon: '☄️',
      shortcut: 'M',
      description: 'Падение пылающего болида из космоса: оставляет гигантский кратер с кипящей лавой.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'earthquake',
      name: 'Землетрясение',
      label: 'Землетрясение',
      category: 'DIVINE',
      subcategory: 'Катаклизмы',
      icon: '🌋',
      description: 'Сейсмический разлом земной коры: сминает рельеф и обрушивает постройки.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'fire',
      name: 'Лесной пожар',
      label: 'Лесной пожар',
      category: 'DIVINE',
      subcategory: 'Катаклизмы',
      icon: '🔥',
      shortcut: 'F',
      description: 'Разведение огня с реалистичным распространением по растительности и зданиям.',
      cursorType: 'divine',
    });

    // --- Благословения ---
    ToolRegistry.register({
      id: 'heal_rain',
      name: 'Целебный дождь',
      label: 'Целебный дождь',
      category: 'DIVINE',
      subcategory: 'Благословения',
      icon: '🌧️',
      description: 'Священный ливень: исцеляет раны, тушит огонь и мгновенно выращивает урожай.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'divine_shield',
      name: 'Божественный щит',
      label: 'Божественный щит',
      category: 'DIVINE',
      subcategory: 'Благословения',
      icon: '🛡️',
      description: 'Сияющая золотая сфера: дарует существам абсолютную неуязвимость на 45 секунд.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'rejuvenate',
      name: 'Омоложение',
      label: 'Омоложение',
      category: 'DIVINE',
      subcategory: 'Благословения',
      icon: '✨',
      description: 'Чудо вечной молодости: возвращает старцам возраст 20 лет, восстанавливая силы.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'warrior_boost',
      name: 'Божественная ярость',
      label: 'Божественная ярость',
      category: 'DIVINE',
      subcategory: 'Благословения',
      icon: '⚔️',
      description: 'Воинское благословение: наделяет воинов удвоенным уроном и стремительной скоростью.',
      cursorType: 'divine',
    });

    // --- Бомбы и Магия ---
    ToolRegistry.register({
      id: 'grenade',
      name: 'Граната',
      label: 'Граната',
      category: 'DIVINE',
      subcategory: 'Бомбы и магия',
      icon: '💣',
      description: 'Осколочная граната: бросок взрывчатки для точечного уничтожения врагов и построек.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'napalm',
      name: 'Напалм',
      label: 'Напалм',
      category: 'DIVINE',
      subcategory: 'Бомбы и магия',
      icon: '🟣',
      description: 'Канистра химического напалма: выжигает сектор несгораемым фиолетовым пламенем.',
      cursorType: 'divine',
    });

    ToolRegistry.register({
      id: 'freeze',
      name: 'Заморозка',
      label: 'Заморозка',
      category: 'DIVINE',
      subcategory: 'Бомбы и магия',
      icon: '❄️',
      description: 'Великая стужа: сковывает воду в лёд, гасит огонь и замораживает существ в глыбах льда.',
      cursorType: 'divine',
    });
  }

  private static recentTools: string[] = ['grassland', 'human', 'tree', 'house'];

  public static register(tool: ToolDefinition): void {
    if (!tool.label) {
      tool.label = tool.name;
    }
    ToolRegistry.tools.set(tool.id, tool);
  }

  public static recordRecent(toolId: string): void {
    if (!ToolRegistry.tools.has(toolId)) return;
    ToolRegistry.recentTools = [
      toolId,
      ...ToolRegistry.recentTools.filter((id) => id !== toolId),
    ].slice(0, 6);
  }

  public static getRecentTools(): ToolDefinition[] {
    return ToolRegistry.recentTools
      .map((id) => ToolRegistry.get(id))
      .filter((t): t is ToolDefinition => t !== undefined);
  }

  public static get(id: string): ToolDefinition | undefined {
    return ToolRegistry.tools.get(id);
  }

  public static getAll(): ToolDefinition[] {
    return Array.from(ToolRegistry.tools.values());
  }

  public static getByCategory(category: ToolCategory): ToolDefinition[] {
    return Array.from(ToolRegistry.tools.values()).filter((t) => t.category === category);
  }
}
