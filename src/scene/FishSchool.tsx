'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../game/store';
import { speciesById } from '../game/species';
import { FISH_COUNT } from '../game/config';

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

export default function FishSchool() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const fish = useGame((s) => s.sim.fishes);

  const geometry = useMemo(() => {
    // body: squashed sphere; tail: flattened cone pointing back (-x after rotate)
    const body = new THREE.SphereGeometry(0.45, 8, 6);
    body.scale(1, 0.45, 0.28);
    const tail = new THREE.ConeGeometry(0.22, 0.55, 4);
    tail.rotateZ(Math.PI / 2); // point along -x
    tail.scale(1, 1, 0.25);
    tail.translate(-0.62, 0, 0);
    const fin = new THREE.ConeGeometry(0.14, 0.3, 4);
    fin.scale(1, 1, 0.3);
    fin.rotateX(Math.PI);
    fin.translate(0, 0.28, 0);
    return mergeGeometries([body, tail, fin])!;
  }, []);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }),
    []
  );

  // static per-instance colors
  useMemo(() => {
    // colors assigned lazily in first frame below once mesh exists
  }, []);

  const colored = useRef(false);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < fish.length && i < FISH_COUNT; i++) {
      const f = fish[i];
      const sp = speciesById(f.speciesId);
      const hidden = f.aiState === 'CAUGHT';
      const scale = hidden ? 0.0001 : 0.5 + (f.weight / sp.wMax) * 1.1;
      tmpObj.position.set(f.pos[0], f.pos[1], f.pos[2]);
      // face velocity direction
      if (Math.abs(f.vel[0]) + Math.abs(f.vel[2]) > 0.01) {
        tmpObj.rotation.y = -Math.atan2(f.vel[2], f.vel[0]);
      }
      // tail wiggle
      tmpObj.rotation.y += Math.sin(t * 8 + i * 1.7) * 0.18;
      tmpObj.scale.setScalar(scale);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
      if (!colored.current) {
        tmpColor.set(sp.colors[0]);
        m.setColorAt(i, tmpColor);
      }
    }
    colored.current = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, FISH_COUNT]}
      frustumCulled={false}
    />
  );
}
