'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WATER_R } from '../game/config';
import { mulberry32 } from '../game/math';

const TREES = 120;
const ROCKS = 30;
const GRASS = 400;

export default function Environment() {
  const { trunkMesh, canopyMesh, rockMesh, grassMesh } = useMemo(() => {
    const rng = mulberry32(1337);
    const tmp = new THREE.Object3D();

    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.32, 1.8, 5),
      new THREE.MeshStandardMaterial({ color: '#5a4230', roughness: 1, flatShading: true }),
      TREES
    );
    const canopy = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.5, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: '#2f6b38', roughness: 1, flatShading: true }),
      TREES
    );
    for (let i = 0; i < TREES; i++) {
      const a = rng() * Math.PI * 2;
      const r = WATER_R + 5 + rng() * 60;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 0.7 + rng() * 1.1;
      const y = 1.0 + (r - WATER_R) * 0.12 + Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.0;
      tmp.position.set(x, y, z);
      tmp.scale.setScalar(s);
      tmp.rotation.y = rng() * Math.PI;
      tmp.updateMatrix();
      trunk.setMatrixAt(i, tmp.matrix);
      tmp.position.y += 2.1 * s;
      tmp.updateMatrix();
      canopy.setMatrixAt(i, tmp.matrix);
    }

    const rock = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: '#8a8f94', roughness: 1, flatShading: true }),
      ROCKS
    );
    for (let i = 0; i < ROCKS; i++) {
      const a = rng() * Math.PI * 2;
      const r = WATER_R - 0.5 + rng() * 8;
      tmp.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      tmp.scale.set(0.4 + rng() * 1.2, 0.3 + rng() * 0.8, 0.4 + rng() * 1.2);
      tmp.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      tmp.updateMatrix();
      rock.setMatrixAt(i, tmp.matrix);
    }

    const grass = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.09, 0.55, 4),
      new THREE.MeshStandardMaterial({ color: '#5f9b4e', roughness: 1 }),
      GRASS
    );
    for (let i = 0; i < GRASS; i++) {
      const a = rng() * Math.PI * 2;
      const r = WATER_R - 0.5 + rng() * 26;
      tmp.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
      tmp.scale.setScalar(0.6 + rng());
      tmp.rotation.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4);
      tmp.updateMatrix();
      grass.setMatrixAt(i, tmp.matrix);
    }

    trunk.castShadow = canopy.castShadow = true;
    return { trunkMesh: trunk, canopyMesh: canopy, rockMesh: rock, grassMesh: grass };
  }, []);

  return (
    <group>
      <primitive object={trunkMesh} />
      <primitive object={canopyMesh} />
      <primitive object={rockMesh} />
      <primitive object={grassMesh} />
    </group>
  );
}
