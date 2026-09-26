'use client';

import { useEffect } from 'react';
import GameCanvas from '../scene/GameCanvas';
import HUD from '../ui/HUD';
import CastButton from '../ui/CastButton';
import FightUI from '../ui/FightUI';
import BitePrompt from '../ui/BitePrompt';
import CatchCard from '../ui/CatchCard';
import { useGame } from '../game/store';
import { startWaterLoop } from '../audio/manager';
import { useProfileQuery } from '../save/queries';

// dev-only handle for automated testing
declare global {
  interface Window { __game?: typeof useGame }
}
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line react-hooks/globals
  if (typeof window !== 'undefined') window.__game = useGame;
}

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
