import React from 'react';
import {
  HumanEntity,
  BuildingEntity,
  SettlementEntity,
  KingdomEntity,
  HumanState,
  Animal,
  DiplomaticPact,
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
  Utensils,
  Crosshair,
  Sprout,
  Beef,
  Sparkles,
} from 'lucide-react';

interface CivilizationInspectorProps {
  human: HumanEntity | null;
  building: BuildingEntity | null;
  animal?: Animal | null;
  settlement?: SettlementEntity | null;
  kingdom?: KingdomEntity | null;
  pacts?: DiplomaticPact[];
  relations?: Array<{ name: string; value: number; reason: string }>;
  onClose: () => void;
  onCenterCamera?: (x: number, y: number) => void;
  onSlaughterAnimal?: (animalId: string) => void;
  onDomesticateAnimal?: (animalId: string) => void;
}

const STATE_LABELS: Record<HumanState, { label: string; icon: React.ReactNode; color: string }> = {
  [HumanState.IDLE]: {
    label: 'Отдых / Бездействие',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-300 bg-slate-800/80 border-slate-700',
  },
  [HumanState.WANDERING]: {
    label: 'Исследование земель',
    icon: <Footprints className="w-3.5 h-3.5 text-sky-400" />,
    color: 'text-sky-300 bg-sky-950/60 border-sky-800',
  },
  [HumanState.SEARCHING_RESOURCE]: {
    label: 'Поиск ресурсов',
    icon: <Compass className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-300 bg-amber-950/60 border-amber-800',
  },
  [HumanState.MOVING_TO_RESOURCE]: {
    label: 'Путь к ресурсам',
    icon: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/60 border-emerald-800',
  },
  [HumanState.GATHERING]: {
    label: 'Сбор ресурсов',
    icon: <Axe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
    color: 'text-amber-300 bg-amber-950/80 border-amber-600',
  },
  [HumanState.DELIVERING_RESOURCES]: {
    label: 'Доставка на склад',
    icon: <Box className="w-3.5 h-3.5 text-orange-400" />,
    color: 'text-orange-300 bg-orange-950/80 border-orange-700',
  },
  [HumanState.BUILDING]: {
    label: 'Строительство',
    icon: <Hammer className="w-3.5 h-3.5 text-blue-400 animate-bounce" />,
    color: 'text-blue-300 bg-blue-950/80 border-blue-600',
  },
  [HumanState.SOCIALIZING]: {
    label: 'Общение / Семья',
    icon: <MessageCircle className="w-3.5 h-3.5 text-pink-400" />,
    color: 'text-pink-300 bg-pink-950/80 border-pink-600',
  },
  [HumanState.COLONIZING]: {
    label: 'Основание поселения',
    icon: <Flag className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600',
  },
  [HumanState.ATTACKING]: {
    label: 'Сражение с врагом',
    icon: <Swords className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
    color: 'text-rose-300 bg-rose-950/80 border-rose-600',
  },
  [HumanState.FLEEING]: {
    label: 'Бегство от опасности!',
    icon: <Footprints className="w-3.5 h-3.5 text-red-400" />,
    color: 'text-red-300 bg-red-950/80 border-red-600',
  },
  [HumanState.PATROLLING]: {
    label: 'Патруль границ',
    icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
    color: 'text-indigo-300 bg-indigo-950/80 border-indigo-600',
  },
  [HumanState.SEARCHING_FOOD]: {
    label: 'Поиск пищи',
    icon: <Utensils className="w-3.5 h-3.5 text-amber-400 animate-bounce" />,
    color: 'text-amber-300 bg-amber-950/80 border-amber-600',
  },
  [HumanState.EATING]: {
    label: 'Приём пищи',
    icon: <Utensils className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600',
  },
  [HumanState.HUNTING]: {
    label: 'Охота на дичь',
    icon: <Crosshair className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
    color: 'text-rose-300 bg-rose-950/80 border-rose-600',
  },
  [HumanState.FARMING]: {
    label: 'Земледелие',
    icon: <Sprout className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600',
  },
  [HumanState.HERDING]: {
    label: 'Выпас скота',
    icon: <Footprints className="w-3.5 h-3.5 text-yellow-400" />,
    color: 'text-yellow-300 bg-yellow-950/80 border-yellow-600',
  },
};

export const CivilizationInspector: React.FC<CivilizationInspectorProps> = ({
  human,
  building,
  animal,
  settlement,
  kingdom,
  pacts = [],
  relations = [],
  onClose,
  onCenterCamera,
  onSlaughterAnimal,
  onDomesticateAnimal,
}) => {
  if (!human && !building && !animal && !settlement && !kingdom) return null;

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
                    {human.sex === 'MALE' ? '♂' : '♀'} {human.age} лет
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
                  title="Центрировать камеру на жителе"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Закрыть панель"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Health & Life Stage */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                <Heart className="w-3 h-3 fill-current" /> Здоровье
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

          {/* Hunger Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                <Utensils className="w-3 h-3" /> Сытость / Питание
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {Math.round(human.hunger ?? 100)} / {human.maxHunger ?? 100}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-150 ${
                  (human.hunger ?? 100) <= 20
                    ? 'bg-rose-500 animate-pulse'
                    : (human.hunger ?? 100) <= 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((human.hunger ?? 100) / (human.maxHunger ?? 100)) * 100)
                  )}%`,
                }}
              />
            </div>
            {(human.hunger ?? 100) <= 0 && (
              <div className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1 animate-pulse">
                ⚠️ Голодает! Здоровье падает от истощения.
              </div>
            )}
          </div>

          {/* State Badge */}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Текущее действие
            </div>
            {(() => {
              if (human.state === HumanState.SOCIALIZING || human.isExpecting) {
                const remainingSecs = Math.max(1, Math.round(((human.birthTimer ?? 0) / 25)));
                return (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-pink-300 bg-pink-950/80 border-pink-600 animate-pulse">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/40" />
                    <span>Семья и рождение ребёнка ({remainingSecs}с)</span>
                  </div>
                );
              }
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
                <Home className="w-3.5 h-3.5 text-emerald-400" /> Поселение:
              </span>
              <span className="font-semibold text-slate-200">
                {settlement ? settlement.name : 'Странник (без дома)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> Государство:
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
                  'Нет подданства'
                )}
              </span>
            </div>
          </div>

          {/* Family & Stats */}
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-300 grid grid-cols-2 gap-2">
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Дети:</span>
              <span className="font-bold text-slate-200">{human.children?.length ?? 0}</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Побед в боях:</span>
              <span className="font-bold text-amber-300">{human.kills ?? 0}</span>
            </div>
          </div>

          {/* Inventory */}
          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Личный инвентарь
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-emerald-400">🌲 Дерево</div>
                <div className="text-xs font-mono font-bold">{human.inventory.wood}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-cyan-400">🪨 Камень</div>
                <div className="text-xs font-mono font-bold">{human.inventory.stone}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-amber-400">🌾 Еда</div>
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
                ) : building.type === 'FARM' ? (
                  <Sprout className="w-4 h-4 text-emerald-400" />
                ) : building.type === 'ANIMAL_PEN' ? (
                  <Beef className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Home className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  {building.type === 'TOWN_HALL'
                    ? 'Ратуша'
                    : building.type === 'STORAGE'
                    ? 'Склад'
                    : building.type === 'FARM'
                    ? 'Ферма'
                    : building.type === 'ANIMAL_PEN'
                    ? 'Загон для скота'
                    : building.type === 'BLACKSMITH'
                    ? 'Кузница'
                    : building.type === 'TEMPLE'
                    ? 'Храм'
                    : building.type === 'WATCHTOWER'
                    ? 'Сторожевая башня'
                    : building.type === 'DEFENSIVE_WALL'
                    ? 'Крепостная стена'
                    : building.type === 'DOCK'
                    ? 'Морская верфь и гавань'
                    : 'Хижина'}
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {building.isCompleted ? 'Построено' : 'Строится'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onCenterCamera && (
                <button
                  onClick={() => onCenterCamera(building.x + building.width / 2, building.y + building.height / 2)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                  title="Центрировать камеру на здании"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Construction Progress */}
          {!building.isCompleted && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-sky-400 font-medium text-[11px]">Строительство</span>
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
                  <span>Доставлено дерева:</span>
                  <span className="font-mono">
                    {building.woodDelivered} / {building.woodNeeded}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Доставлено камня:</span>
                  <span className="font-mono">
                    {building.stoneDelivered} / {building.stoneNeeded}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Farm Crop Growth Info */}
          {building.type === 'FARM' && building.isCompleted && (
            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5" /> Стадия урожая:
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {building.cropStage === 'READY_TO_HARVEST'
                    ? '🌾 Готов к сбору'
                    : building.cropStage === 'GROWING'
                    ? '🌱 Рост культур'
                    : '🌱 Посев и вспашка'}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-1.5">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{ width: `${Math.round((building.cropProgress || 0) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5">
                Производит зерно и овощи для склада поселения при сборе фермерами.
              </div>
            </div>
          )}

          {/* Animal Pen Livestock Info */}
          {building.type === 'ANIMAL_PEN' && building.isCompleted && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-yellow-400 font-semibold flex items-center gap-1">
                  <Beef className="w-3.5 h-3.5" /> Скот в загоне:
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {building.livestockIds?.length ?? 0} / {building.livestockCapacity ?? 8}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Приручённые животные кормятся скотоводами и приносят постоянную пищу.
              </div>
            </div>
          )}

          {/* Occupants */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Работники / Жильцы:
            </span>
            <span className="font-mono font-bold text-slate-200">
              {building.occupants?.length ?? 0} / {building.maxOccupants}
            </span>
          </div>
        </>
      )}

      {/* KINGDOM INSPECTION */}
      {kingdom && !human && !building && !animal && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl border border-white/20" style={{ backgroundColor: kingdom.color }} />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Государство</div>
                <div className="text-sm font-bold">{kingdom.name}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400" title="Закрыть панель"><X className="w-4 h-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2 rounded-lg"><span className="block text-slate-500">Правитель</span><span>{kingdom.rulerName}</span></div>
            <div className="bg-slate-950/60 p-2 rounded-lg"><span className="block text-slate-500">Эпоха</span><span>{kingdom.era}</span></div>
            <div className="bg-slate-950/60 p-2 rounded-lg"><span className="block text-slate-500">Население</span><span>{kingdom.population}</span></div>
            <div className="bg-slate-950/60 p-2 rounded-lg"><span className="block text-slate-500">Армия</span><span>{kingdom.militaryStrength}</span></div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-xs space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Договоры и отношения</div>
            {pacts.length ? pacts.map((pact) => {
              const otherId = pact.kingdomAId === kingdom.id ? pact.kingdomBId : pact.kingdomAId;
              const label = pact.type === 'ALLIANCE' ? 'Союз' : pact.type === 'TRADE' ? 'Торговля' : 'Ненападение';
              return <div key={pact.id} className="flex justify-between bg-emerald-950/50 border border-emerald-900 rounded p-1.5"><span>{label}</span><span className="text-slate-400">{otherId}</span></div>;
            }) : <div className="text-slate-500">Нет действующих договоров.</div>}
            {kingdom.atWarWith.length > 0 && <div className="text-rose-300">⚔️ Активные войны: {kingdom.atWarWith.length}</div>}
            {relations.length > 0 && <div className="pt-1 space-y-1">
              {relations.map((relation) => (
                <div key={relation.name} className="rounded bg-slate-950/60 border border-slate-800 px-1.5 py-1">
                  <div className="flex justify-between gap-2"><span className="truncate">{relation.name}</span><span className={relation.value < 0 ? 'text-rose-300' : relation.value > 0 ? 'text-emerald-300' : 'text-slate-400'}>{relation.value > 0 ? '+' : ''}{relation.value}</span></div>
                  <div className="text-[10px] text-slate-500">{relation.reason}</div>
                </div>
              ))}
            </div>}
          </div>
        </>
      )}

      {/* ANIMAL INSPECTION */}
      {animal && !human && !building && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-950/80 border border-amber-700/60 text-lg">
                {animal.species === 'DEER'
                  ? '🦌'
                  : animal.species === 'BOAR'
                  ? '🐗'
                  : animal.species === 'WOLF'
                  ? '🐺'
                  : animal.species === 'CHICKEN'
                  ? '🐔'
                  : '🐮'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {animal.species === 'DEER'
                      ? 'ОЛЕНЬ'
                      : animal.species === 'BOAR'
                      ? 'КАБАН'
                      : animal.species === 'WOLF'
                      ? 'ВОЛК'
                      : animal.species === 'CHICKEN'
                      ? 'КУРИЦА'
                      : 'КОРОВА'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {animal.isDomesticated ? '🏡 Домашнее' : '🌲 Дикое'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-100 leading-tight mt-0.5">
                  {animal.species === 'DEER'
                    ? 'Дикий олень'
                    : animal.species === 'BOAR'
                    ? 'Лесной кабан'
                    : animal.species === 'WOLF'
                    ? 'Серый волк'
                    : animal.species === 'CHICKEN'
                    ? 'Домашняя курица'
                    : 'Луговая корова'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onCenterCamera && (
                <button
                  onClick={() => onCenterCamera(animal.x, animal.y)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                  title="Центрировать камеру на животном"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Animal Health Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                <Heart className="w-3 h-3 fill-current" /> Здоровье
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {Math.round(animal.health)} / {animal.maxHealth}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (animal.health / animal.maxHealth) * 100))}%` }}
              />
            </div>
          </div>

          {/* Animal Hunger / Energy */}
          <div className="mt-2.5">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                <Utensils className="w-3 h-3" /> Сытость / Питание
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {Math.round(animal.hunger)} / 100
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-amber-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, animal.hunger))}%` }}
              />
            </div>
          </div>

          {/* Behavior State */}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Поведение
            </div>
            <div className="px-2.5 py-1.5 rounded-lg border text-xs font-medium text-amber-300 bg-amber-950/60 border-amber-800 flex items-center gap-2">
              <Footprints className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {animal.state === 'EATING'
                  ? 'Пасётся и кормится'
                  : animal.state === 'FLEEING'
                  ? '⚠️ Спасается бегством!'
                  : animal.state === 'CHASING' || animal.state === 'ATTACKING'
                  ? '⚔️ Преследует добычу!'
                  : animal.state === 'RESTING'
                  ? 'Отдыхает в тени'
                  : animal.state === 'FOLLOWING_HERDER'
                  ? 'Идёт за пастухом'
                  : 'Бродит по местности'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
            {!animal.isDomesticated && (animal.species === 'COW' || animal.species === 'CHICKEN' || animal.species === 'DEER') && onDomesticateAnimal && (
              <button
                onClick={() => onDomesticateAnimal(animal.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 text-xs font-semibold transition-colors"
                title="Приручить животное для поселения"
              >
                <Sparkles className="w-3.5 h-3.5" /> Приручить
              </button>
            )}

            {onSlaughterAnimal && (
              <button
                onClick={() => onSlaughterAnimal(animal.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 text-xs font-semibold transition-colors"
                title="Добыть мясо животного"
              >
                <Beef className="w-3.5 h-3.5" /> Забить
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
