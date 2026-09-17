import React from 'react';
import { HumanEntity, HumanState } from '../../game/types';
import { X, Axe, Footprints, Clock, Compass, Hammer, Box, MessageCircle, Flag, Swords, Shield } from 'lucide-react';

interface InspectorPanelProps {
  human: HumanEntity | null;
  onClose: () => void;
}

const STATE_LABELS: Record<HumanState, { label: string; icon: React.ReactNode; color: string }> = {
  [HumanState.IDLE]: {
    label: 'Idle',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-300 bg-slate-800/80 border-slate-700',
  },
  [HumanState.WANDERING]: {
    label: 'Walking / Wandering',
    icon: <Footprints className="w-3.5 h-3.5 text-sky-400" />,
    color: 'text-sky-300 bg-sky-950/60 border-sky-800',
  },
  [HumanState.SEARCHING_RESOURCE]: {
    label: 'Searching',
    icon: <Compass className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-300 bg-amber-950/60 border-amber-800',
  },
  [HumanState.MOVING_TO_RESOURCE]: {
    label: 'Moving to Resource',
    icon: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/60 border-emerald-800',
  },
  [HumanState.GATHERING]: {
    label: 'Gathering',
    icon: <Axe className="w-3.5 h-3.5 text-amber-400 animate-bounce" />,
    color: 'text-amber-300 bg-amber-950/80 border-amber-600',
  },
  [HumanState.BUILDING]: {
    label: 'Building',
    icon: <Hammer className="w-3.5 h-3.5 text-blue-400" />,
    color: 'text-blue-300 bg-blue-950/80 border-blue-600',
  },
  [HumanState.DELIVERING_RESOURCES]: {
    label: 'Delivering Supplies',
    icon: <Box className="w-3.5 h-3.5 text-orange-400" />,
    color: 'text-orange-300 bg-orange-950/80 border-orange-600',
  },
  [HumanState.SOCIALIZING]: {
    label: 'Socializing',
    icon: <MessageCircle className="w-3.5 h-3.5 text-pink-400" />,
    color: 'text-pink-300 bg-pink-950/80 border-pink-600',
  },
  [HumanState.COLONIZING]: {
    label: 'Colonizing',
    icon: <Flag className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600',
  },
  [HumanState.PATROLLING]: {
    label: 'Patrolling',
    icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
    color: 'text-indigo-300 bg-indigo-950/80 border-indigo-600',
  },
  [HumanState.ATTACKING]: {
    label: 'Attacking',
    icon: <Swords className="w-3.5 h-3.5 text-rose-400" />,
    color: 'text-rose-300 bg-rose-950/80 border-rose-600',
  },
  [HumanState.FLEEING]: {
    label: 'Fleeing',
    icon: <Footprints className="w-3.5 h-3.5 text-red-400" />,
    color: 'text-red-300 bg-red-950/80 border-red-600',
  },
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ human, onClose }) => {
  if (!human) return null;

  const stateInfo = STATE_LABELS[human.state] || STATE_LABELS[HumanState.IDLE];

  return (
    <div
      id="inspector-panel"
      className="absolute top-4 right-4 z-20 w-64 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl p-3.5 text-slate-100 select-none animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/70">
        <div className="flex items-center gap-2">
          {/* Avatar pixel swatch */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/20 shadow-inner"
            style={{ backgroundColor: human.colorTheme.shirt }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: human.colorTheme.skin }}
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-amber-400">
              Human
            </div>
            <div className="text-sm font-bold text-slate-100 leading-tight">
              {human.name}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* State Badge */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
          State
        </div>
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${stateInfo.color}`}
        >
          {stateInfo.icon}
          <span>{stateInfo.label}</span>
        </div>
      </div>

      {/* Gathering Progress (if gathering) */}
      {human.state === HumanState.GATHERING && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] text-amber-300 font-medium mb-1">
            <span>Harvesting...</span>
            <span>{Math.round((human.gatherProgress || 0) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.round((human.gatherProgress || 0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Inventory Section */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          Inventory
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span>🌲</span> Wood
            </div>
            <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
              {human.inventory.wood}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 flex flex-col items-center justify-center">
            <div className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <span>🪨</span> Stone
            </div>
            <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
              {human.inventory.stone}
            </div>
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex justify-between">
        <span>Position:</span>
        <span>
          X: {human.x.toFixed(1)}, Y: {human.y.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
