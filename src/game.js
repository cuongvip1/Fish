// Game state machine + simulation. No DOM access — main.js drives it.
import { CANVAS as C, WATER_Y, BOAT_X, ROUND_SECONDS, FISH_TARGET_COUNT, CAST, FIGHT } from './config.js';
import { rand, pickSpecies, makeFish, respawnFish, makeBobber, makeRipple, makeParticle, makeNotice } from './entities.js';

export const STATE = { MENU: 'menu', AIM: 'aim', CAST: 'cast', WAIT: 'wait', HOOKED: 'hooked', OVER: 'over' };

export function createGame() {
  const game = {
    state: STATE.MENU,
    score: 0, caught: 0, timeLeft: ROUND_SECONDS,
    highScore: +(localStorage.getItem('fish_hs') || 0),
    power: 0, powerDir: 1, charging: false, reeling: false,
    fishes: [], particles: [], ripples: [], notices: [],
    bobber: null, hookedFish: null, tension: 0,
    onGameOver: null,   // set by main.js
  };
  reset(game);
  return game;
}

export function reset(g) {
  g.score = 0; g.caught = 0; g.timeLeft = ROUND_SECONDS;
  g.fishes = []; g.particles = []; g.ripples = []; g.notices = [];
  g.bobber = null; g.hookedFish = null;
  g.power = 0; g.charging = false; g.tension = 0;
  while (g.fishes.length < FISH_TARGET_COUNT) g.fishes.push(makeFish());
}

export function rodTip() {
  return { x: BOAT_X + 52, y: WATER_Y - 66 };
}

const notice = (g, txt, x, y, color) => g.notices.push(makeNotice(txt, x, y, color));

// ---------- player actions ----------

export function startCharge(g) {
  if (g.state === STATE.AIM) g.charging = true;
}

export function releaseCast(g) {
  if (g.state !== STATE.AIM || !g.charging) { g.charging = false; return; }
  g.charging = false;
  const tip = rodTip();
  const dist = CAST.minDistance + g.power * (Math.min(CAST.maxDistance, C.width - 260 - CAST.minDistance));
  const targetX = Math.min(tip.x + dist, C.width - 30);
  g.bobber = makeBobber(tip.x, tip.y,
    (targetX - tip.x) / CAST.flightTime,
    -((targetX - tip.x) * 0.35 + 160));
  g.state = STATE.CAST;
  g.power = 0;
}

/** Click while waiting: strike if biting, otherwise reel the bobber back. */
export function strikeOrRecall(g) {
  if (g.state !== STATE.WAIT) return;
  if (g.bobber?.state === 'bite') hookFish(g);
  else {
    g.state = STATE.AIM; g.bobber = null;
    notice(g, 'Thu dây', BOAT_X + 60, WATER_Y - 40, '#9fb4d8');
  }
}

function hookFish(g) {
  let f = g.fishes.find(f => f.st === 'bite');
  if (!f) {
    let best = FIGHT.hookRadius;
    for (const c of g.fishes) {
      const d = Math.hypot(c.x - g.bobber.x, c.y - g.bobber.y);
      if (d < best) { best = d; f = c; }
    }
  }
  if (!f) {
    g.state = STATE.AIM; g.bobber = null;
    notice(g, 'Hụt!', BOAT_X + 60, WATER_Y - 40, '#ff8888');
    return;
  }
  g.hookedFish = f; f.st = 'hooked';
  g.tension = 0.15; g.state = STATE.HOOKED;
  g.ripples.push(makeRipple(g.bobber.x, WATER_Y));
  notice(g, 'Đính!', g.bobber.x, g.bobber.y - 20, '#7dff9b');
  g.bobber = null;
}

// ---------- simulation ----------

export function update(g, dt) {
  g.timeLeft -= dt;
  if (g.timeLeft <= 0) {
    g.timeLeft = 0;
    if (g.state !== STATE.HOOKED) return endGame(g);
  }

  if (g.charging && g.state === STATE.AIM) {
    g.power += g.powerDir * dt * CAST.chargeRate;
    if (g.power > 1) { g.power = 1; g.powerDir = -1; }
    if (g.power < 0) { g.power = 0; g.powerDir = 1; }
  }

  updateBobber(g, dt);
  updateFishes(g, dt);
  if (g.state === STATE.HOOKED && g.hookedFish) updateFight(g, dt);
  updateFx(g, dt);
}

function updateBobber(g, dt) {
  const b = g.bobber;
  if (!b) return;
  if (b.state === 'fly') {
    b.vy += CAST.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x > C.width - 10) { b.x = C.width - 10; b.vx = -b.vx * 0.3; }
    if (b.y >= WATER_Y) {
      b.y = WATER_Y; b.vx = b.vy = 0; b.state = 'float';
      g.state = STATE.WAIT;
      g.ripples.push(makeRipple(b.x, WATER_Y));
    }
    return;
  }
  b.y = WATER_Y + Math.sin(performance.now() / 300) * 3 + (b.state === 'bite' ? 14 : 0);
  if (b.state === 'bite') {
    b.biteT -= dt;
    if (b.biteT <= 0) {
      b.state = 'float';
      const f = g.fishes.find(f => f.st === 'bite');
      if (f) f.st = 'swim';
    }
  }
}

function updateFishes(g, dt) {
  for (const f of g.fishes) {
    f.wob += dt * 6;
    switch (f.st) {
      case 'swim': {
        f.x += f.dir * f.speed * dt;
        f.y = WATER_Y + 40 + f.depthF * (C.height - WATER_Y - 80) + Math.sin(f.wob) * 6;
        if (f.x < -260 || f.x > C.width + 260) respawnFish(f);
        else if (g.bobber?.state === 'float'
          && Math.hypot(f.x - g.bobber.x, f.y - g.bobber.y) < 260
          && Math.random() < dt * 0.8) f.st = 'approach';
        break;
      }
      case 'approach': {
        if (!g.bobber) { f.st = 'swim'; break; }
        const dx = g.bobber.x - f.x, dy = g.bobber.y + 26 - f.y;
        const d = Math.hypot(dx, dy) || 1;
        f.x += dx / d * f.speed * 1.4 * dt;
        f.y += dy / d * f.speed * 1.4 * dt;
        f.dir = dx >= 0 ? 1 : -1;
        if (d < 24) { f.st = 'nibble'; f.t = rand(0.4, 1.2); f.nibbles = 0; }
        else if (g.bobber.state === 'bite') f.st = 'swim';
        break;
      }
      case 'nibble': {
        if (!g.bobber) { f.st = 'swim'; break; }
        f.t -= dt;
        if (f.t <= 0) {
          f.nibbles++;
          g.ripples.push(makeRipple(g.bobber.x, WATER_Y, 3, 0.8));
          if (f.nibbles >= rand(1, 3)) {
            g.bobber.state = 'bite'; g.bobber.biteT = FIGHT.biteWindow; f.st = 'bite';
          } else f.t = rand(0.5, 1.1);
        }
        break;
      }
      case 'bite': {
        if (!g.bobber || g.bobber.state !== 'bite') { f.st = 'swim'; break; }
        f.x = g.bobber.x; f.y = g.bobber.y + 30;
        break;
      }
      case 'hooked': {
        f.pullT -= dt;
        if (f.pullT <= 0) { f.pull = rand(0.4, 1); f.pullDir = rand(-1, 1); f.pullT = rand(0.5, 1.4); }
        f.pull = Math.max(0, f.pull - dt * 0.8);
        break;
      }
    }
  }
}

function updateFight(g, dt) {
  const tip = rodTip();
  const f = g.hookedFish;
  const toTip = Math.hypot(f.x - tip.x, f.y - tip.y) || 1;

  if (g.reeling) {
    const rate = FIGHT.reelRate - f.pull * FIGHT.pullPenalty;
    f.x += (tip.x - f.x) / toTip * rate * dt;
    f.y += (tip.y - f.y) / toTip * rate * dt;
    g.tension += dt * (FIGHT.tensionGain + f.pull * FIGHT.tensionPullGain);
  } else {
    g.tension -= dt * FIGHT.tensionDecay;
    f.x += f.pullDir * f.pull * f.speed * 0.6 * dt;
    f.y += Math.sin(f.wob) * 40 * dt * f.pull;
  }
  f.y = Math.max(WATER_Y + 20, Math.min(C.height - 30, f.y));
  f.x = Math.max(20, Math.min(C.width - 20, f.x));
  g.tension = Math.max(0, Math.min(1, g.tension));

  if (Math.random() < dt * 8) g.ripples.push(makeRipple(f.x, WATER_Y, 3, 0.6));

  if (g.tension >= FIGHT.snapAt) {
    notice(g, 'ĐỨT DÂY!', f.x, f.y - 30, '#ff5555');
    f.st = 'swim'; f.dir = f.x < C.width / 2 ? -1 : 1; f.x += f.dir * 60;
    g.hookedFish = null; g.state = STATE.AIM;
  } else if (toTip < FIGHT.catchDistance) {
    g.score += f.sp.pts; g.caught++;
    notice(g, `+${f.sp.pts} ${f.sp.name}`, BOAT_X + 40, WATER_Y - 90);
    for (let i = 0; i < 14; i++) g.particles.push(makeParticle(tip.x, tip.y, f.sp.color));
    g.fishes.splice(g.fishes.indexOf(f), 1);
    g.fishes.push(makeFish());
    g.hookedFish = null; g.state = STATE.AIM;
    if (g.timeLeft <= 0) endGame(g);
  }
}

function updateFx(g, dt) {
  for (const p of g.particles) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
  g.particles = g.particles.filter(p => p.t > 0);
  for (const r of g.ripples) { r.r += 60 * dt; r.a -= dt * 1.4; }
  g.ripples = g.ripples.filter(r => r.a > 0);
  for (const n of g.notices) { n.y -= 30 * dt; n.t -= dt; }
  g.notices = g.notices.filter(n => n.t > 0);
}

function endGame(g) {
  g.state = STATE.OVER;
  if (g.score > g.highScore) {
    g.highScore = g.score;
    localStorage.setItem('fish_hs', g.highScore);
  }
  g.onGameOver?.(g);
}
