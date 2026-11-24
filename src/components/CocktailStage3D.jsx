import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, Environment, Lightformer, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  EmeraldMojitoModel,
  EspressoMartiniModel,
  NegroniModel,
} from './ProceduralDrinks';

/**
 * Loads and normalizes any custom Blender .glb model so it fits the studio stage cleanly.
 */
function CustomGLBModel({ url }) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 1.95 / maxDim;
    clone.scale.setScalar(targetScale);
    return clone;
  }, [scene]);

  return (
    <Center position={[0, -0.04, 0]}>
      <primitive object={normalizedScene} />
    </Center>
  );
}

/**
 * Full-Clip-Space Studio Cyclorama + Tabletop Shadow & Caustic Shader.
 * Covers 100% of the WebGL canvas in NDC space (zero plane clipping edges!)
 * and feeds Three.js's `transmission` FBO with the nuanced studio lighting,
 * sunlit tabletop pool, directional contact shadow, and ruby/emerald caustic glow.
 */
function StudioCyclorama({ theme }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      toneMapped: false,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uWallDark: { value: new THREE.Color(theme.cycloWallDark) },
        uWallWarm: { value: new THREE.Color(theme.cycloWallWarm) },
        uKeyBloom: { value: new THREE.Color(theme.cycloKeyBloom) },
        uTableLit: { value: new THREE.Color(theme.cycloTableLit) },
        uTableShadow: { value: new THREE.Color(theme.cycloTableShadow) },
        uCausticGlow: { value: new THREE.Color(theme.causticGlow) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uWallDark;
        uniform vec3 uWallWarm;
        uniform vec3 uKeyBloom;
        uniform vec3 uTableLit;
        uniform vec3 uTableShadow;
        uniform vec3 uCausticGlow;

        varying vec2 vUv;

        float dither(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        }

        void main() {
          // vUv.y: 1.0 = top of viewport, 0.0 = bottom of 44% hero stage (right at filter tags)
          float y = vUv.y;
          float x = vUv.x;

          // Rich warm studio wall falloff from top-right dark crimson/mocha/jade into warm sienna
          vec3 wall = mix(uWallDark, uWallWarm, smoothstep(0.95, 0.44, y));

          // Diagonal studio softbox keylight bloom entering from upper-left (matching reference!)
          float leftKey = exp(-pow(length((vUv - vec2(0.14, 0.56)) * vec2(1.05, 1.35)), 2.0) * 2.1);
          wall = mix(wall, uKeyBloom, leftKey * 0.72);

          // Smooth curved studio cove into the sunlit matte tabletop around & under the glass base
          float coveBlend = smoothstep(0.46, 0.14, y);
          vec3 tableTone = mix(uTableLit * 0.88, uTableLit, smoothstep(0.88, 0.16, x));
          vec3 col = mix(wall, tableTone, coveBlend);

          // Soft directional shadow cast down-right from glass base (center at y ≈ 0.22)
          vec2 shadowCenter = vec2(0.56, 0.205);
          float shadowDist = length((vUv - shadowCenter) * vec2(2.35, 6.2));
          float dirShadow = exp(-shadowDist * shadowDist * 1.55);

          // Tight dark contact shadow directly beneath the crystal base
          vec2 contactCenter = vec2(0.50, 0.228);
          float contactDist = length((vUv - contactCenter) * vec2(3.5, 11.5));
          float contactAo = exp(-contactDist * contactDist * 2.4);

          col = mix(col, uTableShadow * 0.72, dirShadow * 0.68);
          col = mix(col, uTableShadow * 0.30, contactAo * 0.84);

          // Subtle colored liquid caustic light refracted through glass onto the right-front shadow
          vec2 causticPos = vec2(0.535, 0.20);
          float causticDist = length((vUv - causticPos) * vec2(4.2, 12.0));
          col += uCausticGlow * exp(-causticDist * causticDist * 2.6) * 0.13;

          // Bottom edge transition matching the CSS horizon behind the filter tags
          float bottomFade = smoothstep(0.16, 0.0, y);
          col = mix(col, mix(uTableLit, uTableShadow, 0.52), bottomFade * 0.62);

          col += dither(gl_FragCoord.xy) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [theme]);

  useFrame((_, delta) => {
    const t = Math.min(1, delta * 8);
    material.uniforms.uWallDark.value.lerp(new THREE.Color(theme.cycloWallDark), t);
    material.uniforms.uWallWarm.value.lerp(new THREE.Color(theme.cycloWallWarm), t);
    material.uniforms.uKeyBloom.value.lerp(new THREE.Color(theme.cycloKeyBloom), t);
    material.uniforms.uTableLit.value.lerp(new THREE.Color(theme.cycloTableLit), t);
    material.uniforms.uTableShadow.value.lerp(new THREE.Color(theme.cycloTableShadow), t);
    material.uniforms.uCausticGlow.value.lerp(new THREE.Color(theme.causticGlow), t);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * Interactive turntable controller: slow continuous idle rotation + tactile
 * tap-and-drag spin/tilt with momentum, framed to match the reference composition.
 */
function InteractiveCocktailRig({ cocktail, customModelUrl }) {
  const groupRef = useRef(null);
  const scaleRef = useRef(0.6);
  const { gl } = useThree();

  const dragRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rotY: -0.45,
    rotX: 0,
    velY: 0.24,
  });

  useEffect(() => {
    scaleRef.current = 0.58;
    dragRef.current.rotY = -0.45;
    dragRef.current.velY = 0.24;
  }, [cocktail.id, customModelUrl]);

  useEffect(() => {
    const dom = gl.domElement;

    const onDown = (e) => {
      dragRef.current.isDragging = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      dom.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      dragRef.current.rotY += dx * 0.011;
      dragRef.current.velY = THREE.MathUtils.clamp(dx * 0.18, -5, 5);
      dragRef.current.rotX = THREE.MathUtils.clamp(
        dragRef.current.rotX + dy * 0.0045,
        -0.16,
        0.2
      );
    };

    const onUp = () => {
      dragRef.current.isDragging = false;
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const d = dragRef.current;

    if (!d.isDragging) {
      d.velY = THREE.MathUtils.lerp(d.velY, 0.26, Math.min(1, delta * 3.2));
      d.rotY += d.velY * delta;
      d.rotX = THREE.MathUtils.lerp(d.rotX, 0, Math.min(1, delta * 5.5));
    }

    scaleRef.current = THREE.MathUtils.lerp(
      scaleRef.current,
      0.66,
      Math.min(1, delta * 8.5)
    );

    groupRef.current.scale.setScalar(scaleRef.current);
    groupRef.current.rotation.y = d.rotY;
    groupRef.current.rotation.x = d.rotX;
    groupRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 1.3) * 0.01 - 0.08;
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
 * Commercial beverage studio lighting rig — positioned off-axis from horizontal
 * glass bases so vertical crystal walls catch crisp highlights without white floor glare.
 */
function StudioBeverageLighting({ theme }) {
  return (
    <>
      <ambientLight intensity={0.68} color={theme.keyLight} />
      <directionalLight
        position={[-3.8, 4.2, 2.8]}
        intensity={2.4}
        color={theme.keyLight}
      />
      <directionalLight
        position={[2.6, 2.0, -3.5]}
        intensity={1.8}
        color={theme.rimLight}
      />

      <Environment resolution={256}>
        {/* Crisp left studio vertical stripbox (signature left crystal rim highlight!) */}
        <Lightformer
          form="rect"
          intensity={3.8}
          color="#ffffff"
          position={[-4.4, 0.9, 2.1]}
          rotation={[0, Math.PI / 2.8, 0]}
          scale={[0.75, 5.8, 1]}
        />
        {/* Warm right studio vertical stripbox */}
        <Lightformer
          form="rect"
          intensity={2.1}
          color={theme.keyLight}
          position={[4.5, 0.7, 1.8]}
          rotation={[0, -Math.PI / 2.6, 0]}
          scale={[0.85, 5.2, 1]}
        />
        {/* Soft high-rear kicker for ice top bevels (placed at z = -2.8 to avoid flat base reflection) */}
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#fff6ee"
          position={[-1.2, 4.6, -2.6]}
          rotation={[Math.PI / 3, 0, 0]}
          scale={[3.8, 2.2, 1]}
        />
        {/* Warm rear liquid glow disc */}
        <Lightformer
          form="circle"
          intensity={2.4}
          color={theme.rimLight}
          position={[-0.3, 0.3, -4.4]}
          scale={[3.6, 3.6, 1]}
        />
      </Environment>
    </>
  );
}

export default function CocktailStage3D({ cocktail, customModelUrl }) {
  return (
    <section
      className="hero-stage-wrapper"
      aria-label={`Interactive 3D ${cocktail.name} showcase`}
    >
      <div id="cocktail-3d-canvas" className="hero-canvas-container">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.48, 4.55], fov: 30 }}
          onCreated={({ camera }) => {
            camera.lookAt(0, -0.06, 0);
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.04,
          }}
        >
          <StudioCyclorama theme={cocktail.theme} />
          <StudioBeverageLighting theme={cocktail.theme} />
          <InteractiveCocktailRig
            cocktail={cocktail}
            customModelUrl={customModelUrl}
          />
        </Canvas>
      </div>
    </section>
  );
}
