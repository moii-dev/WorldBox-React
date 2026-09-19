import React from 'react';
import { X, Info, Heart, Zap, Coffee, Shield, Home, Briefcase, MapPin, Layers } from 'lucide-react';

interface InspectorPanelProps {
  inspectData: { category: string; data: any } | null;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ inspectData, onClose }) => {
  if (!inspectData) return null;

  const { category, data } = inspectData;

  const categoryLabels: Record<string, string> = {
    human: 'Житель',
    animal: 'Животное',
    building: 'Постройка',
    tile: 'Клетка карты',
  };

  return (
    <div
      id="inspector-panel"
      className="absolute top-16 right-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200 pointer-events-auto select-none animate-slide-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
            Осмотр: {categoryLabels[category] || category}
          </span>
        </div>
        <button
          id="btn-close-inspector"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700/60 transition-colors"
          title="Закрыть (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-3.5 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* 1. HUMAN */}
        {category === 'human' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{data.name}</h3>
                <span className="text-[11px] text-slate-400">
                  {data.sex === 'MALE' ? '♂ Мужчина' : '♀ Женщина'}, Возраст: {Math.floor(data.age)} • {data.role}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {data.currentAction}
              </span>
            </div>

            {/* Health & Needs */}
            <div className="space-y-1.5 font-mono text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> Здоровье</span>
                  <span>{Math.round(data.health)} / 100</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, data.health)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Питание</span>
                  <span>{Math.round(data.hunger)} / 100</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, data.hunger)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1"><Coffee className="w-3 h-3 text-sky-400" /> Бодрость</span>
                  <span>{Math.round(data.energy)} / 100</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, data.energy)}%` }} />
                </div>
              </div>
            </div>

            {/* Position and Location */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Координаты:</span>
                <span className="font-mono">({Math.floor(data.x)}, {Math.floor(data.y)})</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Настроение:</span>
                <span>{data.mood || 'Спокойное'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. ANIMAL */}
        {category === 'animal' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-100 capitalize">{data.species}</h3>
                <span className="text-[11px] text-slate-400">
                  {data.isDomesticated ? '🏡 Домашний скот' : '🌲 Дикое животное'}, Возраст: {Math.floor(data.age)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                {data.state}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>Здоровье</span>
                  <span>{Math.round(data.health)} / {data.maxHealth}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(data.health / data.maxHealth) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>Сытость</span>
                  <span>{Math.round(data.hunger)} / 100</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${data.hunger}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Запас мяса:</span>
                <span className="font-mono">{data.meatYield} ед. еды</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Координаты:</span>
                <span className="font-mono">({Math.floor(data.x)}, {Math.floor(data.y)})</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. BUILDING */}
        {category === 'building' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{data.type}</h3>
                <span className="text-[11px] text-slate-400">
                  Уровень {data.level} • {data.isUnderConstruction ? 'Строится' : 'Действует'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Координаты:</span>
                <span className="font-mono">({data.tileX}, {data.tileY})</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Состояние:</span>
                <span className="font-mono">{Math.round(data.condition || 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. TILE & BIOME */}
        {category === 'tile' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{data.biome}</h3>
                <span className="text-[11px] text-slate-400">
                  Клетка ({data.x}, {data.y})
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                data.isWalkable ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950 text-rose-300 border border-rose-800/60'
              }`}>
                {data.isWalkable ? 'Проходима' : 'Вода / Преграда'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Высота:</span>
                <span className="font-mono">{data.elevation}%</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Климат:</span>
                <span>{data.temp}</span>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800 col-span-2">
                <span className="text-slate-400 block text-[10px]">Множитель еды:</span>
                <span className="font-mono">{data.foodMult}x</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
