import { describe, it, expect } from 'vitest';
import { createGame, dismissResult, tick } from '../src/game/state';
import { makeFight } from '../src/game/state';
import { updateFight } from '../src/game/fight';
import { speciesById } from '../src/game/species';
import { mulberry32 } from '../src/game/math';
import { buyRod, DEFAULT_STATS } from '../src/game/economy';
import { defaultProfile } from '../src/save/adapter';
import { useGame } from '../src/game/store';
import { FISH_COUNT } from '../src/game/config';
import type { GameState, Stats } from '../src/game/types';

function run(s: GameState, secs: number, reeling = false) {
  for (let i = 0; i < Math.round(secs * 60); i++) tick(s, 1 / 60, { reeling });
}

describe('review fixes', () => {
  it('fish keep swimming outside WAITING (IDLE phase)', () => {
    const s = createGame(5);
    const before = s.fishes.map((f) => [...f.pos]);
    run(s, 2); // stays in IDLE — no cast
    const moved = s.fishes.some((f, i) => f.pos[0] !== before[i][0] || f.pos[2] !== before[i][2]);
    expect(moved).toBe(true);
  });

  it('caught fish respawn on result dismissal — lake never depletes', () => {
    const s = createGame(5);
    s.fishes[0].aiState = 'CAUGHT';
    s.phase = 'RESULT';
    s.result = { kind: 'caught', fish: s.fishes[0], coins: 10, exp: 5 };
    dismissResult(s);
    expect(s.fishes.filter((f) => f.aiState === 'CAUGHT').length).toBe(0);
    expect(s.fishes.length).toBe(FISH_COUNT);
    expect(s.fishes[0].aiState).toBe('SWIMMING');
  });

  it('higher tensionMax slows fish tension push', () => {
    const species = speciesById('pike');
    const weak: Stats = { ...DEFAULT_STATS, tensionMax: 100 };
    const strong: Stats = { ...DEFAULT_STATS, tensionMax: 200 };
    const t1 = mulberry32(3), t2 = mulberry32(3);
    const f1 = makeFight(t1), f2 = makeFight(t2);
    for (let i = 0; i < 120; i++) {
      updateFight(f1, t1, species, weak, 1 / 60, false);
      updateFight(f2, t2, species, strong, 1 / 60, false);
    }
    expect(f2.tension).toBeLessThan(f1.tension);
  });

  it('stale CHASE_BAIT reverts to SWIMMING when bobber is gone', () => {
    const s = createGame(7);
    s.fishes[0].aiState = 'CHASE_BAIT';
    s.phase = 'RESULT';
    s.result = { kind: 'missed', fish: null, coins: 0, exp: 0 };
    s.bobber = null;
    tick(s, 1 / 60, { reeling: false });
    expect(s.fishes[0].aiState).toBe('SWIMMING');
  });

  it('owned rods re-equip for free', () => {
    const p = defaultProfile();
    p.coins = 5000;
    p.level = 10;
    const withPro = buyRod(p, 'pro')!;
    expect(withPro.coins).toBe(5000 - 800);
    const backToStarter = buyRod(withPro, 'starter')!;
    expect(backToStarter.coins).toBe(4200); // free re-equip
    const backToPro = buyRod(backToStarter, 'pro')!;
    expect(backToPro.coins).toBe(4200); // already owned — free
    expect(backToPro.rodId).toBe('pro');
  });

  it('reeling resets when fight ends (no latch into next fight)', () => {
    useGame.getState().hydrate();
    const st = useGame.getState();
    st.setReeling(true);
    // force a resolved phase, then tick
    const sim = useGame.getState().sim;
    sim.phase = 'RESULT';
    sim.result = { kind: 'snap', fish: null, coins: 0, exp: 0 };
    st.tick(1 / 60);
    expect(useGame.getState().reeling).toBe(false);
  });
});
