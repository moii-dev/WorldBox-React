/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu, NewWorldSettings } from './components/ui/MainMenu';

export default function App() {
  const [settings, setSettings] = useState<NewWorldSettings | null>(null);

  if (!settings) {
    return <MainMenu onPlay={setSettings} />;
  }

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <GameCanvas settings={settings} />
    </main>
  );
}
