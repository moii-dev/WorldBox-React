import React from 'react';
import {
  HumanEntity,
  BuildingEntity,
  SettlementEntity,
  KingdomEntity,
  HumanState,
} from '../../game/types';
import {
  X,
  Axe,
  Footprints,
  Clock,
  Compass,
  Hammer,
  Shield,
  Heart,
  Home,
  Crown,
  Users,
  Swords,
  Box,
  LocateFixed,
  MessageCircle,
  Flag,
} from 'lucide-react';

interface CivilizationInspectorProps {
  human: HumanEntity | null;
  building: BuildingEntity | null;
  settlement?: SettlementEntity | null;
  kingdom?: KingdomEntity | null;
  onClose: () => void;
  onCenterCamera?: (x: number, y: number) => void;
}

const STATE_LABELS: Record<HumanState, { label: string; icon: React.ReactNode; color: string }> = {
  [HumanState.IDLE]: {
    label: 'Idle / Resting',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-300 bg-slate-800/80 border-slate-700',
  },
  [HumanState.WANDERING]: {
    label: 'Exploring Territory',
    icon: <Footprints className="w-3.5 h-3.5 text-sky-400" />,
    color: 'text-sky-300 bg-sky-950/60 border-sky-800',
  },
  [HumanState.SEARCHING_RESOURCE]: {
    label: 'Scouting Resources',
    icon: <Compass className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-300 bg-amber-950/60 border-amber-800',
  },
  [HumanState.MOVING_TO_RESOURCE]: {
    label: 'Traveling to Resource',
    icon: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/60 border-emerald-800',
  },
  [HumanState.GATHERING]: {
    label: 'Harvesting',
    icon: <Axe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
    color: 'text-amber-300 bg-amber-950/80 border-amber-600',
  },
  [HumanState.DELIVERING_RESOURCES]: {
    label: 'Delivering Supplies',
    icon: <Box className="w-3.5 h-3.5 text-orange-400" />,
    color: 'text-orange-300 bg-orange-950/80 border-orange-700',
  },
  [HumanState.BUILDING]: {
    label: 'Constructing Structure',
    icon: <Hammer className="w-3.5 h-3.5 text-blue-400 animate-bounce" />,
    color: 'text-blue-300 bg-blue-950/80 border-blue-600',
  },
  [HumanState.SOCIALIZING]: {
    label: 'Courting / Socializing',
    icon: <MessageCircle className="w-3.5 h-3.5 text-pink-400" />,
    color: 'text-pink-300 bg-pink-950/80 border-pink-600',
  },
  [HumanState.COLONIZING]: {
    label: 'Founding Settlement',
    icon: <Flag className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600',
  },
  [HumanState.ATTACKING]: {
    label: 'Engaging Enemy in Battle',
    icon: <Swords className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
    color: 'text-rose-300 bg-rose-950/80 border-rose-600',
  },
  [HumanState.FLEEING]: {
    label: 'Fleeing Danger!',
    icon: <Footprints className="w-3.5 h-3.5 text-red-400" />,
    color: 'text-red-300 bg-red-950/80 border-red-600',
  },
  [HumanState.PATROLLING]: {
    label: 'Guarding Frontier',
    icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
    color: 'text-indigo-300 bg-indigo-950/80 border-indigo-600',
  },
};

export const CivilizationInspector: React.FC<CivilizationInspectorProps> = ({
  human,
  building,
  settlement,
  kingdom,
  onClose,
  onCenterCamera,
}) => {
  if (!human && !building && !settlement && !kingdom) return null;

  return (
    <div
      id="civilization-inspector"
      className="absolute top-16 right-4 z-20 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-4 text-slate-100 select-none animate-in fade-in slide-in-from-top-2 duration-150 font-sans"
    >
      {/* HUMAN INSPECTION */}
      {human && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/20 shadow-inner"
                style={{ backgroundColor: human.colorTheme.shirt }}
              >
                <div
                  className="w-4 h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: human.colorTheme.skin }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {human.profession}
                  </span>
                  <span className="text-xs text-slate-400">
                    {human.sex === 'MALE' ? '♂' : '♀'} {human.age} yrs
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-100 leading-tight mt-0.5">
                  {human.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onCenterCamera && (
                <button
                  onClick={() => onCenterCamera(human.x, human.y)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                  title="Center Camera on Person"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Health & Life Stage */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                <Heart className="w-3 h-3 fill-current" /> Health
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {Math.round(human.health)} / {human.maxHealth}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (human.health / human.maxHealth) * 100))}%` }}
              />
            </div>
          </div>

          {/* State Badge */}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Current Behavior
            </div>
            {(() => {
              const stateInfo = STATE_LABELS[human.state] || STATE_LABELS[HumanState.IDLE];
              return (
                <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${stateInfo.color}`}
                >
                  {stateInfo.icon}
                  <span>{stateInfo.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Affiliation (Settlement & Kingdom) */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-emerald-400" /> Settlement:
              </span>
              <span className="font-semibold text-slate-200">
                {settlement ? settlement.name : 'Nomadic wanderer'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> Kingdom:
              </span>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                {kingdom ? (
                  <>
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: kingdom.color }}
                    />
                    {kingdom.name}
                  </>
                ) : (
                  'No Allegiance'
                )}
              </span>
            </div>
          </div>

          {/* Family & Stats */}
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-300 grid grid-cols-2 gap-2">
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Children:</span>
              <span className="font-bold text-slate-200">{human.children?.length ?? 0}</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Battles Won:</span>
              <span className="font-bold text-amber-300">{human.kills ?? 0} kills</span>
            </div>
          </div>

          {/* Inventory */}
          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Personal Inventory
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-emerald-400">🌲 Wood</div>
                <div className="text-xs font-mono font-bold">{human.inventory.wood}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-cyan-400">🪨 Stone</div>
                <div className="text-xs font-mono font-bold">{human.inventory.stone}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-amber-400">🌾 Food</div>
                <div className="text-xs font-mono font-bold">{human.inventory.food}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BUILDING INSPECTION */}
      {building && !human && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-950/80 border border-indigo-700/60">
                {building.type === 'TOWN_HALL' ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : building.type === 'STORAGE' ? (
                  <Box className="w-4 h-4 text-orange-400" />
                ) : (
                  <Home className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  {building.type === 'TOWN_HALL'
                    ? 'Town Hall'
                    : building.type === 'STORAGE'
                    ? 'Storehouse'
                    : 'Cottage'}
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {building.isCompleted ? 'Finished Building' : 'Under Construction'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onCenterCamera && (
                <button
                  onClick={() => onCenterCamera(building.x + building.width / 2, building.y + building.height / 2)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                  title="Center Camera on Building"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Construction Progress */}
          {!building.isCompleted && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-sky-400 font-medium text-[11px]">Construction</span>
                <span className="font-mono text-[11px] text-slate-300">
                  {Math.round(building.constructionProgress * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-sky-500 transition-all duration-150"
                  style={{ width: `${Math.round(building.constructionProgress * 100)}%` }}
                />
              </div>

              <div className="mt-2 text-xs space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Wood Delivered:</span>
                  <span className="font-mono">
                    {building.woodDelivered} / {building.woodNeeded}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Stone Delivered:</span>
                  <span className="font-mono">
                    {building.stoneDelivered} / {building.stoneNeeded}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Occupants */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Residents:
            </span>
            <span className="font-mono font-bold text-slate-200">
              {building.occupants?.length ?? 0} / {building.maxOccupants}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
