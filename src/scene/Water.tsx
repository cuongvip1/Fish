'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WATER_R } from '../game/config';
import { useGame } from '../game/store';
import { bobberPosition } from '../game/state';

const VERT = /* glsl */ `
uniform float uTime;
varying vec3 vPos;
varying vec3 vNormalW;
void main() {
  vec3 p = position;
  float w1 = sin(p.x * 0.35 + uTime * 1.2) * 0.12;
  float w2 = sin(p.z * 0.5 - uTime * 0.9 + p.x * 0.15) * 0.09;
  p.y += w1 + w2;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vPos = wp.xyz;
  float dx = 0.35 * 0.12 * cos(p.x * 0.35 + uTime * 1.2)
           + 0.15 * 0.09 * cos(p.z * 0.5 - uTime * 0.9 + p.x * 0.15);
  float dz = 0.5 * 0.09 * cos(p.z * 0.5 - uTime * 0.9 + p.x * 0.15);
  vNormalW = normalize(vec3(-dx, 1.0, -dz));
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
  vec3 V = normalize(cameraPosition - vPos);
  float fres = pow(1.0 - max(dot(V, vNormalW), 0.0), 2.5);
  vec3 deep = vec3(0.045, 0.28, 0.38);
  vec3 shallow = vec3(0.16, 0.5, 0.6);
  vec3 col = mix(deep, shallow, fres);
  vec3 H = normalize(uSunDir + V);
  col += pow(max(dot(vNormalW, H), 0.0), 120.0) * vec3(1.0, 0.95, 0.8) * 0.9;
  float r = length(vPos.xz);
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={material} renderOrder={2}>
      <circleGeometry args={[WATER_R, 96, 0, Math.PI * 2]} />
    </mesh>
  );
}
