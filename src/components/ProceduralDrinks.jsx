import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * High-clarity studio Fresnel crystal glass material for transparent WebGL canvases.
 * Uses `depthWrite={false}` + intense clearcoat studio reflections so rich translucent
 * liquids, ice cubes, and garnishes inside the glass remain 100% vivid and unobstructed.
 */
function CrystalGlassMaterial({ tint = '#ffffff', opacity = 0.2 }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      opacity={opacity}
      transparent
      depthWrite={false}
      roughness={0.025}
      metalness={0.08}
      ior={1.54}
      reflectivity={1}
      clearcoat={1}
      clearcoatRoughness={0.02}
      envMapIntensity={3.1}
      side={THREE.DoubleSide}
    />
  );
}

/**
 * 1. NEGRONI — Cut-crystal rocks glass, deep ruby Campari liquid, clear artisanal ice block, tucked orange peel
 */
export function NegroniModel() {
  const { glassGeo, liquidGeo, meniscusGeo, peelGeo } = useMemo(() => {
    // Heavy-sham rocks glass silhouette
    const gPoints = [
      new THREE.Vector2(0.0, -1.02),
      new THREE.Vector2(0.88, -1.02),
      new THREE.Vector2(0.93, -0.96),
      new THREE.Vector2(0.95, -0.58),
      new THREE.Vector2(1.01, 0.92),
      new THREE.Vector2(0.995, 0.96),
      new THREE.Vector2(0.955, 0.96),
      new THREE.Vector2(0.93, 0.91),
      new THREE.Vector2(0.86, -0.55),
      new THREE.Vector2(0.79, -0.61),
      new THREE.Vector2(0.0, -0.61),
    ];
    const glassGeometry = new THREE.LatheGeometry(gPoints, 72);

    // Rich ruby liquid body inside glass cavity
    const lPoints = [
      new THREE.Vector2(0.0, -0.59),
      new THREE.Vector2(0.77, -0.59),
      new THREE.Vector2(0.845, -0.53),
      new THREE.Vector2(0.895, 0.48),
      new THREE.Vector2(0.85, 0.495),
      new THREE.Vector2(0.0, 0.485),
    ];
    const liquidGeometry = new THREE.LatheGeometry(lPoints, 64);

    // Top liquid surface disc for bright amber-ruby reflection
    const meniscusGeometry = new THREE.RingGeometry(0.45, 0.89, 64);

    // Orange zest ribbon strictly tucked inside upper-left glass wall
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.52, 0.14, -0.18),
      new THREE.Vector3(-0.63, 0.44, -0.06),
      new THREE.Vector3(-0.69, 0.72, 0.08),
      new THREE.Vector3(-0.62, 0.93, 0.22),
      new THREE.Vector3(-0.46, 0.86, 0.34),
    ]);

    const ribbonShape = new THREE.Shape();
    const w = 0.17;
    const t = 0.026;
    ribbonShape.moveTo(-w, -t);
    ribbonShape.quadraticCurveTo(0, -t * 1.35, w, -t);
    ribbonShape.lineTo(w, t);
    ribbonShape.quadraticCurveTo(0, t * 0.65, -w, t);
    ribbonShape.closePath();

    const peelGeometry = new THREE.ExtrudeGeometry(ribbonShape, {
      steps: 40,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      extrudePath: curve,
    });

    return {
      glassGeo: glassGeometry,
      liquidGeo: liquidGeometry,
      meniscusGeo: meniscusGeometry,
      peelGeo: peelGeometry,
    };
  }, []);

  // Cut-crystal facets around the heavy sham base (matching reference photo's fluted base)
  const shamFacets = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const angle = (idx / 14) * Math.PI * 2;
      const r = 0.905;
      return {
        key: idx,
        position: [Math.cos(angle) * r, -0.79, Math.sin(angle) * r],
        rotation: [0, -angle, 0],
      };
    });
  }, []);

  return (
    <group position={[0, -0.02, 0]}>
      {/* Warm Glowing Internal Amber Core (simulates studio backlight scattering through Campari) */}
      <mesh position={[0, -0.06, -0.05]}>
        <cylinderGeometry args={[0.62, 0.54, 0.88, 32]} />
        <meshBasicMaterial color="#ff3b0a" transparent opacity={0.45} />
      </mesh>

      {/* Deep Saturated Ruby Negroni Liquid (non-transmissive so outer crystal refracts it vividly!) */}
      <mesh geometry={liquidGeo}>
        <meshPhysicalMaterial
          color="#9e1105"
          emissive="#4a0700"
          emissiveIntensity={0.55}
          transparent
          opacity={0.86}
          roughness={0.06}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Bright Ruby-Orange Surface Meniscus */}
      <mesh
        geometry={meniscusGeo}
        position={[0, 0.492, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#e8380e"
          emissive="#6e1400"
          emissiveIntensity={0.4}
          roughness={0.08}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Large Artisanal Hand-Cut Ice Block */}
      <group position={[0.08, 0.25, 0.02]} rotation={[0.11, 0.52, -0.08]}>
        <RoundedBox args={[0.98, 0.94, 0.98]} radius={0.095} smoothness={5}>
          <meshPhysicalMaterial
            color="#fff0ea"
            emissive="#451106"
            emissiveIntensity={0.18}
            transparent
            opacity={0.72}
            roughness={0.08}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.04}
            reflectivity={1}
            envMapIntensity={2.5}
          />
        </RoundedBox>
        {/* Crisp internal crystalline frost glint */}
        <mesh position={[0, 0.18, 0]} rotation={[0.35, 0.25, 0.15]}>
          <boxGeometry args={[0.72, 0.42, 0.72]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.26}
            roughness={0.12}
            envMapIntensity={2.2}
          />
        </mesh>
      </group>

      {/* Sculpted Tangerine Peel Twist */}
      <mesh geometry={peelGeo}>
        <meshPhysicalMaterial
          color="#ff850d"
          emissive="#612100"
          emissiveIntensity={0.28}
          roughness={0.3}
          clearcoat={0.5}
          clearcoatRoughness={0.22}
        />
      </mesh>

      {/* Heavy Crystal Sham Base Core */}
      <mesh position={[0, -0.82, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.86, 0.85, 0.36, 64]} />
        <meshPhysicalMaterial
          color="#fff4ee"
          transparent
          opacity={0.34}
          depthWrite={false}
          roughness={0.05}
          clearcoat={1}
          envMapIntensity={2.8}
        />
      </mesh>

      {/* Cut-Crystal Base Flutes along the Sham Base */}
      {shamFacets.map((facet) => (
        <RoundedBox
          key={facet.key}
          position={facet.position}
          rotation={facet.rotation}
          args={[0.09, 0.38, 0.14]}
          radius={0.035}
          smoothness={3}
          renderOrder={3}
        >
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.32}
            depthWrite={false}
            roughness={0.04}
            clearcoat={1}
            envMapIntensity={2.8}
          />
        </RoundedBox>
      ))}

      {/* Outer Heavy Crystal Rocks Glass */}
      <mesh geometry={glassGeo} renderOrder={4}>
        <CrystalGlassMaterial tint="#fffaf7" opacity={0.21} />
      </mesh>

      {/* Crisp Lip Rim Specular Ring */}
      <mesh position={[0, 0.955, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[0.975, 0.02, 16, 72]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.58}
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={3.0}
        />
      </mesh>
    </group>
  );
}

/**
 * 2. ESPRESSO MARTINI — Stemmed crystal coupe, dark roast espresso body, golden hazelnut crema, 3 beans
 */
export function EspressoMartiniModel() {
  const { coupeGeo, espressoGeo, cremaGeo } = useMemo(() => {
    const cPoints = [
      new THREE.Vector2(0.0, -1.22),
      new THREE.Vector2(0.74, -1.22),
      new THREE.Vector2(0.76, -1.17),
      new THREE.Vector2(0.21, -1.1),
      new THREE.Vector2(0.082, -0.94),
      new THREE.Vector2(0.076, -0.14),
      new THREE.Vector2(0.18, 0.02),
      new THREE.Vector2(0.77, 0.24),
      new THREE.Vector2(1.12, 0.56),
      new THREE.Vector2(1.17, 0.79),
      new THREE.Vector2(1.14, 0.81),
      new THREE.Vector2(1.085, 0.56),
      new THREE.Vector2(0.73, 0.27),
      new THREE.Vector2(0.16, 0.08),
      new THREE.Vector2(0.0, 0.06),
    ];
    const coupeGeometry = new THREE.LatheGeometry(cPoints, 72);

    const ePoints = [
      new THREE.Vector2(0.0, 0.075),
      new THREE.Vector2(0.155, 0.09),
      new THREE.Vector2(0.71, 0.275),
      new THREE.Vector2(1.02, 0.52),
      new THREE.Vector2(0.0, 0.52),
    ];
    const espressoGeometry = new THREE.LatheGeometry(ePoints, 64);

    const crPoints = [
      new THREE.Vector2(0.0, 0.515),
      new THREE.Vector2(1.02, 0.515),
      new THREE.Vector2(1.095, 0.64),
      new THREE.Vector2(1.06, 0.66),
      new THREE.Vector2(0.0, 0.655),
    ];
    const cremaGeometry = new THREE.LatheGeometry(crPoints, 64);

    return {
      coupeGeo: coupeGeometry,
      espressoGeo: espressoGeometry,
      cremaGeo: cremaGeometry,
    };
  }, []);

  const beans = useMemo(() => {
    return [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.25;
      const dist = 0.165;
      return {
        key: i,
        position: [Math.cos(a) * dist, 0.668, Math.sin(a) * dist],
        rotation: [0.05, -a + Math.PI / 2, 0.06],
      };
    });
  }, []);

  return (
    <group position={[0, 0.04, 0]}>
      {/* Dark Roast Espresso Body */}
      <mesh geometry={espressoGeo}>
        <meshPhysicalMaterial
          color="#160803"
          emissive="#240c03"
          emissiveIntensity={0.35}
          roughness={0.09}
          clearcoat={0.9}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* Silky Hazelnut Crema Cap */}
      <mesh geometry={cremaGeo}>
        <meshPhysicalMaterial
          color="#cf9e6e"
          emissive="#3d220c"
          emissiveIntensity={0.22}
          roughness={0.5}
          clearcoat={0.2}
          clearcoatRoughness={0.42}
        />
      </mesh>

      {/* Lighter Micro-foam Rim Halo */}
      <mesh position={[0, 0.655, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.055, 0.022, 16, 64]} />
        <meshStandardMaterial color="#e8c39b" roughness={0.58} />
      </mesh>

      {/* Three Roasted Coffee Beans */}
      {beans.map((bean) => (
        <group key={bean.key} position={bean.position} rotation={bean.rotation}>
          <mesh scale={[0.092, 0.05, 0.142]}>
            <sphereGeometry args={[1, 24, 20]} />
            <meshPhysicalMaterial
              color="#241007"
              roughness={0.34}
              clearcoat={0.4}
              clearcoatRoughness={0.28}
            />
          </mesh>
          <mesh position={[0, 0.045, 0]} scale={[0.012, 0.015, 0.12]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#0d0502" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Outer Stemmed Crystal Coupe */}
      <mesh geometry={coupeGeo} renderOrder={4}>
        <CrystalGlassMaterial tint="#fff9f4" opacity={0.22} />
      </mesh>

      {/* Coupe Rim Specular Highlight */}
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[1.155, 0.016, 16, 72]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.55}
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={3.0}
        />
      </mesh>
    </group>
  );
}

/**
 * 3. EMERALD MOJITO — Tall crystal highball, botanical lime-mint infusion, stacked ice, lime wheel, mint & bubbles
 */
export function EmeraldMojitoModel() {
  const bubblesRef = useRef([]);

  const { highballGeo, mojitoLiquidGeo, leafGeo } = useMemo(() => {
    const hPoints = [
      new THREE.Vector2(0.0, -1.2),
      new THREE.Vector2(0.65, -1.2),
      new THREE.Vector2(0.68, -1.15),
      new THREE.Vector2(0.7, -0.84),
      new THREE.Vector2(0.75, 1.08),
      new THREE.Vector2(0.735, 1.11),
      new THREE.Vector2(0.705, 1.11),
      new THREE.Vector2(0.69, 1.06),
      new THREE.Vector2(0.64, -0.8),
      new THREE.Vector2(0.57, -0.85),
      new THREE.Vector2(0.0, -0.85),
    ];
    const highballGeometry = new THREE.LatheGeometry(hPoints, 68);

    const mPoints = [
      new THREE.Vector2(0.0, -0.83),
      new THREE.Vector2(0.56, -0.83),
      new THREE.Vector2(0.625, -0.78),
      new THREE.Vector2(0.672, 0.82),
      new THREE.Vector2(0.64, 0.835),
      new THREE.Vector2(0.0, 0.825),
    ];
    const mojitoGeometry = new THREE.LatheGeometry(mPoints, 60);

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.17, 0.08, 0.21, 0.32, 0, 0.52);
    shape.bezierCurveTo(-0.21, 0.32, -0.17, 0.08, 0, 0);
    const leafGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    });

    return {
      highballGeo: highballGeometry,
      mojitoLiquidGeo: mojitoGeometry,
      leafGeo: leafGeometry,
    };
  }, []);

  const bubbleSeeds = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 0.12 + ((i * 37) % 38) / 100;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        baseY: -0.72 + ((i * 19) % 145) / 100,
        speed: 0.28 + (i % 5) * 0.07,
        size: 0.016 + (i % 3) * 0.007,
      };
    });
  }, []);

  useFrame((_, delta) => {
    bubblesRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const seed = bubbleSeeds[idx];
      mesh.position.y += seed.speed * delta;
      if (mesh.position.y > 0.79) {
        mesh.position.y = -0.75;
      }
    });
  });

  const iceStack = [
    { pos: [-0.07, -0.36, 0.05], rot: [0.22, 0.4, -0.18], size: [0.64, 0.6, 0.64] },
    { pos: [0.08, 0.12, -0.06], rot: [-0.18, 0.95, 0.24], size: [0.66, 0.62, 0.64] },
    { pos: [-0.05, 0.58, 0.04], rot: [0.28, 0.25, -0.15], size: [0.64, 0.58, 0.62] },
  ];

  return (
    <group position={[0, -0.02, 0]}>
      {/* Botanical Lime-Jade Infusion */}
      <mesh geometry={mojitoLiquidGeo}>
        <meshPhysicalMaterial
          color="#2eb877"
          emissive="#073d23"
          emissiveIntensity={0.35}
          transparent
          opacity={0.76}
          roughness={0.07}
          clearcoat={1}
          envMapIntensity={1.9}
        />
      </mesh>

      {/* Stacked Cracked Ice Cubes */}
      {iceStack.map((cube, idx) => (
        <RoundedBox
          key={idx}
          position={cube.pos}
          rotation={cube.rot}
          args={cube.size}
          radius={0.085}
          smoothness={4}
        >
          <meshPhysicalMaterial
            color="#e8fff4"
            transparent
            opacity={0.68}
            roughness={0.09}
            clearcoat={1}
            envMapIntensity={2.3}
          />
        </RoundedBox>
      ))}

      {/* Rising Effervescent Soda Bubbles */}
      {bubbleSeeds.map((b, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            bubblesRef.current[idx] = el;
          }}
          position={[b.x, b.baseY, b.z]}
        >
          <sphereGeometry args={[b.size, 10, 10]} />
          <meshBasicMaterial color="#e8fff5" transparent opacity={0.78} />
        </mesh>
      ))}

      {/* Fresh Lime Wheel Garnish */}
      <group position={[0.38, 0.86, 0.14]} rotation={[0.25, -0.35, -0.42]}>
        <mesh>
          <cylinderGeometry args={[0.34, 0.34, 0.06, 36, 1, true]} />
          <meshStandardMaterial color="#258535" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.325, 0.325, 0.056, 36]} />
          <meshStandardMaterial color="#f2f7e8" roughness={0.5} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.295, 0.295, 0.062, 32]} />
          <meshPhysicalMaterial color="#9ce03e" roughness={0.22} transparent opacity={0.92} />
        </mesh>
      </group>

      {/* Fresh Garden Mint Sprig Crown */}
      <group position={[-0.12, 0.88, -0.04]}>
        <mesh geometry={leafGeo} rotation={[-0.45, 0.2, 0.35]} scale={0.92}>
          <meshPhysicalMaterial color="#2eb863" roughness={0.36} clearcoat={0.24} />
        </mesh>
        <mesh geometry={leafGeo} rotation={[-0.55, 1.9, -0.25]} scale={0.85}>
          <meshPhysicalMaterial color="#20944b" roughness={0.4} clearcoat={0.2} />
        </mesh>
        <mesh geometry={leafGeo} rotation={[-0.35, 3.6, 0.2]} scale={0.76}>
          <meshPhysicalMaterial color="#3cd175" roughness={0.35} clearcoat={0.25} />
        </mesh>
        <mesh
          geometry={leafGeo}
          position={[0.04, 0.07, 0.03]}
          rotation={[-0.2, -1.1, -0.3]}
          scale={0.62}
        >
          <meshPhysicalMaterial color="#4ee086" roughness={0.34} />
        </mesh>
      </group>

      {/* Brushed Metallic Sipping Straw */}
      <mesh position={[-0.29, 0.28, -0.2]} rotation={[0.08, 0, 0.14]}>
        <cylinderGeometry args={[0.028, 0.028, 2.15, 20]} />
        <meshStandardMaterial color="#dff2e8" metalness={0.86} roughness={0.16} />
      </mesh>

      {/* Heavy Sham Base Crystal Core */}
      <mesh position={[0, -1.02, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.63, 0.62, 0.3, 48]} />
        <meshPhysicalMaterial
          color="#edfff7"
          transparent
          opacity={0.32}
          depthWrite={false}
          roughness={0.05}
          clearcoat={1}
          envMapIntensity={2.8}
        />
      </mesh>

      {/* Outer Tall Crystal Highball Glass */}
      <mesh geometry={highballGeo} renderOrder={4}>
        <CrystalGlassMaterial tint="#f5fffa" opacity={0.21} />
      </mesh>

      {/* Highball Lip Specular Ring */}
      <mesh position={[0, 1.105, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[0.72, 0.016, 16, 68]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.55}
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={3.0}
        />
      </mesh>
    </group>
  );
}
