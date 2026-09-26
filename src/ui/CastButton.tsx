'use client';

import { useGame } from '../game/store';
import { playSfx } from '../audio/manager';
import { motion } from 'framer-motion';

export default function CastButton() {
  const phase = useGame((s) => s.sim.phase);
  const power = useGame((s) => s.sim.charge.power);
  const chargeStart = useGame((s) => s.chargeStart);
  const chargeRelease = useGame((s) => s.chargeRelease);

  const visible = phase === 'IDLE' || phase === 'CHARGING';
  if (!visible) return null;

  const charging = phase === 'CHARGING';
  const p = Math.round(power);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2">
      {charging && (
        <div className="h-2.5 w-52 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${p}%`,
              background: `linear-gradient(90deg,#4ade80,${p > 60 ? '#facc15' : '#4ade80'},${p > 85 ? '#ef4444' : '#4ade80'})`,
            }}
          />
        </div>
      )}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onPointerDown={() => { playSfx('click'); chargeStart(); }}
        onPointerUp={chargeRelease}
        onPointerLeave={() => charging && chargeRelease()}
        className="pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-cyan-300/70 bg-gradient-to-b from-cyan-500 to-cyan-700 text-white shadow-lg shadow-cyan-900/50 active:from-cyan-600"
      >
        <span className="text-2xl leading-none">🎣</span>
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {charging ? 'Buông!' : 'Giữ'}
        </span>
      </motion.button>
      <div className="text-[11px] font-medium text-white/70">
        {charging ? `Lực ${p}%` : 'Giữ để tung lưỡi câu'}
      </div>
    </div>
  );
}
