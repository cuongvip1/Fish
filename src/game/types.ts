export type Vec3 = [number, number, number];

export type Phase =
  | 'IDLE'
  | 'CHARGING'
  | 'CASTING'
  | 'WAITING'
  | 'BITE_WINDOW'
  | 'FIGHTING'
  | 'RESULT';

export type ResultKind = 'caught' | 'snap' | 'escape' | 'missed';

export type FishAI =
  | 'IDLE'
  | 'SWIMMING'
  | 'CHASE_BAIT'
  | 'BITE'
  | 'FIGHT'
  | 'ESCAPE'
  | 'CAUGHT';

export interface Fish {
  id: number;
  speciesId: string;
  pos: Vec3;
  vel: Vec3;
  aiState: FishAI;
  waypoint: Vec3;
  wanderT: number;
  weight: number;
}

export interface FightState {
  /** normalized tension 0..1 (fraction of tensionMax); >1 = snap */
  tension: number;
  /** distance left to reel in; <=0 = catch */
  remaining: number;
  /** seconds spent below greenLo */
  slackT: number;
  /** seconds left in current burst */
  burstT: number;
  /** seconds until next burst */
  nextBurst: number;
}

export interface Effect {
  id: number;
  kind: 'splash' | 'ripple' | 'spark' | 'ring';
  pos: Vec3;
  t: number;
}

export interface CastState {
  from: Vec3;
  to: Vec3;
  t: number;
  dur: number;
}

export interface CatchResult {
  kind: ResultKind;
  fish: Fish | null;
  coins: number;
  exp: number;
  /** store consumes once to credit profile */
  consumed?: boolean;
}

export interface GameState {
  phase: Phase;
  /** seconds since phase entered */
  t: number;
  charge: { power: number; dir: 1 | -1 };
  cast: CastState | null;
  bobber: Vec3 | null;
  /** absolute s.t deadline for hooking */
  bite: { fishId: number; deadline: number } | null;
  hookedFishId: number | null;
  fight: FightState | null;
  result: CatchResult | null;
  fishes: Fish[];
  effects: Effect[];
  effectSeq: number;
  rng: () => number;
}

export interface Profile {
  coins: number;
  exp: number;
  level: number;
  rodId: string;
  upgrades: Record<'strength' | 'line' | 'reel', number>;
  collection: Record<string, { count: number; maxWeight: number }>;
  totalCaught: number;
}

export interface Stats {
  tensionMax: number;
  reelSpeed: number;
  greenLo: number;
  greenHi: number;
}
