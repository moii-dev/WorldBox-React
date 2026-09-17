import React, { useState } from 'react';
import { WorldEvent } from '../../game/types';
import { Scroll, ChevronDown, ChevronUp, ShieldAlert, Swords, Flag, Castle, Sparkles } from 'lucide-react';

interface EventLogProps {
  events?: WorldEvent[];
}

export const EventLog: React.FC<EventLogProps> = ({ events = [] }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getEventIcon = (type: WorldEvent['type']) => {
    switch (type) {
      case 'WAR_DECLARED':
        return <Swords className="w-3 h-3 text-rose-400 shrink-0" />;
      case 'PEACE_SIGNED':
        return <Flag className="w-3 h-3 text-sky-400 shrink-0" />;
      case 'KINGDOM_CREATED':
        return <Castle className="w-3 h-3 text-amber-400 shrink-0" />;
      case 'SETTLEMENT_FOUNDED':
        return <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />;
      case 'SETTLEMENT_CAPTURED':
        return <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />;
      default:
        return <ShieldAlert className="w-3 h-3 text-slate-400 shrink-0" />;
    }
  };

  const safeEvents = events || [];
  const recentEvents = safeEvents.slice(-8).reverse();

  return (
    <div
      id="world-event-log"
      className="absolute top-4 right-4 z-20 flex flex-col items-end select-none font-sans"
    >
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/95 backdrop-blur-md border border-slate-700/80 shadow-xl text-slate-200 text-xs font-medium transition-all"
        title="Toggle World Chronicle"
      >
        <Scroll className="w-3.5 h-3.5 text-amber-400" />
        <span>World Chronicle</span>
        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-amber-300 font-bold border border-slate-700">
          {safeEvents.length}
        </span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded Events Stream */}
      {isExpanded && (
        <div className="mt-2 w-80 max-h-72 overflow-y-auto bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl p-3 text-slate-200 text-xs flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            <span>Recent Events</span>
            <span>Historical Log</span>
          </div>

          {events.length === 0 ? (
            <div className="py-4 text-center text-slate-500 italic">No historical events recorded yet.</div>
          ) : (
            recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] leading-snug"
              >
                <div className="mt-0.5">{getEventIcon(evt.type)}</div>
                <div className="flex-1">
                  <span className="text-slate-100">{evt.text}</span>
                  <div className="mt-0.5 text-[9px] font-mono text-slate-500">Year {evt.year}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
