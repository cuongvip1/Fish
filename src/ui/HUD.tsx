'use client';

import { useGame } from '../game/store';
import { expForLevel } from '../game/economy';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Panels from './Panels';

export default function HUD() {
  const profile = useGame((s) => s.profile);
  const [panel, setPanel] = useState<'collection' | 'shop' | null>(null);

  // exp progress within current level
  let acc = 0;
  for (let l = 1; l < profile.level; l++) acc += expForLevel(l);
  const cur = profile.exp - acc;
  const need = expForLevel(profile.level);
  const pct = Math.min(100, Math.round((cur / need) * 100));

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4">
        <div className="pointer-events-auto rounded-2xl bg-black/45 px-4 py-2 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Lv {profile.level}
          </div>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-cyan-400"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/45 px-4 py-2 backdrop-blur-sm">
            <span className="text-lg">🪙</span>
            <span className="text-sm font-bold text-amber-300 tabular-nums">{profile.coins}</span>
          </div>
          <button
            onClick={() => setPanel(panel === 'collection' ? null : 'collection')}
            className="pointer-events-auto rounded-2xl bg-black/45 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            📖 {profile.totalCaught}
          </button>
          <button
            onClick={() => setPanel(panel === 'shop' ? null : 'shop')}
            className="pointer-events-auto rounded-2xl bg-black/45 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            🛒 Shop
          </button>
        </div>
      </div>
      <Panels open={panel} onClose={() => setPanel(null)} />
    </>
  );
}
