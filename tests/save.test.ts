import { describe, it, expect } from 'vitest';
import { defaultProfile, localAdapter } from '../src/save/adapter';
import { useGame } from '../src/game/store';

describe('save adapter', () => {
  it('defaultProfile is a fresh level-1 profile', () => {
    const p = defaultProfile();
    expect(p.level).toBe(1);
    expect(p.coins).toBe(0);
    expect(p.rodId).toBe('starter');
  });
  it('localAdapter is headless-safe', () => {
    expect(localAdapter.load()).toBeNull();
    expect(() => localAdapter.save(defaultProfile())).not.toThrow();
  });
  it('store hydrates defaults and ticks', () => {
    useGame.getState().hydrate();
    const st = useGame.getState();
    expect(st.profile.level).toBe(1);
    st.tick(1 / 60);
    expect(useGame.getState().sim.t).toBeGreaterThan(0);
  });
  it('store actions drive the sim', () => {
    useGame.getState().hydrate();
    useGame.getState().chargeStart();
    expect(useGame.getState().sim.phase).toBe('CHARGING');
    useGame.getState().chargeRelease();
    expect(useGame.getState().sim.phase).toBe('CASTING');
  });
  it('store rejects invalid purchases', () => {
    useGame.getState().hydrate();
    const before = useGame.getState().profile.coins;
    useGame.getState().buyUpgrade('reel'); // 0 coins → rejected
    expect(useGame.getState().profile.coins).toBe(before);
    expect(useGame.getState().profile.upgrades.reel).toBe(0);
  });
});
