// Entity factories + helpers. Pure data — no DOM access.
import { CANVAS as C, WATER_Y, SPECIES } from './config.js';

export const rand = (a, b) => a + Math.random() * (b - a);

export function pickSpecies() {
  const r = Math.random();
  let acc = 0;
  for (const s of SPECIES) { acc += s.weight; if (r < acc) return s; }
  return SPECIES[0];
}

const depthY = depthF => WATER_Y + 40 + depthF * (C.height - WATER_Y - 80);

/** Creates a fish entering from one screen edge. */
export function makeFish(sp = pickSpecies()) {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const depthF = rand(sp.depth[0], sp.depth[1]);
  return {
    sp, dir, depthF,
    x: dir > 0 ? rand(-200, -40) : rand(C.width + 40, C.width + 200),
    y: depthY(depthF),
    speed: sp.speed * rand(0.8, 1.2),
    size: sp.len * rand(0.85, 1.3),
    st: 'swim',           // swim | approach | nibble | bite | hooked
    t: rand(0, 3), wob: rand(0, Math.PI * 2),
    nibbles: 0, pull: 0, pullDir: 0, pullT: 0,
  };
}

/** Recycles an exiting fish into a fresh spawn from the opposite edge. */
export function respawnFish(f) {
  f.sp = pickSpecies();
  f.size = f.sp.len * rand(0.85, 1.3);
  f.depthF = rand(f.sp.depth[0], f.sp.depth[1]);
  f.speed = f.sp.speed * rand(0.8, 1.2);
  f.dir *= -1;
  f.x = f.dir > 0 ? -240 : C.width + 240;
  f.st = 'swim';
}

export const makeBobber = (x, y, vx, vy) => ({ x, y, vx, vy, state: 'fly', biteT: 0 });
export const makeRipple = (x, y, r = 4, a = 1) => ({ x, y, r, a });
export const makeParticle = (x, y, color) => ({
  x, y, vx: rand(-140, 140), vy: rand(-220, -40), t: rand(0.5, 1), c: color,
});
export const makeNotice = (txt, x, y, color = '#ffd76b') => ({ txt, x, y, color, t: 1.4 });
