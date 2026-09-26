'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGame } from '../game/store';
import { bobberPosition } from '../game/state';

const IDLE_TARGET = new THREE.Vector3(0, 1.2, -27);
const tmp = new THREE.Vector3();

export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const sim = useGame.getState().sim;
    const bob = bobberPosition(sim);
    if ((sim.phase === 'WAITING' || sim.phase === 'BITE_WINDOW' || sim.phase === 'FIGHTING') && bob) {
      tmp.set(bob[0] * 0.55, 1.0, bob[2] * 0.55 + IDLE_TARGET.z * 0.45);
    } else {
      tmp.copy(IDLE_TARGET);
    }
    c.target.lerp(tmp, 0.04);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      target={IDLE_TARGET.toArray()}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={46}
      maxPolarAngle={1.45}
      minPolarAngle={0.35}
    />
  );
}
