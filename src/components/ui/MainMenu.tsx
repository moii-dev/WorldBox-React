import React, { useState } from 'react';
import { Dices, Play } from 'lucide-react';
import worldMenuBackground from '../../assets/world-menu-background.png';

export type WorldSize = 'small' | 'medium' | 'large';

export interface NewWorldSettings {
  name: string;
  size: WorldSize;
  maxPeople: number;
  seed: number;
}

interface MainMenuProps {
  onPlay: (settings: NewWorldSettings) => void;
}

const SIZE_OPTIONS: Array<{ id: WorldSize; label: string; description: string }> = [
  { id: 'small', label: 'Малый', description: '128 × 128' },
  { id: 'medium', label: 'Средний', description: '256 × 256' },
  { id: 'large', label: 'Большой', description: '384 × 384' },
];

const newSeed = () => Math.floor(Math.random() * 1_000_000_000);

export const MainMenu: React.FC<MainMenuProps> = ({ onPlay }) => {
  const [settings, setSettings] = useState<NewWorldSettings>({
    name: 'Новый мир',
    size: 'medium',
    maxPeople: 500,
    seed: newSeed(),
  });

  const update = <K extends keyof NewWorldSettings>(key: K, value: NewWorldSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const startGame = (event: React.FormEvent) => {
    event.preventDefault();
    onPlay({
      ...settings,
      name: settings.name.trim() || 'Новый мир',
      maxPeople: Math.max(6, Math.min(10000, Math.floor(settings.maxPeople || 6))),
      seed: Math.max(0, Math.floor(settings.seed || 0)),
    });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071b2b] px-4 py-8 font-sans text-white">
      <div
        className="menu-scene"
        style={{ backgroundImage: `url(${worldMenuBackground})` }}
        aria-hidden="true"
      />
      <div className="menu-scene-vignette" aria-hidden="true" />
      <div className="menu-scene-glow" aria-hidden="true" />

      <section className="relative z-10 w-full max-w-[590px] rounded-[26px] border border-slate-500/50 bg-slate-950/85 p-5 shadow-2xl shadow-black/60 backdrop-blur-md sm:p-7">
        <div className="mb-7 text-center">
          <h1 className="menu-logo text-5xl font-black tracking-tight text-amber-300 sm:text-6xl">WorldBox</h1>
          <p className="mt-2 text-sm text-slate-300">Создайте мир и наблюдайте за его историей</p>
        </div>

        <form className="space-y-5" onSubmit={startGame}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-100">Имя мира</span>
            <input
              id="world-name"
              value={settings.name}
              onChange={(event) => update('name', event.target.value)}
              maxLength={40}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-100">Размер мира</legend>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => update('size', option.id)}
                  className={`rounded-xl border px-2 py-3 text-center transition ${
                    settings.size === option.id
                      ? 'border-amber-300 bg-amber-400/20 text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,.35)]'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                  aria-pressed={settings.size === option.id}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{option.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-100">Максимум людей</span>
            <input
              id="max-people"
              type="number"
              min="6"
              max="10000"
              value={settings.maxPeople}
              onChange={(event) => update('maxPeople', Number(event.target.value))}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-100">Сид</span>
            <div className="flex gap-2">
              <input
                id="world-seed"
                type="number"
                min="0"
                value={settings.seed}
                onChange={(event) => update('seed', Number(event.target.value))}
                className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              <button
                id="randomize-seed"
                type="button"
                onClick={() => update('seed', newSeed())}
                className="grid w-12 place-items-center rounded-xl border border-slate-600 bg-slate-800 text-slate-200 transition hover:border-amber-300 hover:text-amber-200"
                title="Сгенерировать новый сид"
                aria-label="Сгенерировать новый сид"
              >
                <Dices className="h-5 w-5" />
              </button>
            </div>
          </label>

          <button
            id="start-game"
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-400 px-5 py-3.5 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Play className="h-5 w-5 fill-current" />
            Играть
          </button>
        </form>
      </section>
    </main>
  );
};
