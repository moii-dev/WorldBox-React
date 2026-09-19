import React, { useState } from 'react';
import { SimulationStats } from '../../game/types';
import {
  Users,
  Trees,
  Gem,
  Globe2,
  Mountain,
  Snowflake,
  ChevronDown,
  ChevronUp,
  Crown,
  Home,
  Swords,
  Calendar,
} from 'lucide-react';

interface StatsBarProps {
  stats: SimulationStats | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const [showBiomeDetails, setShowBiomeDetails] = useState(false);
  const [showPopDetails, setShowPopDetails] = useState(false);

  const population = stats?.population ?? 0;
  const gameYear = stats?.gameYear ?? 1;
  const settlementsCount = stats?.settlementsCount ?? 0;
  const kingdomsCount = stats?.kingdomsCount ?? 0;
  const activeWarsCount = stats?.activeWarsCount ?? 0;
  const buildingsCount = stats?.buildingsCount ?? 0;

  const trees = stats?.trees ?? 0;
  const stone = stats?.stone ?? 0;
  const landTiles = stats?.landTiles ?? 0;
  const fps = stats?.fps ?? 60;
  const tps = stats?.tps ?? 25;
  const biomes = stats?.biomes;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 font-sans select-none">
      {/* Primary Top Bar */}
      <div
        id="game-stats-bar"
        className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-slate-100"
      >
        {/* Game Year */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/70 text-amber-200">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono font-bold">Год {gameYear}</span>
        </div>

        {/* Kingdoms */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800/70 border border-slate-700/50">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Государства:</span>
          <span className="text-xs font-mono font-bold text-amber-300">{kingdomsCount}</span>
        </div>

        {/* Settlements */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800/70 border border-slate-700/50">
          <Home className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-slate-400 font-medium">Поселения:</span>
          <span className="text-xs font-mono font-bold text-emerald-300">{settlementsCount}</span>
        </div>

        {/* Wars (if any) */}
        {activeWarsCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-950/70 border border-rose-700/70 text-rose-300 animate-pulse">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-bold font-mono">
              {activeWarsCount === 1 ? '1 Война' : `${activeWarsCount} Войны`}
            </span>
          </div>
        )}

        {/* Population (with toggle for breakdown) */}
        <button
          onClick={() => setShowPopDetails((prev) => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 transition-colors"
          title="Нажмите для просмотра демографии"
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs text-slate-400 font-medium">Жители:</span>
          <span className="text-xs font-mono font-bold text-sky-300">{population}</span>
          {showPopDetails ? (
            <ChevronUp className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </button>

        {/* Natural Resources */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800/70 border border-slate-700/50" title="Деревья в мире">
          <Trees className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-300">{trees}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800/70 border border-slate-700/50" title="Залежи камня">
          <Gem className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300">{stone}</span>
        </div>

        {/* Land Area with Biomes Toggle */}
        <button
          onClick={() => setShowBiomeDetails((prev) => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/40 transition-colors"
          title="Распределение биомов"
        >
          <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Суша:</span>
          <span className="font-mono text-slate-100 font-semibold">{landTiles}</span>
          {showBiomeDetails ? (
            <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          )}
        </button>

        {/* FPS indicator */}
        <div className="hidden lg:flex items-center px-1 text-[11px] font-mono text-slate-500">
          {fps} FPS ({tps} TPS)
        </div>
      </div>

      {/* Expanded Demographics Panel */}
      {showPopDetails && stats && (
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-3 text-slate-200 text-xs w-60 animate-in fade-in slide-in-from-top-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 pb-1.5 border-b border-slate-800 flex justify-between items-center">
            <span>Демография</span>
            <span>Всего: {population}</span>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-sky-300">👶 Дети</span>
              <span className="font-mono font-bold">{stats.childrenCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-300">🧑 Взрослые</span>
              <span className="font-mono font-bold">{stats.adultsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-300">👴 Пожилые</span>
              <span className="font-mono font-bold">{stats.eldersCount}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-rose-400 flex items-center gap-1 font-semibold">
                <Swords className="w-3 h-3" /> Воины
              </span>
              <span className="font-mono font-bold text-rose-300">{stats.soldiersCount}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-400">
              <span>🏠 Всего построек</span>
              <span className="font-mono font-bold text-slate-300">{buildingsCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Biome Distribution Panel */}
      {showBiomeDetails && biomes && (
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-3 text-slate-200 text-xs w-64 animate-in fade-in slide-in-from-top-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 pb-2 border-b border-slate-800">
            Распределение биомов
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Равнины
              </span>
              <span className="font-mono text-slate-300">{biomes.plains}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-green-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-800 inline-block" /> Леса
              </span>
              <span className="font-mono text-slate-300">{biomes.forest}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Mountain className="w-3 h-3 text-slate-400" /> Горы
              </span>
              <span className="font-mono text-slate-300">{biomes.mountain}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sky-200">
                <Snowflake className="w-3 h-3 text-sky-300" /> Снежные вершины
              </span>
              <span className="font-mono text-slate-300">{biomes.snow}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Пляжи и пески
              </span>
              <span className="font-mono text-slate-300">{biomes.sand}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600 inline-block" /> Океан и воды
              </span>
              <span className="font-mono text-slate-400">
                {biomes.water + biomes.shallowWater}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
