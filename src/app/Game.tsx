'use client';

import { useEffect } from 'react';
import GameCanvas from '../scene/GameCanvas';
import HUD from '../ui/HUD';
import CastButton from '../ui/CastButton';
import FightUI from '../ui/FightUI';
import BitePrompt from '../ui/BitePrompt';
import CatchCard from '../ui/CatchCard';
import { useGame } from '../game/store';
import { startWaterLoop, playSfx } from '../audio/manager';
import { localAdapter } from '../save/adapter';
import { useProfileQuery } from '../save/queries';

// dev-only handle for automated testing
declare global {
  interface Window { __game?: typeof useGame }
}
if (process.env.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') window.__game = useGame;
}

const seenEffects = new Set<number>();

export default function Game() {
  const hydrate = useGame((s) => s.hydrate);
  const profile = useProfileQuery();

  useEffect(() => {
    if (profile.data) hydrate(profile.data);
  }, [profile.data, hydrate]);

  useEffect(() => {
    // audio needs a user gesture; start ambience on first interaction
    const kick = () => startWaterLoop();
    window.addEventListener('pointerdown', kick, { once: true });
    return () => window.removeEventListener('pointerdown', kick);
  }, []);

  // SFX for sim-spawned effects (splash on cast landing, ring handled by BitePrompt)
  useEffect(() => {
    return useGame.subscribe((state) => {
      for (const e of state.sim.effects) {
        if (seenEffects.has(e.id)) continue;
        seenEffects.add(e.id);
        if (e.kind === 'splash' || e.kind === 'ripple') playSfx('splash');
      }
      if (seenEffects.size > 200) seenEffects.clear();
    });
  }, []);

  // keyboard: Space — hook during bite window, reel during fight, charge otherwise
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat) return;
      ev.preventDefault();
      const st = useGame.getState();
      const p = st.sim.phase;
      if (p === 'IDLE') st.chargeStart();
      else if (p === 'BITE_WINDOW') st.hook();
      else if (p === 'FIGHTING') st.setReeling(true);
      else if (p === 'RESULT') st.dismissResult();
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return;
      const st = useGame.getState();
      if (st.sim.phase === 'CHARGING') st.chargeRelease();
      st.setReeling(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // flush any pending save when the tab is hidden/closed
  useEffect(() => {
    const flush = () => localAdapter.save(useGame.getState().profile);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return (
    <div className="fixed inset-0">
      <GameCanvas />
      <HUD />
      <CastButton />
      <FightUI />
      <BitePrompt />
      <CatchCard />
    </div>
  );
}
