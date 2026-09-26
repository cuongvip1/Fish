'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DOCK_POS } from '../game/config';
import { useGame } from '../game/store';

/** Live world position of the rod tip — read by FishingLine. */
export const rodTipRef = new THREE.Vector3(0, 3.1, -27.2);

export default function Fisherman() {
  const arm = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const tipObj = useRef<THREE.Object3D>(null);
  const tmp = useRef(new THREE.Vector3());

  useFrame((state) => {
    const sim = useGame.getState().sim;
    const t = state.clock.elapsedTime;
    const a = arm.current;
    const body = torso.current;
    if (!a || !body) return;

    let armAngle = -0.5; // relaxed hold
    let lean = 0;
    switch (sim.phase) {
      case 'CHARGING':
        armAngle = -0.5 - (sim.charge.power / 100) * 1.6; // wind back
        lean = -(sim.charge.power / 100) * 0.12;
        break;
      case 'CASTING':
        armAngle = sim.cast ? -2.1 + (sim.cast.t / sim.cast.dur) * 2.4 : -0.5;
        break;
      case 'FIGHTING':
        armAngle = -1.1 + Math.sin(t * 7) * 0.08;
        lean = (sim.fight?.tension ?? 0) * -0.28;
        break;
      default:
        armAngle = -0.5 + Math.sin(t * 1.4) * 0.04; // idle sway
    }
    a.rotation.x = THREE.MathUtils.lerp(a.rotation.x, armAngle, 0.18);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, lean, 0.12);
    body.position.y = Math.sin(t * 1.2) * 0.03;

    if (tipObj.current) {
      tipObj.current.getWorldPosition(tmp.current);
      rodTipRef.copy(tmp.current);
    }
  });

  return (
    <group position={DOCK_POS}>
      {/* dock */}
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.25, 6]} />
        <meshStandardMaterial color="#6d4c2f" roughness={0.95} />
      </mesh>
      <mesh position={[-1.3, -1.4, -2.6]}>
        <cylinderGeometry args={[0.16, 0.16, 3]} />
        <meshStandardMaterial color="#4d3621" roughness={1} />
      </mesh>
      <mesh position={[1.3, -1.4, -2.6]}>
        <cylinderGeometry args={[0.16, 0.16, 3]} />
        <meshStandardMaterial color="#4d3621" roughness={1} />
      </mesh>

      {/* fisherman faces +z (toward lake center) */}
      <group ref={torso} position={[0, 0.9, 1.5]}>
        {/* legs */}
        <mesh position={[-0.16, 0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.24]} />
          <meshStandardMaterial color="#37507a" roughness={1} flatShading />
        </mesh>
        <mesh position={[0.16, 0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.24]} />
          <meshStandardMaterial color="#37507a" roughness={1} flatShading />
        </mesh>
        {/* torso */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.62, 0.75, 0.34]} />
          <meshStandardMaterial color="#b8472f" roughness={1} flatShading />
        </mesh>
        {/* head + cap */}
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.21, 10, 8]} />
          <meshStandardMaterial color="#d9a066" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 1.88, 0.02]} castShadow>
          <coneGeometry args={[0.24, 0.22, 8]} />
          <meshStandardMaterial color="#e8b33c" roughness={1} flatShading />
        </mesh>
        {/* left arm (static) */}
        <mesh position={[-0.4, 1.15, 0.1]} rotation={[0.5, 0, 0.25]} castShadow>
          <boxGeometry args={[0.14, 0.55, 0.14]} />
          <meshStandardMaterial color="#b8472f" roughness={1} flatShading />
        </mesh>
        {/* right arm + rod — pivots at shoulder */}
        <group ref={arm} position={[0.4, 1.35, 0.05]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.14, 0.56, 0.14]} />
            <meshStandardMaterial color="#b8472f" roughness={1} flatShading />
          </mesh>
          {/* rod extends forward/up from hand */}
          <group position={[0, -0.55, 0.05]} rotation={[1.9, 0, 0]}>
            <mesh position={[0, 1.35, 0]} castShadow>
              <cylinderGeometry args={[0.022, 0.05, 3.2, 6]} />
              <meshStandardMaterial color="#7a5230" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.35, -0.12]} castShadow>
              <torusGeometry args={[0.09, 0.035, 6, 12]} />
              <meshStandardMaterial color="#333a42" roughness={0.5} metalness={0.5} />
            </mesh>
            {/* rod tip anchor — line attaches here */}
            <object3D ref={tipObj} position={[0, 2.95, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}
