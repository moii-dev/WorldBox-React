import React from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { ToolRegistry } from '../../game/tools/ToolRegistry';
import { BiomeRegistry } from '../../game/world/BiomeRegistry';
import {
  Sparkles,
  Layers,
  Circle,
  Users,
  X,
  Compass,
  Info,
  Sliders,
  Check,
} from 'lucide-react';

interface ToolContextPanelProps {
  engine: GameEngine | null;
  activeTool: string;
  brushRadius: number;
  brushHardness: number;
  eraseLandToWater: boolean;
  selectedCount: number;
  onSetBrushRadius: (r: number) => void;
  onSetBrushHardness: (h: number) => void;
  onToggleEraseLandToWater: (val: boolean) => void;
  onClearSelection: () => void;
}

const BRUSH_SIZES = [1, 3, 5, 10, 20, 30, 50];
const HARDNESS_LEVELS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
];

export const ToolContextPanel: React.FC<ToolContextPanelProps> = ({
  engine,
  activeTool,
  brushRadius,
  brushHardness,
  eraseLandToWater,
  selectedCount,
  onSetBrushRadius,
  onSetBrushHardness,
  onToggleEraseLandToWater,
  onClearSelection,
}) => {
  const toolDef = ToolRegistry.get(activeTool);
  const isBiome = BiomeRegistry.isBiome(activeTool);
  const biomeDef = isBiome ? BiomeRegistry.get(activeTool) : null;

  return (
    <div
      id="tool-context-panel"
      className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border border-slate-800/90 px-4 py-2 rounded-2xl shadow-2xl text-xs text-slate-200 pointer-events-auto select-none max-w-2xl animate-fade-in"
    >
      {/* 1. BIOME CONTEXT */}
      {isBiome && biomeDef && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Biome title badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/70 font-medium">
            <span className="text-base">{biomeDef.icon}</span>
            <span className="font-semibold text-slate-100">{biomeDef.name}</span>
          </div>

          {/* Brush Radius Controls */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Circle className="w-3 h-3 text-slate-400" /> Размер:
            </span>
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                id={`btn-brush-size-${size}`}
                onClick={() => onSetBrushRadius(size)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  brushRadius === size
                    ? 'bg-sky-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Brush Hardness Controls */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400" /> Края:
            </span>
            {HARDNESS_LEVELS.map((level) => (
              <button
                key={level.label}
                id={`btn-brush-hardness-${level.label}`}
                onClick={() => onSetBrushHardness(level.value)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  Math.abs(brushHardness - level.value) < 0.05
                    ? 'bg-emerald-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={`Жёсткость краёв ${level.label}`}
              >
                {level.label}
              </button>
            ))}
          </div>

          {/* Quick stats tags */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="px-1.5 py-0.5 bg-slate-800/60 rounded border border-slate-700/50">
              Деревья: {Math.round(biomeDef.treeDensity * 100)}%
            </span>
            <span className="px-1.5 py-0.5 bg-slate-800/60 rounded border border-slate-700/50">
              Еда: {biomeDef.foodMultiplier}x
            </span>
          </div>
        </div>
      )}

      {/* 2. CREATURE CONTEXT */}
      {toolDef?.category === 'CREATURE' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/70 font-medium">
            <span className="text-base">{toolDef.icon}</span>
            <span className="font-semibold text-slate-100">{toolDef.label}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="px-2 py-0.5 bg-sky-950/80 text-sky-300 rounded border border-sky-800/60">
              Клик: 1 существо
            </span>
            <span className="px-2 py-0.5 bg-indigo-950/80 text-indigo-300 rounded border border-indigo-800/60">
              Shift + Клик: Группа ({typeof toolDef.spawnGroupSize === 'object' && toolDef.spawnGroupSize !== null
                ? (toolDef.spawnGroupSize.label || `${toolDef.spawnGroupSize.min}-${toolDef.spawnGroupSize.max}`)
                : (toolDef.spawnGroupSize || 4)})
            </span>
            <span className="text-slate-400 hidden sm:inline">Зажмите ЛКМ для череды существ</span>
          </div>
        </div>
      )}

      {/* 3. SELECT CONTEXT */}
      {activeTool === 'select' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/80 rounded-lg border border-sky-800/60 font-medium text-sky-300">
            <Users className="w-3.5 h-3.5" />
            <span>Выделение</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Рамка для группы • Клик для характеристик
          </span>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 rounded border border-emerald-800/60 font-mono text-[11px]">
                Выбрано: {selectedCount}
              </span>
              <button
                id="btn-clear-selection-context"
                onClick={onClearSelection}
                className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-200 transition-colors border border-slate-700"
              >
                <X className="w-3 h-3" /> Сброс (ESC)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. INSPECT CONTEXT */}
      {activeTool === 'inspect' && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/80 rounded-lg border border-purple-800/60 font-medium text-purple-300">
            <Info className="w-3.5 h-3.5" />
            <span>Режим осмотра</span>
          </div>
          <span className="text-slate-400">
            Нажмите на жителя, животное, здание или клетку карты для просмотра свойств
          </span>
        </div>
      )}

      {/* 5. ERASER CONTEXT */}
      {activeTool === 'eraser' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/80 rounded-lg border border-rose-800/60 font-medium text-rose-300">
            <span>⌫</span>
            <span>Ластик</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 mr-1">Радиус:</span>
            {[1, 3, 5, 10, 20].map((size) => (
              <button
                key={size}
                id={`btn-eraser-size-${size}`}
                onClick={() => onSetBrushRadius(size)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  brushRadius === size
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white transition-colors bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <input
              id="chk-erase-land-to-water"
              type="checkbox"
              checked={eraseLandToWater}
              onChange={(e) => onToggleEraseLandToWater(e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 w-3.5 h-3.5 bg-slate-900"
            />
            <span>Стирать сушу до воды</span>
          </label>
        </div>
      )}

      {/* 6. MOVE / HAND CONTEXT */}
      {activeTool === 'move' && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/70 font-medium text-slate-200">
            <span>✋</span>
            <span>Рука</span>
          </div>
          <span className="text-slate-400">
            Тяните мышью или используйте WASD для перемещения по миру • Колёсико — масштаб
          </span>
        </div>
      )}

      {/* 7. RESOURCE OR BUILDING CONTEXT */}
      {(toolDef?.category === 'RESOURCE' || toolDef?.category === 'BUILDING') && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/70 font-medium text-slate-200">
            <span className="text-base">{toolDef.icon}</span>
            <span>{toolDef.label}</span>
          </div>
          <span className="text-slate-400">
            Кликните на подходящую сушу, чтобы разместить объект
          </span>
        </div>
      )}

      {/* 8. DIVINE POWERS CONTEXT */}
      {toolDef?.category === 'DIVINE' && (
        <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
              toolDef.subcategory === 'Катаклизмы'
                ? 'bg-rose-950/80 border-rose-800/60 text-rose-200'
                : toolDef.subcategory === 'Благословения'
                ? 'bg-amber-950/80 border-amber-800/60 text-amber-200'
                : 'bg-purple-950/80 border-purple-800/60 text-purple-200'
            }`}
          >
            <span className="text-base">{toolDef.icon}</span>
            <span className="font-bold">{toolDef.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 uppercase tracking-wider font-mono ml-1">
              {toolDef.subcategory}
            </span>
          </div>
          <span className="text-slate-300 font-medium">
            {toolDef.description}
          </span>
          <span className="text-purple-400/90 text-[10px] italic">
            • Кликните по карте для применения
          </span>
        </div>
      )}
    </div>
  );
};
