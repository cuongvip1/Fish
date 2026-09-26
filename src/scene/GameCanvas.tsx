'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useGame } from '../game/store';
import Lake from './Lake';
import Water from './Water';
import Environment from './Environment';
import CameraRig from './CameraRig';
import FishSchool from './FishSchool';
import Fisherman from './Fisherman';
import FishingLine from './FishingLine';
import Effects from './Effects';

function SimTick() {
  useFrame((_, dt) => {
    useGame.getState().tick(dt);
  });
  return null;
}

export default function GameCanvas() {
  return (
    <Canvas
      camera={{ position: [13, 9, -46], fov: 50 }}
      dpr={[1, 1.5]}
      shadows
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#a5cfe0']} />
      <fog attach="fog" args={['#a5cfe0', 60, 220]} />
      <directionalLight
        position={[40, 50, 20]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <hemisphereLight args={['#bfe3ff', '#2a4a3a', 0.5]} />

      <SimTick />
      <CameraRig />
      <Lake />
      <Water />
      <Environment />
      <FishSchool />
      <Fisherman />
      <FishingLine />
      <Effects />

      <EffectComposer>
        <Bloom intensity={0.35} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
      </EffectComposer>
    </Canvas>
  );
}
