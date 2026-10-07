import * as THREE from 'three';
import { ROAD_HALF, SEA_LEVEL } from './config.js';
import { makeNoise } from './noise.js';

const M = THREE.MathUtils;
const ss = (x, a, b) => M.smoothstep(x, a, b);

/**
 * Scene zones along the road, derived from where the sections start:
 * countryside → forest (skills) → coast with the sea on the left (projects) → harbour city (contact).
 */
export function createZones(stops) {
  const first = (group) => stops.find((s) => s.group === group)?.viewDist;
  const end = stops[stops.length - 1].viewDist;
  const forest = (first('Skills') ?? end * 0.25) - 70;
  const coast = (first('Projects') ?? end * 0.55) - 90;
  const city = end - 150;
  function at(d, out = {}) {
    out.country = 1 - ss(d, forest - 50, forest + 50);
    out.coast = ss(d, coast - 60, coast + 60);
    out.forest = Math.max(0, 1 - out.country - out.coast);
    out.city = ss(d, city - 60, city + 60);
    return out;
  }
  return { forest, coast, city, at };
}

const COLORS = {
  meadow: new THREE.Color('#8fbb5e'),
  forest: new THREE.Color('#4a7a35'),
  coast: new THREE.Color('#97b862'),
  urban: new THREE.Color('#7f8b66'),
  rock: new THREE.Color('#8d877b'),
  sand: new THREE.Color('#e8d5a3'),
  wet: new THREE.Color('#bba275'),
  seabed: new THREE.Color('#2f6f6c'),
};

export function createTerrain({ road, zones, island, texture, detail = 1 }) {
  const { fbm } = makeNoise(7);
  const loc = { lat: 0, d: 0 };
  const zw = {};
  let islandMask = 0;

  /** Ground height at a world point. Flat next to the road, hills further out, a beach on the sea side. */
  function height(x, z) {
    road.local(x, z, loc);
    zones.at(loc.d, zw);
    const a = Math.abs(loc.lat);
    const n = fbm(x * 0.0065, z * 0.0065, 4);
    const ridge = 1 - Math.abs(fbm(x * 0.0032 + 17, z * 0.0032 - 9, 3) * 2 - 1);
    const amp = (zw.country * 13 + zw.forest * 40 + zw.coast * 30) * (1 - zw.city * 0.8);
    const start = zw.country * 110 + zw.forest * 30 + zw.coast * 40;
    let h = ss(a, ROAD_HALF + 8, ROAD_HALF + 8 + start) * (n * 0.7 + ridge * ridge * 0.6) * amp;
    h += ss(a, ROAD_HALF + 6, ROAD_HALF + 26) * (n - 0.5) * 1.4 * (1 - zw.forest);

    if (loc.lat < 0 && zw.coast > 0) {
      const beach = -Math.pow(ss(a, ROAD_HALF + 4, ROAD_HALF + 70), 0.8) * 10 + (n - 0.5) * 0.6 * ss(a, 20, 60);
      h = M.lerp(h, beach, zw.coast);
    }

    islandMask = 0;
    if (island) {
      const dx = x - island.x, dz = z - island.z;
      const bump = 9.5 * Math.exp(-(dx * dx + dz * dz) / (2 * 15 * 15)) * (0.85 + n * 0.3);
      const top = SEA_LEVEL - 5 + bump;
      if (top > h) { h = top; islandMask = 1; }
    }
    return h;
  }

  /** Colour for the point last passed to height(). */
  function colorAt(x, z, h, c) {
    const { meadow, forest, coast } = COLORS;
    c.setRGB(
      meadow.r * zw.country + forest.r * zw.forest + coast.r * zw.coast,
      meadow.g * zw.country + forest.g * zw.forest + coast.g * zw.coast,
      meadow.b * zw.country + forest.b * zw.forest + coast.b * zw.coast,
    );
    if (loc.lat > 0) c.lerp(COLORS.urban, zw.city * 0.6);
    c.multiplyScalar(0.86 + fbm(x * 0.045, z * 0.045, 2) * 0.28);
    c.lerp(COLORS.rock, ss(h, 20, 42) * 0.7);

    const shore = Math.max(loc.lat < 0 ? zw.coast : 0, islandMask);
    if (shore > 0 && h < 1.2) {
      c.lerp(COLORS.sand, (1 - ss(h, 0.3, 1.2)) * shore);
      c.lerp(COLORS.wet, (1 - ss(Math.abs(h - SEA_LEVEL - 0.1), 0.1, 0.6)) * shore);
      if (h < SEA_LEVEL) c.lerp(COLORS.seabed, ss(SEA_LEVEL - h, 0, 5) * shore);
    }
    if (islandMask) c.lerp(COLORS.rock, ss(h, 0.5, 3) * 0.75);
    return c;
  }

  // Build the ground mesh around the whole route.
  const zStart = 320;
  const zEnd = road.frameAt(road.end).p.z - 260;
  const W = 1400, L = zStart - zEnd;
  const segX = Math.round(220 * detail), segZ = Math.round((L / 6.4) * detail);
  const geo = new THREE.PlaneGeometry(W, L, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, (zStart + zEnd) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = height(x, z);
    pos.setY(i, h);
    colorAt(x, z, h, c);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  texture.repeat.set(W / 20, L / 20);
  const time = { value: 0 };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, map: texture });
  // Foam line where the waves lap the beach.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWorldY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWorldY;\nuniform float uTime;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float waveLine = ${SEA_LEVEL.toFixed(2)} + 0.12 + 0.11 * sin(uTime * 1.25);
        float foam = smoothstep(0.2, 0.0, abs(vWorldY - waveLine));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.97, 0.98), foam * 0.85);`);
  };
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.renderOrder = -0.5;

  return { mesh, height, time };
}

/* ───────────────────────── water ───────────────────────── */

export function createWater() {
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSunVis: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoon: { value: 0 },
    uSkyTop: { value: new THREE.Color() },
    uSkyBottom: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uFogNear: { value: 50 },
    uFogFar: { value: 600 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSunVis, uMoon, uFogNear, uFogFar;
      uniform vec3 uSunDir, uSunColor, uMoonDir, uSkyTop, uSkyBottom, uDeep, uFogColor;
      varying vec3 vWorld;

      void wave(inout vec2 g, vec2 p, vec2 dir, float freq, float amp, float speed) {
        dir = normalize(dir);
        g += dir * freq * amp * cos(dot(dir, p) * freq + uTime * speed);
      }

      void main() {
        vec2 p = vWorld.xz;
        float dist = length(cameraPosition - vWorld);
        float detail = 1.0 - smoothstep(40.0, 260.0, dist);
        vec2 g = vec2(0.0);
        wave(g, p, vec2(1.0, 0.35), 0.08, 0.32, 1.1);
        wave(g, p, vec2(-0.45, 1.0), 0.13, 0.20, 1.5);
        wave(g, p, vec2(0.7, -0.8), 0.27, 0.08 * (0.4 + 0.6 * detail), 2.1);
        wave(g, p, vec2(-1.0, -0.25), 0.47, 0.04 * detail, 2.7);
        wave(g, p, vec2(0.3, 1.0), 0.93, 0.016 * detail, 3.6);
        wave(g, p, vec2(1.0, -1.0), 1.71, 0.008 * detail, 4.4);
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

        vec3 V = normalize(cameraPosition - vWorld);
        float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 5.0);
        vec3 R = reflect(-V, n);
        R.y = abs(R.y);
        vec3 sky = mix(uSkyBottom, uSkyTop, smoothstep(0.0, 0.6, R.y));

        float s = max(dot(R, normalize(uSunDir)), 0.0);
        float spec = (pow(s, 420.0) * 9.0 + pow(s, 36.0) * 0.22) * uSunVis;
        float m = max(dot(R, normalize(uMoonDir)), 0.0);
        float moonSpec = (pow(m, 260.0) * 4.0 + pow(m, 30.0) * 0.12) * uMoon;

        vec3 body = uDeep * (0.75 + 0.25 * n.y);
        vec3 col = mix(body, sky, fres) + uSunColor * spec + vec3(0.8, 0.86, 1.0) * moonSpec;
        float alpha = max(mix(0.7, 1.0, fres), smoothstep(12.0, 70.0, dist));
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200).rotateX(-Math.PI / 2), material);
  mesh.position.y = SEA_LEVEL;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
