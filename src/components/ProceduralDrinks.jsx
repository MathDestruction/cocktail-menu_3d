import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Generates a single-skin Lathe-like BufferGeometry with optional sculpted
 * concave cut-crystal vertical flutes on the outer wall & sham base.
 * Using a single outer crystal skin avoids WebGL double-wall transmission
 * sorting bands while letting Three.js's transmission pass refract the
 * volumetric liquid and studio cyclorama cleanly!
 */
function createCrystalGlassGeometry(profilePoints, segments = 128, fluteOpts = null) {
  const denseProfile = [];
  for (let i = 0; i < profilePoints.length - 1; i++) {
    const p0 = profilePoints[i];
    const p1 = profilePoints[i + 1];
    const dist = p0.distanceTo(p1);
    const steps = Math.max(1, Math.ceil(dist / 0.04));
    for (let s = 0; s < steps; s++) {
      denseProfile.push(p0.clone().lerp(p1, s / steps));
    }
  }
  denseProfile.push(profilePoints[profilePoints.length - 1].clone());

  const numPts = denseProfile.length;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segments; j++) {
    const u = j / segments;
    const theta = u * Math.PI * 2;

    for (let i = 0; i < numPts; i++) {
      const v = i / (numPts - 1);
      let r = denseProfile[i].x;
      const y = denseProfile[i].y;

      if (fluteOpts && r > 0.38 && v < 0.88) {
        const { count = 12, depth = 0.036, yMin = -0.96, yMax = -0.06 } = fluteOpts;
        if (y > yMin && y < yMax) {
          const fadeBottom = THREE.MathUtils.smoothstep(y, yMin, yMin + 0.1);
          const fadeTop = 1.0 - THREE.MathUtils.smoothstep(y, yMax - 0.2, yMax);
          // Concave cut-crystal facet arch with crisp ridges between flutes
          const wave = Math.abs(Math.sin((theta * count) / 2));
          const arch = Math.pow(wave, 0.65);
          r -= depth * fadeBottom * fadeTop * arch;
        }
      }

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < numPts - 1; i++) {
      const a = j * numPts + i;
      const b = (j + 1) * numPts + i;
      const c = (j + 1) * numPts + (i + 1);
      const d = j * numPts + (i + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Physically-based lead-crystal glass material tuned for single-pass WebGL refraction.
 * `thickness` is calibrated so wall refraction bends internal liquids & facets realistically
 * without UV-overshooting outside the glass silhouette.
 */
function RefractiveCrystalMaterial({
  tint = '#fffaf7',
  attenuationColor = '#e0cac0',
  thickness = 0.16,
  clearcoat = 1,
  envMapIntensity = 1.85,
}) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={0.94}
      ior={1.49}
      thickness={thickness}
      roughness={0.035}
      metalness={0}
      dispersion={0.22}
      reflectivity={0.95}
      clearcoat={clearcoat}
      clearcoatRoughness={0.025}
      attenuationColor={attenuationColor}
      attenuationDistance={2.2}
      envMapIntensity={envMapIntensity}
      side={THREE.DoubleSide}
    />
  );
}

/**
 * Custom GLSL Beer-Lambert Volumetric Liquid Shader.
 * Simulates rich deep edge absorption, fiery backlit center transmission,
 * internal cut-crystal facet caustics, submerged ice refraction, and a dark
 * glossy meniscus surface with capillary wall climb.
 */
function useVolumetricLiquidMaterial({
  deepColor,
  midColor,
  coreGlowColor,
  surfaceDeepColor,
  meniscusColor,
  peelTint = '#000000',
  peelStrength = 0.0,
  iceShadowStrength = 0.0,
  fluteRipple = 0.0,
}) {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uDeepColor: { value: new THREE.Color(deepColor) },
        uMidColor: { value: new THREE.Color(midColor) },
        uCoreGlow: { value: new THREE.Color(coreGlowColor) },
        uSurfaceDeep: { value: new THREE.Color(surfaceDeepColor) },
        uMeniscusColor: { value: new THREE.Color(meniscusColor) },
        uPeelTint: { value: new THREE.Color(peelTint) },
        uPeelStrength: { value: peelStrength },
        uIceShadow: { value: iceShadowStrength },
        uFluteRipple: { value: fluteRipple },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;

        void main() {
          vLocalPos = position;
          vLocalNormal = normal;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDeepColor;
        uniform vec3 uMidColor;
        uniform vec3 uCoreGlow;
        uniform vec3 uSurfaceDeep;
        uniform vec3 uMeniscusColor;
        uniform vec3 uPeelTint;
        uniform float uPeelStrength;
        uniform float uIceShadow;
        uniform float uFluteRipple;

        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float ndotv = clamp(dot(N, V), 0.0, 1.0);

          // Beer-Lambert optical path: dark garnet silhouette edges, glowing ruby-amber center
          float centerTransmit = pow(ndotv, 1.45);
          float verticalDepth = smoothstep(-0.62, 0.48, vLocalPos.y);

          vec3 col = mix(uDeepColor, uMidColor, smoothstep(0.06, 0.58, centerTransmit));

          // Internal studio backlight scatter (richer on left-center keylight side & middle depth)
          float keySide = smoothstep(-0.7, 0.65, -vWorldPos.x * 0.6 + centerTransmit * 0.8);
          float midBand = sin(clamp((vLocalPos.y + 0.58) / 1.06, 0.0, 1.0) * 3.14159);
          float glowFactor = pow(centerTransmit, 2.0) * (0.45 + 0.55 * keySide) * (0.45 + 0.55 * midBand);
          col = mix(col, uCoreGlow, clamp(glowFactor, 0.0, 0.85));

          // Cut-crystal vertical facet caustics & dark refraction ribs inside the liquid
          if (uFluteRipple > 0.0) {
            float angle = atan(vLocalPos.z, vLocalPos.x);
            float rib = abs(sin(angle * 6.0 + V.x * 1.4));
            float sharpCaustic = pow(rib, 5.0);
            float darkRib = pow(1.0 - rib, 2.4);
            float fluteHeight = 1.0 - smoothstep(-0.56, 0.36, vLocalPos.y);
            col = mix(col, uDeepColor * 0.65, darkRib * uFluteRipple * 0.65 * (0.4 + 0.6 * fluteHeight));
            col += uCoreGlow * sharpCaustic * uFluteRipple * 0.45 * centerTransmit;
          }

          // Submerged ice block refraction & shadow inside the cocktail liquid
          if (uIceShadow > 0.0) {
            vec3 iceDelta = vLocalPos - vec3(0.07, 0.24, 0.02);
            float boxDist = max(max(abs(iceDelta.x), abs(iceDelta.y * 1.05)), abs(iceDelta.z));
            float inIce = 1.0 - smoothstep(0.34, 0.54, boxDist);
            float iceRim = smoothstep(0.36, 0.47, boxDist) * (1.0 - smoothstep(0.47, 0.60, boxDist));
            col = mix(col, uDeepColor * 0.58, inIce * uIceShadow * 0.62);
            col += uCoreGlow * iceRim * uIceShadow * 0.48;
          }

          // Submerged orange peel warm amber scatter in upper-left
          if (uPeelStrength > 0.0) {
            float peelDist = length(vLocalPos - vec3(-0.62, 0.32, 0.08));
            float peelGlow = 1.0 - smoothstep(0.12, 0.68, peelDist);
            col = mix(col, uPeelTint, peelGlow * uPeelStrength * 0.52);
          }

          // Bottom heavy crystal floor dark reflection + warm ruby rim bounce
          float bottomEdge = 1.0 - smoothstep(-0.58, -0.42, vLocalPos.y);
          col = mix(col, uDeepColor * 0.7, bottomEdge * (1.0 - centerTransmit) * 0.6);
          col += uCoreGlow * bottomEdge * centerTransmit * 0.22;

          // Top elliptical meniscus surface (rich dark glossy pool + bright capillary wall ring)
          float isTopSurface = smoothstep(0.55, 0.92, vLocalNormal.y);
          if (isTopSurface > 0.01) {
            float rNorm = clamp(length(vLocalPos.xz) / 0.94, 0.0, 1.0);
            float capillaryRing = smoothstep(0.80, 0.99, rNorm);
            vec3 topCol = mix(uSurfaceDeep, uMeniscusColor, capillaryRing * 0.78);

            // Subtle warm subsurface glow around submerged ice & peel on top surface
            topCol += uCoreGlow * (1.0 - smoothstep(0.28, 0.62, rNorm)) * 0.16;

            // Crisp studio keylight specular glint on wet meniscus
            vec3 R = reflect(-V, N);
            float spec = pow(clamp(dot(R, normalize(vec3(-0.55, 0.76, 0.34))), 0.0, 1.0), 22.0);
            float fresnel = pow(1.0 - ndotv, 3.8);
            topCol += vec3(1.0, 0.88, 0.80) * (spec * 0.35 + fresnel * 0.18);

            col = mix(col, topCol, isTopSurface);
          } else {
            // Vertical studio strip reflections on liquid cylinder
            vec3 R = reflect(-V, N);
            float leftStrip = pow(clamp(dot(R, normalize(vec3(-0.80, 0.22, 0.55))), 0.0, 1.0), 34.0);
            float rightStrip = pow(clamp(dot(R, normalize(vec3(0.84, 0.18, 0.50))), 0.0, 1.0), 42.0);
            col += uMeniscusColor * (leftStrip * 0.24 + rightStrip * 0.14);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [
    deepColor,
    midColor,
    coreGlowColor,
    surfaceDeepColor,
    meniscusColor,
    peelTint,
    peelStrength,
    iceShadowStrength,
    fluteRipple,
  ]);
}

/**
 * 1. NEGRONI — Cut-crystal rocks glass, deep Campari-ruby volumetric liquid,
 * clear artisanal square ice block breaking the surface & tucked orange peel.
 */
export function NegroniModel() {
  const negroniLiquidMat = useVolumetricLiquidMaterial({
    deepColor: '#1f0200',
    midColor: '#8c0c02',
    coreGlowColor: '#f23607',
    surfaceDeepColor: '#470501',
    meniscusColor: '#eb4b17',
    peelTint: '#ff7e0d',
    peelStrength: 0.85,
    iceShadowStrength: 0.95,
    fluteRipple: 0.55,
  });

  const { glassGeo, shamPrismGeo, liquidGeo, peelGeo, pithGeo } = useMemo(() => {
    // Single-skin outer heavy cut-crystal rocks glass with smooth lip curl
    const gPoints = [
      new THREE.Vector2(0.0, -0.98),
      new THREE.Vector2(0.86, -0.98),
      new THREE.Vector2(0.92, -0.92),
      new THREE.Vector2(0.955, -0.52),
      new THREE.Vector2(1.0, 0.85),
      new THREE.Vector2(0.985, 0.885),
      new THREE.Vector2(0.955, 0.875),
    ];
    const glassGeometry = createCrystalGlassGeometry(gPoints, 128, {
      count: 12,
      depth: 0.042,
      yMin: -0.94,
      yMax: -0.02,
    });

    // Subtle internal crystal sham floor refraction ring (prevents white blowout while giving crystal depth)
    const shamPoints = [
      new THREE.Vector2(0.0, -0.92),
      new THREE.Vector2(0.82, -0.92),
      new THREE.Vector2(0.86, -0.62),
      new THREE.Vector2(0.76, -0.59),
      new THREE.Vector2(0.0, -0.59),
    ];
    const shamGeometry = createCrystalGlassGeometry(shamPoints, 96, {
      count: 12,
      depth: 0.032,
      yMin: -0.91,
      yMax: -0.59,
    });

    // Volumetric ruby Negroni liquid hugging 95% of glass radius
    const lPoints = [
      new THREE.Vector2(0.0, -0.57),
      new THREE.Vector2(0.84, -0.57),
      new THREE.Vector2(0.905, -0.50),
      new THREE.Vector2(0.945, 0.44),
      new THREE.Vector2(0.948, 0.472),
      new THREE.Vector2(0.905, 0.446),
      new THREE.Vector2(0.0, 0.44),
    ];
    const liquidGeometry = new THREE.LatheGeometry(lPoints, 72);

    // Sculpted orange peel tucked cleanly inside upper-left glass rim (matching reference photo!)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 0.08, 0.12),
      new THREE.Vector3(-0.74, 0.38, 0.16),
      new THREE.Vector3(-0.78, 0.66, 0.18),
      new THREE.Vector3(-0.67, 0.90, 0.16),
      new THREE.Vector3(-0.52, 0.78, 0.24),
    ]);

    const zestShape = new THREE.Shape();
    const w = 0.21;
    const t = 0.022;
    zestShape.moveTo(-w, -t);
    zestShape.quadraticCurveTo(0, -t * 1.4, w, -t);
    zestShape.lineTo(w, t * 0.4);
    zestShape.quadraticCurveTo(0, 0, -w, t * 0.4);
    zestShape.closePath();

    const peelGeometry = new THREE.ExtrudeGeometry(zestShape, {
      steps: 44,
      bevelEnabled: true,
      bevelThickness: 0.007,
      bevelSize: 0.007,
      bevelSegments: 3,
      extrudePath: curve,
    });

    const pithShape = new THREE.Shape();
    pithShape.moveTo(-w * 0.92, 0);
    pithShape.lineTo(w * 0.92, 0);
    pithShape.lineTo(w * 0.92, t * 0.85);
    pithShape.lineTo(-w * 0.92, t * 0.85);
    pithShape.closePath();

    const pithGeometry = new THREE.ExtrudeGeometry(pithShape, {
      steps: 40,
      bevelEnabled: false,
      extrudePath: curve,
    });

    return {
      glassGeo: glassGeometry,
      shamPrismGeo: shamGeometry,
      liquidGeo: liquidGeometry,
      peelGeo: peelGeometry,
      pithGeo: pithGeometry,
    };
  }, []);

  return (
    <group position={[0, -0.04, 0]}>
      {/* Volumetric Beer-Lambert Ruby Negroni Liquid */}
      <mesh geometry={liquidGeo} material={negroniLiquidMat} />

      {/* Internal Cut-Crystal Sham Base Facet Ring (refracts tabletop shadow & ruby caustics) */}
      <mesh geometry={shamPrismGeo}>
        <meshPhysicalMaterial
          color="#d9c6bc"
          transmission={0.86}
          ior={1.52}
          thickness={0.28}
          roughness={0.09}
          attenuationColor="#8c4b3b"
          attenuationDistance={0.95}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Large Artisanal Clear Square Ice Cube Breaking Above the Ruby Meniscus */}
      <group position={[0.09, 0.36, 0.02]} rotation={[0.07, 0.34, -0.05]}>
        <RoundedBox args={[0.98, 0.88, 0.98]} radius={0.075} smoothness={6}>
          <meshPhysicalMaterial
            color="#fff6f0"
            transmission={0.92}
            ior={1.31}
            thickness={0.45}
            roughness={0.07}
            clearcoat={1}
            clearcoatRoughness={0.03}
            reflectivity={1}
            attenuationColor="#eb9b82"
            attenuationDistance={1.1}
            envMapIntensity={2.1}
          />
        </RoundedBox>
      </group>

      {/* Sculpted Tangerine-Orange Peel Zest */}
      <mesh geometry={peelGeo}>
        <meshPhysicalMaterial
          color="#ff8c14"
          emissive="#6e2300"
          emissiveIntensity={0.26}
          roughness={0.32}
          clearcoat={0.5}
          clearcoatRoughness={0.22}
        />
      </mesh>
      <mesh geometry={pithGeo}>
        <meshStandardMaterial color="#ffd699" roughness={0.62} />
      </mesh>

      {/* Outer Fluted Cut-Crystal Rocks Glass */}
      <mesh geometry={glassGeo}>
        <RefractiveCrystalMaterial
          tint="#fffaf7"
          attenuationColor="#dec5ba"
          thickness={0.16}
        />
      </mesh>

      {/* Optical Internal-Reflection Lip Hairline (signature dark-ruby glass rim!) */}
      <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.982, 0.012, 16, 96]} />
        <meshPhysicalMaterial
          color="#470e06"
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={2.2}
        />
      </mesh>
    </group>
  );
}

/**
 * 2. ESPRESSO MARTINI — Refractive stemmed crystal coupe, rich dark espresso body,
 * velvety micro-foam hazelnut crema shader & 3 glossy roasted coffee beans.
 */
export function EspressoMartiniModel() {
  const espressoLiquidMat = useVolumetricLiquidMaterial({
    deepColor: '#070200',
    midColor: '#1f0b03',
    coreGlowColor: '#6e2c0b',
    surfaceDeepColor: '#140702',
    meniscusColor: '#a86e3e',
    peelStrength: 0.0,
    iceShadowStrength: 0.0,
    fluteRipple: 0.0,
  });

  const { coupeGeo, espressoGeo, cremaGeo, cremaMat } = useMemo(() => {
    // Single-skin stemmed crystal coupe
    const cPoints = [
      new THREE.Vector2(0.0, -1.14),
      new THREE.Vector2(0.7, -1.14),
      new THREE.Vector2(0.72, -1.1),
      new THREE.Vector2(0.18, -1.03),
      new THREE.Vector2(0.072, -0.88),
      new THREE.Vector2(0.068, -0.1),
      new THREE.Vector2(0.17, 0.05),
      new THREE.Vector2(0.76, 0.26),
      new THREE.Vector2(1.11, 0.56),
      new THREE.Vector2(1.16, 0.78),
      new THREE.Vector2(1.135, 0.795),
    ];
    const coupeGeometry = createCrystalGlassGeometry(cPoints, 112, null);

    // Rich dark espresso body filling 96% of coupe bowl width
    const ePoints = [
      new THREE.Vector2(0.0, 0.07),
      new THREE.Vector2(0.16, 0.085),
      new THREE.Vector2(0.735, 0.275),
      new THREE.Vector2(1.065, 0.535),
      new THREE.Vector2(0.0, 0.535),
    ];
    const espressoGeometry = new THREE.LatheGeometry(ePoints, 72);

    // Thick velvety hazelnut crema layer sitting atop the dark espresso
    const crPoints = [
      new THREE.Vector2(0.0, 0.53),
      new THREE.Vector2(1.065, 0.53),
      new THREE.Vector2(1.125, 0.665),
      new THREE.Vector2(1.09, 0.682),
      new THREE.Vector2(0.0, 0.676),
    ];
    const cremaGeometry = new THREE.LatheGeometry(crPoints, 72);

    const cremaMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vLocalPos;
        varying vec3 vWorldNormal;
        void main() {
          vLocalPos = position;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vLocalPos;
        varying vec3 vWorldNormal;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec3 N = normalize(vWorldNormal);
          float r = length(vLocalPos.xz);

          vec3 centerCrema = vec3(0.84, 0.65, 0.45);
          vec3 midCrema = vec3(0.73, 0.51, 0.31);
          vec3 edgeRing = vec3(0.90, 0.75, 0.57);

          float mottle = hash(floor(vLocalPos.xz * 95.0)) * 0.035;
          vec3 col = mix(centerCrema, midCrema, smoothstep(0.15, 0.85, r));
          col = mix(col, edgeRing, smoothstep(0.92, 1.11, r));
          col += mottle;

          float keyDiff = clamp(dot(N, normalize(vec3(-0.55, 0.78, 0.35))), 0.0, 1.0);
          col *= (0.78 + 0.28 * keyDiff);

          // Side foam gradient blending into dark espresso below
          float sideDark = (1.0 - smoothstep(0.54, 0.65, vLocalPos.y)) * (1.0 - step(0.6, N.y));
          col = mix(col, vec3(0.28, 0.13, 0.05), sideDark * 0.68);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    return {
      coupeGeo: coupeGeometry,
      espressoGeo: espressoGeometry,
      cremaGeo: cremaGeometry,
      cremaMat: cremaMaterial,
    };
  }, []);

  const beans = useMemo(() => {
    return [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const dist = 0.16;
      return {
        key: i,
        position: [Math.cos(a) * dist, 0.684, Math.sin(a) * dist],
        rotation: [0.04, -a + Math.PI / 2, 0.05],
      };
    });
  }, []);

  return (
    <group position={[0, 0.03, 0]}>
      <mesh geometry={espressoGeo} material={espressoLiquidMat} />
      <mesh geometry={cremaGeo} material={cremaMat} />

      {beans.map((bean) => (
        <group key={bean.key} position={bean.position} rotation={bean.rotation}>
          <mesh scale={[0.088, 0.048, 0.138]}>
            <sphereGeometry args={[1, 24, 20]} />
            <meshPhysicalMaterial
              color="#1f0c04"
              roughness={0.28}
              clearcoat={0.55}
              clearcoatRoughness={0.22}
              envMapIntensity={1.9}
            />
          </mesh>
          <mesh position={[0, 0.043, 0]} scale={[0.011, 0.014, 0.115]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#0a0301" roughness={0.85} />
          </mesh>
        </group>
      ))}

      <mesh geometry={coupeGeo}>
        <RefractiveCrystalMaterial
          tint="#fffaf5"
          attenuationColor="#cbb3a2"
          thickness={0.025}
          clearcoat={0.3}
          envMapIntensity={1.05}
        />
      </mesh>

      <mesh position={[0, 0.788, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.148, 0.01, 16, 96]} />
        <meshPhysicalMaterial
          color="#361c0d"
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={2.2}
        />
      </mesh>
    </group>
  );
}

/**
 * 3. EMERALD MOJITO — Fluted crystal highball, Beer-Lambert botanical lime-mint liquid,
 * glistening crown ice cubes, lime wheel, garden mint sprig & rising soda bubbles.
 */
export function EmeraldMojitoModel() {
  const bubblesRef = useRef([]);

  const mojitoLiquidMat = useVolumetricLiquidMaterial({
    deepColor: '#052919',
    midColor: '#1b8252',
    coreGlowColor: '#7ef0b2',
    surfaceDeepColor: '#0d4a2f',
    meniscusColor: '#9effca',
    peelTint: '#94e332',
    peelStrength: 0.45,
    iceShadowStrength: 0.75,
    fluteRipple: 0.36,
  });

  const { highballGeo, shamGeo, mojitoLiquidGeo, leafGeo } = useMemo(() => {
    const hPoints = [
      new THREE.Vector2(0.0, -1.12),
      new THREE.Vector2(0.64, -1.12),
      new THREE.Vector2(0.68, -1.07),
      new THREE.Vector2(0.7, -0.76),
      new THREE.Vector2(0.75, 1.0),
      new THREE.Vector2(0.738, 1.03),
      new THREE.Vector2(0.715, 1.02),
    ];
    const highballGeometry = createCrystalGlassGeometry(hPoints, 112, {
      count: 14,
      depth: 0.028,
      yMin: -1.06,
      yMax: -0.25,
    });

    const sPoints = [
      new THREE.Vector2(0.0, -1.06),
      new THREE.Vector2(0.61, -1.06),
      new THREE.Vector2(0.64, -0.8),
      new THREE.Vector2(0.56, -0.77),
      new THREE.Vector2(0.0, -0.77),
    ];
    const shamGeometry = createCrystalGlassGeometry(sPoints, 84, {
      count: 14,
      depth: 0.022,
      yMin: -1.05,
      yMax: -0.77,
    });

    const mPoints = [
      new THREE.Vector2(0.0, -0.76),
      new THREE.Vector2(0.59, -0.76),
      new THREE.Vector2(0.635, -0.7),
      new THREE.Vector2(0.695, 0.75),
      new THREE.Vector2(0.698, 0.775),
      new THREE.Vector2(0.66, 0.755),
      new THREE.Vector2(0.0, 0.75),
    ];
    const mojitoGeometry = new THREE.LatheGeometry(mPoints, 68);

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.16, 0.08, 0.2, 0.3, 0, 0.48);
    shape.bezierCurveTo(-0.2, 0.3, -0.16, 0.08, 0, 0);
    const leafGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    });

    return {
      highballGeo: highballGeometry,
      shamGeo: shamGeometry,
      mojitoLiquidGeo: mojitoGeometry,
      leafGeo: leafGeometry,
    };
  }, []);

  const bubbleSeeds = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 0.62 + (i % 3) * 0.025;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        baseY: -0.68 + ((i * 19) % 135) / 100,
        speed: 0.24 + (i % 5) * 0.06,
        size: 0.014 + (i % 3) * 0.005,
      };
    });
  }, []);

  useFrame((_, delta) => {
    bubblesRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const seed = bubbleSeeds[idx];
      mesh.position.y += seed.speed * delta;
      if (mesh.position.y > 0.72) {
        mesh.position.y = -0.68;
      }
    });
  });

  return (
    <group position={[0, -0.02, 0]}>
      <mesh geometry={mojitoLiquidGeo} material={mojitoLiquidMat} />

      <mesh geometry={shamGeo}>
        <meshPhysicalMaterial
          color="#c8ddd3"
          transmission={0.86}
          ior={1.52}
          thickness={0.24}
          roughness={0.09}
          attenuationColor="#356e56"
          attenuationDistance={0.95}
          envMapIntensity={1.2}
        />
      </mesh>

      <RoundedBox
        position={[-0.08, 0.72, 0.06]}
        rotation={[0.24, 0.35, -0.16]}
        args={[0.56, 0.52, 0.56]}
        radius={0.075}
        smoothness={5}
      >
        <meshPhysicalMaterial
          color="#ebfff5"
          transmission={0.92}
          ior={1.31}
          thickness={0.4}
          roughness={0.07}
          clearcoat={1}
          attenuationColor="#8ee8ba"
          attenuationDistance={1.2}
          envMapIntensity={2.0}
        />
      </RoundedBox>
      <RoundedBox
        position={[0.14, 0.66, -0.1]}
        rotation={[-0.18, 0.85, 0.2]}
        args={[0.5, 0.48, 0.5]}
        radius={0.07}
        smoothness={5}
      >
        <meshPhysicalMaterial
          color="#ebfff5"
          transmission={0.92}
          ior={1.31}
          thickness={0.38}
          roughness={0.075}
          clearcoat={1}
          attenuationColor="#8ee8ba"
          attenuationDistance={1.2}
          envMapIntensity={2.0}
        />
      </RoundedBox>

      {bubbleSeeds.map((b, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            bubblesRef.current[idx] = el;
          }}
          position={[b.x, b.baseY, b.z]}
        >
          <sphereGeometry args={[b.size, 10, 10]} />
          <meshPhysicalMaterial
            color="#ffffff"
            roughness={0.05}
            clearcoat={1}
            envMapIntensity={1.9}
          />
        </mesh>
      ))}

      <group position={[0.36, 0.82, 0.14]} rotation={[0.25, -0.35, -0.42]}>
        <mesh>
          <cylinderGeometry args={[0.31, 0.31, 0.052, 36, 1, true]} />
          <meshStandardMaterial color="#1d752d" roughness={0.42} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.296, 0.296, 0.049, 36]} />
          <meshStandardMaterial color="#eef5e1" roughness={0.55} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.268, 0.268, 0.055, 32]} />
          <meshPhysicalMaterial
            color="#8fd930"
            emissive="#224f07"
            emissiveIntensity={0.2}
            roughness={0.22}
            clearcoat={0.55}
          />
        </mesh>
      </group>

      <group position={[-0.12, 0.84, -0.04]}>
        <mesh geometry={leafGeo} rotation={[-0.45, 0.2, 0.35]} scale={0.88}>
          <meshPhysicalMaterial color="#26a858" roughness={0.36} clearcoat={0.28} />
        </mesh>
        <mesh geometry={leafGeo} rotation={[-0.55, 1.9, -0.25]} scale={0.8}>
          <meshPhysicalMaterial color="#1b8743" roughness={0.4} clearcoat={0.22} />
        </mesh>
        <mesh geometry={leafGeo} rotation={[-0.35, 3.6, 0.2]} scale={0.72}>
          <meshPhysicalMaterial color="#34c26a" roughness={0.34} clearcoat={0.26} />
        </mesh>
        <mesh
          geometry={leafGeo}
          position={[0.04, 0.07, 0.03]}
          rotation={[-0.2, -1.1, -0.3]}
          scale={0.58}
        >
          <meshPhysicalMaterial color="#46d47b" roughness={0.34} />
        </mesh>
      </group>

      <mesh position={[-0.28, 0.22, -0.18]} rotation={[0.07, 0, 0.12]}>
        <cylinderGeometry args={[0.024, 0.024, 2.0, 20]} />
        <meshStandardMaterial color="#dfefe7" metalness={0.9} roughness={0.15} />
      </mesh>

      <mesh geometry={highballGeo}>
        <RefractiveCrystalMaterial
          tint="#f4fff9"
          attenuationColor="#bddbd0"
          thickness={0.14}
        />
      </mesh>

      <mesh position={[0, 1.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.728, 0.01, 16, 84]} />
        <meshPhysicalMaterial
          color="#103826"
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={2.2}
        />
      </mesh>
    </group>
  );
}
