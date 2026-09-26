# Ultimate Fishing: Reel Catch 3D — Sub-project 1 Design

**Date:** 2026-09-26
**Status:** Approved (user: "làm đi", approach A selected)
**Scope:** Playable 3D fishing prototype — sub-project 1 of the full spec

## Intent

Replace the existing zero-dependency 2D canvas fishing game in `F:/WEB` with a
Next.js 15 + React Three Fiber 3D fishing game modeled on the Playhop title
"Ultimate Fishing: Reel Catch". Casual, browser-first, playable end-to-end.

Full spec (6 subsystems) is decomposed into sequential sub-projects:

| # | Sub-project | Status |
|---|---|---|
| 1 | Playable 3D prototype (this spec) | In progress |
| 2 | Backend: Prisma schema + API routes, catch validation, inventory/shop | Deferred |
| 3+ | River/Ocean/Deep Sea maps, quests, leaderboard, weather, LOD, Draco, Rapier | Deferred |

## Decisions (locked)

- **Architecture A — sim-core + render shell.** Pure-TypeScript game module in
  Zustand; R3F renders read-only; React UI overlays. Deterministic, vitest-testable.
- **No Rapier in v1.** Cast uses closed-form ballistics + verlet rope for the
  line. Rapier is deferred until a subsystem needs rigid bodies.
- **All assets procedural.** No GLB files exist. Low-poly stylized look via
  generated geometry; `Fisherman.tsx` uses procedural poses over a simple
  articulated rig (deviation from "GLB + AnimationMixer" in the original brief —
  real models can slot in later without changing the sim).
- **Replace in place.** Old 2D game files deleted; baseline committed to git first.
- **Deploy prepped, not run.** No GitHub/Vercel credentials in this environment.
  I produce CI workflow + vercel.json + instructions; user runs push/deploy.
- **localStorage persistence** behind a `SaveAdapter` interface; Postgres impl
  is a drop-in swap in sub-project 2.

## 1. Architecture

```
F:/WEB
├── app/
│   ├── layout.tsx              # fonts, globals
│   ├── page.tsx                # dynamic-import <Game/> (ssr:false) + HUD
│   └── globals.css             # tailwind
├── src/
│   ├── game/                   # PURE TS — no three/react imports
│   │   ├── state.ts            # state machine + tick(dt)
│   │   ├── fish.ts             # species table, Fish entity, AI states
│   │   ├── fight.ts            # tension/reel model
│   │   ├── economy.ts          # coins/EXP/levels/upgrades
│   │   ├── config.ts           # all tuning constants
│   │   └── store.ts            # Zustand store: sim state + UI actions
│   ├── scene/                  # R3F components (read store, render only)
│   │   ├── GameCanvas.tsx      # <Canvas>, camera, lighting, post
│   │   ├── Lake.tsx            # terrain ring, water mesh
│   │   ├── Water.tsx           # custom ShaderMaterial (gerstner-lite,
│   │   │                       #   fresnel, shore foam)
│   │   ├── FishSchool.tsx      # InstancedMesh, per-instance transforms
│   │   ├── Fisherman.tsx       # articulated low-poly rig, procedural poses
│   │   ├── FishingLine.tsx     # verlet rope between rod tip and bobber
│   │   ├── Environment.tsx     # instanced trees/rocks/grass, sky, fog
│   │   └── Effects.tsx         # splash rings, hook flash, catch burst
│   ├── ui/
│   │   ├── HUD.tsx             # top bar (level/EXP/coins), quest stub
│   │   ├── CastButton.tsx      # hold-to-charge power gauge
│   │   ├── FightUI.tsx         # tension gauge + reel progress
│   │   ├── BitePrompt.tsx      # "NOW!" indicator + countdown
│   │   ├── CatchCard.tsx       # species, weight, rarity, reward
│   │   └── Panels.tsx          # Collection, Shop/Upgrade (tabs)
│   ├── save/
│   │   └── adapter.ts          # SaveAdapter interface + localStorage impl
│   └── audio/
│       └── manager.ts          # Howler wrapper, generated WAV blobs
├── scripts/
│   └── gen-sounds.mjs          # writes public/sounds/*.wav (one-time)
├── tests/                      # vitest, sim-core only
├── .github/workflows/deploy.yml
├── vercel.json
└── README.md
```

Data flow: Zustand store owns `GameState` (plain object, ticked by
`tick(dt)`). Scene components read via selectors. UI dispatch actions
(`startCharge`, `releaseCast`, `hook`, `setReeling`, `buyUpgrade`, …).
One RAF inside `<Canvas>` drives `useFrame(() => tick(dt))`.

## 2. Core loop — state machine

`IDLE → CHARGING → CASTING → WAITING → BITE_WINDOW → FIGHTING → CATCH_RESULT → IDLE`

Escape branches: `LINE_SNAP`, `FISH_ESCAPED` (→ result card → IDLE).
`AIM` is implicit in IDLE (orbit camera free look).

- **CHARGING:** press-and-hold runs an oscillating power gauge 0–100 (as the
  2D game). Release commits `power`, enters CASTING.
- **CASTING:** ballistic arc `p(t)` from rod tip toward aim point on the water;
  distance ∝ power. On water contact: splash ripple + sound → WAITING.
- **WAITING:** every tick, each fish within `attractRadius` of the bobber rolls
  `P(chase) = base[species] · baitFactor`. On success fish enters `CHASE_BAIT`,
  swims to bobber, then `BITE` after `approachDelay`.
- **BITE_WINDOW:** `biteWindow` 1.2–2.5s (rarity-scaled — rarer = shorter).
  Splash ring, rod-tip dip, vibration API, sting sound. Click/space = hook →
  FIGHTING. Timeout → fish escapes, back to WAITING (fish scatters to new point).
- **FIGHTING:** hold-to-reel.
  - `tension += (reelForce · reeling − drain) · dt`
  - `fishPower(t)` = `species.basePower · (1 + burst(t))`, `burst` a scheduled
    pseudo-random pulse train; while bursting, fish surges and tension gain
    from reeling is amplified.
  - Reel progress `remaining -= reelSpeed · dt` only while tension ∈ green
    band `[0.25, 0.75] · tensionMax`.
  - `tension ≥ tensionMax` → LINE_SNAP. `tension ≤ slackMin` for `slackTime`
    1.5s → FISH_ESCAPED. `remaining ≤ 0` → CAUGHT.
- **CATCH_RESULT:** reward card (species, weight roll, rarity, coins, EXP) →
  collection record, EXP/level check, autosave → IDLE.

## 3. Fish model

```ts
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
interface FishSpecies {
  id: string; name: string; rarity: Rarity;
  basePower: number;        // fight strength
  weightMin: number; weightMax: number; // kg
  baseCoins: number; exp: number;
  color: [string, string];  // body, belly
  attractP: number;         // bite probability weight
  speed: number;
}
interface Fish {
  id: number; speciesId: string;
  pos: Vec3; vel: Vec3;
  aiState: 'IDLE' | 'SWIMMING' | 'CHASE_BAIT' | 'BITE' | 'FIGHT' | 'ESCAPE' | 'CAUGHT';
  waypoint: Vec3; wanderT: number;
}
```

8 species for Small Lake across 4 rarities (e.g. Minnow, Bluegill, Perch,
Bass, Pike, Catfish, Koi, Golden Carp). Movement: waypoint wander + arrival
steering; simple separation between schoolmates. `InstancedMesh` with
per-instance color via `instanceColor`.

## 4. Economy & progression

- `coins = round(baseCoins · weightRatio · rarityMult)` where
  `weightRatio = weight / weightMax`, `rarityMult` = {1, 1.6, 3, 8}.
- EXP → level thresholds `level_n = 100 · n^1.6` (cumulate). Level gates rod tiers.
- Upgrades (5 tiers each, cost `base · 3^tier`):
  Rod Strength (↑ tensionMax), Line (↑ tensionMax & snap margin),
  Reel (↑ reelSpeed).
- 3 rods: Starter (l1), Pro (l4), Master (l8) — each is a stat preset + price.
- Profile shape: `{ coins, exp, level, rodId, upgrades, collection: Record<speciesId,{count,maxWeight}>, totals }`.
- `SaveAdapter.load() → Profile | null`; `localStorage` key `uf3d_save_v1`.

## 5. Scene (procedural)

- **Water:** 128×128 plane, vertex gerstner-lite (2 waves), fragment fresnel
  reflection color blend + procedural shore-foam ring at terrain edge.
  Uniforms: `uTime`, `uSunDir`, `uBobberPos` (local ripple).
- **Terrain:** ring mesh around the water disc, displaced plane — grass green
  low-poly. Trees = instanced cone/sphere pairs (~120), rocks = icosahedron
  instances (~30), grass tufts (~400 instanced quads w/ vertex sway).
- **Fisherman:** dock/boat edge, low-poly rig (torso, head, arm groups).
  Procedural poses keyed off sim state: idle sway, wind-up during CHARGING,
  throw flick on release, lean-back during FIGHTING.
- **Fishing line:** verlet rope (12 segments, gravity + windless), endpoints
  pinned rod-tip ↔ bobber.
- **Lighting:** directional sun + hemisphere; `fog` for depth; soft bloom via
  `@react-three/postprocessing` (LuminanceSmoothing, low intensity).
- **Camera:** orbit around fisherman, polar clamp, zoom 8–24, smooth damp.
  During FIGHTING camera eases toward bobber/hooked fish.

## 6. Audio

Howler per spec. `scripts/gen-sounds.mjs` synthesizes WAVs (16-bit PCM):
`water-loop` (filtered noise), `reel` (click-ratchet loop), `splash`,
`bite` (sting), `catch` (jingle), `snap`, `ui-click`. Run once; committed.
No external audio assets.

## 7. Performance

- Fish + vegetation instanced; total draw calls target < 60.
- `dpr={[1, 1.5]}` cap; antialias on, shadows limited to one directional map.
- Objects pooled: ripples, splash sprites, catch bursts.
- Frustum culling is automatic in three; LOD deferred (single small scene).
- Budget: 60fps desktop, 45+ mobile — measured in the browser smoke pass.

## 8. Testing

Vitest over sim core only (no DOM/WebGL):

- State machine transitions: full happy path IDLE→…→CATCH_RESULT; illegal
  transitions rejected.
- Fight model: reachable win/loss — scripted reel inputs produce all three
  of catch/snap/escape for a mid species.
- Bite probability: seeded RNG → nonzero bites within N seconds of sim.
- Economy: reward formula, level-up thresholds, upgrade cost curve, rod gating.
- Save adapter round-trip (localStorage stub).

Visual surface verified manually: `next dev`, play the full loop in Chromium
via the browser tool.

## 9. DevOps (prepped, user runs remote steps)

- git: already initialized; branches `main` (existing) + `develop`.
- Commits: conventional (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`).
- `.github/workflows/deploy.yml`: on push to main → setup → lint → vitest →
  build → deploy to Vercel via `vercel-action` gated on
  `secrets.VERCEL_TOKEN` (+ `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- `vercel.json`: framework nextjs, regions sin1.
- README: stack, run commands, controls, deploy steps incl. required secrets.

## Deferrals (explicit)

Rapier, maps 2–4, weather, quests, leaderboard, Prisma/Postgres + all /api
routes, auth, Draco, LOD, GLTF assets, mobile-tuned touch gestures (basic
touch works via pointer events), anti-cheat.
