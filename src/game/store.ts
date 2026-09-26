import { create } from 'zustand';
import type { GameState, Profile, Stats } from './types';
import { createGame, tick as simTick, startCharge, releaseCast, hook, dismissResult } from './state';
import { computeStats, buyUpgrade as ecoBuyUpgrade, buyRod as ecoBuyRod, applyCatch, type UpgradeId } from './economy';
import { speciesById } from './species';
import { defaultProfile, localAdapter } from '../save/adapter';

export interface StoreState {
  sim: GameState;
  profile: Profile;
  stats: Stats;
  reeling: boolean;
  hydrated: boolean;
  tick(dt: number): void;
  chargeStart(): void;
  chargeRelease(): void;
  hook(): void;
  setReeling(v: boolean): void;
  hydrate(loaded?: Profile): void;
  dismissResult(): void;
  buyUpgrade(id: UpgradeId): void;
  buyRod(id: string): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistSoon(p: Profile) {
  clearTimeout(saveTimer ?? undefined);
  saveTimer = setTimeout(() => localAdapter.save(p), 400);
}

export const useGame = create<StoreState>()((set, get) => ({
  sim: createGame(),
  profile: defaultProfile(),
  stats: computeStats(defaultProfile()),
  reeling: false,
  hydrated: false,

  hydrate(loaded?: Profile) {
    if (get().hydrated) return;
    const p = loaded ?? localAdapter.load() ?? defaultProfile();
    set({ profile: p, stats: computeStats(p), hydrated: true });
  },

  tick(dt) {
    const { sim, reeling, stats, profile } = get();
    simTick(sim, dt, { reeling }, stats);
    // credit a fresh catch exactly once
    if (sim.result?.kind === 'caught' && sim.result.fish && !sim.result.consumed) {
      sim.result.consumed = true;
      const sp = speciesById(sim.result.fish.speciesId);
      const p = applyCatch(profile, sp, sim.result.fish.weight);
      persistSoon(p);
      set({ profile: p, stats: computeStats(p) });
    }
    set({ sim: { ...sim }, reeling: sim.phase === 'FIGHTING' ? get().reeling : false });
  },

  chargeStart() {
    const { sim } = get();
    startCharge(sim);
    set({ sim: { ...sim } });
  },

  chargeRelease() {
    const { sim } = get();
    releaseCast(sim);
    set({ sim: { ...sim } });
  },

  hook() {
    const { sim } = get();
    hook(sim);
    set({ sim: { ...sim } });
  },

  setReeling(v) {
    set({ reeling: v });
  },

  dismissResult() {
    const { sim } = get();
    dismissResult(sim);
    set({ sim: { ...sim } });
  },

  buyUpgrade(id) {
    const { profile } = get();
    const next = ecoBuyUpgrade(profile, id);
    if (!next) return;
    persistSoon(next);
    set({ profile: next, stats: computeStats(next) });
  },

  buyRod(id) {
    const { profile } = get();
    const next = ecoBuyRod(profile, id);
    if (!next) return;
    persistSoon(next);
    set({ profile: next, stats: computeStats(next) });
  },
}));

