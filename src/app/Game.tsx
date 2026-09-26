'use client';

import { useEffect } from 'react';
import GameCanvas from '../scene/GameCanvas';
import HUD from '../ui/HUD';
import CastButton from '../ui/CastButton';
import FightUI from '../ui/FightUI';
import BitePrompt from '../ui/BitePrompt';
import CatchCard from '../ui/CatchCard';
import Providers from '../ui/Providers';
import { useGame } from '../game/store';
import { startWaterLoop } from '../audio/manager';
import { useProfileQuery } from '../save/queries';

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
    <Providers>
      <div className="fixed inset-0">
        <GameCanvas />
        <HUD />
        <CastButton />
        <FightUI />
        <BitePrompt />
        <CatchCard />
      </div>
    </Providers>
  );
}
