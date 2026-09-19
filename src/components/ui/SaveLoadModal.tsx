import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { SaveSlotMeta } from '../../game/save/SaveManager';
import { SoundSynthesizer } from '../../game/audio/SoundSynthesizer';
import {
  Save,
  Download,
  Upload,
  Trash2,
  X,
  Clock,
  Users,
  Crown,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  onWorldLoaded?: () => void;
  onToast?: (msg: string) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  engine,
  onWorldLoaded,
  onToast,
}) => {
  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [slotNames, setSlotNames] = useState<Record<number, string>>({});
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSlots = () => {
    if (engine) {
      const currentSlots = engine.getSaveSlots();
      setSlots(currentSlots);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
    }
  }, [isOpen, engine]);

  if (!isOpen || !engine) return null;

  const handleSaveToSlot = (slotIndex: number) => {
    setSavingSlot(slotIndex);
    const customName = slotNames[slotIndex]?.trim() || `Мир ${slotIndex + 1}`;
    const success = engine.saveWorldToSlot(slotIndex, customName);
    setSavingSlot(null);

    if (success) {
      SoundSynthesizer.playTownBell();
      refreshSlots();
      if (onToast) onToast(`Мир успешно сохранён в Слот ${slotIndex + 1}!`);
    } else {
      if (onToast) onToast(`Ошибка сохранения мира в слот.`);
    }
  };

  const handleLoadFromSlot = (slotIndex: number) => {
    setLoadingSlot(slotIndex);
    const success = engine.loadWorldFromSlot(slotIndex);
    setLoadingSlot(null);

    if (success) {
      SoundSynthesizer.playDivineChime();
      if (onWorldLoaded) onWorldLoaded();
      if (onToast) onToast(`Мир из Слота ${slotIndex + 1} успешно загружен!`);
      onClose();
    } else {
      if (onToast) onToast(`Не удалось загрузить мир из этого слота.`);
    }
  };

  const handleDeleteSlot = (slotIndex: number) => {
    localStorage.removeItem(`world_save_slot_${slotIndex}`);
    refreshSlots();
    if (onToast) onToast(`Слот ${slotIndex + 1} очищен.`);
  };

  const handleExportJson = () => {
    try {
      const json = engine.exportWorldJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world_chronicles_year${1 + Math.floor(engine.simulation.tickRate)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      SoundSynthesizer.playDivineChime();
      if (onToast) onToast('Файл мира экспортирован на устройство!');
    } catch {
      if (onToast) onToast('Ошибка экспорта файла сохранения.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = engine.importWorldJson(text);
        if (success) {
          SoundSynthesizer.playDivineChime();
          refreshSlots();
          if (onWorldLoaded) onWorldLoaded();
          if (onToast) onToast('Мир успешно импортирован из файла!');
          onClose();
        } else {
          if (onToast) onToast('Неверный формат файла сохранения.');
        }
      } catch {
        if (onToast) onToast('Ошибка чтения JSON файла.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Хроники Мира (Save / Load)
              </h2>
              <p className="text-xs text-slate-400">
                Сохраняйте эпохи, цивилизации и прогресс в слоты браузера или файлы JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Локальные слоты памяти (LocalStorage)
          </div>

          {slots.map((slot) => (
            <div
              key={slot.slot}
              className={`p-4 rounded-xl border transition-all ${
                slot.exists
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/20 border-slate-900 border-dashed'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Слот {slot.slot + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {slot.exists ? slot.name : 'Пустой слот'}
                    </span>
                    {slot.exists && slot.era && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                        {slot.era}
                      </span>
                    )}
                  </div>

                  {slot.exists ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" /> Год {slot.gameYear}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Жители: {slot.population}
                      </span>
                      <span className="flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-400" /> Королевства: {slot.kingdomsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> {formatDate(slot.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Готов к записи текущего состояния симуляции
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleSaveToSlot(slot.slot)}
                    disabled={savingSlot === slot.slot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-950 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{slot.exists ? 'Перезаписать' : 'Сохранить'}</span>
                  </button>

                  {slot.exists && (
                    <button
                      onClick={() => handleLoadFromSlot(slot.slot)}
                      disabled={loadingSlot === slot.slot}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Загрузить</span>
                    </button>
                  )}

                  {slot.exists && (
                    <button
                      onClick={() => handleDeleteSlot(slot.slot)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Очистить слот"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with JSON Import/Export */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportJson}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Экспорт в JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Импорт из JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
