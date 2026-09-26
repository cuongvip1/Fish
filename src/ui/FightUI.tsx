'use client';

import { useGame } from '../game/store';
import { START_DEPTH } from '../game/config';
import { useEffect } from 'react';
import { startReelLoop, stopReelLoop } from '../audio/manager';

export default function FightUI() {
  const phase = useGame((s) => s.sim.phase);
  // primitive selectors — sim mutates FightState in place, so selecting the
  // object itself would freeze the gauge (Object.is skips re-renders)
  const tension = useGame((s) => s.sim.fight?.tension ?? 0);
  const remaining = useGame((s) => s.sim.fight?.remaining ?? START_DEPTH);
  const bursting = useGame((s) => (s.sim.fight?.burstT ?? 0) > 0);
  const stats = useGame((s) => s.stats);
  const reeling = useGame((s) => s.reeling);
  const setReeling = useGame((s) => s.setReeling);

  useEffect(() => {
    if (phase === 'FIGHTING' && reeling) startReelLoop();
    else stopReelLoop();
    return () => stopReelLoop();
  }, [phase, reeling]);

  if (phase !== 'FIGHTING') return null;

  const t = Math.min(1, tension);
  const progress = Math.max(0, 1 - remaining / START_DEPTH);
  const inBand = t >= stats.greenLo && t <= stats.greenHi;

  return (
    <div
      className="absolute inset-0 select-none"
      onPointerDown={() => setReeling(true)}
      onPointerUp={() => setReeling(false)}
      onPointerLeave={() => setReeling(false)}
      onPointerCancel={() => setReeling(false)}
      style={{ touchAction: 'none' }}
    >
      {/* tension gauge — right side */}
      <div className="absolute right-5 top-1/2 flex h-64 w-12 -translate-y-1/2 flex-col items-center">
        <div className="relative h-full w-5 overflow-hidden rounded-full border border-white/25 bg-black/50">
          <div
            className="absolute inset-x-0 bg-emerald-400/30"
            style={{ bottom: `${stats.greenLo * 100}%`, height: `${(stats.greenHi - stats.greenLo) * 100}%` }}
          />
          <div className="absolute inset-x-0 top-0 h-[10%] bg-red-500/40" />
          <div
            className={`absolute inset-x-0 h-2.5 rounded-full transition-none ${
              t > 0.9 ? 'bg-red-400 shadow-[0_0_12px_#f87171]' : inBand ? 'bg-emerald-300' : 'bg-cyan-300'
            }`}
            style={{ bottom: `calc(${t * 100}% - 5px)` }}
          />
        </div>
        <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/80">Căng dây</div>
      </div>

      {/* reel progress — bottom */}
      <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-1.5">
        {bursting && (
          <div className="animate-pulse rounded-full bg-red-500/80 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">
            ⚡ Cá giằng mạnh!
          </div>
        )}
        <div className="h-2.5 w-64 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="rounded-full bg-black/40 px-3 py-0.5 text-[11px] font-semibold text-white/85">
          {reeling ? 'Đang quay…' : 'Giữ để quay máy câu'}
        </div>
      </div>
    </div>
  );
}
