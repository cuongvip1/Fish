import { describe, it, expect } from 'vitest';
import { createGame, startCharge, releaseCast, hook, dismissResult, tick } from '../src/game/state';
import { CAST_DUR } from '../src/game/config';
import type { GameState } from '../src/game/types';

function run(s: GameState, secs: number, reeling = false) {
  for (let i = 0; i < Math.round(secs * 60); i++) tick(s, 1 / 60, { reeling });
}

function toBiteOrResult(s: GameState, maxSecs = 60) {
  for (let i = 0; i < maxSecs; i++) {
    run(s, 1);
    if (s.phase !== 'WAITING') return;
  }
}

describe('state machine', () => {
  it('full cast→wait→bite path is reachable', () => {
    const s = createGame(42);
    startCharge(s);
    run(s, 0.5);
    releaseCast(s);
    expect(s.phase).toBe('CASTING');
    run(s, CAST_DUR + 0.1);
    expect(s.phase).toBe('WAITING');
    expect(s.bobber).not.toBeNull();
    toBiteOrResult(s);
    expect(['BITE_WINDOW', 'FIGHTING', 'RESULT']).toContain(s.phase);
  });
  it('bite arrives within 20s of cast (pacing fallback)', () => {
    for (const seed of [2, 5, 11, 23]) {
      const s = createGame(seed);
      startCharge(s);
      run(s, 0.5);
      releaseCast(s);
      run(s, CAST_DUR + 0.2);
      let waitSecs = 0;
      while (s.phase === 'WAITING' && waitSecs < 20) {
        run(s, 1);
        waitSecs++;
      }
      expect(s.phase, `seed ${seed}`).not.toBe('WAITING');
    }
  });
  it('double hook in same window is a no-op', () => {
    const s = createGame(42);
    startCharge(s);
    run(s, 0.5);
    releaseCast(s);
    toBiteOrResult(s);
    if (s.phase === 'BITE_WINDOW') {
      hook(s);
      const id = s.hookedFishId;
      hook(s);
      expect(s.hookedFishId).toBe(id);
      expect(s.phase).toBe('FIGHTING');
    }
  });
  it('bite window expiry produces missed result', () => {
    const s = createGame(42);
    startCharge(s);
    run(s, 0.5);
    releaseCast(s);
    while (s.phase === 'WAITING' || s.phase === 'CASTING') run(s, 1);
    if (s.phase === 'BITE_WINDOW') {
      run(s, 4);
      expect(s.phase).toBe('RESULT');
      expect(s.result?.kind).toBe('missed');
    }
  });
  it('dismissResult returns to IDLE', () => {
    const s = createGame(42);
    s.phase = 'RESULT';
    s.result = { kind: 'missed', fish: null, coins: 0, exp: 0 };
    dismissResult(s);
    expect(s.phase).toBe('IDLE');
    expect(s.bobber).toBeNull();
  });
  it('illegal transitions are ignored', () => {
    const s = createGame(1);
    hook(s);
    expect(s.phase).toBe('IDLE');
    releaseCast(s);
    expect(s.phase).toBe('IDLE');
    dismissResult(s);
    expect(s.phase).toBe('IDLE');
  });
  it('charge power oscillates 0-100', () => {
    const s = createGame(1);
    startCharge(s);
    let min = 100, max = 0;
    for (let i = 0; i < 60 * 5; i++) {
      tick(s, 1 / 60, { reeling: false });
      min = Math.min(min, s.charge.power);
      max = Math.max(max, s.charge.power);
    }
    expect(max).toBeGreaterThan(95);
    expect(min).toBeLessThan(5);
  });
});
