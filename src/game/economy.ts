import type { Profile, Stats } from './types';
import type { Species } from './species';
import { GREEN_BAND } from './config';

export const DEFAULT_STATS: Stats = {
  tensionMax: 100,
  reelSpeed: 1,
  greenLo: GREEN_BAND[0],
  greenHi: GREEN_BAND[1],
};

export interface RodDef {
  id: string;
  name: string;
  minLevel: number;
  price: number;
  stats: { strength: number; reel: number };
}

export const RODS: RodDef[] = [
  { id: 'starter', name: 'Starter Rod', minLevel: 1, price: 0, stats: { strength: 1.0, reel: 1.0 } },
  { id: 'pro', name: 'Pro Rod', minLevel: 4, price: 800, stats: { strength: 1.35, reel: 1.2 } },
  { id: 'master', name: 'Master Rod', minLevel: 8, price: 3500, stats: { strength: 1.8, reel: 1.45 } },
];

export type UpgradeId = 'strength' | 'line' | 'reel';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  tiers: number;
  baseCost: number;
  desc: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'strength', name: 'Rod Strength', tiers: 5, baseCost: 150, desc: '+15% line tension capacity per tier' },
  { id: 'line', name: 'Braided Line', tiers: 5, baseCost: 120, desc: 'Widens the safe tension band per tier' },
  { id: 'reel', name: 'Reel Speed', tiers: 5, baseCost: 180, desc: '+12% reel-in speed per tier' },
];

const RARITY_MULT: Record<Species['rarity'], number> = {
  common: 1,
  uncommon: 1.6,
  rare: 3,
  legendary: 8,
};

export function rewardFor(species: Species, weight: number): { coins: number; exp: number } {
  const weightRatio = weight / species.wMax;
  return {
    coins: Math.round(species.coins * (0.5 + 0.5 * weightRatio) * RARITY_MULT[species.rarity]),
    exp: species.exp,
  };
}

export function expForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

export function levelForExp(exp: number): number {
  let level = 1;
  let need = expForLevel(level);
  let acc = 0;
  while (acc + need <= exp && level < 99) {
    acc += need;
    level++;
    need = expForLevel(level);
  }
  return level;
}

export function rodById(id: string): RodDef {
  return RODS.find((r) => r.id === id) ?? RODS[0];
}

export function computeStats(p: Profile): Stats {
  const rod = rodById(p.rodId);
  return {
    tensionMax: 100 * (1 + 0.15 * p.upgrades.strength) * rod.stats.strength,
    reelSpeed: (1 + 0.12 * p.upgrades.reel) * rod.stats.reel,
    greenLo: Math.max(0.05, GREEN_BAND[0] - 0.02 * p.upgrades.line),
    greenHi: Math.min(0.95, GREEN_BAND[1] + 0.02 * p.upgrades.line),
  };
}

export function applyCatch(p: Profile, species: Species, weight: number): Profile {
  const reward = rewardFor(species, weight);
  const prev = p.collection[species.id];
  const collection = {
    ...p.collection,
    [species.id]: {
      count: (prev?.count ?? 0) + 1,
      maxWeight: Math.max(prev?.maxWeight ?? 0, weight),
    },
  };
  const exp = p.exp + reward.exp;
  return {
    ...p,
    coins: p.coins + reward.coins,
    exp,
    level: levelForExp(exp),
    collection,
    totalCaught: p.totalCaught + 1,
  };
}

export function upgradeCost(id: UpgradeId, tier: number): number {
  const def = UPGRADES.find((u) => u.id === id)!;
  return Math.round(def.baseCost * Math.pow(3, tier));
}

export function canAfford(p: Profile, cost: number): boolean {
  return p.coins >= cost;
}

/** Returns a new profile, or null if the purchase is rejected. */
export function buyUpgrade(p: Profile, id: UpgradeId): Profile | null {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return null;
  const tier = p.upgrades[id];
  if (tier >= def.tiers) return null;
  const cost = upgradeCost(id, tier);
  if (p.coins < cost) return null;
  return {
    ...p,
    coins: p.coins - cost,
    upgrades: { ...p.upgrades, [id]: tier + 1 },
  };
}

/** Returns a new profile, or null if the purchase is rejected. */
export function buyRod(p: Profile, id: string): Profile | null {
  const rod = RODS.find((r) => r.id === id);
  if (!rod) return null;
  if (p.rodId === id) return null;
  if (p.level < rod.minLevel) return null;
  if (p.coins < rod.price) return null;
  return { ...p, coins: p.coins - rod.price, rodId: id };
}
