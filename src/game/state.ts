import type { Effect, FightState, Fish, GameState, Vec3 } from './types';
import {
  FISH_COUNT,
  WATER_R,
  CHASE_SPEED_MULT,
  ROD_TIP,
  CAST_DUR,
  CAST_MIN_DIST,
  CAST_MAX_DIST,
  CHARGE_PERIOD,
  ATTRACT_RADIUS,
  APPROACH_DELAY,
  BASE_BITE_RATE,
  START_DEPTH,
  BURST_PERIOD,
  DT_MAX,
  EFFECT_TTL,
} from './config';
import { mulberry32, dist2d, pickWeighted, randRange, clamp, ballistic } from './math';
import { SPECIES, speciesById, rollWeight, randomPointInWater } from './species';
import { updateFight } from './fight';
import { rewardFor, DEFAULT_STATS } from './economy';

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

    if (f.aiState === 'CHASE_BAIT') {
      if (!s.bobber) {
        // bait gone (missed/snap/escape/dismiss) — back to wandering
        f.aiState = 'SWIMMING';
        f.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
        f.wanderT = randRange(s.rng, [2, 6]);
      } else {
        const target: Vec3 = [s.bobber[0], -0.6, s.bobber[2]];
        steer(f, target, sp.speed * CHASE_SPEED_MULT, dt, 1.5);
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

// ---------- player actions ----------

export function startCharge(s: GameState): void {
  if (s.phase !== 'IDLE') return;
  s.phase = 'CHARGING';
  s.t = 0;
  s.charge = { power: 0, dir: 1 };
}

export function aimPoint(power: number): Vec3 {
  const dist = CAST_MIN_DIST + (CAST_MAX_DIST - CAST_MIN_DIST) * (clamp(power, 0, 100) / 100);
  // dock at z=-30, cast toward lake center (positive z)
  return [0, 0, -30 + dist + 8];
}

export function releaseCast(s: GameState): void {
  if (s.phase !== 'CHARGING') return;
  s.cast = { from: [...ROD_TIP], to: aimPoint(s.charge.power), t: 0, dur: CAST_DUR };
  s.phase = 'CASTING';
  s.t = 0;
}

export function makeFight(rng: () => number, tensionStart = 0.35): FightState {
  return {
    tension: tensionStart,
    remaining: START_DEPTH,
    slackT: 0,
    burstT: 0,
    nextBurst: randRange(rng, BURST_PERIOD),
  };
}

export function hook(s: GameState): void {
  if (s.phase !== 'BITE_WINDOW' || !s.bite) return;
  const fish = s.fishes.find((f) => f.id === s.bite!.fishId);
  if (!fish) return;
  fish.aiState = 'FIGHT';
  s.hookedFishId = fish.id;
  s.fight = makeFight(s.rng);
  s.bite = null;
  s.phase = 'FIGHTING';
  s.t = 0;
}

export function missHook(s: GameState): void {
  if (s.phase !== 'BITE_WINDOW' || !s.bite) return;
  const fish = s.fishes.find((f) => f.id === s.bite!.fishId);
  if (fish) {
    fish.aiState = 'ESCAPE';
    fish.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
    fish.wanderT = randRange(s.rng, [1.5, 3]);
  }
  s.bite = null;
  s.result = { kind: 'missed', fish: fish ?? null, coins: 0, exp: 0 };
  s.phase = 'RESULT';
  s.t = 0;
}

export function dismissResult(s: GameState): void {
  if (s.phase !== 'RESULT') return;
  // recycle the caught fish so the lake never depletes
  const caught = s.result?.kind === 'caught' ? s.result.fish : null;
  if (caught) {
    const sp = speciesById(caught.speciesId);
    caught.aiState = 'SWIMMING';
    caught.pos = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
    caught.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
    caught.wanderT = randRange(s.rng, [2, 6]);
    caught.weight = rollWeight(s.rng, sp);
    caught.vel = [0, 0, 0];
  }
  s.result = null;
  s.bobber = null;
  s.cast = null;
  s.hookedFishId = null;
  s.fight = null;
  s.phase = 'IDLE';
  s.t = 0;
}

// ---------- tick ----------

function pushEffect(s: GameState, kind: Effect['kind'], pos: Vec3): void {
  s.effects.push({ id: s.effectSeq++, kind, pos: [...pos], t: 0 });
}

export function bobberPosition(s: GameState): Vec3 | null {
  if (s.phase === 'CASTING' && s.cast) {
    return ballistic(s.cast.from, s.cast.to, s.cast.t / s.cast.dur, 8);
  }
  if (s.bobber) {
    const bob = Math.sin(s.t * 2.4) * 0.06;
    return [s.bobber[0], bob, s.bobber[2]];
  }
  return null;
}

export function tick(s: GameState, dtRaw: number, input: { reeling: boolean }, stats = DEFAULT_STATS): void {
  const dt = clamp(dtRaw, 0, DT_MAX);
  s.t += dt;

  // fish swim continuously regardless of phase (CHASE/FIGHT/BITE/CAUGHT guarded inside)
  updateFishMovement(s, dt);
  separateFish(s.fishes);

  // advance + reap effects regardless of phase
  for (const e of s.effects) e.t += dt;
  s.effects = s.effects.filter((e) => e.t < EFFECT_TTL);

  switch (s.phase) {
    case 'CHARGING': {
      s.charge.power += s.charge.dir * (100 / CHARGE_PERIOD) * dt;
      if (s.charge.power >= 100) { s.charge.power = 100; s.charge.dir = -1; }
      if (s.charge.power <= 0) { s.charge.power = 0; s.charge.dir = 1; }
      break;
    }
    case 'CASTING': {
      if (!s.cast) { s.phase = 'IDLE'; break; }
      s.cast.t += dt;
      if (s.cast.t >= s.cast.dur) {
        s.bobber = [...s.cast.to];
        pushEffect(s, 'splash', s.bobber);
        pushEffect(s, 'ripple', s.bobber);
        s.cast = null;
        s.phase = 'WAITING';
        s.t = 0;
      }
      break;
    }
    case 'WAITING': {
      if (!s.bobber) { s.phase = 'IDLE'; break; }
      let anyChase = false;
      for (const f of s.fishes) {
        const sp = speciesById(f.speciesId);
        if (f.aiState === 'SWIMMING' && dist2d(f.pos, s.bobber) < ATTRACT_RADIUS) {
          if (s.rng() < sp.attractP * BASE_BITE_RATE * dt) {
            f.aiState = 'CHASE_BAIT';
            f.wanderT = 0;
          }
        } else if (f.aiState === 'CHASE_BAIT') {
          anyChase = true;
          if (dist2d(f.pos, s.bobber) < 1.5) {
            if (f.wanderT <= 0) f.wanderT = randRange(s.rng, APPROACH_DELAY);
            f.wanderT -= dt;
            if (f.wanderT <= 0) {
              f.aiState = 'BITE';
              s.bite = { fishId: f.id, deadline: randRange(s.rng, sp.biteWin) };
              pushEffect(s, 'ring', s.bobber);
              s.phase = 'BITE_WINDOW';
              s.t = 0;
              break;
            }
          }
        }
      }
      // casual pacing: after ~3.5s with nobody homing, send the nearest fish
      if (!anyChase && s.t > 3.5) {
        let nearest: Fish | null = null;
        let nd = Infinity;
        for (const f of s.fishes) {
          if (f.aiState !== 'SWIMMING') continue;
          const d = dist2d(f.pos, s.bobber);
          if (d < nd) { nd = d; nearest = f; }
        }
        if (nearest) { nearest.aiState = 'CHASE_BAIT'; nearest.wanderT = 0; }
      }
      break;
    }
    case 'BITE_WINDOW': {
      if (s.bite && s.t > s.bite.deadline) missHook(s);
      break;
    }
    case 'FIGHTING': {
      const fish = s.fishes.find((f) => f.id === s.hookedFishId);
      if (!fish || !s.fight) { s.phase = 'IDLE'; break; }
      const sp = speciesById(fish.speciesId);
      const outcome = updateFight(s.fight, s.rng, sp, stats, dt, input.reeling);
      if (outcome === 'catch') {
        fish.aiState = 'CAUGHT';
        const reward = rewardFor(sp, fish.weight);
        s.result = { kind: 'caught', fish, coins: reward.coins, exp: reward.exp };
        pushEffect(s, 'splash', [fish.pos[0], 0, fish.pos[2]]);
        s.phase = 'RESULT';
        s.t = 0;
      } else if (outcome === 'snap') {
        fish.aiState = 'ESCAPE';
        fish.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
        fish.wanderT = randRange(s.rng, [2, 4]);
        s.result = { kind: 'snap', fish, coins: 0, exp: 0 };
        s.phase = 'RESULT';
        s.t = 0;
      } else if (outcome === 'escape') {
        fish.aiState = 'ESCAPE';
        fish.waypoint = randomPointInWater(s.rng, WATER_R * 0.8, [0.5, 3]);
        fish.wanderT = randRange(s.rng, [2, 4]);
        s.result = { kind: 'escape', fish, coins: 0, exp: 0 };
        s.phase = 'RESULT';
        s.t = 0;
      } else {
        // hooked fish drags toward deeper water while fighting
        fish.pos = [fish.pos[0] + Math.sin(s.t * 3) * dt * 2, fish.pos[1], fish.pos[2] + Math.cos(s.t * 2) * dt * 2];
      }
      break;
    }
    case 'RESULT':
    case 'IDLE':
    default:
      break;
  }
}
