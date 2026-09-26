import type { Vec3 } from './types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist2d(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Parabolic interpolation from→to; apex height h above the chord at t=0.5. */
export function ballistic(from: Vec3, to: Vec3, t: number, h: number): Vec3 {
  const p = lerp3(from, to, clamp(t, 0, 1));
  p[1] += 4 * h * t * (1 - t);
  return p;
}

export function pickWeighted(rng: () => number, items: { w: number }[]): number {
  let total = 0;
  for (const it of items) total += it.w;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= items[i].w;
    if (roll <= 0) return i;
  }
  return items.length - 1;
}

export function randRange(rng: () => number, range: [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}
