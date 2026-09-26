import { describe, it, expect } from 'vitest';
import { mulberry32, clamp, ballistic, pickWeighted } from '../src/game/math';
import type { Vec3 } from '../src/game/types';

const ORIGIN: Vec3 = [0, 0, 0];
const TARGET: Vec3 = [10, 0, 0];

describe('math', () => {
  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
    const c = mulberry32(43);
    expect(a() === c()).toBe(false);
  });
  it('clamp bounds values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('ballistic hits endpoints at t=0 and t=1 and apex at t=0.5', () => {
    expect(ballistic(ORIGIN, TARGET, 0, 5)).toEqual(ORIGIN);
    expect(ballistic(ORIGIN, TARGET, 1, 5)).toEqual(TARGET);
    expect(ballistic(ORIGIN, TARGET, 0.5, 5)[1]).toBeCloseTo(5, 5);
  });
  it('pickWeighted respects weights', () => {
    const rng = mulberry32(7);
    expect(pickWeighted(rng, [{ w: 0 }, { w: 1 }, { w: 0 }])).toBe(1);
    let zeros = 0;
    for (let i = 0; i < 200; i++) {
      if (pickWeighted(rng, [{ w: 1 }, { w: 3 }]) === 0) zeros++;
    }
    expect(zeros).toBeGreaterThan(10);
    expect(zeros).toBeLessThan(120);
  });
});
