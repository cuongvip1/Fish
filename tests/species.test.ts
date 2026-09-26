import { describe, it, expect } from 'vitest';
import { SPECIES, speciesById, rollWeight } from '../src/game/species';
import { spawnFish } from '../src/game/state';
import { mulberry32 } from '../src/game/math';
import { WATER_R } from '../src/game/config';

describe('species', () => {
  it('has 8 species across 4 rarities', () => {
    expect(SPECIES.length).toBe(8);
    expect(new Set(SPECIES.map((s) => s.rarity)).size).toBe(4);
  });
  it('rollWeight stays in [wMin,wMax]', () => {
    const rng = mulberry32(1);
    for (const s of SPECIES) {
      for (let i = 0; i < 50; i++) {
        const w = rollWeight(rng, s);
        expect(w).toBeGreaterThanOrEqual(s.wMin);
        expect(w).toBeLessThanOrEqual(s.wMax);
      }
    }
  });
  it('spawnFish creates fish inside water radius, submerged', () => {
    const fish = spawnFish(mulberry32(3));
    expect(fish.length).toBeGreaterThan(0);
    for (const f of fish) {
      expect(Math.hypot(f.pos[0], f.pos[2])).toBeLessThanOrEqual(WATER_R);
      expect(f.pos[1]).toBeLessThan(0);
      expect(speciesById(f.speciesId)).toBeDefined();
    }
  });
});
