'use client';

import { useGame } from '../game/store';
import { playSfx } from '../audio/manager';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function BitePrompt() {
  const phase = useGame((s) => s.sim.phase);
  const bite = useGame((s) => s.sim.bite);
  const t = useGame((s) => s.sim.t);
  const hook = useGame((s) => s.hook);
  const played = useRef(false);

  useEffect(() => {
    if (phase === 'BITE_WINDOW' && !played.current) {
      playSfx('bite');
      played.current = true;
      navigator.vibrate?.(120);
    }
    if (phase !== 'BITE_WINDOW') played.current = false;
  }, [phase]);

  if (phase !== 'BITE_WINDOW' || !bite) return null;
  const remain = Math.max(0, 1 - t / bite.deadline);

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 z-20"
        onPointerDown={hook}
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-x-0 top-[22%] flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            transition={{ scale: { repeat: Infinity, duration: 0.6 } }}
            className="rounded-3xl border-4 border-yellow-300 bg-black/60 px-8 py-4 text-center backdrop-blur-sm"
          >
            <div className="text-4xl">🐟</div>
            <div className="mt-1 text-2xl font-black uppercase tracking-widest text-yellow-300">
              Cắn câu!
            </div>
            <div className="mt-1 text-xs font-semibold text-white/80">Chạm ngay để móc!</div>
          </motion.div>
          <div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full bg-yellow-300" style={{ width: `${remain * 100}%` }} />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
