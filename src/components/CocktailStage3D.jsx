import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Center,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import {
  EmeraldMojitoModel,
  EspressoMartiniModel,
  NegroniModel,
} from './ProceduralDrinks';

/**
 * Loads and normalizes any custom Blender .glb model so it fits the stage cleanly.
 */
function CustomGLBModel({ url }) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 2.25 / maxDim;
    clone.scale.setScalar(targetScale);
    return clone;
  }, [scene]);

  return (
    <Center position={[0, -0.05, 0]}>
      <primitive object={normalizedScene} />
    </Center>
  );
}

/**
 * Animated turntable wrapper that plays a smooth entrance settle when switching drinks.
 */
function AnimatedDrinkShowcase({ cocktail, customModelUrl }) {
  const groupRef = useRef(null);
  const transitionProgress = useRef(0);

  useEffect(() => {
    transitionProgress.current = 0;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0.74);
      groupRef.current.rotation.y = -0.55;
    }
  }, [cocktail.id, customModelUrl]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    transitionProgress.current = Math.min(1, transitionProgress.current + delta * 3.8);
    const targetScale = 0.88;
    const nextScale = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      targetScale,
      Math.min(1, delta * 9)
    );
    groupRef.current.scale.setScalar(nextScale);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      0,
      Math.min(1, delta * 7)
    );
    // Gentle micro-breathing float
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.018 - 0.06;
  });

  const activeModelUrl = customModelUrl || cocktail.modelUrl;

  return (
    <group ref={groupRef}>
      {activeModelUrl ? (
        <Suspense fallback={null}>
          <CustomGLBModel url={activeModelUrl} />
        </Suspense>
      ) : cocktail.proceduralType === 'espresso' ? (
        <EspressoMartiniModel />
      ) : cocktail.proceduralType === 'mojito' ? (
        <EmeraldMojitoModel />
      ) : (
        <NegroniModel />
      )}
    </group>
  );
}

/**
 * Studio beverage photography lighting rig built with procedural Lightformers
 * (zero external HDR network latency, crisp vertical glass speculars).
 */
function StudioBeverageLighting({ theme }) {
  return (
    <>
      <ambientLight intensity={0.65} color={theme.keyLight} />
      <directionalLight
        position={[3.5, 5.2, 4.0]}
        intensity={2.2}
        color={theme.keyLight}
      />
      <directionalLight
        position={[-4.0, 2.2, -2.8]}
        intensity={1.65}
        color={theme.rimLight}
      />
      <pointLight
        position={[0, -1.35, 0.8]}
        intensity={1.1}
        distance={4.5}
        color={theme.rimLight}
      />

      <Environment resolution={256}>
        {/* Overhead softbox */}
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#fffaf5"
          position={[0, 5, 1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 4, 1]}
        />
        {/* Tall left studio strip light for crisp crystal rim highlight */}
        <Lightformer
          form="rect"
          intensity={3.6}
          color="#ffffff"
          position={[-4.2, 0.8, 2.2]}
          rotation={[0, Math.PI / 2.6, 0]}
          scale={[1.1, 6.5, 1]}
        />
        {/* Tall right studio strip light */}
        <Lightformer
          form="rect"
          intensity={2.9}
          color={theme.keyLight}
          position={[4.4, 0.6, 1.8]}
          rotation={[0, -Math.PI / 2.5, 0]}
          scale={[1.3, 6.0, 1]}
        />
        {/* Backliquid glow kicker so Campari / Mojito / Espresso glows from behind */}
        <Lightformer
          form="circle"
          intensity={2.6}
          color={theme.rimLight}
          position={[0, 0.4, -4.2]}
          scale={[4.2, 4.2, 1]}
        />
      </Environment>
    </>
  );
}

export default function CocktailStage3D({
  cocktail,
  customModelUrl,
  onPrevDrink,
  onNextDrink,
}) {
  const [hasInteracted, setHasInteracted] = useState(false);

  return (
    <section
      className="hero-stage-wrapper"
      aria-label={`Interactive 3D ${cocktail.name} showcase`}
    >
      {/* Subtle left/right quick-switch chevrons along stage edges */}
      <button
        id="prev-cocktail-btn"
        type="button"
        className="stage-side-arrow left"
        onClick={onPrevDrink}
        aria-label="Previous cocktail"
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
      </button>

      <button
        id="next-cocktail-btn"
        type="button"
        className="stage-side-arrow right"
        onClick={onNextDrink}
        aria-label="Next cocktail"
      >
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>

      <div
        id="cocktail-3d-canvas"
        className="hero-canvas-container"
        onPointerDown={() => setHasInteracted(true)}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0.72, 5.25], fov: 35 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <StudioBeverageLighting theme={cocktail.theme} />

          <AnimatedDrinkShowcase
            cocktail={cocktail}
            customModelUrl={customModelUrl}
          />

          <ContactShadows
            position={[0, -1.14, 0]}
            opacity={0.5}
            scale={4.8}
            blur={2.4}
            far={2.4}
            color={cocktail.theme.shadowColor}
          />

          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={1.15}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.8}
            minPolarAngle={Math.PI * 0.28}
            maxPolarAngle={Math.PI * 0.54}
          />
        </Canvas>
      </div>

      <div className={`stage-orbit-hint ${hasInteracted ? 'hidden' : ''}`}>
        <MoveHorizontal size={12} />
        <span>Drag to rotate 3D glass</span>
      </div>
    </section>
  );
}
