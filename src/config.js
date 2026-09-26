// Tunable game constants — single source of truth for designers/devs.

export const CANVAS = { width: 960, height: 600 };
export const WATER_Y = 220;
export const BOAT_X = 140;
export const ROUND_SECONDS = 90;
export const FISH_TARGET_COUNT = 9;

export const CAST = {
  minDistance: 120,       // px past rod tip at power 0
  maxDistance: 700,       // px past rod tip at power 1
  flightTime: 0.9,        // s
  gravity: 900,
  chargeRate: 1.6,        // power units / s (ping-pong)
};

export const FIGHT = {
  reelRate: 130,          // px/s toward rod tip
  pullPenalty: 70,        // px/s removed at max pull
  tensionGain: 0.22,      // /s while reeling
  tensionPullGain: 0.85,  // extra /s scaled by fish pull
  tensionDecay: 0.35,     // /s when not reeling
  snapAt: 1.0,
  catchDistance: 55,      // px from rod tip
  biteWindow: 0.9,        // s to react when bobber sinks
  hookRadius: 90,         // fallback proximity hook distance
};

export const SPECIES = [
  { name: 'Cá con',   color: '#7fb3e8', belly: '#cfe4f7', len: 16, pts: 10,  depth: [0.15, 0.4],  speed: 40, weight: 0.45 },
  { name: 'Cá rô',    color: '#5fbf77', belly: '#d8f2df', len: 22, pts: 25,  depth: [0.3, 0.6],   speed: 55, weight: 0.30 },
  { name: 'Cá chép',  color: '#e8a34f', belly: '#fbe7c8', len: 30, pts: 60,  depth: [0.5, 0.8],   speed: 70, weight: 0.18 },
  { name: 'Cá ngựa',  color: '#c86bd8', belly: '#f0d8f7', len: 36, pts: 120, depth: [0.7, 0.95],  speed: 95, weight: 0.07 },
];
