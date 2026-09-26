'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WATER_R } from '../game/config';
import { useGame } from '../game/store';
import { bobberPosition } from '../game/state';

/* eslint-disable react-hooks/immutability -- material is a stable memoized ShaderMaterial mutated per-frame */

// Geometry is a tessellated plane rotated -90° about X, so local z maps to
// world y — wave displacement goes on p.z, samples on local (x, y).
const VERT = /* glsl */ `
uniform float uTime;
varying vec3 vPos;
varying vec3 vNormalW;
void main() {
  vec3 p = position;
  float w1 = sin(p.x * 0.35 + uTime * 1.2) * 0.12;
  float w2 = sin(p.y * 0.5 - uTime * 0.9 + p.x * 0.15) * 0.09;
  p.z += w1 + w2;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPos = wp.xyz;
  float dx = 0.35 * 0.12 * cos(p.x * 0.35 + uTime * 1.2)
           + 0.15 * 0.09 * cos(p.y * 0.5 - uTime * 0.9 + p.x * 0.15);
  float dy = 0.5 * 0.09 * cos(p.y * 0.5 - uTime * 0.9 + p.x * 0.15);
  // surface normal of the displaced plane, then to world space
  vec3 nLocal = normalize(vec3(-dx, -dy, 1.0));
  vNormalW = normalize(mat3(modelMatrix) * nLocal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uBobber;
uniform vec3 uSunDir;
uniform float uRim;
varying vec3 vPos;
varying vec3 vNormalW;
void main() {
  float r = length(vPos.xz);
  if (r > uRim) discard;
  vec3 V = normalize(cameraPosition - vPos);
  float fres = pow(1.0 - max(dot(V, vNormalW), 0.0), 2.5);
  vec3 deep = vec3(0.045, 0.28, 0.38);
  vec3 shallow = vec3(0.16, 0.5, 0.6);
  vec3 col = mix(deep, shallow, fres);
  vec3 H = normalize(uSunDir + V);
  col += pow(max(dot(vNormalW, H), 0.0), 120.0) * vec3(1.0, 0.95, 0.8) * 0.9;
  float foam = smoothstep(uRim - 2.2, uRim - 0.2, r) * (0.5 + 0.5 * sin(uTime * 2.0 + r * 3.0));
  col = mix(col, vec3(0.9, 0.97, 1.0), foam * 0.35);
  float bd = length(vPos.xz - uBobber.xz);
  float rip = sin(bd * 6.0 - uTime * 6.0) * exp(-bd * 0.55);
  col += rip * 0.09;
  gl_FragColor = vec4(col, 0.78);
}
`;

export default function Water() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: {
          uTime: { value: 0 },
          uBobber: { value: new THREE.Vector3(999, 0, 999) },
          uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
          uRim: { value: WATER_R },
        },
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    const bob = bobberPosition(useGame.getState().sim);
    const v = material.uniforms.uBobber.value as THREE.Vector3;
    if (bob) v.set(bob[0], bob[1], bob[2]);
    else v.set(999, 0, 999);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={2}>
      <planeGeometry args={[WATER_R * 2, WATER_R * 2, 96, 96]} />
    </mesh>
  );
}
