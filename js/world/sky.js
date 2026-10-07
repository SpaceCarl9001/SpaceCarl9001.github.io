import * as THREE from 'three';
import { mulberry32 } from '../textures.js';

const M = THREE.MathUtils;

/** Sky dome (gradient, drifting clouds, sun and moon), distant mountains and stars. */
export function createSky(mountainCanvas) {
  const uniforms = {
    uTime: { value: 0 },
    top: { value: new THREE.Color() },
    bottom: { value: new THREE.Color() },
    sunColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    glow: { value: 0.5 },
    moonDir: { value: new THREE.Vector3(0, 1, 0) },
    moon: { value: 0 },
    cloudLit: { value: new THREE.Color() },
    cloudDark: { value: new THREE.Color() },
    cloudAmount: { value: 0.8 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 48, 24),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDir = wp.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, glow, moon, cloudAmount;
        uniform vec3 top, bottom, sunColor, sunDir, moonDir, cloudLit, cloudDark;
        varying vec3 vDir;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
          return v;
        }

        void main() {
          vec3 dir = normalize(vDir);
          vec3 col = mix(bottom, top, smoothstep(-0.03, 0.5, dir.y));
          vec3 sd = normalize(sunDir);
          float s = max(dot(dir, sd), 0.0);
          col += sunColor * (pow(s, 10.0) * glow + pow(s, 180.0) * 0.6);
          float disk = smoothstep(0.99935, 0.99965, s);

          float m = max(dot(dir, normalize(moonDir)), 0.0);
          col += vec3(0.55, 0.62, 0.85) * pow(m, 60.0) * 0.25 * moon;
          float moonDisk = smoothstep(0.99975, 0.9999, m) * moon;

          // clouds: a noise layer projected onto a flat ceiling, drifting with time
          float cover = 0.0;
          vec3 cloud = vec3(0.0);
          if (dir.y > 0.0) {
            vec2 uv = dir.xz / (dir.y + 0.15) * 1.1 + vec2(uTime * 0.006, uTime * 0.0025);
            float c = fbm(uv);
            float c2 = fbm(uv + sd.xz * 0.06);
            cover = smoothstep(0.62 - cloudAmount * 0.16, 0.86, c) * smoothstep(0.0, 0.16, dir.y);
            cloud = mix(cloudDark, cloudLit, clamp(0.55 + (c - c2) * 3.5, 0.0, 1.0));
            cloud += sunColor * pow(s, 6.0) * 0.35;
          }
          col = min(col, vec3(0.97)); // only the sun and moon discs are bright enough to bloom
          col = mix(col, sunColor * 4.0, disk * (1.0 - cover * 0.85));
          col = mix(col, vec3(1.6, 1.65, 1.8), moonDisk * (1.0 - cover));
          col = mix(col, cloud, cover * 0.92);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -2;
  dome.frustumCulled = false;

  // Distant ridges on a cylinder that travels with the camera, cut away over the sea.
  const mapTex = new THREE.CanvasTexture(mountainCanvas);
  mapTex.wrapS = THREE.RepeatWrapping;
  const mountainUniforms = {
    map: { value: mapTex },
    color: { value: new THREE.Color() },
    seaMask: { value: 0 },
    seaDir: { value: new THREE.Vector2(-1, 0) },
  };
  const mountains = new THREE.Mesh(
    new THREE.CylinderGeometry(980, 980, 280, 128, 1, true),
    new THREE.ShaderMaterial({
      uniforms: mountainUniforms,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vDir;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDir = wp.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 color;
        uniform float seaMask;
        uniform vec2 seaDir;
        varying vec2 vUv;
        varying vec3 vDir;
        void main() {
          float a = texture2D(map, vUv).a;
          float towardSea = dot(normalize(vDir.xz), seaDir);
          a *= 1.0 - seaMask * smoothstep(-0.25, 0.25, towardSea);
          gl_FragColor = vec4(color, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  mountains.renderOrder = -1;
  mountains.frustumCulled = false;

  const rand = mulberry32(99);
  const starPts = [];
  for (let i = 0; i < 1600; i++) {
    const y = 0.08 + Math.pow(rand(), 0.7) * 0.92;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    starPts.push(Math.cos(a) * r * 1000, y * 1000, Math.sin(a) * r * 1000);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
  stars.frustumCulled = false;

  return { dome, mountains, stars, uniforms, mountainUniforms };
}

/* ───────────────────────── time of day ───────────────────────── */
// Morning at the start line, golden hour along the coast, sunset over the sea, night in the city.
const KEYS = [
  { at: 0.0, top: '#5068b0', bottom: '#f7bf98', sun: '#ffd9ae', hemiSky: '#ffe2cc', hemiGround: '#5d6b45', mtn: '#8a86b4', sea: '#2f6185', cloudLit: '#ffe2d0', cloudDark: '#9c8fb3', clouds: 0.75, elev: 7, az: -38, glow: 0.9, sunI: 1.9, hemiI: 1.15, night: 0, bloom: 0.45 },
  { at: 0.3, top: '#2f7fd8', bottom: '#c4e4fb', sun: '#fff4df', hemiSky: '#d3eaff', hemiGround: '#61793f', mtn: '#7b97bb', sea: '#1f6c93', cloudLit: '#ffffff', cloudDark: '#b9c6d8', clouds: 0.85, elev: 44, az: -12, glow: 0.35, sunI: 2.6, hemiI: 1.25, night: 0, bloom: 0.35 },
  { at: 0.62, top: '#4466b6', bottom: '#ffd7a3', sun: '#ffcf8c', hemiSky: '#ffe3bd', hemiGround: '#5a6a3a', mtn: '#97849f', sea: '#2b6288', cloudLit: '#ffe4b8', cloudDark: '#a48da0', clouds: 0.8, elev: 14, az: -24, glow: 0.6, sunI: 2.2, hemiI: 1.05, night: 0, bloom: 0.5 },
  { at: 0.84, top: '#2c2566', bottom: '#ff8360', sun: '#ff9a62', hemiSky: '#ffa184', hemiGround: '#3c3550', mtn: '#5b4677', sea: '#3a3b6c', cloudLit: '#ff9f7a', cloudDark: '#5f3d63', clouds: 0.95, elev: 1.8, az: -28, glow: 1.3, sunI: 1.1, hemiI: 0.75, night: 0.3, bloom: 0.75 },
  { at: 1.0, top: '#050a1d', bottom: '#1b2550', sun: '#c9d4ff', hemiSky: '#3b4c8c', hemiGround: '#141a2a', mtn: '#1b2245', sea: '#0b1734', cloudLit: '#3a4572', cloudDark: '#121831', clouds: 0.45, elev: -10, az: -30, glow: 0.0, sunI: 0.45, hemiI: 0.5, night: 1, bloom: 0.95 },
].map((k) => {
  const o = { ...k };
  for (const [key, v] of Object.entries(k)) if (typeof v === 'string') o[key] = new THREE.Color(v);
  return o;
});
const COLOR_KEYS = Object.keys(KEYS[0]).filter((k) => KEYS[0][k] instanceof THREE.Color);

export function dirFrom(azDeg, elevDeg, out = new THREE.Vector3()) {
  const az = M.degToRad(azDeg), el = M.degToRad(elevDeg);
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/** Returns update(p) which drives every light, colour and glow from progress p (0..1). */
export function createTimeOfDay({ scene, sky, water, hemi, sunLight, headlight, nightMaterials, glowMaterials, beams }) {
  const tod = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()]));
  const moonDir = dirFrom(-14, 13);
  const moonLight = new THREE.Color('#9fb3ff');
  const lightDir = new THREE.Vector3();
  const out = { night: 0, lamps: 0, bloom: 0.5, lightDir, clock: '06:00' };

  return function update(p) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = M.smoothstep(p, a.at, b.at);
    for (const k of COLOR_KEYS) tod[k].lerpColors(a[k], b[k], t);
    const lerp = (k) => a[k] + (b[k] - a[k]) * t;
    const night = lerp('night');

    const u = sky.uniforms;
    u.top.value.copy(tod.top);
    u.bottom.value.copy(tod.bottom);
    u.sunColor.value.copy(tod.sun);
    dirFrom(lerp('az'), lerp('elev'), u.sunDir.value);
    u.glow.value = lerp('glow');
    u.moonDir.value.copy(moonDir);
    u.moon.value = M.smoothstep(night, 0.4, 1);
    u.cloudLit.value.copy(tod.cloudLit);
    u.cloudDark.value.copy(tod.cloudDark);
    u.cloudAmount.value = lerp('clouds');
    sky.mountainUniforms.color.value.copy(tod.mtn);
    sky.stars.material.opacity = M.smoothstep(night, 0.45, 1);

    scene.fog.color.copy(tod.bottom);
    hemi.color.copy(tod.hemiSky);
    hemi.groundColor.copy(tod.hemiGround);
    hemi.intensity = lerp('hemiI');

    // Key light: the sun by day, the moon by night; never so low that shadows streak forever.
    lightDir.copy(u.sunDir.value).lerp(moonDir, M.smoothstep(night, 0.3, 0.9));
    lightDir.y = Math.max(lightDir.y, 0.28);
    lightDir.normalize();
    sunLight.color.copy(tod.sun).lerp(moonLight, night);
    sunLight.intensity = lerp('sunI');

    const w = water.uniforms;
    w.uSunDir.value.copy(u.sunDir.value);
    w.uSunColor.value.copy(tod.sun);
    w.uSunVis.value = M.smoothstep(u.sunDir.value.y, -0.02, 0.03);
    w.uMoonDir.value.copy(moonDir);
    w.uMoon.value = u.moon.value;
    w.uSkyTop.value.copy(tod.top);
    w.uSkyBottom.value.copy(tod.bottom);
    w.uDeep.value.copy(tod.sea);
    w.uFogColor.value.copy(tod.bottom);
    w.uFogNear.value = scene.fog.near;
    w.uFogFar.value = scene.fog.far;

    const lamps = M.smoothstep(night, 0.12, 0.6);
    for (const [mat, max] of nightMaterials) mat.emissiveIntensity = lamps * max;
    for (const [mat, max] of glowMaterials) mat.opacity = lamps * max;
    for (const beam of beams) beam.material.opacity = lamps * 0.55;
    headlight.intensity = lamps * 2.6;

    // In-game clock for the dashboard: 06:00 at the start, 21:00 at the end.
    const minutes = Math.round((6 + p * 15) * 60);
    out.clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    out.night = night;
    out.lamps = lamps;
    out.bloom = lerp('bloom');
    return out;
  };
}
