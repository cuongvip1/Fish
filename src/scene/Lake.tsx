'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WATER_R } from '../game/config';

/** Lake bed bowl + surrounding grass ring, deterministic vertex noise. */
export default function Lake() {
  const bed = useMemo(() => {
    const g = new THREE.CircleGeometry(WATER_R + 0.6, 96);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      // bowl: deeper at center
      pos.setY(i, -3.4 + (r / WATER_R) * 2.9 + Math.sin(x * 0.8) * Math.cos(z * 0.7) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const terrain = useMemo(() => {
    const g = new THREE.RingGeometry(WATER_R - 1.5, 130, 96, 6);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const edge = Math.min(1, (r - WATER_R) / 8); // ramp up from shore
      const bump =
        Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.3 +
        Math.sin(x * 0.5 + z * 0.4) * 0.35 +
        Math.sin(x * 0.07 - z * 0.09) * 2.0;
      pos.setY(i, 0.15 + edge * (1.5 + bump * 0.8) - (1 - edge) * 0.4);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group>
      <mesh geometry={bed} receiveShadow>
        <meshStandardMaterial color="#173a2e" roughness={1} />
      </mesh>
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial color="#3f7d46" roughness={1} flatShading />
      </mesh>
    </group>
  );
}
