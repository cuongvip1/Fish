import { describe, it, expect } from 'vitest';
import { SPECIES, speciesById } from '../src/game/species';
import {
  rewardFor,
  levelForExp,
  computeStats,
  buyUpgrade,
  buyRod,
  applyCatch,
  upgradeCost,
  RODS,
} from '../src/game/economy';
import { defaultProfile } from '../src/save/adapter';
import type { Profile } from '../src/game/types';

const perch = speciesById('perch');

function richProfile(): Profile {
  const p = defaultProfile();
  p.coins = 100000;
  return p;
}

describe('economy', () => {
  it('reward scales with weight and rarity', () => {
    const small = rewardFor(perch, perch.wMin);
    const big = rewardFor(perch, perch.wMax);
    expect(big.coins).toBeGreaterThan(small.coins);
    const legendary = SPECIES.find((s) => s.rarity === 'legendary')!;
    expect(rewardFor(legendary, legendary.wMax).coins).toBeGreaterThan(big.coins);
  });
  it('level thresholds increase monotonically', () => {
    expect(levelForExp(0)).toBe(1);
    const l5 = levelForExp(2000);
    expect(l5).toBeGreaterThan(1);
    expect(levelForExp(10000)).toBeGreaterThanOrEqual(l5);
  });
  it('rejects purchases without funds or past tier cap', () => {
    const p = defaultProfile();
    expect(buyUpgrade(p, 'reel')).toBeNull(); // 0 coins
    let q = richProfile();
    for (let i = 0; i < 5; i++) q = buyUpgrade(q, 'reel')!;
    expect(buyUpgrade(q, 'reel')).toBeNull(); // maxed
  });
  it('rejects rod purchase below level gate', () => {
    const p = richProfile();
    expect(buyRod(p, 'master')).toBeNull(); // needs level 8
    p.level = 8;
    const q = buyRod(p, 'master');
    expect(q).not.toBeNull();
    expect(q!.rodId).toBe('master');
  });
  it('applyCatch updates coins, exp, collection', () => {
    const p = applyCatch(defaultProfile(), perch, 1.0);
    expect(p.coins).toBeGreaterThan(0);
    expect(p.collection.perch.count).toBe(1);
    expect(p.collection.perch.maxWeight).toBe(1.0);
    expect(p.totalCaught).toBe(1);
  });
  it('computeStats improves with upgrades', () => {
    const base = computeStats(defaultProfile());
    const p = richProfile();
    const upgraded = computeStats(buyUpgrade(p, 'strength')!);
    expect(upgraded.tensionMax).toBeGreaterThan(base.tensionMax);
  });
  it('upgradeCost grows 3x per tier', () => {
    expect(upgradeCost('strength', 1)).toBe(upgradeCost('strength', 0) * 3);
  });
  it('every rod is defined', () => {
    expect(RODS.length).toBe(3);
    expect(RODS.map((r) => r.id)).toEqual(['starter', 'pro', 'master']);
  });
});
