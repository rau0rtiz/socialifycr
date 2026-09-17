import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import {
  CameraObject,
  COL,
  ComputerObject,
  FloatingShapes,
  Hotspot,
  LogoMark,
  MegaphoneObject,
  Platforms,
  PropsCluster,
} from './objects';
import { TeamWalkers } from './TeamWalkers';

export type HotspotId = 'camara' | 'computadora' | 'megafono';

/** Toda la escena se inclina apenas siguiendo el cursor. */
const CursorTilt = ({ still, children }: { still: boolean; children: React.ReactNode }) => {
  const g = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((state, delta) => {
    if (!g.current) return;
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-3 * dt);
    const ty = still ? 0 : pointer.x * 0.18;
    const tx = still ? 0 : -pointer.y * 0.08;
    g.current.rotation.y += (ty - g.current.rotation.y) * k;
    g.current.rotation.x += (tx - g.current.rotation.x) * k;
    if (!still) {
      g.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
    }
  });
  return <group ref={g}>{children}</group>;
};

const Scene = ({
  still,
  hovered,
  onHover,
  onActivate,
}: {
  still: boolean;
  hovered: HotspotId | null;
  onHover: (id: HotspotId | null) => void;
  onActivate: (id: HotspotId) => void;
}) => (
  <>
    <color attach="background" args={[COL.carbon]} />
    <fog attach="fog" args={[COL.carbon, 14, 34]} />
    <ambientLight intensity={0.55} />
    <directionalLight
      position={[6, 9, 7]}
      intensity={1.9}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0008}
    />
    <directionalLight position={[-7, 4, -3]} intensity={0.5} color="#8a94a8" />
    <Environment>
      <Lightformer intensity={1.6} position={[0, 6, 2]} scale={[10, 10, 1]} />
      <Lightformer
        intensity={0.7}
        color="#ff8a5c"
        position={[-6, 2, 1]}
        rotation-y={Math.PI / 2}
        scale={[16, 2, 1]}
      />
    </Environment>

    <CursorTilt still={still}>
      <group position={[-0.1, -1.6, 0]} scale={0.95}>
        <Platforms />
        <PropsCluster />
        <FloatingShapes still={still} />
         <TeamWalkers still={still} />

        {/* Marca de Socialify flotando sobre la escena */}
        <group position={[-2.15, 4.35, 1.6]} scale={1.25}>
          <LogoMark still={still} />
        </group>

        <Hotspot
          position={[-1.55, 1.875, 0.05]}
          hovered={hovered === 'camara'}
          onHover={(v) => onHover(v ? 'camara' : null)}
          onActivate={() => onActivate('camara')}
        >
          <CameraObject />
        </Hotspot>

        <Hotspot
          position={[1.4, 2.05, -0.5]}
          hovered={hovered === 'computadora'}
          onHover={(v) => onHover(v ? 'computadora' : null)}
          onActivate={() => onActivate('computadora')}
        >
          <ComputerObject />
        </Hotspot>

        <Hotspot
          position={[1.35, 1.05, 2]}
          hovered={hovered === 'megafono'}
          onHover={(v) => onHover(v ? 'megafono' : null)}
          onActivate={() => onActivate('megafono')}
        >
          <MegaphoneObject />
        </Hotspot>
      </group>
    </CursorTilt>

    {/* Piso que recibe la sombra sin romper el fondo carbón */}
    <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color={COL.carbon} roughness={1} />
    </mesh>
  </>
);

export const AgencyScene = ({
  still,
  onActivate,
  onHoverLabel,
}: {
  still: boolean;
  onActivate: (id: HotspotId) => void;
  onHoverLabel?: (id: HotspotId | null) => void;
}) => {
  const [hovered, setHovered] = useState<HotspotId | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.9, 13], fov: 40 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(COL.carbon);
      }}
      onPointerMissed={() => setHovered(null)}
      style={{ cursor: hovered ? 'pointer' : 'default' }}
      fallback={null}
    >
      <Suspense fallback={null}>
        <Scene
          still={still}
          hovered={hovered}
          onHover={(id) => {
            setHovered(id);
            onHoverLabel?.(id);
          }}
          onActivate={onActivate}
        />
      </Suspense>
    </Canvas>
  );
};

export default AgencyScene;
