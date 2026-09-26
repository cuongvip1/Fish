import type { FightState, Stats } from './types';
import type { Species } from './species';
import {
  REEL_FORCE,
  TENSION_DRAIN,
  SLACK_TIME,
  BURST_PERIOD,
  BURST_LEN,
  BURST_MULT,
} from './config';
import { clamp, randRange } from './math';

/**
 * Advance the fight by dt seconds.
 * Returns 'catch' | 'snap' | 'escape' when resolved, null while ongoing.
 * Tension is normalized 0..1 (fraction of stats.tensionMax).
 */
export function updateFight(
  f: FightState,
  rng: () => number,
  species: Species,
  stats: Stats,
  dt: number,
  reeling: boolean
): 'catch' | 'snap' | 'escape' | null {
  // burst scheduler
  f.nextBurst -= dt;
  if (f.nextBurst <= 0) {
    f.burstT = randRange(rng, BURST_LEN);
    f.nextBurst = randRange(rng, BURST_PERIOD);
  }
  const bursting = f.burstT > 0;
  if (bursting) f.burstT -= dt;

  // tension dynamics
  const reelGain = reeling ? REEL_FORCE : 0;
  const fishPull = species.power * 0.04 + (bursting ? species.power * BURST_MULT * 0.06 : 0);
  f.tension = clamp(f.tension + (reelGain + fishPull - TENSION_DRAIN) * dt, 0, 1.2);

  // reel progress only in the green band
  if (f.tension >= stats.greenLo && f.tension <= stats.greenHi) {
    f.remaining -= stats.reelSpeed * 1.4 * dt;
  }

  // outcomes
  if (f.remaining <= 0) return 'catch';
  if (f.tension >= 1) return 'snap';
  if (f.tension < stats.greenLo) {
    f.slackT += dt;
    if (f.slackT >= SLACK_TIME) return 'escape';
  } else {
    f.slackT = 0;
  }
  return null;
}
