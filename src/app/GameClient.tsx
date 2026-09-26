'use client';

import dynamic from 'next/dynamic';
import Providers from '../ui/Providers';

const Game = dynamic(() => import('./Game'), { ssr: false });

export default function GameClient() {
  return (
    <Providers>
      <Game />
    </Providers>
  );
}
