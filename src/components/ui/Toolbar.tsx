import React, { useState } from 'react';
import { ToolType, WorldGenPreset } from '../../game/types';
import {
  Shovel,
  User,
  Pause,
  Play,
  Minus,
  Plus,
  Trees,
  Mountain,
  Snowflake,
  SunMedium,
  Droplets,
  Sparkles,
  ChevronUp,
  Home,
  Box,
  Crown,
  Flag,
  Pointer,
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  simSpeed: number;
  isPaused: boolean;
  onSetSpeed: (speed: number) => void;
  onTogglePause: () => void;
  onGenerateWorld: (preset: WorldGenPreset) => void;
  showPoliticalMap: boolean;
  onTogglePoliticalMap: () => void;
}

const BRUSH_SIZES = [1, 3, 5, 10, 20];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  simSpeed,
  isPaused,
  onSetSpeed,
  onTogglePause,
  onGenerateWorld,
  showPoliticalMap,
  onTogglePoliticalMap,
}) => {
  const [showWorldMenu, setShowWorldMenu] = useState(false);

  const currentBrushIdx = BRUSH_SIZES.indexOf(brushSize);

  const handlePrevBrush = () => {
    if (currentBrushIdx > 0) {
      onChangeBrushSize(BRUSH_SIZES[currentBrushIdx - 1]);
    }
  };

  const handleNextBrush = () => {
    if (currentBrushIdx < BRUSH_SIZES.length - 1) {
      onChangeBrushSize(BRUSH_SIZES[currentBrushIdx + 1]);
    }
  };

  const handleSelectPreset = (preset: WorldGenPreset) => {
    onGenerateWorld(preset);
    setShowWorldMenu(false);
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 select-none">
      {/* World Generation Popover Menu */}
      {showWorldMenu && (
        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl p-2.5 text-slate-100 text-xs flex flex-col gap-1 w-56 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-2 py-1 border-b border-slate-800">
            Procedural Generation
          </div>
          <button
            onClick={() => handleSelectPreset('continents')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-emerald-300 font-medium transition-colors"
          >
            <span>🌍</span> Continents & Ranges
          </button>
          <button
            onClick={() => handleSelectPreset('archipelago')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-cyan-300 font-medium transition-colors"
          >
            <span>🏝️</span> Archipelago Islands
          </button>
          <button
            onClick={() => handleSelectPreset('pangea')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-amber-300 font-medium transition-colors"
          >
            <span>🏔️</span> Supercontinent Pangea
          </button>
          <button
            onClick={() => handleSelectPreset('ring')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-sky-300 font-medium transition-colors"
          >
            <span>🪐</span> Ring Atoll & Lagoon
          </button>
          <button
            onClick={() => handleSelectPreset('empty')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-slate-400 font-medium transition-colors border-t border-slate-800/80"
          >
            <span>🌊</span> Empty Ocean
          </button>
        </div>
      )}

      {/* Main Bottom Toolbar */}
      <div
        id="game-toolbar"
        className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-slate-100"
      >
        {/* World Gen Button */}
        <button
          onClick={() => setShowWorldMenu((prev) => !prev)}
          title="Procedural World Generator"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-700/60 shadow-md transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">World Gen</span>
          <ChevronUp className="w-3 h-3 text-indigo-300" />
        </button>

        <div className="h-5 w-px bg-slate-700/80 mx-0.5" />

        {/* Inspect Mode */}
        <button
          id="btn-tool-inspect"
          onClick={() => onSelectTool('inspect')}
          title="Inspect Tool: Click any human, building, or settlement to view details"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTool === 'inspect'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
          }`}
        >
          <Pointer className="w-3.5 h-3.5 text-amber-300" />
          <span>Inspect</span>
        </button>

        {/* Political Map Toggle */}
        <button
          id="btn-toggle-political"
          onClick={onTogglePoliticalMap}
          title="Toggle Political Territory Map & Borders"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            showPoliticalMap
              ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
          }`}
        >
          <Flag className="w-3.5 h-3.5 text-purple-300" />
          <span className="hidden md:inline">Borders</span>
        </button>

        <div className="h-5 w-px bg-slate-700/80 mx-0.5" />

        {/* Biome & Terrain Tools */}
        <div className="flex items-center gap-1">
          {/* Auto Land */}
          <button
            id="btn-tool-land"
            onClick={() => onSelectTool('land')}
            title="Auto Land Brush: Paints natural land"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'land'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Shovel className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Land</span>
          </button>

          {/* Forest */}
          <button
            id="btn-tool-forest"
            onClick={() => onSelectTool('forest')}
            title="Forest Biome: Dense woodland"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'forest'
                ? 'bg-green-700 text-white shadow-md ring-2 ring-green-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Trees className="w-3.5 h-3.5 text-green-300" />
          </button>

          {/* Mountain */}
          <button
            id="btn-tool-mountain"
            onClick={() => onSelectTool('mountain')}
            title="Mountain Biome: Rocky ridges & stone"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'mountain'
                ? 'bg-slate-600 text-white shadow-md ring-2 ring-slate-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {/* Snow */}
          <button
            id="btn-tool-snow"
            onClick={() => onSelectTool('snow')}
            title="Snow Biome"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'snow'
                ? 'bg-sky-700 text-white shadow-md ring-2 ring-sky-300/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5 text-sky-200" />
          </button>

          {/* Sand */}
          <button
            id="btn-tool-sand"
            onClick={() => onSelectTool('sand')}
            title="Sand & Beach"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'sand'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <SunMedium className="w-3.5 h-3.5 text-amber-300" />
          </button>

          {/* Water */}
          <button
            id="btn-tool-water"
            onClick={() => onSelectTool('water')}
            title="Water / Ocean"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'water'
                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-300" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-700/80 mx-0.5" />

        {/* Civilization Entities & Buildings */}
        <div className="flex items-center gap-1">
          {/* Human Placer */}
          <button
            id="btn-tool-human"
            onClick={() => onSelectTool('human')}
            title="Human (Key 2): Place pioneer on land"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'human'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Human</span>
          </button>

          {/* House */}
          <button
            id="btn-tool-house"
            onClick={() => onSelectTool('house')}
            title="Place House Foundation: Expands settlement housing"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'house'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden md:inline">House</span>
          </button>

          {/* Storehouse */}
          <button
            id="btn-tool-storage"
            onClick={() => onSelectTool('storage')}
            title="Place Storehouse: Holds wood, stone, food"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'storage'
                ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-orange-300" />
            <span className="hidden md:inline">Storage</span>
          </button>

          {/* Town Hall */}
          <button
            id="btn-tool-town-hall"
            onClick={() => onSelectTool('town_hall')}
            title="Place Town Hall: Administrative heart of town / kingdom"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTool === 'town_hall'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Town Hall</span>
          </button>
        </div>

        <div className="h-5 w-px bg-slate-700/80 mx-0.5" />

        {/* Brush Size Controls */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-xl border border-slate-800">
          <button
            id="btn-brush-minus"
            onClick={handlePrevBrush}
            disabled={currentBrushIdx <= 0}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Decrease brush size"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-4 text-center font-mono text-xs font-bold text-emerald-400">
            {brushSize}
          </span>
          <button
            id="btn-brush-plus"
            onClick={handleNextBrush}
            disabled={currentBrushIdx >= BRUSH_SIZES.length - 1}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Increase brush size"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-700/80 mx-0.5" />

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-sim-pause"
            onClick={onTogglePause}
            title="Pause / Resume (Spacebar)"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isPaused
                ? 'bg-rose-600 text-white ring-2 ring-rose-400/50 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
          >
            {isPaused ? (
              <Play className="w-3 h-3 text-rose-200 fill-current" />
            ) : (
              <Pause className="w-3 h-3 text-slate-400" />
            )}
            <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {[1, 2, 4].map((spd) => {
            const isActive = !isPaused && simSpeed === spd;
            return (
              <button
                key={spd}
                id={`btn-sim-${spd}x`}
                onClick={() => onSetSpeed(spd)}
                className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white ring-2 ring-sky-400/50 shadow-md'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
