import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MousePointer, Move, ZoomIn } from 'lucide-react';

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
      {/* Toast Notification Container (if any provided) */}
      {toasts && toasts.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-rose-950/90 border border-rose-600/80 text-rose-200 text-xs px-3.5 py-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Mini Controls Guide (Bottom Right) */}
      <div className="absolute bottom-5 right-4 z-20 select-none">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs backdrop-blur-md transition-colors shadow-lg"
            title="Show Controls Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium">Controls</span>
          </button>
        ) : (
          <div className="w-60 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl p-3 text-slate-300 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-semibold text-slate-100 text-[11px] uppercase tracking-wider">
                Game Controls
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="text-slate-400 hover:text-slate-200"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Move Camera:</span>
                <span className="font-mono text-slate-200">WASD / Drag</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Zoom:</span>
                <span className="font-mono text-slate-200">Mouse Wheel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paint Land:</span>
                <span className="font-mono text-emerald-400">LMB (Land tool)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Place Human/Building:</span>
                <span className="font-mono text-amber-400">Select Tool & LMB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inspect:</span>
                <span className="font-mono text-slate-200">Click Human / Building</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Political Map:</span>
                <span className="font-mono text-indigo-400">Borders Toggle</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pause / Resume:</span>
                <span className="font-mono text-slate-200">Spacebar</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
