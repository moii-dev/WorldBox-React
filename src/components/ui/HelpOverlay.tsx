import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Keyboard } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
}

interface HelpOverlayProps {
  toasts?: Toast[];
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ toasts = [] }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* Mini Controls Guide (Bottom Right) */}
      <div className="absolute bottom-5 right-4 z-20 select-none">
        {collapsed ? (
          <button
            id="btn-show-controls"
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-700/80 text-xs backdrop-blur-md transition-colors shadow-lg"
            title="Управление и горячие клавиши"
          >
            <Keyboard className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium">Клавиши</span>
          </button>
        ) : (
          <div
            id="controls-guide-modal"
            className="w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-3.5 text-slate-300 text-xs animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-100 text-[11px] uppercase tracking-wider">
                <Keyboard className="w-3.5 h-3.5 text-sky-400" />
                <span>Управление и клавиши</span>
              </div>
              <button
                id="btn-hide-controls"
                onClick={() => setCollapsed(true)}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
                title="Свернуть"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Перемещение камеры:</span>
                <span className="font-mono text-slate-200">WASD / Пробел + тянуть</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Масштаб:</span>
                <span className="font-mono text-slate-200">Колёсико мыши</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Выделение рамкой:</span>
                <span className="font-mono text-sky-400">V / Рамка ЛКМ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Осмотр объекта:</span>
                <span className="font-mono text-purple-400">I (клик по объекту)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ластик:</span>
                <span className="font-mono text-rose-400">E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Рука (панорама):</span>
                <span className="font-mono text-slate-200">H / СКМ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Смена биома:</span>
                <span className="font-mono text-emerald-400">B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Спавн группы:</span>
                <span className="font-mono text-amber-400">Shift + Клик</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Размер кисти:</span>
                <span className="font-mono text-slate-200">Клавиши [ и ]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Отмена / Повтор:</span>
                <span className="font-mono text-slate-200">Ctrl+Z / Ctrl+Y</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Снять выделение:</span>
                <span className="font-mono text-slate-200">ESC</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
