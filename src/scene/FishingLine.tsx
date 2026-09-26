'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../game/store';
import { bobberPosition } from '../game/state';
import { rodTipRef } from './Fisherman';

const SEGMENTS = 14;
const GRAVITY = -1.8;
const tmpBob = new THREE.Vector3();

export default function FishingLine() {
  const { line, points, prev } = useMemo(() => {
    const pts = Array.from({ length: SEGMENTS + 1 }, () => rodTipRef.clone());
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((SEGMENTS + 1) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#e8e4d8', transparent: true, opacity: 0.85 });
    const l = new THREE.Line(geo, mat);
    l.frustumCulled = false;
    return { line: l, points: pts, prev: pts.map((p) => p.clone()) };
  }, []);

  useFrame((state, dt) => {
    const sim = useGame.getState().sim;
    const bob = bobberPosition(sim);
    const cdt = Math.min(dt, 0.05);
    const d2 = cdt * cdt;

    for (let i = 1; i < SEGMENTS; i++) {
      const p = points[i];
      const old = prev[i];
      const vx = (p.x - old.x) * 0.985;
      const vy = (p.y - old.y) * 0.985;
      const vz = (p.z - old.z) * 0.985;
      old.copy(p);
      p.x += vx;
      p.y += vy + GRAVITY * d2 * 30;
      p.z += vz;
    }

    points[0].copy(rodTipRef);
    if (bob) tmpBob.set(bob[0], bob[1] + 0.05, bob[2]);
    else tmpBob.copy(rodTipRef);
    points[SEGMENTS].copy(tmpBob);
    prev[0].copy(points[0]);
    prev[SEGMENTS].copy(points[SEGMENTS]);

    const rest = points[0].distanceTo(points[SEGMENTS]) / SEGMENTS;
    const segLen = Math.max(0.15, rest * 1.02);
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < SEGMENTS; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-5;
        const diff = (d - segLen) / d;
        const wa = i === 0 ? 0 : i === SEGMENTS ? 1 : 0.5;
        const wb = i + 1 === SEGMENTS ? 0 : i === 0 ? 1 : 0.5;
        a.x += dx * diff * wa; a.y += dy * diff * wa; a.z += dz * diff * wa;
        b.x -= dx * diff * wb; b.y -= dy * diff * wb; b.z -= dz * diff * wb;
      }
    }

    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i <= SEGMENTS; i++) {
      attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={line} />
      <Bobber />
    </group>
  );
}

function Bobber() {
  const ref = useRef<THREE.Mesh>(null);
  const biteFlash = useGame((s) => s.sim.phase === 'BITE_WINDOW');

  useFrame(() => {
    const b = ref.current;
    if (!b) return;
    const pos = bobberPosition(useGame.getState().sim);
    if (pos) {
      b.visible = true;
      b.position.set(pos[0], pos[1] + 0.08, pos[2]);
    } else {
      b.visible = false;
    }
  });

  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.14, 10, 8]} />
      <meshStandardMaterial
        color="#e03b3b"
        emissive={biteFlash ? '#ff2020' : '#400000'}
        emissiveIntensity={biteFlash ? 1.6 : 0.3}
      />
    </mesh>
  );
}
