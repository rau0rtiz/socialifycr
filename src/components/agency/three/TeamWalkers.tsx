import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COL } from './objects';

type TeamMember = 'lu' | 'ale' | 'naty' | 'elena' | 'raul';

type CharacterPalette = {
  skin: string;
  top: string;
  bottom: string;
  shoes: string;
  hair: string;
  hairRoot?: string;
  accent?: string;
};

type WalkerConfig = {
  member: TeamMember;
  height: number;
  center: [number, number];
  radius: [number, number];
  speed: number;
  phase: number;
  direction: 1 | -1;
  palette: CharacterPalette;
};

const material = (color: string, metalness = 0.02) => ({
  color,
  roughness: 0.88,
  metalness,
  flatShading: true,
});

const Limb = ({
  limbRef,
  position,
  color,
  length,
  width,
  shoe,
}: {
  limbRef: React.RefObject<THREE.Group>;
  position: [number, number, number];
  color: string;
  length: number;
  width: number;
  shoe?: string;
}) => (
  <group ref={limbRef} position={position}>
    <mesh position={[0, -length / 2, 0]} castShadow>
      <capsuleGeometry args={[width, Math.max(0.08, length - width * 2), 3, 6]} />
      <meshStandardMaterial {...material(color)} />
    </mesh>
    {shoe && (
      <mesh position={[0, -length + 0.01, 0.075]} castShadow>
        <boxGeometry args={[width * 2.15, width * 0.8, width * 3]} />
        <meshStandardMaterial {...material(shoe)} />
      </mesh>
    )}
  </group>
);

const Face = ({ skin }: { skin: string }) => (
  <>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.073, 0.015, 0.165]}>
        <sphereGeometry args={[0.018, 5, 5]} />
        <meshStandardMaterial {...material(COL.carbon)} />
      </mesh>
    ))}
    <mesh position={[0, -0.035, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.032, 0.008, 4, 7, Math.PI]} />
      <meshStandardMaterial {...material('#8e5548')} />
    </mesh>
    <mesh position={[0, -0.17, 0]} castShadow>
      <cylinderGeometry args={[0.065, 0.075, 0.12, 6]} />
      <meshStandardMaterial {...material(skin)} />
    </mesh>
  </>
);

const BlondeHair = ({ rootColor, long = false }: { rootColor: string; long?: boolean }) => (
  <group>
    <mesh position={[0, 0.095, -0.025]} castShadow>
      <sphereGeometry args={[0.225, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
      <meshStandardMaterial {...material('#d4b368')} />
    </mesh>
    <mesh position={[0, 0.145, 0.01]} scale={[0.72, 0.25, 0.82]} castShadow>
      <sphereGeometry args={[0.205, 7, 4]} />
      <meshStandardMaterial {...material(rootColor)} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.17, long ? -0.12 : -0.06, -0.03]} rotation={[0, 0, side * 0.1]} castShadow>
        <capsuleGeometry args={[0.055, long ? 0.35 : 0.2, 3, 6]} />
        <meshStandardMaterial {...material('#d4b368')} />
      </mesh>
    ))}
  </group>
);

const LongHair = ({ color }: { color: string }) => (
  <group>
    <mesh position={[0, 0.07, -0.035]} castShadow>
      <sphereGeometry args={[0.23, 7, 5]} />
      <meshStandardMaterial {...material(color)} />
    </mesh>
    <mesh position={[0, -0.27, -0.12]} castShadow>
      <capsuleGeometry args={[0.14, 0.48, 4, 7]} />
      <meshStandardMaterial {...material(color)} />
    </mesh>
  </group>
);

const CurlyHair = ({ color }: { color: string }) => (
  <group>
    {[
      [-0.16, 0.08, -0.02], [0, 0.16, -0.04], [0.16, 0.08, -0.02],
      [-0.2, -0.06, -0.04], [0.2, -0.06, -0.04], [-0.18, -0.2, -0.07],
      [0.18, -0.2, -0.07], [0, -0.25, -0.13],
    ].map(([x, y, z], index) => (
      <mesh key={index} position={[x, y, z]} castShadow>
        <icosahedronGeometry args={[0.115, 1]} />
        <meshStandardMaterial {...material(color)} />
      </mesh>
    ))}
  </group>
);

const Hair = ({ member, palette }: { member: TeamMember; palette: CharacterPalette }) => {
  if (member === 'lu') return <BlondeHair rootColor={palette.hairRoot ?? palette.hair} long />;
  if (member === 'ale') return <BlondeHair rootColor={palette.hairRoot ?? palette.hair} />;
  if (member === 'elena') return <CurlyHair color={palette.hair} />;
  return <LongHair color={palette.hair} />;
};

const MaximalistDetails = () => (
  <group>
    <mesh position={[-0.17, 0.08, 0.17]} rotation={[0, 0, 0.55]} castShadow>
      <boxGeometry args={[0.13, 0.38, 0.035]} />
      <meshStandardMaterial {...material('#f0b83f')} />
    </mesh>
    <mesh position={[0.16, -0.06, 0.18]} rotation={[0, 0, -0.45]} castShadow>
      <boxGeometry args={[0.12, 0.34, 0.035]} />
      <meshStandardMaterial {...material('#2a9d8f')} />
    </mesh>
    <mesh position={[0, 0.23, 0.19]} castShadow>
      <octahedronGeometry args={[0.09, 0]} />
      <meshStandardMaterial {...material('#ec6f91')} />
    </mesh>
    <mesh position={[0.29, 0.18, 0]} rotation={[0, 0, -0.25]} castShadow>
      <torusGeometry args={[0.11, 0.035, 5, 8]} />
      <meshStandardMaterial {...material('#f0b83f')} />
    </mesh>
  </group>
);

const RaulDetails = () => (
  <>
    <mesh position={[0, 0.32, 0.19]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <coneGeometry args={[0.11, 0.16, 3]} />
      <meshStandardMaterial {...material(COL.carbonLight)} />
    </mesh>
    <mesh position={[0.31, -0.23, 0]} rotation={[0, 0, -0.04]} castShadow>
      <torusGeometry args={[0.075, 0.027, 6, 10]} />
      <meshStandardMaterial {...material('#b7a06a', 0.65)} />
    </mesh>
  </>
);

const Person = ({
  member,
  palette,
  leftArm,
  rightArm,
  leftLeg,
  rightLeg,
}: {
  member: TeamMember;
  palette: CharacterPalette;
  leftArm: React.RefObject<THREE.Group>;
  rightArm: React.RefObject<THREE.Group>;
  leftLeg: React.RefObject<THREE.Group>;
  rightLeg: React.RefObject<THREE.Group>;
}) => {
  const isRaul = member === 'raul';
  const torsoWidth = isRaul ? 0.62 : 0.48;
  const shoulder = isRaul ? 0.37 : 0.3;
  const armWidth = isRaul ? 0.105 : 0.085;

  return (
    <group>
      <Limb limbRef={leftLeg} position={[-0.14, 0.65, 0]} color={palette.bottom} length={0.62} width={0.105} shoe={palette.shoes} />
      <Limb limbRef={rightLeg} position={[0.14, 0.65, 0]} color={palette.bottom} length={0.62} width={0.105} shoe={palette.shoes} />
      <mesh position={[0, 1.06, 0]} scale={[torsoWidth, 0.7, isRaul ? 0.34 : 0.3]} castShadow>
        <dodecahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial {...material(palette.top)} />
      </mesh>
      {member === 'lu' && (
        <mesh position={[0, 0.98, 0.2]} scale={[0.23, 0.25, 0.17]} castShadow>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial {...material(palette.top)} />
        </mesh>
      )}
      {member === 'ale' && <MaximalistDetails />}
      {isRaul && <RaulDetails />}
      <Limb limbRef={leftArm} position={[-shoulder, 1.26, 0]} color={isRaul ? palette.top : palette.skin} length={0.55} width={armWidth} />
      <Limb limbRef={rightArm} position={[shoulder, 1.26, 0]} color={isRaul ? palette.top : palette.skin} length={0.55} width={armWidth} />
      <group position={[0, 1.65, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.215, 2]} />
          <meshStandardMaterial {...material(palette.skin)} />
        </mesh>
        <Face skin={palette.skin} />
        <Hair member={member} palette={palette} />
      </group>
    </group>
  );
};

const WalkingPerson = ({ config, still }: { config: WalkerConfig; still: boolean }) => {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (!root.current || !body.current) return;

    if (still) {
      const angle = config.phase;
      root.current.position.set(
        config.center[0] + Math.cos(angle) * config.radius[0],
        0,
        config.center[1] + Math.sin(angle) * config.radius[1],
      );
      root.current.rotation.y = Math.atan2(
        -Math.sin(angle) * config.radius[0] * config.direction,
        Math.cos(angle) * config.radius[1] * config.direction,
      );
      return;
    }

    const t = state.clock.elapsedTime;
    const angle = config.phase + t * config.speed * config.direction;
    const x = config.center[0] + Math.cos(angle) * config.radius[0];
    const z = config.center[1] + Math.sin(angle) * config.radius[1];
    const dx = -Math.sin(angle) * config.radius[0] * config.direction;
    const dz = Math.cos(angle) * config.radius[1] * config.direction;
    const targetYaw = Math.atan2(dx, dz);
    const yawDiff = Math.atan2(
      Math.sin(targetYaw - root.current.rotation.y),
      Math.cos(targetYaw - root.current.rotation.y),
    );
    const stride = Math.sin(t * 5.2 + config.phase * 2);
    const settle = 1 - Math.exp(-8 * dt);

    root.current.position.x += (x - root.current.position.x) * settle;
    root.current.position.z += (z - root.current.position.z) * settle;
    root.current.rotation.y += yawDiff * settle;
    body.current.position.y = Math.abs(stride) * 0.025;
    body.current.rotation.z = Math.sin(t * 2.6 + config.phase) * 0.018;
    if (leftArm.current) leftArm.current.rotation.x = stride * 0.48;
    if (rightArm.current) rightArm.current.rotation.x = -stride * 0.48;
    if (leftLeg.current) leftLeg.current.rotation.x = -stride * 0.42;
    if (rightLeg.current) rightLeg.current.rotation.x = stride * 0.42;
  });

  return (
    <group ref={root} scale={config.height}>
      <group ref={body}>
        <Person
          member={config.member}
          palette={config.palette}
          leftArm={leftArm}
          rightArm={rightArm}
          leftLeg={leftLeg}
          rightLeg={rightLeg}
        />
      </group>
    </group>
  );
};

const WALKERS: WalkerConfig[] = [
  {
    member: 'lu', height: 0.72, center: [-1.35, 1.85], radius: [1.3, 0.48], speed: 0.19, phase: 0.5, direction: 1,
    palette: { skin: '#d9a27f', top: '#d96a49', bottom: '#252323', shoes: '#eee8df', hair: '#d4b368', hairRoot: '#6f4937' },
  },
  {
    member: 'ale', height: 0.63, center: [1.8, 2.3], radius: [1.15, 0.4], speed: 0.23, phase: 2.5, direction: -1,
    palette: { skin: '#c98967', top: '#cf476d', bottom: '#2a9d8f', shoes: '#f0b83f', hair: '#d4b368', hairRoot: '#73503a', accent: '#f0b83f' },
  },
  {
    member: 'naty', height: 0.74, center: [2.0, -1.65], radius: [1.15, 0.42], speed: 0.17, phase: 4.1, direction: 1,
    palette: { skin: '#bd7f62', top: '#5b766d', bottom: '#252323', shoes: '#c4b9aa', hair: '#513526' },
  },
  {
    member: 'elena', height: 0.64, center: [-2.35, -1.45], radius: [1.0, 0.5], speed: 0.21, phase: 5.4, direction: -1,
    palette: { skin: '#a96f52', top: '#bc6c83', bottom: '#3e4542', shoes: '#e1d4c5', hair: '#3a241d' },
  },
  {
    member: 'raul', height: 0.79, center: [0.15, 2.75], radius: [1.55, 0.35], speed: 0.16, phase: 3.4, direction: 1,
    palette: { skin: '#bd805f', top: '#191817', bottom: '#151414', shoes: '#242221', hair: '#161413', accent: COL.orange },
  },
];

export const TeamWalkers = ({ still }: { still: boolean }) => (
  <group>
    {WALKERS.map((config) => (
      <WalkingPerson key={config.member} config={config} still={still} />
    ))}
  </group>
);
