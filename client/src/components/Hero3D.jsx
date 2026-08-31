import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/* Paleta M3 "Tu Auditor" */
const AZUL = "#005db8";
const AZUL_CLARO = "#7aa9e8";
const CIAN = "#4fc3f7";
const SUPERFICIE = "#d6e3ff";

function CajaConPares({
  position,
  rotation = [0, 0, 0],
  escala = 1,
  conBarras = false,
  color,
  rough = 0.25,
  metal = 0.4,
}) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    return g;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={escala}>
      <mesh ref={ref} geometry={geometry}>
        <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      </mesh>
      {/* Código de barras en relieve */}
      {conBarras && <Barras />}
    </group>
  );
}

/* Código de barras embossed pegado a la cara frontal del cubo */
function Barras() {
  const group = useRef();
  const barras = useMemo(() => {
    const arr = [];
    let x = -0.32;
    const anchoTotal = 0.64;
    const n = 14;
    while (x < anchoTotal / 2) {
      const w = 0.02 + Math.random() * 0.035;
      arr.push({ x, w });
      x += w + 0.015;
    }
    return arr;
  }, []);
  return (
    <group position={[0, 0, 0.501]}>
      {barras.map((b, i) => (
        <mesh key={i} position={[b.x, 0, 0]}>
          <boxGeometry args={[b.w, 0.52, 0.035]} />
          <meshStandardMaterial color={AZUL} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Laser() {
  const ref = useRef();
  const haz = useRef();
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 1.4) % 1;
    const x = THREE.MathUtils.lerp(-0.44, 0.44, t);
    if (ref.current) {
      ref.current.position.x = x;
      ref.current.position.z = 0.66;
    }
    if (haz.current) {
      haz.current.position.x = x * 0.6;
      haz.current.position.z = 0.66;
    }
  });
  return (
    <group>
      {/* haz vertical principal */}
      <mesh ref={ref}>
        <boxGeometry args={[0.025, 1.1, 0.02]} />
        <meshBasicMaterial color={CIAN} toneMapped={false} />
      </mesh>
      {/* cola de luz ancha sutil */}
      <mesh ref={haz}>
        <planeGeometry args={[0.06, 1.05]} />
        <meshBasicMaterial color={CIAN} transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* punto brillante en el cubo */}
      <pointLight position={[0, 0, 1.2]} color={CIAN} intensity={1.4} distance={4} />
    </group>
  );
}

function ProductoPrincipal() {
  const grupo = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (grupo.current) {
      grupo.current.rotation.y = 0.55 + Math.sin(t * 0.35) * 0.22;
      grupo.current.position.y = Math.sin(t * 1.1) * 0.06;
    }
  });
  return (
    <group ref={grupo}>
      <CajaConPares
        position={[0, 0, 0]}
        conBarras
        escala={1.35}
        color={SUPERFICIE}
        rough={0.18}
        metal={0.55}
      />
      {/* cubos flotantes acompañantes */}
      <CajaConPares position={[1.95, 1.0, -0.6]} color={AZUL} escala={0.55} />
      <CajaConPares position={[-1.9, -0.9, -0.5]} color={AZUL_CLARO} escala={0.66} />
      <Laser />
    </group>
  );
}

export default function Hero3D({ className = "" }) {
  return (
    <div className={"relative " + className}>
      <Canvas
        camera={{ position: [0, 0.6, 6.8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} color="#ffffff" />
        <pointLight position={[-4, -2, 3]} intensity={0.5} color={AZUL_CLARO} />
        <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.6}>
          <ProductoPrincipal />
        </Float>
        <ContactShadows opacity={0.35} scale={12} blur={2.4} far={3} color="#1b2b45" />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
