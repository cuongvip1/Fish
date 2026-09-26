'use client';

import { useGame } from '../game/store';
import { speciesById } from '../game/species';
import { playSfx } from '../audio/manager';
import { useEffect, useRef } from 'react';
import type { CatchResult } from '../game/types';
import { motion, AnimatePresence } from 'framer-motion';

const RARITY_STYLE: Record<string, { label: string; cls: string }> = {
  common: { label: 'Thường', cls: 'bg-slate-500/70 text-slate-100' },
  uncommon: { label: 'Không phổ biến', cls: 'bg-emerald-600/80 text-emerald-50' },
  rare: { label: 'Hiếm', cls: 'bg-blue-600/80 text-blue-50' },
  legendary: { label: 'Huyền thoại', cls: 'bg-amber-500/90 text-amber-950' },
};

export default function CatchCard() {
  const sim = useGame((s) => s.sim);
  const dismissResult = useGame((s) => s.dismissResult);
  // play result SFX exactly once per result object (identity, not sim.t
  // which increments every tick while the card is open)
  const playedRef = useRef<CatchResult | null>(null);
  useEffect(() => {
    if (sim.phase !== 'RESULT' || !sim.result) return;
    if (playedRef.current === sim.result) return;
    playedRef.current = sim.result;
    if (sim.result.kind === 'caught') playSfx('catch');
    else if (sim.result.kind === 'snap') playSfx('snap');
    else playSfx('splash');
  }, [sim.phase, sim.result]);

  if (sim.phase !== 'RESULT' || !sim.result) return null;
  const r = sim.result;
  const sp = r.fish ? speciesById(r.fish.speciesId) : null;
  const rarity = sp ? RARITY_STYLE[sp.rarity] : null;

  return (
    <AnimatePresence>
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30">
        <motion.div
          initial={{ scale: 0.6, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="pointer-events-auto w-72 rounded-3xl border border-white/15 bg-gradient-to-b from-slate-800/95 to-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-md"
        >
          {r.kind === 'caught' && sp ? (
            <>
              <div
                className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full text-5xl"
                style={{ background: `radial-gradient(circle, ${sp.colors[0]}55, transparent)` }}
              >
                🐟
              </div>
              <div className="text-xl font-black text-white">{sp.name}</div>
              <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide ${rarity!.cls}`}>
                {rarity!.label}
              </span>
              <div className="mt-3 text-3xl font-black text-white tabular-nums">
                {r.fish!.weight.toFixed(2)} <span className="text-base font-semibold text-white/60">kg</span>
              </div>
              <div className="mt-3 flex justify-center gap-3">
                <span className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-sm font-bold text-amber-300">
                  +{r.coins} 🪙
                </span>
                <span className="rounded-xl bg-cyan-500/20 px-3 py-1.5 text-sm font-bold text-cyan-300">
                  +{r.exp} EXP
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-5xl">
                {r.kind === 'snap' ? '💥' : r.kind === 'escape' ? '🌊' : '😅'}
              </div>
              <div className="text-lg font-black text-white">
                {r.kind === 'snap' ? 'Đứt dây!' : r.kind === 'escape' ? 'Cá thoát mất…' : 'Hụt rồi!'}
              </div>
              <div className="mt-1 text-sm text-white/60">
                {r.kind === 'snap'
                  ? 'Giảm lực kéo khi dây quá căng.'
                  : r.kind === 'escape'
                    ? 'Giữ dây luôn căng — đừng để trùng quá lâu.'
                    : 'Chạm nhanh hơn khi cá cắn.'}
              </div>
            </>
          )}
          <button
            onClick={dismissResult}
            className="mt-5 w-full rounded-2xl bg-cyan-500 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-cyan-400 active:scale-95"
          >
            Tiếp tục
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
