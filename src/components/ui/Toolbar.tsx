import React, { useState, useRef, useEffect } from 'react';
import { WorldGenPreset } from '../../game/types';
import { ToolRegistry } from '../../game/tools/ToolRegistry';
import { BiomeRegistry } from '../../game/world/BiomeRegistry';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Globe,
  Flag,
  ChevronDown,
  Hand,
  MousePointer,
  Search,
  Eraser,
  Trees,
  Footprints,
  Pickaxe,
  Building2,
  Clock,
  Trash2,
  Sparkles,
  Save,
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onSelectTool: (toolId: string) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  simSpeed: number;
  onChangeSpeed: (spd: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showPoliticalMap: boolean;
  onTogglePoliticalMap: () => void;
  onGenerateWorld: (preset: WorldGenPreset) => void;
  onClearWorld: () => void;
  onOpenSaveLoad?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  isPaused,
  onTogglePause,
  simSpeed,
  onChangeSpeed,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showPoliticalMap,
  onTogglePoliticalMap,
  onGenerateWorld,
  onClearWorld,
  onOpenSaveLoad,
}) => {
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menuName: string) => {
    setOpenDropdown((curr) => (curr === menuName ? null : menuName));
  };

  const handleSelectToolAndClose = (toolId: string) => {
    onSelectTool(toolId);
    setOpenDropdown(null);
  };

  const recentToolDefs = ToolRegistry.getRecentTools();
  const biomes = BiomeRegistry.getAll();
  const creatureTools = ToolRegistry.getByCategory('CREATURE');
  const resourceTools = ToolRegistry.getByCategory('RESOURCE');
  const buildingTools = ToolRegistry.getByCategory('BUILDING');
  const divineTools = ToolRegistry.getByCategory('DIVINE');

  // Determine active category if any
  const isBiomeActive = BiomeRegistry.isBiome(activeTool);
  const activeBiomeDef = isBiomeActive ? BiomeRegistry.get(activeTool) : null;
  const isCreatureActive = creatureTools.some((t) => t.id === activeTool);
  const isResourceActive = resourceTools.some((t) => t.id === activeTool);
  const isBuildingActive = buildingTools.some((t) => t.id === activeTool);
  const isDivineActive = divineTools.some((t) => t.id === activeTool);
  const activeDivineDef = isDivineActive ? ToolRegistry.get(activeTool) : null;

  return (
    <div
      ref={toolbarRef}
      id="main-toolbar-container"
      className="relative z-20 flex flex-col items-center gap-2 select-none"
    >
      {/* 1. RECENT TOOLS QUICK ACCESS BAR */}
      {recentToolDefs.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800/80 shadow-lg text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 mr-1 uppercase tracking-wider font-mono">
            <Clock className="w-3 h-3 text-slate-400" /> Недавние:
          </span>
          {recentToolDefs.map((tool) => (
            <button
              key={tool.id}
              id={`btn-recent-tool-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all text-[11px] font-medium ${
                activeTool === tool.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/40'
              }`}
            >
              <span>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 2. MAIN TOOLBAR DOCK */}
      <div className="flex items-center gap-2 p-2 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl">
        {/* SECTION A: BASE NAVIGATION & SELECTION TOOLS */}
        <div className="flex items-center gap-1">
          {/* Hand / Pan */}
          <button
            id="btn-tool-move"
            onClick={() => onSelectTool('move')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTool === 'move'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Рука (Пробел / СКМ) — перемещение по карте"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden sm:inline">Рука</span>
          </button>

          {/* Select Tool */}
          <button
            id="btn-tool-select"
            onClick={() => onSelectTool('select')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Выбор (V) — кликните или растяните рамку выделения"
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden sm:inline">Выбор</span>
          </button>

          {/* Inspect Tool */}
          <button
            id="btn-tool-inspect"
            onClick={() => onSelectTool('inspect')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTool === 'inspect'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Осмотр (I) — характеристики жителей, зданий и биомов"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Осмотр</span>
          </button>

          {/* Eraser Tool */}
          <button
            id="btn-tool-eraser"
            onClick={() => onSelectTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTool === 'eraser'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Ластик (E) — удаление существ, построек и суши"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">Ластик</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800 mx-0.5" />

        {/* SECTION B: DROPDOWN / COMBOBOX CATEGORIES */}
        <div className="flex items-center gap-1.5">
          {/* 1. BIOMES DROPDOWN */}
          <div className="relative">
            <button
              id="btn-dropdown-biomes"
              onClick={() => toggleDropdown('biomes')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isBiomeActive
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Trees className="w-4 h-4 text-emerald-400" />
              <span>{activeBiomeDef ? activeBiomeDef.name : 'Биомы'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {openDropdown === 'biomes' && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-30 animate-fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Биомы мира (9)
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto">
                  {biomes.map((biome) => (
                    <button
                      key={biome.id}
                      id={`btn-select-biome-${biome.id}`}
                      onClick={() => handleSelectToolAndClose(biome.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                        activeTool === biome.id
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{biome.icon}</span>
                        <div>
                          <div className="font-medium text-slate-100">{biome.name}</div>
                          <div className="text-[10px] text-slate-400">{biome.description}</div>
                        </div>
                      </div>
                      <div
                        className="w-3 h-3 rounded-full border border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: biome.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. CREATURES DROPDOWN */}
          <div className="relative">
            <button
              id="btn-dropdown-creatures"
              onClick={() => toggleDropdown('creatures')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isCreatureActive
                  ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Footprints className="w-4 h-4 text-amber-400" />
              <span>Существа</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {openDropdown === 'creatures' && (
              <div className="absolute bottom-full mb-2 left-0 w-60 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-30 animate-fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex justify-between">
                  <span>Создание существ</span>
                  <span className="text-sky-400 lowercase">shift = стая</span>
                </div>
                <div className="space-y-1">
                  {creatureTools.map((tool) => (
                    <button
                      key={tool.id}
                      id={`btn-select-creature-${tool.id}`}
                      onClick={() => handleSelectToolAndClose(tool.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                        activeTool === tool.id
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tool.icon}</span>
                        <div>
                          <div className="font-medium text-slate-100">{tool.label}</div>
                          <div className="text-[10px] text-slate-400">{tool.description}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 px-1 bg-slate-800 rounded">
                        +{typeof tool.spawnGroupSize === 'object' && tool.spawnGroupSize !== null
                          ? tool.spawnGroupSize.max
                          : (tool.spawnGroupSize || 1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. RESOURCES DROPDOWN */}
          <div className="relative">
            <button
              id="btn-dropdown-resources"
              onClick={() => toggleDropdown('resources')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isResourceActive
                  ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Pickaxe className="w-4 h-4 text-indigo-400" />
              <span>Ресурсы</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {openDropdown === 'resources' && (
              <div className="absolute bottom-full mb-2 left-0 w-56 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-30 animate-fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Природные ресурсы
                </div>
                <div className="space-y-1">
                  {resourceTools.map((tool) => (
                    <button
                      key={tool.id}
                      id={`btn-select-resource-${tool.id}`}
                      onClick={() => handleSelectToolAndClose(tool.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                        activeTool === tool.id
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{tool.icon}</span>
                      <div>
                        <div className="font-medium text-slate-100">{tool.label}</div>
                        <div className="text-[10px] text-slate-400">{tool.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. BUILDINGS DROPDOWN */}
          <div className="relative">
            <button
              id="btn-dropdown-buildings"
              onClick={() => toggleDropdown('buildings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isBuildingActive
                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Постройки</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {openDropdown === 'buildings' && (
              <div className="absolute bottom-full mb-2 left-0 w-60 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-30 animate-fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Архитектура поселений
                </div>
                <div className="space-y-1">
                  {buildingTools.map((tool) => (
                    <button
                      key={tool.id}
                      id={`btn-select-building-${tool.id}`}
                      onClick={() => handleSelectToolAndClose(tool.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                        activeTool === tool.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{tool.icon}</span>
                      <div>
                        <div className="font-medium text-slate-100">{tool.label}</div>
                        <div className="text-[10px] text-slate-400">{tool.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. DIVINE POWERS DROPDOWN (Катаклизмы, Благословения, Бомбы и Магия) */}
          <div className="relative">
            <button
              id="btn-dropdown-divine"
              onClick={() => toggleDropdown('divine')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isDivineActive
                  ? 'bg-purple-950/80 border-purple-500/60 text-purple-200 shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-200 hover:bg-slate-800 hover:border-purple-500/30'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>{activeDivineDef ? activeDivineDef.label : 'Божества'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {openDropdown === 'divine' && (
              <div className="absolute bottom-full mb-2 right-0 sm:left-0 sm:right-auto w-80 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-purple-500/40 shadow-2xl p-2.5 z-30 animate-fade-in max-h-96 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-purple-300 border-b border-purple-900/40 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Божественные силы
                  </span>
                  <span className="text-[9px] text-purple-400/80">Интерактивная магия</span>
                </div>

                {/* Subcategory: Катаклизмы */}
                <div className="mb-2.5">
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <span>🌋</span> Катаклизмы
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {divineTools
                      .filter((t) => t.subcategory === 'Катаклизмы')
                      .map((tool) => (
                        <button
                          key={tool.id}
                          id={`btn-select-divine-${tool.id}`}
                          onClick={() => handleSelectToolAndClose(tool.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                            activeTool === tool.id
                              ? 'bg-rose-500/25 text-rose-200 font-semibold border border-rose-500/50'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <span className="text-lg flex-shrink-0">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-100">{tool.label}</span>
                              {tool.shortcut && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                                  {tool.shortcut}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight truncate">{tool.description}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Subcategory: Благословения */}
                <div className="mb-2.5">
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <span>✨</span> Благословения
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {divineTools
                      .filter((t) => t.subcategory === 'Благословения')
                      .map((tool) => (
                        <button
                          key={tool.id}
                          id={`btn-select-divine-${tool.id}`}
                          onClick={() => handleSelectToolAndClose(tool.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                            activeTool === tool.id
                              ? 'bg-amber-500/25 text-amber-200 font-semibold border border-amber-500/50'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <span className="text-lg flex-shrink-0">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-100">{tool.label}</span>
                              {tool.shortcut && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                                  {tool.shortcut}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight truncate">{tool.description}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Subcategory: Бомбы и Магия */}
                <div>
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <span>💣</span> Бомбы и магия
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {divineTools
                      .filter((t) => t.subcategory === 'Бомбы и магия')
                      .map((tool) => (
                        <button
                          key={tool.id}
                          id={`btn-select-divine-${tool.id}`}
                          onClick={() => handleSelectToolAndClose(tool.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                            activeTool === tool.id
                              ? 'bg-sky-500/25 text-sky-200 font-semibold border border-sky-500/50'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <span className="text-lg flex-shrink-0">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-100">{tool.label}</span>
                              {tool.shortcut && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                                  {tool.shortcut}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight truncate">{tool.description}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800 mx-0.5" />

        {/* SECTION C: UNDO / REDO HISTORY */}
        <div className="flex items-center gap-1">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition-all ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Отменить (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition-all ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Повторить (Ctrl+Y)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800 mx-0.5" />

        {/* SECTION D: SIMULATION PLAYBACK & SPEED */}
        <div className="flex items-center gap-1">
          <button
            id="btn-toggle-pause"
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isPaused
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
            }`}
            title="Пауза / Возобновление (Пробел)"
          >
            {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
            <span className="hidden md:inline">{isPaused ? 'Старт' : 'Пауза'}</span>
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}x`}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  simSpeed === spd
                    ? 'bg-slate-700 text-sky-400 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800 mx-0.5" />

        {/* SECTION E: WORLD CONTROLS & POLITY MAP */}
        <div className="flex items-center gap-1">
          {/* Political Map Toggle */}
          <button
            id="btn-toggle-political-map"
            onClick={onTogglePoliticalMap}
            className={`p-2 rounded-xl transition-all ${
              showPoliticalMap
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Политическая карта / Границы королевств"
          >
            <Flag className="w-4 h-4" />
          </button>

          {/* Save / Load World Chronicles Modal */}
          {onOpenSaveLoad && (
            <button
              id="btn-open-save-load"
              onClick={onOpenSaveLoad}
              className="p-2 rounded-xl text-indigo-400 hover:text-indigo-200 hover:bg-slate-800 transition-all"
              title="Хроники и сохранения мира (Save / Load)"
            >
              <Save className="w-4 h-4" />
            </button>
          )}

          {/* World Presets Dropdown */}
          <div className="relative">
            <button
              id="btn-dropdown-world-presets"
              onClick={() => toggleDropdown('world')}
              className="flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              title="Создать новый мир"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {openDropdown === 'world' && (
              <div className="absolute bottom-full mb-2 right-0 w-56 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-30 animate-fade-in">
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                  Генерация мира
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    id="btn-gen-continents"
                    onClick={() => {
                      onGenerateWorld('continents');
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-slate-800 text-left transition-colors"
                  >
                    <span>🌍</span> Материки и моря
                  </button>
                  <button
                    id="btn-gen-archipelago"
                    onClick={() => {
                      onGenerateWorld('archipelago');
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-cyan-300 hover:bg-slate-800 text-left transition-colors"
                  >
                    <span>🏝️</span> Архипелаг
                  </button>
                  <button
                    id="btn-gen-pangea"
                    onClick={() => {
                      onGenerateWorld('pangea');
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-300 hover:bg-slate-800 text-left transition-colors"
                  >
                    <span>🌋</span> Пангея (Суперконтинент)
                  </button>
                  <button
                    id="btn-gen-islands"
                    onClick={() => {
                      onGenerateWorld('islands');
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sky-300 hover:bg-slate-800 text-left transition-colors"
                  >
                    <span>🌊</span> Океанические атоллы
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    id="btn-clear-world"
                    onClick={() => {
                      onClearWorld();
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-left transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Очистить мир (Океан)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
