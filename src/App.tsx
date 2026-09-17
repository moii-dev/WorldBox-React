/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <GameCanvas />
    </main>
  );
}
