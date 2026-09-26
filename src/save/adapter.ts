import type { Profile } from '../game/types';

const SAVE_KEY = 'uf3d_save_v1';

export function defaultProfile(): Profile {
  return {
    coins: 0,
    exp: 0,
    level: 1,
    rodId: 'starter',
    upgrades: { strength: 0, line: 0, reel: 0 },
    collection: {},
    totalCaught: 0,
  };
}

export interface SaveAdapter {
  load(): Profile | null;
  save(p: Profile): void;
}

export const localAdapter: SaveAdapter = {
  load() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Profile;
      // defensive merge so old saves missing new fields still work
      return { ...defaultProfile(), ...parsed, upgrades: { ...defaultProfile().upgrades, ...parsed.upgrades } };
    } catch {
      return null;
    }
  },
  save(p: Profile) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(SAVE_KEY, JSON.stringify(p));
    } catch {
      // storage full / private mode — non-fatal
    }
  },
};
