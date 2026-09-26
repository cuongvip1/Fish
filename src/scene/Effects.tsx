'use client';

import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../game/store';
import { speciesById } from '../game/species';
import { EFFECT_TTL } from '../game/config';

/** Splash rings / ripples / sparks spawned by the sim's effects array. */
export default function Effects() {
  const effects = useGame((s) => s.sim.effects);

  return (
    <group>
      {effects.map((e) => (
        <EffectMesh key={e.id} kind={e.kind} pos={e.pos} t={e.t} />
      ))}
      <CaughtShowcase />
    </group>
  );
}

function EffectMesh({ kind, pos, t }: { kind: string; pos: [number, number, number]; t: number }) {
  const k = Math.min(1, t / EFFECT_TTL);
  const opacity = 1 - k;
  if (kind === 'splash' || kind === 'ripple' || kind === 'ring') {
    const base = kind === 'ring' ? 1.2 : kind === 'splash' ? 0.6 : 1.6;
    const scale = base + k * (kind === 'ring' ? 2.2 : 3.5);
    const color = kind === 'ring' ? '#ffe28a' : '#cfeef8';
    return (
      <mesh position={[pos[0], 0.12 + k * 0.05, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[scale, scale + 0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    );
  }
  return null;
}

/** Caught fish leaps above the water during RESULT. */
function CaughtShowcase() {
  const sim = useGame((s) => s.sim);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    if (sim.phase === 'RESULT' && sim.result?.kind === 'caught' && sim.result.fish) {
      g.visible = true;
      const p = sim.result.fish.pos;
      const hop = Math.sin(Math.min(1, sim.t / 0.9) * Math.PI);
      g.position.set(p[0] * 0.4, 1.6 + hop * 2.2, p[2] * 0.4 - 10);
      g.rotation.y = state.clock.elapsedTime * 4;
      g.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.4;
    } else {
      g.visible = false;
    }
  });

  const fish = sim.result?.fish;
  const sp = fish ? speciesById(fish.speciesId) : null;

  return (
    <group ref={ref} visible={false}>
      {sp && (
        <mesh>
          <sphereGeometry args={[0.5, 10, 8]} />
          <meshStandardMaterial color={sp.colors[0]} flatShading />
        </mesh>
      )}
    </group>
  );
}
