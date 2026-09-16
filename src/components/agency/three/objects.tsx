import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Objetos low-poly construidos con geometrías simples (prototipo, v2 detallada).
 * Bordes suavizados (RoundedBox), más segmentos facetados y más piezas por
 * objeto para acercarse a la referencia de estudio. Los que aún ganarían con
 * un modelo diseñado (GLB) están marcados con NOTA-MODELO.
 */

// Paleta: carbón mate + naranja Socialify.
export const COL = {
  carbon: '#1a1817',
  carbonLight: '#332f2c',
  carbonMid: '#262220',
  stone: '#d8d0c4',
  orange: '#e85d3a',
  orangeDeep: '#c94a2b',
  screen: '#16130f',
};

const matte = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => ({
  color,
  roughness: 0.85,
  metalness: 0.05,
  flatShading: true,
  ...extra,
});

/** Grupo clickeable: escala suave al pasar el cursor, accesible por teclado desde el HTML. */
export const Hotspot = ({
  children,
  position,
  onActivate,
  hovered,
  onHover,
}: {
  children: React.ReactNode;
  position: [number, number, number];
  onActivate: () => void;
  hovered: boolean;
  onHover: (v: boolean) => void;
}) => {
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!g.current) return;
    const target = hovered ? 1.06 : 1;
    const k = 1 - Math.exp(-10 * Math.min(delta, 0.05));
    g.current.scale.lerp(new THREE.Vector3(target, target, target), k);
  });
  return (
    <group
      ref={g}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
    >
      {children}
    </group>
  );
};

/** Plataformas escalonadas con bordes suavizados y piso que recibe sombras. */
export const Platforms = () => (
  <group>
    {/* Piso amplio del mismo carbón: solo existe para anclar las sombras */}
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[16, 40]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    {([
      [0, 0.35, 0, 6.4, 0.7, 3.4],
      [-1.5, 1.05, -0.2, 2.6, 0.7, 2.4],
      [1.6, 0.95, 0.1, 2.4, 0.5, 2.2],
      [0.2, 1.55, -0.6, 2.2, 0.5, 1.6],
      [2.6, 0.55, 0.9, 1.6, 0.35, 1.4],
    ] as Array<[number, number, number, number, number, number]>).map(
      ([x, y, z, w, h, d], i) => (
        <RoundedBox
          key={i}
          args={[w, h, d]}
          radius={0.06}
          smoothness={2}
          position={[x, y, z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...matte(i % 2 === 0 ? COL.carbonLight : COL.carbonMid)} />
        </RoundedBox>
      ),
    )}
    {/* Peldaños frontales como en la referencia */}
    {([
      [0.6, 0.12, 2.5, 3.2, 0.24, 0.8],
      [0.9, 0.34, 2.9, 2.4, 0.22, 0.6],
    ] as Array<[number, number, number, number, number, number]>).map(([x, y, z, w, h, d], i) => (
      <RoundedBox
        key={`step-${i}`}
        args={[w, h, d]}
        radius={0.05}
        smoothness={2}
        position={[x, y, z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...matte(i % 2 ? COL.carbonLight : COL.carbonMid)} />
      </RoundedBox>
    ))}
  </group>
);

/** NOTA-MODELO: la cámara mirrorless es la que más se beneficiaría de un GLB
 *  (empuñadura curva, textura del grip, óptica real). Acá va con primitivas:
 *  cuerpo redondeado, prisma de visor, lente de 4 secciones facetadas con
 *  doble aro de marca, diales, zapata, pantalla trasera y anclajes de correa. */
export const CameraObject = () => (
  <group rotation={[0, 0.5, 0]}>
    {/* Cuerpo */}
    <RoundedBox args={[1.5, 0.95, 0.85]} radius={0.08} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </RoundedBox>
    {/* Grip lateral con textura facetada */}
    <RoundedBox args={[0.22, 0.82, 0.64]} radius={0.06} smoothness={2} position={[-0.73, -0.02, 0.08]} castShadow>
      <meshStandardMaterial {...matte(COL.carbonMid)} />
    </RoundedBox>
    {[0, 1, 2].map((i) => (
      <mesh key={`grip-${i}`} position={[-0.75, -0.22 + i * 0.22, 0.42]} castShadow>
        <boxGeometry args={[0.16, 0.05, 0.03]} />
        <meshStandardMaterial {...matte(COL.carbon)} />
      </mesh>
    ))}
    {/* Visor: prisma pentagonal + ocular */}
    <mesh position={[0.28, 0.62, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.36, 0.34, 4]} />
      <meshStandardMaterial {...matte(COL.carbonMid)} />
    </mesh>
    <mesh position={[0.28, 0.6, -0.46]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.11, 0.13, 0.08, 12]} />
      <meshStandardMaterial {...matte('#0e0c0b', { roughness: 0.4 })} />
    </mesh>
    {/* Dial de modo estriado + disparo naranja + dial trasero */}
    <mesh position={[-0.45, 0.55, -0.18]} castShadow>
      <cylinderGeometry args={[0.09, 0.09, 0.12, 16]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[-0.52, 0.54, 0.2]} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 0.1, 12]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[-0.2, 0.52, -0.25]} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
      <meshStandardMaterial {...matte(COL.carbonMid)} />
    </mesh>
    {/* Zapata de flash con rieles */}
    <mesh position={[0.28, 0.82, 0]} castShadow>
      <boxGeometry args={[0.3, 0.07, 0.24]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={`rail-${s}`} position={[0.28, 0.87, s * 0.1]} castShadow>
        <boxGeometry args={[0.3, 0.03, 0.04]} />
        <meshStandardMaterial {...matte(COL.carbonMid)} />
      </mesh>
    ))}
    {/* Pantalla trasera */}
    <mesh position={[0, 0.02, -0.44]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.95, 0.6]} />
      <meshStandardMaterial {...matte(COL.screen, { roughness: 0.5 })} />
    </mesh>
    {/* Anclajes de correa */}
    {[-1, 1].map((s) => (
      <mesh key={`lug-${s}`} position={[s * 0.78, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.025, 6, 10]} />
        <meshStandardMaterial {...matte(COL.carbon)} />
      </mesh>
    ))}
    {/* Lente: montura + tres secciones facetadas + parasol */}
    <mesh position={[0.15, 0, 0.56]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.48, 0.5, 0.3, 18]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[0.15, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.42, 0.47, 0.34, 18]} />
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </mesh>
    {/* Anillo de zoom estriado */}
    <mesh position={[0.15, 0, 0.98]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
      <meshStandardMaterial {...matte(COL.carbonMid)} />
    </mesh>
    <mesh position={[0.15, 0, 1.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.42, 0.2, 18]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    {/* Doble aro naranja de marca + cristal con reflejo interno */}
    <mesh position={[0.15, 0, 1.22]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.32, 0.03, 8, 20]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[0.15, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.26, 0.02, 8, 20]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    <mesh position={[0.15, 0, 1.23]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.24, 0.24, 0.05, 18]} />
      <meshStandardMaterial {...matte('#0e0c0b', { roughness: 0.25, metalness: 0.3 })} />
    </mesh>
    <mesh position={[0.08, 0.07, 1.26]}>
      <circleGeometry args={[0.06, 10]} />
      <meshStandardMaterial {...matte('#4a4441', { roughness: 0.2, metalness: 0.4 })} />
    </mesh>
    {/* Logo naranja del cuerpo */}
    <mesh position={[0.55, 0.3, 0.44]} castShadow>
      <boxGeometry args={[0.12, 0.12, 0.04]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
  </group>
);

/** NOTA-MODELO: el monitor está bien con primitivas; el teclado con teclas
 *  individuales ganaría en fidelidad con un GLB. */
export const ComputerObject = () => {
  const keys: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 11; c++) {
      keys.push(
        <mesh key={`${r}-${c}`} position={[-1.0 + c * 0.2 + (r % 2) * 0.03, 0.045, -0.28 + r * 0.17]}>
          <boxGeometry args={[0.16, 0.05, 0.13]} />
          <meshStandardMaterial {...matte(r === 0 && c === 5 ? COL.orange : COL.carbonMid)} />
        </mesh>,
      );
    }
  }
  return (
    <group rotation={[0, -0.18, 0]}>
      {/* Marco del monitor con bordes suaves + bisel interno */}
      <RoundedBox args={[3, 1.9, 0.16]} radius={0.05} smoothness={2} position={[0, 1.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matte(COL.carbonLight)} />
      </RoundedBox>
      <mesh position={[0, 1.15, 0.085]}>
        <planeGeometry args={[2.88, 1.78]} />
        <meshStandardMaterial {...matte(COL.carbon)} />
      </mesh>
      <mesh position={[0, 1.15, 0.1]}>
        <planeGeometry args={[2.78, 1.68]} />
        <meshStandardMaterial {...matte(COL.screen, { roughness: 0.55 })} />
      </mesh>
      {/* Cámara del marco */}
      <mesh position={[0, 2.06, 0.09]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial {...matte('#0e0c0b', { roughness: 0.3 })} />
      </mesh>
      {/* Contenido de la pantalla: foto con montañas y sol (como la referencia) */}
      <mesh position={[-0.62, 1.12, 0.12]}>
        <planeGeometry args={[1.15, 1.15]} />
        <meshStandardMaterial {...matte('#241d18')} />
      </mesh>
      <mesh position={[-0.72, 0.98, 0.13]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.42, 0.62, 4]} />
        <meshStandardMaterial {...matte(COL.orange)} />
      </mesh>
      <mesh position={[-0.38, 0.88, 0.13]}>
        <coneGeometry args={[0.3, 0.45, 4]} />
        <meshStandardMaterial {...matte(COL.orangeDeep)} />
      </mesh>
      <mesh position={[-0.32, 1.42, 0.13]}>
        <circleGeometry args={[0.13, 12]} />
        <meshStandardMaterial {...matte(COL.orange)} />
      </mesh>
      {/* Columna de texto simulado */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.85, 1.62 - i * 0.24, 0.12]}>
          <boxGeometry args={[0.95 - i * 0.12, 0.09, 0.02]} />
          <meshStandardMaterial {...matte('#4a4441')} />
        </mesh>
      ))}
      {/* Checkbox naranja + líneas */}
      <mesh position={[0.42, 0.62, 0.12]}>
        <boxGeometry args={[0.18, 0.18, 0.02]} />
        <meshStandardMaterial {...matte(COL.orangeDeep)} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={`l${i}`} position={[0.95, 0.68 - i * 0.18, 0.12]}>
          <boxGeometry args={[0.75, 0.08, 0.02]} />
          <meshStandardMaterial {...matte('#4a4441')} />
        </mesh>
      ))}
      {/* Soporte y base */}
      <RoundedBox args={[0.35, 0.5, 0.3]} radius={0.04} smoothness={2} position={[0, 0.12, 0]} castShadow>
        <meshStandardMaterial {...matte(COL.carbon)} />
      </RoundedBox>
      <RoundedBox args={[1.9, 0.1, 0.7]} radius={0.04} smoothness={2} position={[0, -0.1, 0.35]} castShadow receiveShadow>
        <meshStandardMaterial {...matte(COL.carbonLight)} />
      </RoundedBox>
      {/* Teclado con teclas individuales */}
      <group position={[0.1, -0.08, 1.15]} rotation={[0, 0.08, 0]}>
        <RoundedBox args={[2.3, 0.07, 0.85]} radius={0.03} smoothness={2} castShadow receiveShadow>
          <meshStandardMaterial {...matte(COL.carbonLight)} />
        </RoundedBox>
        {keys}
      </group>
    </group>
  );
};

/** NOTA-MODELO: el megáfono es el segundo candidato claro a GLB (gatillo, asa
 *  curva, grill interno). Acá va con campana facetada de tres tramos, aros,
 *  interior escalonado, gatillo y pedestal. */
export const MegaphoneObject = () => (
  <group rotation={[0, 0.55, 0.2]}>
    {/* Campana: tres tramos para el perfil de cono suave */}
    <mesh position={[0.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[0.92, 0.55, 1.0, 20, 1, true]} />
      <meshStandardMaterial {...matte(COL.orange, { side: THREE.DoubleSide })} />
    </mesh>
    <mesh position={[-0.28, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.55, 0.4, 0.32, 20]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[-0.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.4, 0.3, 0.3, 20]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    {/* Aro frontal del borde, más fino */}
    <mesh position={[0.86, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <torusGeometry args={[0.9, 0.045, 8, 24]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    {/* Interior oscuro escalonado + cápsula del micrófono */}
    <mesh position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[0.62, 0.62, 0.05, 20]} />
      <meshStandardMaterial {...matte('#241d18', { side: THREE.DoubleSide })} />
    </mesh>
    <mesh position={[0.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
      <meshStandardMaterial {...matte('#181210', { side: THREE.DoubleSide })} />
    </mesh>
    <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.15, 0.2, 0.35, 12]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[0.62, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial {...matte(COL.carbonMid, { roughness: 0.5 })} />
    </mesh>
    {/* Cuerpo trasero + asa + gatillo */}
    <mesh position={[-0.85, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.3, 0.26, 0.5, 16]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    <RoundedBox args={[0.26, 0.44, 0.22]} radius={0.05} smoothness={2} position={[-0.95, -0.42, 0]} castShadow>
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </RoundedBox>
    <RoundedBox args={[0.34, 0.1, 0.28]} radius={0.03} smoothness={2} position={[-0.95, -0.62, 0]} castShadow>
      <meshStandardMaterial {...matte(COL.carbon)} />
    </RoundedBox>
    <mesh position={[-0.72, -0.28, 0]} rotation={[0, 0, 0.5]} castShadow>
      <boxGeometry args={[0.06, 0.16, 0.08]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    {/* Pedestal */}
    <mesh position={[-0.35, -0.75, 0]} castShadow>
      <boxGeometry args={[0.16, 0.5, 0.16]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <RoundedBox args={[0.7, 0.12, 0.55]} radius={0.03} smoothness={2} position={[-0.35, -1.02, 0]} castShadow receiveShadow>
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </RoundedBox>
    {/* Ondas de sonido */}
    {[0.6, 0.95, 1.3].map((d, i) => (
      <mesh key={i} position={[1.05 + d * 0.5, 0.35 + i * 0.28, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.11, 0.32, 3]} />
        <meshStandardMaterial {...matte(COL.orange)} />
      </mesh>
    ))}
  </group>
);

/** Figuras geométricas flotando, con movimiento sutil y más facetas. */
export const FloatingShapes = ({ still }: { still: boolean }) => {
  const g = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!g.current || still) return;
    const t = state.clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      c.position.y = (c.userData.baseY as number) + Math.sin(t * 0.6 + i) * 0.12;
      c.rotation.y += delta * (0.15 + i * 0.05);
      c.rotation.x += delta * 0.08;
    });
  });
  const items: Array<{ p: [number, number, number]; s: number; kind: 'ico' | 'tetra' | 'sphere' }> = [
    { p: [0.4, 4.5, -0.4], s: 0.62, kind: 'ico' },
    { p: [3.1, 1.5, 0.9], s: 0.6, kind: 'tetra' },
    { p: [-2.1, 3.6, 0.6], s: 0.3, kind: 'tetra' },
    { p: [2.5, 3.4, -0.2], s: 0.26, kind: 'tetra' },
    { p: [-1.2, 2.6, 1.3], s: 0.18, kind: 'tetra' },
    { p: [1.7, 2.7, 1.1], s: 0.15, kind: 'tetra' },
    { p: [3.4, 2.6, 0.2], s: 0.14, kind: 'tetra' },
    { p: [-0.6, 3.1, 1.5], s: 0.12, kind: 'tetra' },
    { p: [1.2, 4.1, 0.8], s: 0.1, kind: 'tetra' },
  ];
  return (
    <group ref={g}>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={it.p}
          scale={it.s}
          castShadow
          userData={{ baseY: it.p[1] }}
        >
          {it.kind === 'ico' ? (
            <icosahedronGeometry args={[1, 1]} />
          ) : it.kind === 'tetra' ? (
            <tetrahedronGeometry args={[1, 0]} />
          ) : (
            <sphereGeometry args={[1, 12, 12]} />
          )}
          <meshStandardMaterial {...matte(i === 2 ? COL.orangeDeep : COL.orange)} />
        </mesh>
      ))}
    </group>
  );
};

/** Esfera mate clara del frente + cuadros tipo polaroid con contenido. */
export const PropsCluster = () => (
  <group>
    {/* Esfera grande de piedra, facetada fina */}
    <mesh position={[-2.7, 0.95, 1.5]} castShadow receiveShadow>
      <icosahedronGeometry args={[0.62, 2]} />
      <meshStandardMaterial {...matte(COL.stone, { roughness: 0.95 })} />
    </mesh>
    {/* Cuadro grande: foto con sol y montaña */}
    <group position={[-1.5, 1.75, 1.2]} rotation={[0, 0.4, -0.06]}>
      <RoundedBox args={[1.05, 1.05, 0.08]} radius={0.03} smoothness={2} castShadow>
        <meshStandardMaterial {...matte(COL.stone, { roughness: 0.95 })} />
      </RoundedBox>
      <mesh position={[0, 0.03, 0.05]}>
        <planeGeometry args={[0.85, 0.72]} />
        <meshStandardMaterial {...matte('#3a3532')} />
      </mesh>
      <mesh position={[-0.12, -0.14, 0.06]}>
        <coneGeometry args={[0.22, 0.34, 4]} />
        <meshStandardMaterial {...matte(COL.stone, { roughness: 0.8 })} />
      </mesh>
      <mesh position={[0.08, -0.18, 0.06]}>
        <coneGeometry args={[0.16, 0.24, 4]} />
        <meshStandardMaterial {...matte('#b8b0a4')} />
      </mesh>
      <mesh position={[0.2, 0.18, 0.06]}>
        <circleGeometry args={[0.09, 12]} />
        <meshStandardMaterial {...matte(COL.stone)} />
      </mesh>
    </group>
    {/* Cuadro chico: botón de play */}
    <group position={[-0.5, 1.55, 1.35]} rotation={[0, -0.15, 0.04]}>
      <RoundedBox args={[0.9, 0.9, 0.08]} radius={0.03} smoothness={2} castShadow>
        <meshStandardMaterial {...matte(COL.carbonLight)} />
      </RoundedBox>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[0.72, 0.72]} />
        <meshStandardMaterial {...matte(COL.carbonMid)} />
      </mesh>
      <mesh position={[0.05, 0, 0.07]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.2, 0.3, 3]} />
        <meshStandardMaterial {...matte(COL.orange)} />
      </mesh>
    </group>
    {/* Pirámide naranja facetada de la derecha */}
    <mesh position={[2.9, 0.95, 0.9]} castShadow receiveShadow>
      <coneGeometry args={[0.52, 1.15, 4]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[2.35, 0.62, 1.45]} rotation={[0, 0.6, 0]} castShadow>
      <tetrahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
  </group>
);

/** Etiqueta invisible para lectores de pantalla no es necesaria acá:
 *  la navegación equivalente vive en los botones HTML del overlay. */
export const useHoverState = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  return { hovered, setHovered };
};

/**
 * Marca de Socialify en 3D: la "s" del favicon armada con dos arcos low-poly
 * y el punto naranja como esfera facetada. Gira despacio sobre sí misma.
 * NOTA-MODELO: un GLB con la tipografía exacta subiría la fidelidad.
 */
export const LogoMark = ({ still = false }: { still?: boolean }) => {
  const g = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!g.current) return;
    const dt = Math.min(delta, 0.05);
    if (!still) {
      // Balanceo suave: nunca queda de canto (se leería como una línea).
      const t = state.clock.elapsedTime;
      const target = Math.sin(t * 0.45) * 0.55;
      g.current.rotation.y += (target - g.current.rotation.y) * (1 - Math.exp(-2 * dt));
      g.current.position.y = Math.sin(t * 0.7) * 0.1;
    }
  });

  const arc = (rotZ: number, x: number, y: number) => (
    <mesh position={[x, y, 0]} rotation={[0, 0, rotZ]} castShadow receiveShadow>
      {/* torus parcial = trazo curvo de la "s", con pocos segmentos (low poly) */}
      <torusGeometry args={[0.34, 0.14, 8, 16, Math.PI * 1.15]} />
      <meshStandardMaterial {...matte(COL.stone)} />
    </mesh>
  );

  return (
    <group ref={g}>
      {arc(Math.PI * 0.35, -0.04, 0.31)}
      {arc(Math.PI * 1.35, 0.04, -0.31)}
      {/* Punto naranja del favicon */}
      <mesh position={[0.62, -0.5, 0]} castShadow>
        <icosahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial {...matte(COL.orange, { roughness: 0.6 })} />
      </mesh>
    </group>
  );
};
