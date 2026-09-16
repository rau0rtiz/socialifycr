import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Objetos low-poly construidos con geometrías simples (prototipo).
 * Los que ganarían más con un modelo diseñado (GLB) están marcados con
 * NOTA-MODELO en cada componente.
 */

// Paleta: carbón mate + naranja Socialify.
export const COL = {
  carbon: '#1a1817',
  carbonLight: '#332f2c',
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

/** Plataformas escalonadas donde se apoya todo. */
export const Platforms = () => (
  <group>
    {([
      [0, 0.35, 0, 6.4, 0.7, 3.4],
      [-1.5, 1.05, -0.2, 2.6, 0.7, 2.4],
      [1.6, 0.95, 0.1, 2.4, 0.5, 2.2],
      [0.2, 1.55, -0.6, 2.2, 0.5, 1.6],
      [2.6, 0.55, 0.9, 1.6, 0.35, 1.4],
    ] as Array<[number, number, number, number, number, number]>).map(
      ([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...matte(i % 2 === 0 ? COL.carbonLight : COL.carbon)} />
        </mesh>
      ),
    )}
  </group>
);

/** NOTA-MODELO: la cámara mirrorless es la que más se beneficiaría de un GLB
 *  (visor, dial, textura de grip). Acá va como cuerpo + lente cilíndrico. */
export const CameraObject = () => (
  <group rotation={[0, 0.5, 0]}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.95, 0.85]} />
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </mesh>
    <mesh position={[0.28, 0.6, 0]} castShadow>
      <boxGeometry args={[0.55, 0.28, 0.5]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[-0.45, 0.56, 0]} castShadow>
      <cylinderGeometry args={[0.09, 0.09, 0.14, 12]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[0.15, 0, 0.62]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.42, 0.46, 0.7, 10]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[0.15, 0, 0.99]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.3, 0.3, 0.06, 10]} />
      <meshStandardMaterial {...matte('#0e0c0b', { roughness: 0.4 })} />
    </mesh>
  </group>
);

/** NOTA-MODELO: el monitor está bien con primitivas; el teclado ganaría con un GLB. */
export const ComputerObject = () => (
  <group rotation={[0, -0.18, 0]}>
    <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
      <boxGeometry args={[3, 1.9, 0.16]} />
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </mesh>
    <mesh position={[0, 1.15, 0.1]}>
      <planeGeometry args={[2.78, 1.68]} />
      <meshStandardMaterial {...matte(COL.screen, { roughness: 0.55 })} />
    </mesh>
    {/* "Gráfico" naranja dentro de la pantalla */}
    <mesh position={[-0.45, 0.95, 0.12]}>
      <coneGeometry args={[0.6, 0.75, 4]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[-0.05, 1.55, 0.12]}>
      <sphereGeometry args={[0.19, 12, 12]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0.95, 1.55 - i * 0.24, 0.12]}>
        <boxGeometry args={[0.9, 0.09, 0.02]} />
        <meshStandardMaterial {...matte('#4a4441')} />
      </mesh>
    ))}
    <mesh position={[0, 0.12, 0]} castShadow>
      <boxGeometry args={[0.35, 0.5, 0.3]} />
      <meshStandardMaterial {...matte(COL.carbon)} />
    </mesh>
    <mesh position={[0, -0.1, 0.35]} castShadow receiveShadow>
      <boxGeometry args={[1.9, 0.1, 0.7]} />
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </mesh>
  </group>
);

/** NOTA-MODELO: el megáfono es el segundo candidato claro a GLB (gatillo, asa curva). */
export const MegaphoneObject = () => (
  <group rotation={[0, -0.35, 0.25]}>
    <mesh rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[0.92, 0.34, 1.5, 9, 1, true]} />
      <meshStandardMaterial {...matte(COL.orange, { side: THREE.DoubleSide })} />
    </mesh>
    <mesh position={[-1.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.3, 0.26, 0.7, 9]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    <mesh position={[-0.95, -0.42, 0]} castShadow>
      <boxGeometry args={[0.3, 0.42, 0.24]} />
      <meshStandardMaterial {...matte(COL.orangeDeep)} />
    </mesh>
    {/* Ondas de sonido */}
    {[0.6, 0.95, 1.3].map((d, i) => (
      <mesh key={i} position={[1.05 + d * 0.5, 0.35 + i * 0.28, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.11, 0.32, 3]} />
        <meshStandardMaterial {...matte(COL.orange)} />
      </mesh>
    ))}
  </group>
);

/** Figuras geométricas flotando, con movimiento sutil. */
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
            <icosahedronGeometry args={[1, 0]} />
          ) : it.kind === 'tetra' ? (
            <tetrahedronGeometry args={[1, 0]} />
          ) : (
            <sphereGeometry args={[1, 10, 10]} />
          )}
          <meshStandardMaterial {...matte(i === 2 ? COL.orangeDeep : COL.orange)} />
        </mesh>
      ))}
    </group>
  );
};

/** Esfera mate clara del frente + cuadros tipo polaroid. */
export const PropsCluster = () => (
  <group>
    <mesh position={[-2.7, 0.95, 1.5]} castShadow receiveShadow>
      <sphereGeometry args={[0.6, 18, 18]} />
      <meshStandardMaterial {...matte(COL.stone, { roughness: 0.95 })} />
    </mesh>
    <mesh position={[-1.5, 1.75, 1.2]} rotation={[0, 0.4, -0.06]} castShadow>
      <boxGeometry args={[1.05, 1.05, 0.08]} />
      <meshStandardMaterial {...matte(COL.stone, { roughness: 0.95 })} />
    </mesh>
    <mesh position={[-1.5, 1.8, 1.25]} rotation={[0, 0.4, -0.06]}>
      <planeGeometry args={[0.85, 0.72]} />
      <meshStandardMaterial {...matte('#3a3532')} />
    </mesh>
    <mesh position={[-0.5, 1.55, 1.35]} rotation={[0, -0.15, 0.04]} castShadow>
      <boxGeometry args={[0.9, 0.9, 0.08]} />
      <meshStandardMaterial {...matte(COL.carbonLight)} />
    </mesh>
    <mesh position={[-0.45, 1.55, 1.41]} rotation={[0, -0.15, 0.04]}>
      <coneGeometry args={[0.22, 0.34, 3]} />
      <meshStandardMaterial {...matte(COL.orange)} />
    </mesh>
    <mesh position={[2.9, 0.95, 0.9]} castShadow receiveShadow>
      <coneGeometry args={[0.5, 1.1, 4]} />
      <meshStandardMaterial {...matte(COL.orange)} />
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
      <torusGeometry args={[0.34, 0.14, 6, 12, Math.PI * 1.15]} />
      <meshStandardMaterial {...matte(COL.stone)} />
    </mesh>
  );

  return (
    <group ref={g}>
      {arc(Math.PI * 0.35, -0.04, 0.31)}
      {arc(Math.PI * 1.35, 0.04, -0.31)}
      {/* Punto naranja del favicon */}
      <mesh position={[0.62, -0.5, 0]} castShadow>
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial {...matte(COL.orange, { roughness: 0.6 })} />
      </mesh>
    </group>
  );
};
