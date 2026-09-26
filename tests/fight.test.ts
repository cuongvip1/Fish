import { describe, it, expect } from 'vitest';
import { makeFight } from '../src/game/state';
import { updateFight } from '../src/game/fight';
import { speciesById } from '../src/game/species';
import { mulberry32 } from '../src/game/math';
import type { Stats } from '../src/game/types';
import { DEFAULT_STATS } from '../src/game/economy';

const stats: Stats = DEFAULT_STATS;

describe('fight model', () => {
  it('sustained in-band reeling wins', () => {
    const species = speciesById('perch');
    const rng = mulberry32(9);
    const f = makeFight(rng);
    let out: string | null = null;
    for (let i = 0; i < 60 * 120 && !out; i++) {
      const reel = f.tension < 0.68; // pulse-reel to hold the green band
      out = updateFight(f, rng, species, stats, 1 / 60, reel);
    }
    expect(out).toBe('catch');
  });
  it('always-reeling snaps the line', () => {
    const species = speciesById('pike');
    const rng = mulberry32(5);
    const f = makeFight(rng);
    let out: string | null = null;
    for (let i = 0; i < 60 * 15 && !out; i++) {
      out = updateFight(f, rng, species, stats, 1 / 60, true);
    }
    expect(out).toBe('snap');
  });
  it('never reeling loses the fish', () => {
    const species = speciesById('perch');
    const rng = mulberry32(5);
    const f = makeFight(rng);
    let out: string | null = null;
    for (let i = 0; i < 60 * 15 && !out; i++) {
      out = updateFight(f, rng, species, stats, 1 / 60, false);
    }
    expect(out).toBe('escape');
  });
});
