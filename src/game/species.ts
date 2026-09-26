import type { Vec3 } from './types';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Species {
  id: string;
  name: string;
  rarity: Rarity;
  /** fight strength multiplier */
  power: number;
  wMin: number;
  wMax: number;
  coins: number;
  exp: number;
  colors: [string, string];
  /** bite probability weight 0..1 */
  attractP: number;
  speed: number;
  /** bite window seconds [min,max] */
  biteWin: [number, number];
}

export const SPECIES: Species[] = [
  { id: 'minnow', name: 'Minnow', rarity: 'common', power: 0.35, wMin: 0.02, wMax: 0.08, coins: 2, exp: 3, colors: ['#7fb8d4', '#e8f1f5'], attractP: 0.85, speed: 2.4, biteWin: [1.9, 2.5] },
  { id: 'bluegill', name: 'Bluegill', rarity: 'common', power: 0.45, wMin: 0.1, wMax: 0.4, coins: 4, exp: 5, colors: ['#5a9e6f', '#d8ecd0'], attractP: 0.7, speed: 2.0, biteWin: [1.7, 2.3] },
  { id: 'perch', name: 'Perch', rarity: 'uncommon', power: 0.55, wMin: 0.2, wMax: 0.8, coins: 8, exp: 8, colors: ['#d4b04a', '#f0e6c0'], attractP: 0.55, speed: 2.2, biteWin: [1.5, 2.1] },
  { id: 'bass', name: 'Bass', rarity: 'uncommon', power: 0.8, wMin: 0.5, wMax: 2.5, coins: 15, exp: 15, colors: ['#4a7c59', '#cfe0d0'], attractP: 0.45, speed: 2.6, biteWin: [1.4, 2.0] },
  { id: 'pike', name: 'Pike', rarity: 'rare', power: 1.1, wMin: 1.0, wMax: 5.0, coins: 40, exp: 35, colors: ['#3d5a45', '#b8ccab'], attractP: 0.3, speed: 3.0, biteWin: [1.1, 1.7] },
  { id: 'catfish', name: 'Catfish', rarity: 'rare', power: 1.25, wMin: 1.5, wMax: 8.0, coins: 55, exp: 45, colors: ['#5a5a6e', '#c9c3b8'], attractP: 0.28, speed: 1.8, biteWin: [1.0, 1.6] },
  { id: 'koi', name: 'Koi', rarity: 'legendary', power: 0.9, wMin: 0.5, wMax: 3.0, coins: 90, exp: 80, colors: ['#e8843c', '#f7f0e0'], attractP: 0.18, speed: 2.5, biteWin: [0.9, 1.4] },
  { id: 'golden', name: 'Golden Carp', rarity: 'legendary', power: 1.5, wMin: 0.8, wMax: 4.0, coins: 150, exp: 120, colors: ['#f0c33c', '#fff4c0'], attractP: 0.12, speed: 3.2, biteWin: [0.8, 1.2] },
];

const BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function speciesById(id: string): Species {
  const s = BY_ID[id];
  if (!s) throw new Error(`unknown species: ${id}`);
  return s;
}

/** Bias toward the light end: rng² weights small weights. */
export function rollWeight(rng: () => number, s: Species): number {
  return s.wMin + (s.wMax - s.wMin) * rng() * rng();
}

export function randomPointInWater(rng: () => number, radius: number, depth: [number, number]): Vec3 {
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * radius;
  return [Math.cos(a) * r, -(depth[0] + rng() * (depth[1] - depth[0])), Math.sin(a) * r];
}
