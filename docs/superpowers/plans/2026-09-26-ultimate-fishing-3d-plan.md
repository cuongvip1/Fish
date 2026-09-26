# Ultimate Fishing: Reel Catch 3D — Sub-project 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable 3D fishing game (Small Lake, full cast→bite→fight→catch loop, economy, collection, upgrades) in Next.js 15 + React Three Fiber, replacing the existing 2D canvas game in `F:/WEB`.

**Architecture:** Sim-core + render shell (spec §Decisions). All game logic lives in pure-TypeScript modules under `src/game/` with zero imports from three/react; a Zustand store ticks the sim and exposes actions; R3F scene components render the store read-only; DOM HUD reads it via selectors.

**Tech Stack:** Next.js 15 (App Router, `src/app`), React 19, TypeScript strict, TailwindCSS v4, @react-three/fiber v9, @react-three/drei, @react-three/postprocessing, zustand, @tanstack/react-query, framer-motion, howler, vitest. No Rapier (deferred).

**Spec:** `docs/superpowers/specs/2026-09-26-ultimate-fishing-3d-design.md`

## Global Constraints

- All game-state mutations go through `tick(s, dt)` or store actions — never from scene components.
- `src/game/**` MUST NOT import `three`, `react`, or any DOM API (vitest runs it in node).
- Sim uses the seeded `s.rng()` for ALL randomness — never `Math.random` inside `src/game`.
- Time in seconds; `dt` clamped to `DT_MAX = 0.1` inside `tick`.
- Conventional commits (`feat:`, `fix:`, `chore:`, `perf:`). Commit per task.
- Water surface at `y = 0`; water disc radius `WATER_R = 42`; player/dock at `z = -30`.
- Path alias `@/* → ./src/*` in tsconfig.

## Review Focus

Inputs the spec implies but that are easy to break — each gets a pinned test in its owning task:

1. **First run with no save** → `loadProfile()` must return defaults (not crash, not null-prop) — Task 8 test.
2. **Rapid double `hook()` inside BITE_WINDOW** → second call must be a no-op — Task 4 test.
3. **Headless test env has no `window`/`localStorage`** → save adapter must no-op gracefully — Task 8 test.
4. **Buying with insufficient coins / maxed tier** → action rejected, profile unchanged — Task 7 test.
5. **Cast released at zero power** → still enters CASTING (short lob), never stuck in CHARGING — Task 4 test.

---

## File Structure

Pure sim (`src/game/`): `types.ts`, `config.ts`, `species.ts`, `math.ts`, `state.ts`, `fight.ts`, `economy.ts`, `store.ts`.
Persistence (`src/save/`): `adapter.ts`.
Scene (`src/scene/`): `GameCanvas.tsx`, `Lake.tsx`, `Water.tsx`, `Environment.tsx`, `FishSchool.tsx`, `Fisherman.tsx`, `FishingLine.tsx`, `Effects.tsx`, `CameraRig.tsx`.
UI (`src/ui/`): `HUD.tsx`, `CastButton.tsx`, `FightUI.tsx`, `BitePrompt.tsx`, `CatchCard.tsx`, `Panels.tsx`, `Providers.tsx`.
App (`src/app/`): `layout.tsx`, `page.tsx`, `globals.css`, `Game.tsx` (client entry).
Audio: `scripts/gen-sounds.mjs` → `public/sounds/*.wav`; `src/audio/manager.ts`.

---

### Task 1: Scaffold — Next.js + deps, remove 2D game

**Files:**
- Delete: `index.html`, `server.mjs`, `src/main.js`, `src/input.js`, `src/renderer.js`, `src/game.js`, `src/entities.js`, `src/config.js`, `src/style.css` (all tracked in baseline commit `e480eac` — recoverable from git)
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/types.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/Game.tsx`, `src/ui/Providers.tsx`

**Interfaces:**
- Produces: working `npm run dev` shell; `Game.tsx` exports default component rendering `<div>` placeholder until Task 10.

- [ ] **Step 1: Write package.json + configs**

`package.json`:
```json
{
  "name": "ultimate-fishing-3d",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "gen-sounds": "node scripts/gen-sounds.mjs"
  }
}
```
Dependencies (install with `npm install`): `next@15 react@19 react-dom@19 three @react-three/fiber @react-three/drei @react-three/postprocessing zustand @tanstack/react-query framer-motion howler`. Dev: `typescript @types/react @types/react-dom @types/node @types/three vitest eslint eslint-config-next tailwindcss @tailwindcss/postcss`.

`tsconfig.json` — Next.js defaults plus `"paths": { "@/*": ["./src/*"] }`, `"strict": true`, `include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`.

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'] } });
```

`src/types.d.ts` — `declare module '*.wav';` (future-proof; audio loads via URL strings anyway).

`src/app/globals.css`:
```css
@import "tailwindcss";
html, body { margin: 0; height: 100%; background: #0a1622; overflow: hidden; }
```

`.gitignore`: `node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `.vercel`, `*.tsbuildinfo`.

- [ ] **Step 2: Remove old 2D game files, create app shell**

`git rm index.html server.mjs src/*.js src/style.css`. `src/app/layout.tsx` — root layout, `<html lang="en"><body>{children}</body></html>`, metadata title "Ultimate Fishing: Reel Catch 3D". `src/app/page.tsx`:
```tsx
import dynamic from 'next/dynamic';
const Game = dynamic(() => import('./Game'), { ssr: false });
export default function Page() { return <Game />; }
```
`src/app/Game.tsx` — `'use client'`, returns `<div className="fixed inset-0 grid place-items-center text-white">Loading…</div>` placeholder (replaced in Task 10). `src/ui/Providers.tsx` — `'use client'`, wraps children in `QueryClientProvider` (one `new QueryClient` in `useState`).

- [ ] **Step 3: Install + verify dev server builds**

Run: `npm install` then `npx next build`. Expected: build succeeds, page renders "Loading…". Then commit: `git add -A && git commit -m "chore: scaffold Next.js 15 + R3F, remove 2D prototype"`.

---

### Task 2: Sim types + config + math

**Files:**
- Create: `src/game/types.ts`, `src/game/config.ts`, `src/game/math.ts`
- Test: `tests/math.test.ts`

**Interfaces:**
- Produces:
  - `export type Vec3 = [number, number, number]`
  - `export type Phase = 'IDLE'|'CHARGING'|'CASTING'|'WAITING'|'BITE_WINDOW'|'FIGHTING'|'RESULT'`
  - `export type ResultKind = 'caught'|'snap'|'escape'|'missed'`
  - `export interface Fish { id:number; speciesId:string; pos:Vec3; vel:Vec3; aiState:'IDLE'|'SWIMMING'|'CHASE_BAIT'|'BITE'|'FIGHT'|'ESCAPE'|'CAUGHT'; waypoint:Vec3; wanderT:number; weight:number }`
  - `export interface GameState { phase:Phase; t:number; charge:{power:number;dir:1|-1}; cast:{from:Vec3;to:Vec3;t:number;dur:number}|null; bobber:Vec3|null; bite:{fishId:number;window:number}|null; hookedFishId:number|null; fight:FightState|null; result:{kind:ResultKind;fish:Fish|null;coins:number;exp:number}|null; fishes:Fish[]; effects:Effect[]; rng:()=>number; }`
  - `export interface FightState { tension:number; remaining:number; slackT:number; burstT:number; nextBurst:number }`
  - `export interface Effect { id:number; kind:'splash'|'ripple'|'spark'|'ring'; pos:Vec3; t:number }` (ring = bite indicator)
  - `export interface Profile { coins:number; exp:number; level:number; rodId:string; upgrades:Record<'strength'|'line'|'reel',number>; collection:Record<string,{count:number;maxWeight:number}>; totalCaught:number }`
  - `export interface Stats { tensionMax:number; reelSpeed:number; greenLo:number; greenHi:number }`
  - `math.ts`: `mulberry32(seed:number):()=>number`, `clamp(v,lo,hi)`, `lerp(a,b,t)`, `dist2d(a:Vec3,b:Vec3)`, `ballistic(from:Vec3,to:Vec3,t:number,h:number):Vec3` (parabola apex `h`), `pickWeighted(rng, items:{w:number}[]):number` index.
  - `config.ts` exports every numeric tuning constant (see Step 3).

- [ ] **Step 1: Write the failing test**

```ts
// tests/math.test.ts
import { describe, it, expect } from 'vitest';
import { mulberry32, clamp, ballistic, pickWeighted } from '../src/game/math';

describe('math', () => {
  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('clamp bounds values', () => {
    expect(clamp(5, 0, 3)).toBe(3); expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('ballistic hits endpoints at t=0 and t=1', () => {
    const p0 = ballistic([0,0,0],[10,0,0],0,5), p1 = ballistic([0,0,0],[10,0,0],1,5);
    expect(p0).toEqual([0,0,0]); expect(p1).toEqual([10,0,0]);
    expect(ballistic([0,0,0],[10,0,0],0.5,5)[1]).toBeCloseTo(5, 5); // apex
  });
  it('pickWeighted respects weights', () => {
    const rng = mulberry32(7);
    const idx = pickWeighted(rng, [{w:0},{w:1},{w:0}]);
    expect(idx).toBe(1);
  });
});
```

- [ ] **Step 2: `npx vitest run tests/math.test.ts` → FAIL (module not found)**

- [ ] **Step 3: Implement the three modules**

`config.ts` — one export per constant, grouped:
```ts
export const WATER_R = 42;
export const DOCK_POS: [number,number,number] = [0, 0.4, -30];
export const ROD_TIP: [number,number,number] = [0, 3.1, -27.2];
export const DT_MAX = 0.1;
export const CHARGE_PERIOD = 1.4;          // s for 0→100
export const CAST_MIN_DIST = 6, CAST_MAX_DIST = 30;
export const CAST_DUR = 0.9;               // s flight time
export const CAST_APEX = 8;
export const FISH_COUNT = 14;
export const ATTRACT_RADIUS = 9;           // bobber attract radius
export const CHASE_SPEED_MULT = 2.2;
export const APPROACH_DELAY: [number,number] = [0.8, 2.2]; // s range before bite
export const SLACK_TIME = 1.5;             // s below greenLo → escape
export const REEL_FORCE = 0.55;            // tension/s while reeling (fraction of max)
export const TENSION_DRAIN = 0.18;         // tension/s baseline decay
export const GREEN_BAND: [number,number] = [0.25, 0.75]; // fraction of tensionMax
export const START_DEPTH = 26;             // reel distance units
export const BURST_PERIOD: [number,number] = [1.4, 3.0];
export const BURST_LEN: [number,number] = [0.5, 1.1];
export const BURST_MULT = 1.8;             // fish power multiplier while bursting
```

`math.ts` — implement per signatures above; `ballistic(from,to,t,h)` = horizontal lerp + `4h·t(1−t)` on y. `pickWeighted` returns first index where cumulative weight exceeds `rng()*total`.

`types.ts` — interfaces exactly as listed in Interfaces.

- [ ] **Step 4: `npx vitest run` → PASS; commit** `feat: sim core types, config, math`

---

### Task 3: Species table + fish spawning/movement

**Files:**
- Create: `src/game/species.ts`, fish section of `src/game/state.ts`
- Test: `tests/species.test.ts`

**Interfaces:**
- Produces:
  - `export interface Species { id:string; name:string; rarity:'common'|'uncommon'|'rare'|'legendary'; power:number; wMin:number; wMax:number; coins:number; exp:number; colors:[string,string]; attractP:number; speed:number; biteWin:[number,number]; }`
  - `export const SPECIES: Species[]` — 8 entries, exact values:
    ```
    minnow   common    p=0.35 w=0.02–0.08kg coins=2  exp=3  attractP=0.85 speed=2.4 biteWin=[1.9,2.5] colors=['#7fb8d4','#e8f1f5']
    bluegill common    p=0.45 w=0.1–0.4    coins=4  exp=5  attractP=0.7  speed=2.0 biteWin=[1.7,2.3] colors=['#5a9e6f','#d8ecd0']
    perch    uncommon  p=0.55 w=0.2–0.8    coins=8  exp=8  attractP=0.55 speed=2.2 biteWin=[1.5,2.1] colors=['#d4b04a','#f0e6c0']
    bass     uncommon  p=0.8  w=0.5–2.5    coins=15 exp=15 attractP=0.45 speed=2.6 biteWin=[1.4,2.0] colors=['#4a7c59','#cfe0d0']
    pike     rare      p=1.1  w=1.0–5.0    coins=40 exp=35 attractP=0.3  speed=3.0 biteWin=[1.1,1.7] colors=['#3d5a45','#b8ccab']
    catfish  rare      p=1.25 w=1.5–8.0    coins=55 exp=45 attractP=0.28 speed=1.8 biteWin=[1.0,1.6] colors=['#5a5a6e','#c9c3b8']
    koi      legendary p=0.9  w=0.5–3.0    coins=90 exp=80 attractP=0.18 speed=2.5 biteWin=[0.9,1.4] colors=['#e8843c','#f7f0e0']
    golden   legendary p=1.5  w=0.8–4.0    coins=150 exp=120 attractP=0.12 speed=3.2 biteWin=[0.8,1.2] colors=['#f0c33c','#fff4c0']
    ```
  - `export function speciesById(id:string): Species`
  - `export function rollWeight(rng:()=>number, s:Species):number` — `wMin + (wMax-wMin)·rng()²` (bias light)
  - From `state.ts`: `export function spawnFish(rng):Fish[]` — `FISH_COUNT` fish, species via `pickWeighted` on `attractP·3` (common bias), random pos inside `WATER_R·0.8` disc at `y=-0.5–-3`, `aiState:'SWIMMING'`.
  - `export function updateFishMovement(s:GameState, dt:number)` — waypoint wander (new waypoint within 12u when `wanderT` expires or arrived within 1u), velocity toward waypoint at `species.speed`, `CHASE_BAIT` overrides waypoint to `s.bobber` at `speed·CHASE_SPEED_MULT`. Fish with `aiState==='CAUGHT'|'FIGHT'` don't wander.

- [ ] **Step 1: Failing test**

```ts
// tests/species.test.ts
import { describe, it, expect } from 'vitest';
import { SPECIES, speciesById, rollWeight } from '../src/game/species';
import { spawnFish } from '../src/game/state';
import { mulberry32 } from '../src/game/math';
import { WATER_R } from '../src/game/config';

describe('species', () => {
  it('has 8 species across 4 rarities', () => {
    expect(SPECIES.length).toBe(8);
    expect(new Set(SPECIES.map(s=>s.rarity)).size).toBe(4);
  });
  it('rollWeight stays in [wMin,wMax]', () => {
    const rng = mulberry32(1);
    for (const s of SPECIES)
      for (let i=0;i<50;i++){ const w=rollWeight(rng,s); expect(w).toBeGreaterThanOrEqual(s.wMin); expect(w).toBeLessThanOrEqual(s.wMax); }
  });
  it('spawnFish creates fish inside water radius', () => {
    const fish = spawnFish(mulberry32(3));
    expect(fish.length).toBeGreaterThan(0);
    for (const f of fish) {
      expect(Math.hypot(f.pos[0], f.pos[2])).toBeLessThanOrEqual(WATER_R);
      expect(f.pos[1]).toBeLessThan(0);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL → implement `species.ts` and `spawnFish`/`updateFishMovement` in `state.ts` → PASS → commit** `feat: species table + fish spawning/movement`

---

### Task 4: State machine (`state.ts` core)

**Files:**
- Modify: `src/game/state.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 5, 8, 9, 11–16):
  - `export function createGame(seed?:number):GameState` — `phase:'IDLE'`, `fishes:spawnFish`, `rng:mulberry32(seed ?? Date.now())`, all transient fields null.
  - `export function startCharge(s):void` — IDLE only → `phase:'CHARGING'`.
  - `export function releaseCast(s):void` — CHARGING only; commits `power` → `cast={from:ROD_TIP, to:aimPoint(power), t:0, dur:CAST_DUR}` → `phase:'CASTING'`. Works at `power===0` (lob).
  - `export function hook(s):void` — BITE_WINDOW only → `phase:'FIGHTING'`, `hookedFishId`, `fight=makeFight(species)`, fish `aiState='FIGHT'`. No-op otherwise AND on second call in same window.
  - `export function missHook(s)` — called by UI timeout OR by tick when window expires → fish `aiState='ESCAPE'`, `result={kind:'missed',fish,coins:0,exp:0}` → `phase:'RESULT'`.
  - `export function dismissResult(s):void` — RESULT → IDLE (clears bobber/hooked/result).
  - `export function tick(s, dt, input:{reeling:boolean}):void` — clamps dt, `s.t+=dt`, dispatches per-phase.
  - `aimPoint(power)` — distance `lerp(CAST_MIN_DIST,CAST_MAX_DIST,power/100)` straight ahead of dock (`z`-negative → water center).
  - Tick details: CHARGING oscillates `charge.power` 0–100–0 at `CHARGE_PERIOD`. CASTING advances `cast.t`; at `t≥dur` → bobber at `cast.to`, splash Effect, `phase:'WAITING'`. WAITING: per-fish attraction roll `P = species.attractP·0.6·dt` for fish within `ATTRACT_RADIUS` → `CHASE_BAIT`; on arrival within 1.5u starts countdown `approachDelay` (store on fish `wanderT`), then `phase:'BITE_WINDOW'`, `bite={fishId, window: lerp(species.biteWin) }`, fish `aiState='BITE'`, ring Effect. BITE_WINDOW: `s.t>window` → `missHook`. RESULT stays until `dismissResult`.
  - `export function makeFight(species):FightState` — `{tension:0.4·? , remaining:START_DEPTH, slackT:0, burstT:0, nextBurst:rand(BURST_PERIOD)}` — tension starts at `0.35` fraction.

- [ ] **Step 1: Failing test**

```ts
// tests/state.test.ts
import { describe, it, expect } from 'vitest';
import { createGame, startCharge, releaseCast, hook, dismissResult, tick } from '../src/game/state';
import { CAST_DUR } from '../src/game/config';

function run(s, secs, input={reeling:false}) {
  for (let i=0;i<secs*60;i++) tick(s, 1/60, input);
}

describe('state machine', () => {
  it('full cast→wait→bite→hook→fight path is reachable', () => {
    const s = createGame(42);
    startCharge(s);
    run(s, 0.5);
    releaseCast(s);
    expect(s.phase).toBe('CASTING');
    run(s, CAST_DUR + 0.1);
    expect(s.phase).toBe('WAITING');
    run(s, 30); // seeded rng → a bite must occur
    expect(['BITE_WINDOW','FIGHTING','RESULT']).toContain(s.phase);
  });
  it('release at zero power still casts', () => {
    const s = createGame(1);
    startCharge(s); releaseCast(s);
    expect(s.phase).toBe('CASTING');
  });
  it('double hook in same window is a no-op', () => {
    const s = createGame(42);
    startCharge(s); run(s,0.5); releaseCast(s); run(s, 30);
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
    startCharge(s); run(s,0.5); releaseCast(s); run(s, 30);
    while (s.phase !== 'BITE_WINDOW' && s.phase !== 'RESULT') run(s, 1);
    if (s.phase === 'BITE_WINDOW') { run(s, 3); expect(s.phase).toBe('RESULT'); expect(s.result?.kind).toBe('missed'); }
  });
  it('dismissResult returns to IDLE', () => {
    const s = createGame(42); s.phase='RESULT'; s.result={kind:'missed',fish:null,coins:0,exp:0};
    dismissResult(s); expect(s.phase).toBe('IDLE');
  });
  it('illegal transitions are ignored', () => {
    const s = createGame(1);
    hook(s); expect(s.phase).toBe('IDLE');
    releaseCast(s); expect(s.phase).toBe('IDLE');
  });
});
```

- [ ] **Step 2: Run → FAIL → implement → PASS → commit** `feat: core fishing state machine`

---

### Task 5: Fight model (`fight.ts` + tick integration)

**Files:**
- Create: `src/game/fight.ts`; Modify: `src/game/state.ts` (FIGHTING branch calls it)
- Test: `tests/fight.test.ts`

**Interfaces:**
- Consumes: `Species`, `FightState`, `Stats`, config constants.
- Produces:
  - `export function updateFight(s:GameState, species:Species, stats:Stats, dt:number, reeling:boolean):'catch'|'snap'|'escape'|null`
  - Tension is stored **normalized 0–1** (`tension` fraction of `tensionMax`):
    `tension += (reeling ? REEL_FORCE : -TENSION_DRAIN)·dt + species.power·0.04·dt` clamped `[0,1.2]`.
    While `burstT>0`: add `species.power·BURST_MULT·0.06·dt` extra.
    `remaining -= stats.reelSpeed·dt·(1.4)` only while `tension ∈ [stats.greenLo, stats.greenHi]`.
    Burst scheduler: `nextBurst -= dt`; at 0 → `burstT = rand(BURST_LEN)`, `nextBurst = rand(BURST_PERIOD)`; `burstT -= dt`.
    Outcomes: `remaining≤0`→'catch'; `tension≥1`→'snap'; `tension<greenLo` accumulates `slackT`, `slackT≥SLACK_TIME`→'escape' (reset `slackT` when back in band).

- [ ] **Step 1: Failing test — three outcomes reachable**

```ts
// tests/fight.test.ts
import { describe, it, expect } from 'vitest';
import { createGame, makeFight } from '../src/game/state';
import { updateFight } from '../src/game/fight';
import { speciesById } from '../src/game/species';
import type { GameState } from '../src/game/types';

function fightSetup(id='perch') {
  const s = createGame(9);
  const species = speciesById(id);
  s.fight = makeFight(species);
  return { s, species };
}
const stats = { tensionMax: 100, reelSpeed: 1, greenLo: 0.25, greenHi: 0.75 };

describe('fight model', () => {
  it('sustained reeling in-band wins', () => {
    const { s, species } = fightSetup();
    let out = null;
    for (let i=0;i<60*120 && !out;i++) {
      const reel = s.fight!.tension < 0.7;  // pulse-reel to stay in band
      out = updateFight(s, species, stats, 1/60, reel);
    }
    expect(out).toBe('catch');
  });
  it('always-reeling snaps the line', () => {
    const { s, species } = fightSetup('pike');
    let out = null;
    for (let i=0;i<60*10 && !out;i++) out = updateFight(s, species, stats, 1/60, true);
    expect(out).toBe('snap');
  });
  it('never reeling loses the fish', () => {
    const { s, species } = fightSetup();
    let out = null;
    for (let i=0;i<60*10 && !out;i++) out = updateFight(s, species, stats, 1/60, false);
    expect(out).toBe('escape');
  });
});
```

- [ ] **Step 2: FAIL → implement `fight.ts` + wire FIGHTING branch in `tick`** (on outcome: 'catch' → `result={kind:'caught',fish,coins,exp}` computed in Task 7's `rewardFor`; for this task compute inline `coins=species.coins, exp=species.exp` and refactor in Task 7; 'snap'/'escape' → corresponding results; `phase:'RESULT'`).

- [ ] **Step 3: PASS → commit** `feat: tension-based fight model`

---

### Task 6: (folded — see Task 5 wiring)

### Task 7: Economy (`economy.ts`)

**Files:**
- Create: `src/game/economy.ts`
- Modify: `src/game/state.ts` — catch result uses `rewardFor`
- Test: `tests/economy.test.ts`

**Interfaces:**
- Produces:
  - `export interface RodDef { id:string; name:string; minLevel:number; price:number; stats:{strength:number;reel:number} }`
  - `export const RODS: RodDef[]` — `starter {lvl 1, 0, 1.0/1.0}`, `pro {lvl 4, 800, 1.35/1.2}`, `master {lvl 8, 3500, 1.8/1.45}`.
  - `export interface UpgradeDef { id:'strength'|'line'|'reel'; name:string; tiers:number; baseCost:number; desc:string }`
  - `export const UPGRADES: UpgradeDef[]` — strength `base 150`, line `base 120`, reel `base 180`; 5 tiers; cost `baseCost·3^tier`.
  - `export function rewardFor(species, weight):{coins:number;exp:number}` — `coins=round(coins·(0.5+0.5·weight/wMax)·rarityMult)`, `rarityMult={common:1,uncommon:1.6,rare:3,legendary:8}`.
  - `export function expForLevel(level):number` — cumulative `100·level^1.6`.
  - `export function levelForExp(exp):number` — inverse via loop.
  - `export function computeStats(profile):Stats` — `tensionMax=100·(1+0.15·upg.strength)·rod.stats.strength`, `reelSpeed=(1+0.12·upg.reel)·rod.stats.reel`, green band `GREEN_BAND` narrowed `0.02·upg.line` each side.
  - `export function applyCatch(p:Profile, species, weight):{coins,exp,leveled:boolean}` — mutates profile copy.
  - `export function canAfford(p,cost)`, `buyRod(p,id)`, `buyUpgrade(p,id)` — return new profile or `null` if rejected (insufficient funds, level, tier cap).

- [ ] **Step 1: Failing test**

```ts
// tests/economy.test.ts
import { describe, it, expect } from 'vitest';
import { SPECIES } from '../src/game/species';
import { rewardFor, levelForExp, computeStats, buyUpgrade, buyRod, RODS, UPGRADES, applyCatch } from '../src/game/economy';
import { defaultProfile } from '../src/save/adapter';

const perch = SPECIES.find(s=>s.id==='perch')!;

describe('economy', () => {
  it('reward scales with weight and rarity', () => {
    const small = rewardFor(perch, perch.wMin), big = rewardFor(perch, perch.wMax);
    expect(big.coins).toBeGreaterThan(small.coins);
    const legendary = SPECIES.find(s=>s.rarity==='legendary')!;
    expect(rewardFor(legendary, legendary.wMax).coins).toBeGreaterThan(big.coins);
  });
  it('level thresholds increase monotonically', () => {
    expect(levelForExp(0)).toBe(1);
    const l5 = levelForExp(2000); expect(l5).toBeGreaterThan(1);
    expect(levelForExp(10_000)).toBeGreaterThanOrEqual(l5);
  });
  it('reject purchases without funds/tier cap', () => {
    const p = defaultProfile();
    expect(buyUpgrade(p, 'reel')).toBeNull();           // 0 coins
    p.coins = 100000;
    let q = p; for (let i=0;i<5;i++) q = buyUpgrade(q,'reel')!;
    expect(buyUpgrade(q,'reel')).toBeNull();            // maxed
    const p2 = defaultProfile(); p2.coins=100000;
    expect(buyRod(p2,'master')).toBeNull();             // level 1 < 8
  });
  it('applyCatch updates coins, exp, collection', () => {
    const p = applyCatch(defaultProfile(), perch, 1.0);
    expect(p.coins).toBeGreaterThan(0);
    expect(p.collection.perch.count).toBe(1);
    expect(p.collection.perch.maxWeight).toBe(1.0);
  });
});
```

- [ ] **Step 2: FAIL → implement → refactor Task-5 inline reward to `rewardFor` → PASS → commit** `feat: economy, rods, upgrades, rewards`

---

### Task 8: Save adapter + Zustand store

**Files:**
- Create: `src/save/adapter.ts`, `src/game/store.ts`
- Test: `tests/save.test.ts`

**Interfaces:**
- Produces:
  - `export function defaultProfile():Profile` — `{coins:0,exp:0,level:1,rodId:'starter',upgrades:{strength:0,line:0,reel:0},collection:{},totalCaught:0}`.
  - `export interface SaveAdapter { load():Profile|null; save(p:Profile):void }`
  - `export const localAdapter:SaveAdapter` — key `uf3d_save_v1`, `JSON.stringify/parse`, try/catch + `typeof localStorage==='undefined'` guard → no-op/null (headless-safe).
  - `export const useGame = createStore<StoreState>` from `zustand`:
    ```ts
    interface StoreState {
      sim: GameState; profile: Profile; stats: Stats; reeling: boolean;
      tick(dt:number):void;
      chargeStart():void; chargeRelease():void; hook():void;
      setReeling(v:boolean):void; dismissResult():void;
      buyUpgrade(id:'strength'|'line'|'reel'):void; buyRod(id:string):void;
      hydrate():void;  // call once client-side: load profile
    }
    ```
  - `tick` calls sim `tick(sim,dt,{reeling})`, then on `phase→RESULT && result.kind==='caught'` applies `applyCatch` + `save` once (guard via consumed flag on result). Recompute `stats` when profile changes.

- [ ] **Step 1: Failing test**

```ts
// tests/save.test.ts
import { describe, it, expect } from 'vitest';
import { defaultProfile, localAdapter } from '../src/save/adapter';
import { useGame } from '../src/game/store';

describe('save adapter', () => {
  it('defaultProfile is a fresh level-1 profile', () => {
    const p = defaultProfile();
    expect(p.level).toBe(1); expect(p.coins).toBe(0); expect(p.rodId).toBe('starter');
  });
  it('localAdapter is headless-safe', () => {
    expect(localAdapter.load()).toBeNull();      // no localStorage in node
    expect(()=>localAdapter.save(defaultProfile())).not.toThrow();
  });
  it('store hydrates defaults and ticks', () => {
    useGame.getState().hydrate();
    const st = useGame.getState();
    expect(st.profile.level).toBe(1);
    st.tick(1/60);
    expect(useGame.getState().sim.t).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: FAIL → implement → PASS → commit** `feat: save adapter + zustand store`

---

### Task 9: Sound generation + audio manager

**Files:**
- Create: `scripts/gen-sounds.mjs`, `public/sounds/*.wav` (generated, committed), `src/audio/manager.ts`
- Test: `tests/audio.test.ts` (WAV header validation only)

**Interfaces:**
- Produces:
  - `export type Sfx = 'splash'|'bite'|'reel'|'catch'|'snap'|'click'|'water'`
  - `export function playSfx(name:Sfx):void` — lazy `new Howl({src:[`sounds/${name}.wav`]})` cache; guard `typeof window`.
  - `export function startWaterLoop()/stopWaterLoop():void` — `water.wav`, `loop:true`, volume 0.3.
  - `export function startReelLoop()/stopReelLoop():void` — reel ratchet, loop while reeling.
  - Files generated: `water.wav` (3s brown-noise loop), `splash.wav` (0.4s noise burst w/ decay), `bite.wav` (0.3s two-tone beep 880→1320Hz), `reel.wav` (0.25s click-ratchet loop), `catch.wav` (0.8s 3-note arpeggio sine), `snap.wav` (0.2s noise crack), `click.wav` (0.05s square blip). All 16-bit mono 22050Hz PCM written by `gen-sounds.mjs` via raw Buffer — no deps.

- [ ] **Step 1: Failing test**

```ts
// tests/audio.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';

const WAVS = ['splash','bite','reel','catch','snap','click','water'];
describe('generated audio', () => {
  for (const n of WAVS) it(`${n}.wav is a valid PCM WAV`, () => {
    const p = `public/sounds/${n}.wav`;
    expect(existsSync(p)).toBe(true);
    const b = readFileSync(p);
    expect(b.toString('ascii',0,4)).toBe('RIFF');
    expect(b.toString('ascii',8,12)).toBe('WAVE');
    expect(b.readUInt16LE(34)).toBe(16);       // bit depth
    expect(b.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: FAIL → write `gen-sounds.mjs`, run `npm run gen-sounds` → PASS → implement `manager.ts` → commit** `feat: procedural audio generation + howler manager`

---

### Task 10: Scene — GameCanvas + Lake + Water + Environment + CameraRig

**Files:**
- Create: `src/scene/GameCanvas.tsx`, `Lake.tsx`, `Water.tsx`, `Environment.tsx`, `CameraRig.tsx`; Modify: `src/app/Game.tsx`
- Test: none (visual task — verified Task 16)

**Interfaces:**
- Consumes: `useGame` selectors (`sim.phase`, `sim.bobber`, `sim.fishes`), config `WATER_R`, `DOCK_POS`, `ROD_TIP`.
- Produces:
  - `<GameCanvas>` — `<Canvas camera={{position:[14,10,-44],fov:50}} dpr={[1,1.5]} shadows>` containing `<CameraRig/>`, lighting, `<Lake/>`, `<Water/>`, `<Environment/>`, `<FishSchool/>` (Task 12), `<FishingLine/>`, `<Fisherman/>`, `<Effects/>`, `<EffectComposer><Bloom intensity={0.4} luminanceThreshold={0.7}/></EffectComposer>`. Owns `useFrame((_,dt)=>useGame.getState().tick(dt))`.
  - `<Water/>` — `circleGeometry(WATER_R, 96)` rotated flat at y=0, `ShaderMaterial`: vertex displaces y with 2 gerstner-lite sine waves (`uTime`); fragment: deep `#1a5f7a` → shallow `#2e8ba8` fresnel blend vs. view angle, moving specular streak from `uSunDir`, procedural foam ring `smoothstep` near radius edge, ring ripple around `uBobber` uniform (`vec3`, sine ring expanding with `uTime`). Transparent, `depthWrite:false` layering over `Lake` bed.
  - `<Lake/>` — lake bed disc (dark `#173a2e`, y=-4..0 gentle bowl via vertex displacement in geometry bake) + surrounding terrain ring `circleGeometry(120)` y≈0.35 grass `#3f7d46` with subtle low-poly bump noise baked into vertices.
  - `<Environment/>` — instanced meshes: trees = `coneGeometry` canopy + `cylinderGeometry` trunk ×120 scattered on terrain ring (r∈[46,110]), rocks = `icosahedronGeometry(1,0)` ×30 near shore, grass = small `coneGeometry` ×400 on inner ring. All `InstancedMesh` with static matrices set in `useMemo`; vertex sway for grass via `onBeforeCompile` time uniform — optional, skip if >30 lines.
  - `<CameraRig/>` — `OrbitControls` (drei) target `lerp` between `[0,1,-27]` (idle) and `sim.bobber` (WAITING/FIGHTING) via damped `useFrame`; `enablePan=false`, `minDistance=8 maxDistance=40`, `maxPolarAngle=1.45`, damping. Touch works via OrbitControls pointer events.
  - Lighting: `<directionalLight position={[40,50,20]} intensity={1.6} castShadow shadow-mapSize={1024}/>`, `<hemisphereLight args={['#bfe3ff','#2a4a3a',0.5]}/>`, `<fog attach="fog" args={['#9fc8d8',60,220]}/>` inside `<Canvas>`.

- [ ] **Step 1: Implement components** (single pass — no unit tests for scene)

- [ ] **Step 2: `npx next build` → compiles; `npm run dev` + browser screenshot check** (lake + water + trees render)

- [ ] **Step 3: Commit** `feat: 3D lake scene — water shader, terrain, instanced environment`

---

### Task 11: Scene — Fisherman + FishingLine + Effects

**Files:**
- Create: `src/scene/Fisherman.tsx`, `FishingLine.tsx`, `Effects.tsx`

**Interfaces:**
- Produces:
  - `<Fisherman/>` — low-poly articulated rig at `DOCK_POS` on a wooden plank dock (3 boxGeometry planks + 2 posts): torso (box), head (sphere, cap cone), arm group pivoted at shoulder holding `fishingRod` (thin cylinder + reel torus). Pose driven by `useFrame` reading `sim.phase`: IDLE gentle sway `sin(t)`; CHARGING arm rotates back ∝ `charge.power`; CASTING flicks forward over `cast.t`; WAITING relaxed hold; FIGHTING arm pulls, torso leans back ∝ `fight.tension`. Rod tip world position → exposed via module-level `rodTipRef` (a `Vector3` updated in `useFrame`) consumed by `FishingLine`.
  - `<FishingLine/>` — 14-segment verlet rope in `useFrame`: positions array pinned start=`rodTipRef`, end=`sim.bobber` (or rod tip when null → reel-in). Gravity `-9.8·0.2` on middle nodes, 2 constraint iterations. Rendered as `<line>` primitive via `Line` from drei (`points` prop updated per frame).
  - `<Effects/>` — pooled: `sim.effects` array → splash = expanding ring mesh (`ringGeometry`, opacity fades over 0.8s), ripple = flat ring, spark = small sprite burst. Each effect spawned in sim has `t` advanced by tick; component maps to meshes, removes at `t>1`. Plus `CAUGHT` moment: scale-up fish sprite above bobber for 1.5s (reads `sim.result`).

- [ ] **Step 1: Implement; Step 2: `npm run dev` visual check — cast produces arc + splash ring; Step 3: commit** `feat: fisherman rig, verlet fishing line, effects`

---

### Task 12: Scene — FishSchool

**Files:**
- Create: `src/scene/FishSchool.tsx`

**Interfaces:**
- Produces:
  - `<FishSchool/>` — procedural fish geometry: `useMemo` builds a merged `BufferGeometry` (body = `sphereGeometry` scaled `[1,0.45,0.25]`, tail = flattened cone merged via `mergeGeometries` from three/examples `BufferGeometryUtils`). `InstancedMesh` count `FISH_COUNT`; per-frame `useFrame` writes each `sim.fishes[i].pos` → matrix (orient along `vel`, tail-wiggle `rotation.y += sin(t·8)·0.3`), `setColorAt` per species `colors[0]` (belly color used on second instanced layer or tint lerp — simple: single color per instance). Hide `CAUGHT`/escaped fish by scaling matrix to 0.
  - Underwater visibility: fish rendered beneath transparent water — `depthTest` on, y below 0; add slight `pointLight` underwater glow `#2e8ba8` near bobber during WAITING for readability.

- [ ] **Step 1: Implement; Step 2: visual check — fish school visible swimming under surface; Step 3: commit** `feat: instanced fish school`

---

### Task 13: UI — HUD + CastButton + FightUI + BitePrompt + CatchCard

**Files:**
- Create: `src/ui/HUD.tsx`, `CastButton.tsx`, `FightUI.tsx`, `BitePrompt.tsx`, `CatchCard.tsx`
- Modify: `src/app/Game.tsx` — compose canvas + overlay

**Interfaces:**
- Consumes: `useGame` store actions/selectors; `profile`, `stats`; `sim.phase`, `sim.charge`, `sim.fight`, `sim.bite`, `sim.result`.
- Produces `src/app/Game.tsx` layout: `<Providers>` → `<div className="fixed inset-0">` → `<GameCanvas/>` + absolutely-positioned UI layers + `onPointerDown/Up` wiring for hook action on the canvas during BITE_WINDOW.
  - `<HUD/>` — top bar: `Lv {profile.level}` + EXP progress bar (framer-motion `motion.div` width), coins `{profile.coins}` with coin icon, Collection/Shop buttons opening `<Panels/>`.
  - `<CastButton/>` — bottom-center large round button visible in `IDLE`/`CHARGING`; `onPointerDown=chargeStart onPointerUp=chargeRelease`; during CHARGING shows power arc `sim.charge.power` (conic-gradient or SVG arc), label "THẢ CÂU"→"BUÔNG!".
  - `<FightUI/>` — during FIGHTING: vertical tension gauge, green band `[greenLo,greenHi]` highlighted, needle = `fight.tension`, red zone >0.9 flashes; hold-anywhere reel: pointer down/up on overlay sets `setReeling`; reel progress bar `1 - remaining/START_DEPTH`.
  - `<BitePrompt/>` — BITE_WINDOW: pulsing "🐟 NOW!" + radial countdown `1 - t/window`; canvas tap calls `hook()`.
  - `<CatchCard/>` — RESULT: framer-motion spring card: species name + rarity chip (color-coded), weight kg, `+coins` `+exp` badges; `snap`/`escape`/`missed` variants ("Line snapped!" / "It got away…" / "Missed!"); dismiss button → `dismissResult()`.
  - Audio hooks in components: `BitePrompt` mount → `playSfx('bite')`; cast→WAITING transition → `splash`; `catch` result → `catch`, `snap`→`snap`; reeling toggles `startReelLoop/stopReelLoop`; water loop starts on first user gesture.

- [ ] **Step 1: Implement all UI + Game.tsx composition**

- [ ] **Step 2: Manual smoke — `npm run dev`, browser: full loop playable end-to-end** (charge, cast, bite prompt, fight gauge, result card)

- [ ] **Step 3: Commit** `feat: HUD, cast/reel controls, bite prompt, catch card`

---

### Task 14: UI — Panels (Collection + Shop/Upgrade)

**Files:**
- Create: `src/ui/Panels.tsx`

**Interfaces:**
- Consumes: `profile`, `buyUpgrade`, `buyRod`, `SPECIES`, `UPGRADES`, `RODS`, `computeStats`.
- Produces:
  - `<Panels open={tab|null}/>` — slide-up bottom sheet (framer-motion `AnimatePresence`), two tabs:
    - **Collection:** grid of all `SPECIES`, silhouette (tinted `colors[0]` block) if `profile.collection[id]` missing; else name, count, `maxWeight` kg, rarity chip.
    - **Shop:** rod cards (name, stats, price / "Lv N req" / "Equipped"), upgrade rows (name, desc, tier pips ◕◕◕◕◕, cost or MAX). Buttons call store actions; disabled when `buyX` would return null — compute via `canAfford`/level checks, not by calling mutators.
  - Coins shown in panel header, live-updates after purchase.

- [ ] **Step 1: Implement; Step 2: smoke — buy an upgrade after catching fish, verify coins decrement + stats recompute; Step 3: commit** `feat: collection + shop panels`

---

### Task 15: React Query wiring for profile

**Files:**
- Modify: `src/ui/Providers.tsx`, `src/app/Game.tsx`, `src/game/store.ts`

**Interfaces:**
- Produces: profile load/save wrapped in React Query (`useQuery(['profile'], load)` + `useMutation(save)`), satisfying the data-layer spec; `hydrate` becomes a query effect. Debounce saves (500ms) inside `localAdapter.save` call site in store — simple `setTimeout` trailing guard.

- [ ] **Step 1: Implement; Step 2: `npx next build` + vitest still green; Step 3: commit** `feat: react-query profile persistence layer`

---

### Task 16: Browser verification pass

**Files:** none (verification only)

- [ ] **Step 1: `npm run dev` via hub process; open `browser.open` → play: charge/cast/wait; force fast bite by temporarily testing with seeded store OR play ~30s; verify: splash, bite prompt appears, hook works, fight gauge live, catch card, coins increment, collection panel updates, reload → profile persists.**
- [ ] **Step 2: `npx next build` clean; `npx vitest run` all green; `npx eslint .` clean.**
- [ ] **Step 3: Fix anything found; commit** `fix: browser pass corrections` (if needed).

---

### Task 17: DevOps + README

**Files:**
- Create: `.github/workflows/deploy.yml`, `vercel.json`, `README.md`, `LICENSE` (MIT, optional)

- [ ] **Step 1: Write files**

`.github/workflows/deploy.yml`:
```yaml
name: deploy
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
          working-directory: ./
```
`vercel.json`: `{ "framework": "nextjs", "regions": ["sin1"], "buildCommand": "next build" }`.
`README.md`: title, stack list, `npm install && npm run dev`, controls (hold to charge → release to cast → tap on bite → hold to reel, keep tension in green), upgrade/economy summary, deploy instructions incl. the three secrets and `vercel --prod`, and a "Sub-projects" section listing deferred work (backend, maps 2–4, GLB assets, Rapier).

- [ ] **Step 2: `git checkout -b develop` (create branch); commit on develop, merge to main:** `feat: CI workflow, vercel config, README`

- [ ] **Step 3: Final summary to user: files, how to run, exact deploy commands.**

---

## Self-Review Notes

- Spec coverage: state machine ✓(T4), fish model ✓(T3), fight ✓(T5), economy ✓(T7), rods ✓(T7), save adapter ✓(T8), water shader/terrain/instancing ✓(T10), fisherman rig+poses ✓(T11), verlet line ✓(T11), effects ✓(T11), fish InstancedMesh ✓(T12), HUD/cast/fight/bite/catch UI ✓(T13), panels ✓(T14), audio ✓(T9+T13 wiring), React Query ✓(T15), perf (instancing, dpr cap, bloom budget) ✓(T10/T12), vitest suite ✓, CI/vercel/README ✓(T17), browser verification ✓(T16).
- Deferred per spec §Deferrals: Rapier, maps 2–4, weather, quests, leaderboard, DB/API, Draco, LOD, GLTF.
