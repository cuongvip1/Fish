import type { Fish, GameState, Vec3 } from './types';
import { FISH_COUNT, WATER_R, CHASE_SPEED_MULT } from './config';
import { mulberry32, dist2d, pickWeighted, randRange, clamp } from './math';
import { SPECIES, speciesById, rollWeight, randomPointInWater } from './species';

let fishSeq = 0;

export function spawnFish(rng: () => number): Fish[] {
  const fishes: Fish[] = [];
  for (let i = 0; i < FISH_COUNT; i++) {
    const idx = pickWeighted(
      rng,
      SPECIES.map((s) => ({ w: s.attractP * 3 }))
    );
    const sp = SPECIES[idx];
    const pos = randomPointInWater(rng, WATER_R * 0.8, [0.5, 3]);
    fishes.push({
      id: fishSeq++,
      speciesId: sp.id,
      pos,
      vel: [0, 0, 0],
      aiState: 'SWIMMING',
      waypoint: randomPointInWater(rng, WATER_R * 0.8, [0.5, 3]),
      wanderT: randRange(rng, [2, 8]),
      weight: rollWeight(rng, sp),
    });
  }
  return fishes;
}

export function createGame(seed?: number): GameState {
  const rng = mulberry32(seed ?? (Date.now() & 0xffffffff));
  return {
    phase: 'IDLE',
    t: 0,
    charge: { power: 0, dir: 1 },
    cast: null,
    bobber: null,
    bite: null,
    hookedFishId: null,
    fight: null,
    result: null,
    fishes: spawnFish(rng),
    effects: [],
    effectSeq: 0,
    rng,
  };
}

/** Move a fish toward a target point at speed; returns true when within `tol`. */
function steer(f: Fish, target: Vec3, speed: number, dt: number, tol: number): boolean {
  const dx = target[0] - f.pos[0];
  const dy = target[1] - f.pos[1];
  const dz = target[2] - f.pos[2];
  const d = Math.hypot(dx, dy, dz);
  if (d < tol) {
    f.vel = [0, 0, 0];
    return true;
  }
  const k = speed / d;
  f.vel = [dx * k, dy * k, dz * k];
  f.pos = [f.pos[0] + f.vel[0] * dt, f.pos[1] + f.vel[1] * dt, f.pos[2] + f.vel[2] * dt];
  return false;
}

export function updateFishMovement(s: GameState, dt: number): void {
  for (const f of s.fishes) {
    if (f.aiState === 'CAUGHT' || f.aiState === 'FIGHT' || f.aiState === 'BITE') continue;
    const sp = speciesById(f.speciesId);

    if (f.aiState === 'CHASE_BAIT' && s.bobber) {
      const target: Vec3 = [s.bobber[0], -0.6, s.bobber[2]];
      if (steer(f, target, sp.speed * CHASE_SPEED_MULT, dt, 1.5)) {
        // arrival handled by tick() — it owns the countdown→BITE transition
      }
      continue;
    }

    if (f.aiState === 'ESCAPE') {
      f.wanderT -= dt;
      if (f.wanderT <= 0) {
        f.aiState = 'SWIMMING';
        f.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
        f.wanderT = randRange(s.rng, [4, 9]);
      } else {
        steer(f, f.waypoint, sp.speed * 2.5, dt, 1);
      }
      continue;
    }

    // SWIMMING: wander between waypoints
    f.wanderT -= dt;
    const arrived = steer(f, f.waypoint, sp.speed, dt, 1.2);
    if (arrived || f.wanderT <= 0) {
      f.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
      f.wanderT = randRange(s.rng, [3, 9]);
    }
  }
}

/** Soft separation so schoolmates don't stack. Called once per tick. */
export function separateFish(fishes: Fish[]): void {
  for (let i = 0; i < fishes.length; i++) {
    for (let j = i + 1; j < fishes.length; j++) {
      const a = fishes[i];
      const b = fishes[j];
      const d = dist2d(a.pos, b.pos);
      if (d < 1.2 && d > 0.001) {
        const push = (1.2 - d) * 0.5;
        const nx = (a.pos[0] - b.pos[0]) / d;
        const nz = (a.pos[2] - b.pos[2]) / d;
        a.pos = [clamp(a.pos[0] + nx * push, -WATER_R, WATER_R), a.pos[1], clamp(a.pos[2] + nz * push, -WATER_R, WATER_R)];
        b.pos = [clamp(b.pos[0] - nx * push, -WATER_R, WATER_R), b.pos[1], clamp(b.pos[2] - nz * push, -WATER_R, WATER_R)];
      }
    }
  }
}
