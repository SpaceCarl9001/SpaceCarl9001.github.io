import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import content from './content.js';
import { buildStops, cardHTML, renderStatic, renderRoute, clusterSVG, isDemoLink } from './ui.js';
import { createDemoMonitor } from './demo.js';
import { createRadio } from './radio.js';
import { windshieldSVG, dashSVG, wheelSVG } from './cockpit.js';
import { drawMountainTexture, drawGlowTexture, drawGroundDetailTexture, loadImage, loadFonts } from './textures.js';
import { LANE, EYE, ROUTE_LENGTH, SEA_LEVEL } from './world/config.js';
import { createRoad } from './world/road.js';
import { createZones, createTerrain, createWater } from './world/terrain.js';
import { createSky, createTimeOfDay } from './world/sky.js';
import { buildSigns } from './world/signs.js';
import { buildScenery } from './world/scenery.js';
import { lit, setPBR, usesPBR, windTime } from './world/materials.js';
import { createFinishPass } from './world/post.js';

const M = THREE.MathUtils;
const $ = (s) => document.querySelector(s);
const body = document.body;
const params = new URLSearchParams(location.search);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────────────────── stops along the road ───────────────────────── */
const stops = buildStops(content);
const END = ROUTE_LENGTH;
const SPACING = END / Math.max(1, stops.length - 1); // road distance between two stops
let billboardCount = 0;
stops.forEach((s, i) => {
  s.index = i;
  s.viewDist = i * SPACING; // where the car "parks" to read this stop
  if (s.kind === 'gantry') {
    s.side = 0;
    s.signDist = s.viewDist + 46;
  } else {
    s.side = billboardCount++ % 2 ? -1 : 1;
    s.signDist = s.viewDist + 34;
  }
});
const groups = [...new Set(stops.map((s) => s.group))].map((name) => ({
  name, id: name.toLowerCase(), first: stops.find((s) => s.group === name),
}));

/* ───────────────────────── page chrome ───────────────────────── */
const { profile } = content;
document.title = `${profile.name} · ${profile.role}`;
$('#brandBadge').textContent = profile.initials;
$('#brandName').textContent = profile.name;
$('#windshield').innerHTML = windshieldSVG();
$('#dash').innerHTML = dashSVG();
$('#wheel').innerHTML = wheelSVG();
$('#wheelLogo').textContent = profile.initials;
$('#cluster').innerHTML = clusterSVG();
renderStatic(content, $('#static'));
createRadio(content.music, { root: $('#radio'), toggle: $('#radioToggle'), screenEl: $('.screen') });
const route = renderRoute(groups, END, $('#route'));
$('#track').style.height = `${stops.length * 100}vh`;

const hud = {
  card: $('#card'),
  wheel: $('.wheel'),
  needle: $('#needle'),
  speed: $('#speed'),
  odo: $('#odo'),
  gear: $('#gear'),
  clock: $('#clock'),
  now: $('#navNow'),
  next: $('#navNext'),
  bar: $('#navBar'),
  demoBtn: $('#demoBtn'),
  previewBtn: $('#previewBtn'),
  screen: $('.screen'),
};

const toggle = $('#modeToggle');
let driveScroll = 0;
function setTextMode(on) {
  if (on === body.classList.contains('text-mode')) return;
  if (on) driveScroll = scrollY;
  body.classList.toggle('text-mode', on);
  toggle.textContent = on ? 'Drive mode' : 'Text version';
  toggle.setAttribute('aria-pressed', String(on));
  scrollTo(0, on ? 0 : driveScroll);
  if (!on && renderer) {
    resize();
    readScroll();
    dist = prevDist = target;
  }
}
toggle.addEventListener('click', () => setTextMode(!body.classList.contains('text-mode')));

/* ───────────────────────── renderer + quality ───────────────────────── */
// Quality tiers, best first:
//   high   – PBR materials + sky reflections, shadows, sea mirror, ambient occlusion, bloom, grass
//   medium – the same minus the sea mirror and ambient occlusion
//   low    – simple materials, no shadows or post effects (phones)
// Desktops start on high and step down one tier at a time if the frame rate suffers.
// Override with ?quality=low|medium|high.
const TIERS = ['low', 'medium', 'high'];
const forced = TIERS.includes(params.get('quality')) ? params.get('quality') : null;
const looksMobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
let quality = forced || (looksMobile ? 'low' : 'high');

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setPBR(quality !== 'low');
} catch (err) {
  console.warn('WebGL is not available, falling back to the text version.', err);
}

function texture(canvas, { repeat = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ───────────────────────── world ───────────────────────── */
const road = createRoad(END + 800);
const zones = createZones(stops);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, 55, 620);
const camera = new THREE.PerspectiveCamera(58, 1, 0.3, 2600);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 420 });
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.6;
scene.add(hemi, sunLight, sunLight.target);

const headlight = new THREE.SpotLight(0xfff1d6, 0, 95, Math.PI / 7, 0.55, 0);
headlight.position.set(0, -0.6, 0);
headlight.target.position.set(0, -2.4, -24);
camera.add(headlight, headlight.target);

const glowTex = texture(drawGlowTexture());
const mats = {
  metal: lit({ color: 0x7d838c, roughness: 0.42, metalness: 0.75 }),
  frame: lit({ color: 0x2a2d33, roughness: 0.5, metalness: 0.5 }),
  lamp: lit({ color: 0x444444, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.4 }),
  post: lit({ color: 0xf2f2ee, roughness: 0.6 }),
  reflector: new THREE.MeshBasicMaterial({ color: 0xff9b3d }),
  pool: new THREE.MeshBasicMaterial({
    map: glowTex, color: 0xffc98a, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
  }),
  halo: new THREE.PointsMaterial({
    map: glowTex, color: 0xffd39a, size: 3.2, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }),
};

// The lighthouse island sits off the coast, between two project billboards.
const island = (() => {
  const f = road.frameAt(zones.coast + 350);
  return { x: f.p.x - f.r.x * 108, z: f.p.z - f.r.z * 108 };
})();

const sky = createSky(drawMountainTexture());
// Two seas: a real mirror for high quality and a cheaper sky-reflection one for the rest.
const plainWater = createWater();
const mirrorWater = renderer && usesPBR() ? createWater({ reflect: true }) : null;
const waters = [plainWater, mirrorWater].filter(Boolean);
let terrain, timeOfDay, scenery;
scene.add(sky.dome, sky.mountains, sky.stars, ...waters.map((w) => w.mesh));

// Grass lives on layer 1 so the ambient-occlusion pass (which uses its own camera) skips it.
camera.layers.enable(1);
const aoCamera = new THREE.PerspectiveCamera();

/* Reflections of the sky on every PBR surface: the sky dome is rendered into a blurred
   environment map, refreshed as the time of day changes. */
const pmrem = renderer && usesPBR() ? new THREE.PMREMGenerator(renderer) : null;
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(sky.dome.geometry, sky.dome.material));
let envTarget = null, envProgress = -1, envTime = -1e9;
function updateEnvironment(p, now, force = false) {
  if (!pmrem) return;
  if (!force && (Math.abs(p - envProgress) < 0.008 || now - envTime < 300)) return;
  envProgress = p;
  envTime = now;
  const next = pmrem.fromScene(envScene, 0, 1, 2000);
  envTarget?.dispose();
  envTarget = next;
  scene.environment = next.texture;
}

let composer = null, bloom = null, ao = null, finish = null;
function setupQuality() {
  const tier = TIERS.indexOf(quality);
  const shadows = tier >= 1;
  renderer.shadowMap.enabled = shadows;
  sunLight.castShadow = shadows;
  if (mirrorWater) mirrorWater.mesh.visible = tier >= 2;
  plainWater.mesh.visible = !mirrorWater || tier < 2;
  scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });

  composer = null;
  if (tier >= 1) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    ao = null;
    if (tier >= 2) {
      ao = new GTAOPass(scene, aoCamera, 1, 1, undefined,
        { radius: 1.6, distanceExponent: 1.4, thickness: 1.4, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false },
        { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      ao.blendIntensity = 0.85;
      // AO is soft by nature: compute it at half resolution.
      const fullSetSize = ao.setSize.bind(ao);
      ao.setSize = (w, h) => fullSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
      composer.addPass(ao);
    }
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    finish = createFinishPass();
    composer.addPass(finish);
  }
  setupMirror();
}

/* ───────────────────────── scroll → distance ───────────────────────── */
let target = 0, dist = 0, prevDist = 0, speed = 0, velocity = 0, steer = 0, last = 0, lastRender = 0;
let dirty = true, glanceMax = 0.22, activeCard = -2, cardTimer = 0;
const hudCache = {};
const perf = { frames: 0, time: 0 };

const scrollMax = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
function readScroll() {
  if (body.classList.contains('text-mode') || drive.active) return;
  target = M.clamp(scrollY / scrollMax(), 0, 1) * END;
}

/* ───────────────────────── keyboard driving ───────────────────────── */
// Hold ↑ / W to accelerate, ↓ / S to reverse. Let go and the car brakes, pulling up at the
// nearest sign. While the keys drive, they own `target` and keep the page scroll in sync.
const drive = { fwd: false, back: false, active: false, parking: false, pos: 0, vel: 0, park: 0 };
const KEY_MAX = 55;    // m/s top speed under key control
const KEY_ACCEL = 26;  // m/s² throttle
const KEY_BRAKE = 40;  // m/s² braking

function releasePedals() {
  if (!drive.active) return;
  // Roll on to the next sign in the direction of travel, never back to one already passed
  // (a few metres of slack, so a tiny tap doesn't send the car off to the next stop).
  const coast = drive.pos + (drive.vel * Math.abs(drive.vel)) / (2 * KEY_BRAKE);
  const ahead = drive.vel > 0 ? stops.find((s) => s.viewDist > coast - 4)
    : drive.vel < 0 ? [...stops].reverse().find((s) => s.viewDist < coast + 4)
    : stops[M.clamp(Math.round(coast / SPACING), 0, stops.length - 1)];
  drive.park = (ahead ?? stops[drive.vel > 0 ? stops.length - 1 : 0]).viewDist;
  drive.parking = true;
}

function cancelDrive() {
  Object.assign(drive, { fwd: false, back: false, active: false, parking: false, vel: 0 });
}

function stepDrive(dt) {
  if (!drive.active || dt <= 0) return;
  const pedal = (drive.fwd ? 1 : 0) - (drive.back ? 1 : 0);
  if (pedal) {
    drive.parking = false;
    const braking = drive.vel !== 0 && Math.sign(drive.vel) !== pedal;
    drive.vel = M.clamp(drive.vel + pedal * (braking ? KEY_BRAKE : KEY_ACCEL) * dt, -KEY_MAX, KEY_MAX);
  } else if (drive.parking) {
    // Ease into the parking spot: the fastest speed we could still brake from in time.
    const rem = drive.park - drive.pos;
    if (Math.abs(rem) < 0.3 && Math.abs(drive.vel) < 2) {
      drive.pos = target = drive.park;
      cancelDrive();
      scrollTo(0, (target / END) * scrollMax());
      return;
    }
    const desired = Math.sign(rem) * Math.min(KEY_MAX, Math.sqrt(2 * KEY_BRAKE * 0.8 * Math.abs(rem)));
    const limit = (Math.abs(desired) < Math.abs(drive.vel) || Math.sign(desired) !== Math.sign(drive.vel) ? KEY_BRAKE : KEY_ACCEL) * dt;
    drive.vel += M.clamp(desired - drive.vel, -limit, limit);
  }
  drive.pos += drive.vel * dt;
  if (drive.pos <= 0 || drive.pos >= END) {
    drive.pos = M.clamp(drive.pos, 0, END);
    drive.vel = 0;
  }
  target = drive.pos;
  scrollTo(0, (target / END) * scrollMax());
}
function scrollToStop(i, smooth = true) {
  cancelDrive();
  scrollTo({ top: (stops[i].viewDist / END) * scrollMax(), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
}

function resize() {
  // The canvas's real size: on Windows a page scrollbar makes it narrower than the window.
  const w = renderer.domElement.clientWidth || innerWidth, h = renderer.domElement.clientHeight || innerHeight;
  const ratio = Math.min(devicePixelRatio, quality === 'low' ? 1.75 : 1.5);
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
  }
  for (const sea of waters) sea.setSize(w * ratio, h * ratio);
  const portrait = w / h < 0.85;
  // Render a taller frustum and show its lower part: lifts the horizon above the dashboard.
  const dash = document.querySelector('.dash')?.getBoundingClientRect().height || 0;
  const extra = dash * 0.55;
  camera.fov = portrait ? 66 : 56;
  camera.aspect = w / (h + extra);
  camera.setViewOffset(w, h + extra, 0, extra, w, h);
  camera.updateProjectionMatrix();
  glanceMax = portrait ? 0.72 : 0.22;
  dirty = true;
}

/* ───────── live demos: the dash screen's Demo button and the card's demo link open the monitor ───────── */
const demo = createDemoMonitor({ reduceMotion, onOpenChange: (isOpen) => { if (isOpen) cancelDrive(); } });
let demoStop = null;
function setDemoStop(stop) {
  if (stop === demoStop) return;
  demoStop = stop;
  hud.demoBtn.hidden = !(stop.links || []).some(isDemoLink);
  // a project screenshot (e.g. an automation workflow) shown on the dash screen
  const preview = stop.preview?.image ? stop.preview : null;
  hud.previewBtn.hidden = !preview;
  if (preview) {
    $('#previewImg').src = preview.image;
    $('#previewLabel').textContent = preview.label || 'Preview';
    hud.previewBtn.setAttribute('aria-label', `Open ${preview.label || 'preview'} for ${stop.title}`);
  }
}
const showPreview = (stop, from) => demo.show({ image: stop.preview.image, label: stop.preview.label || 'Preview', caption: stop.preview.caption, project: stop.title }, from);
hud.previewBtn.addEventListener('click', () => { if (demoStop?.preview?.image) showPreview(demoStop, hud.previewBtn); });
hud.demoBtn.addEventListener('click', () => {
  const link = demoStop?.links?.find(isDemoLink);
  if (link) demo.show({ url: link.url, project: demoStop.title }, hud.screen);
});
hud.card.addEventListener('click', (e) => {
  const shot = e.target.closest('[data-preview]');
  if (shot && activeCard >= 0 && stops[activeCard].preview?.image) { showPreview(stops[activeCard], shot); return; }
  const a = e.target.closest('a[data-demo]');
  // plain left-clicks only: ctrl/cmd/shift-click still opens a new tab
  if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || activeCard < 0) return;
  e.preventDefault();
  demo.show({ url: a.href, project: stops[activeCard].title }, a);
});

function setCard(i) {
  if (i === activeCard) return;
  const wasShown = activeCard >= 0;
  activeCard = i;
  clearTimeout(cardTimer);
  hud.card.classList.remove('show');
  hud.card.inert = true;
  if (i < 0) return;
  cardTimer = setTimeout(() => {
    const s = stops[i];
    hud.card.innerHTML = cardHTML(s);
    hud.card.dataset.side = s.side === -1 ? 'right' : 'left';
    hud.card.style.setProperty('--accent', s.accent);
    hud.card.inert = false;
    hud.card.scrollTop = 0;
    hud.card.classList.add('show');
    updateCardFade();
  }, wasShown ? 240 : 0);
}

/** Fades the bottom edge of a card while more of it is hidden below the fold. */
function updateCardFade() {
  const c = hud.card;
  c.classList.toggle('more', c.scrollHeight - c.clientHeight - c.scrollTop > 6);
}
hud.card.addEventListener('scroll', updateCardFade, { passive: true });
addEventListener('resize', updateCardFade);

function setText(key, el, value) {
  if (hudCache[key] === value) return;
  hudCache[key] = value;
  el.textContent = value;
}

const fA = road.frameAt(0), fB = road.frameAt(0), fC = road.frameAt(0);
const look = new THREE.Vector3();
const forward = new THREE.Vector3();
const SEAT = -0.38; // the driver sits left of the car's centre line (left-hand drive)
const cabinVars = { light: -1, warm: -1 };
const zw = {};

function update(now, dt) {
  road.frameAt(dist, fA);
  road.frameAt(dist + 26, fB);
  road.frameAt(dist + 18, fC);
  const p = dist / END;
  const t = now / 1000;

  // camera: sit in the right lane, look down the road, glance at signs as we pull up
  const bob = reduceMotion ? 0 : Math.sin(now * 0.017) * 0.018 * Math.min(speed / 40, 1);
  camera.position.copy(fA.p).addScaledVector(fA.r, LANE + SEAT);
  camera.position.y = EYE + bob;
  look.copy(fB.p).addScaledVector(fB.r, LANE * 0.85 + SEAT);
  look.y = EYE - 0.15;
  const idx = M.clamp(Math.round(dist / SPACING), 0, stops.length - 1);
  const near = stops[idx];
  if (near.side) {
    const delta = dist - near.viewDist;
    const g = delta > 0 ? 1 - M.smoothstep(delta, 0, 22) : 1 - M.smoothstep(-delta, 0, SPACING * 0.55);
    look.lerp(near.focus, g * glanceMax);
  }
  camera.lookAt(look);

  let turn = road.heading(fC.t) - road.heading(fA.t);
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  steer += (turn - steer) * Math.min(1, dt * 4);
  camera.rotateZ(-steer * 0.12);

  // environment follows the camera; fog thickens in the forest
  zones.at(dist, zw);
  scene.fog.near = M.lerp(M.lerp(60, 28, zw.forest), 90, zw.coast);
  scene.fog.far = M.lerp(M.lerp(640, 360, zw.forest), 950, zw.coast);
  sky.dome.position.copy(camera.position);
  sky.stars.position.copy(camera.position);
  sky.mountains.position.set(camera.position.x, 70, camera.position.z);
  sky.mountainUniforms.seaMask.value = zw.coast;
  sky.mountainUniforms.seaDir.value.set(-fA.r.x, -fA.r.z).normalize();
  for (const sea of waters) sea.mesh.position.set(camera.position.x, SEA_LEVEL, camera.position.z);
  // only pay for the sea mirror once the coast is near enough to see
  if (mirrorWater && quality === 'high') mirrorWater.mesh.visible = dist > zones.coast - 700;
  const env = timeOfDay(p);
  if (usesPBR()) hemi.intensity *= 0.55; // the sky's environment light now provides much of the fill
  updateEnvironment(p, now);

  forward.subVectors(look, camera.position).setY(0).normalize();
  sunLight.target.position.copy(camera.position).addScaledVector(forward, 32).setY(0);
  sunLight.position.copy(sunLight.target.position).addScaledVector(env.lightDir, 180);

  sky.uniforms.uTime.value = t;
  for (const sea of waters) sea.uniforms.uTime.value = t;
  terrain.time.value = t;
  windTime.value = t;
  scenery.update(t, env.lamps);
  if (bloom) bloom.strength = env.bloom;
  // cabin lighting: the interior darkens at night and warms up through golden hour
  const cabinLight = Math.round((1 - 0.66 * M.smoothstep(env.night, 0.15, 1)) * 100) / 100;
  const cabinWarm = Math.round(env.golden * 100) / 100;
  if (cabinLight !== cabinVars.light || cabinWarm !== cabinVars.warm) {
    cabinVars.light = cabinLight;
    cabinVars.warm = cabinWarm;
    document.documentElement.style.setProperty('--cabin', cabinLight);
    document.documentElement.style.setProperty('--cabin-warm', cabinWarm);
  }
  if (finish) {
    const u = finish.uniforms;
    u.uTime.value = t;
    u.uBlur.value = reduceMotion ? 0 : Math.min(0.035, Math.max(0, speed - 25) / 9000);
    u.uGrade.value.copy(env.grade);
  }
  if (ao) {
    aoCamera.copy(camera, false);
    aoCamera.layers.set(0);
  }

  // dashboard
  // Realistic-ish for key driving (55 m/s ≈ 100 km/h); a hard scroll flick pegs the needle.
  const kmh = Math.round(240 * (1 - Math.exp((-speed * 2.4) / 240)));
  hud.wheel.style.transform = `rotate(${M.clamp(M.radToDeg(steer) * 7, -150, 150).toFixed(1)}deg)`;
  hud.needle.setAttribute('transform', `rotate(${(-120 + kmh).toFixed(1)} 200 128)`);
  setText('speed', hud.speed, String(kmh));
  setText('odo', hud.odo, (dist / 1000).toFixed(2));
  const moving = drive.active ? Math.abs(drive.vel) > 0.3 : speed >= 3;
  const forwardGear = drive.active ? drive.vel >= 0 : velocity >= 0;
  setText('gear', hud.gear, moving ? (forwardGear ? 'D' : 'R') : 'P');
  setText('clock', hud.clock, env.clock);
  const next = stops.find((s) => s.viewDist > dist + 20);
  const current = next ? stops[Math.max(0, next.index - 1)] : stops[stops.length - 1];
  setText('now', hud.now, current.group === 'Start' ? 'Start line' : current.title);
  setDemoStop(current);
  setText('next', hud.next, next ? `Next: ${next.title} · ${Math.round(next.viewDist - dist)} m` : 'You have arrived');
  hud.bar.style.transform = `scaleX(${p.toFixed(4)})`;

  route.fill.style.transform = `scaleX(${p.toFixed(4)})`;
  route.items.forEach((el) => el.classList.toggle('active', el.dataset.group === near.group));

  setCard(Math.abs(dist - near.viewDist) < SPACING * 0.36 ? idx : -1);
}

/* ───────── rearview mirror: a small live render of the road behind, flipped like a mirror ───────── */
const mirrorEl = $('.mirror');
const rear = {
  camera: new THREE.PerspectiveCamera(24, 3, 0.5, 1800),
  look: new THREE.Vector3(),
  scene: new THREE.Scene(),
  ortho: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
  target: null,
  quad: null,
  rect: null,
  frame: 0,
};
rear.camera.layers.enable(1);

function setupMirror() {
  const live = !!renderer && quality !== 'low';
  mirrorEl.classList.toggle('static', !live);
  if (!live || rear.target) return;
  rear.target = new THREE.WebGLRenderTarget(256, 80, { type: THREE.HalfFloatType });
  rear.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { map: { value: rear.target.texture }, size: { value: new THREE.Vector2(1, 1) }, radius: { value: 12 } },
    depthTest: false,
    depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec2 size;
      uniform float radius;
      varying vec2 vUv;
      void main() {
        // rounded-rectangle glass, matching the CSS housing
        vec2 p = (vUv - 0.5) * size;
        vec2 q = abs(p) - (size * 0.5 - radius);
        if (length(max(q, 0.0)) > radius) discard;
        vec3 col = texture2D(map, vec2(1.0 - vUv.x, vUv.y)).rgb; // flipped left-right, like a mirror
        col *= 0.9 - 0.25 * dot(vUv - 0.5, vUv - 0.5);          // slight tint and edge falloff
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  rear.scene.add(rear.quad);
  measureMirror();
}

function measureMirror() {
  if (!rear.target) return;
  const g = $('#mirrorGlass').getBoundingClientRect();
  const c = renderer.domElement.getBoundingClientRect();
  // canvas-relative, pulled in 1px so the image never peeks past the frame
  const r = { left: g.left - c.left + 1, top: g.top - c.top + 1, width: g.width - 2, height: g.height - 2, canvasH: c.height };
  const same = rear.rect && ['left', 'top', 'width', 'height', 'canvasH'].every((k) => Math.abs(rear.rect[k] - r[k]) < 0.5);
  rear.rect = r.width > 4 && r.height > 4 ? r : null;
  if (!rear.rect || same) return;
  const ratio = renderer.getPixelRatio();
  rear.target.setSize(Math.round(r.width * ratio), Math.round(r.height * ratio));
  rear.quad.material.uniforms.size.value.set(r.width, r.height);
  rear.quad.material.uniforms.radius.value = Math.min(11, r.height / 2);
  rear.camera.aspect = r.width / r.height;
  rear.camera.updateProjectionMatrix();
}

function renderMirror() {
  if (quality === 'low' || !rear.target || body.classList.contains('text-mode')) return;
  measureMirror(); // cheap; keeps the image locked to the frame if the layout shifts
  if (!rear.rect) return;
  // Refresh the reflection every other frame; draw it every frame (the main render covers it).
  if (rear.frame++ % 2 === 0) {
    rear.camera.position.copy(camera.position).addScaledVector(forward, 0.35);
    rear.camera.position.y += 0.12;
    rear.look.copy(rear.camera.position).addScaledVector(forward, -40);
    rear.look.y -= 1.2;
    rear.camera.lookAt(rear.look);
    // the sea mirror would render its own reflection for this camera: use the plain sea instead
    const seaMirror = mirrorWater?.mesh.visible;
    if (seaMirror) { mirrorWater.mesh.visible = false; plainWater.mesh.visible = true; }
    const autoShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rear.target);
    renderer.render(scene, rear.camera);
    renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = autoShadow;
    if (seaMirror) { mirrorWater.mesh.visible = true; plainWater.mesh.visible = false; }
  }
  const r = rear.rect;
  const y = r.canvasH - (r.top + r.height);
  renderer.setScissorTest(true);
  renderer.setScissor(r.left, y, r.width, r.height);
  renderer.setViewport(r.left, y, r.width, r.height);
  renderer.render(rear.scene, rear.ortho);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight);
}

function render() {
  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - (last || now)) / 1000, 0.1);
  last = now;
  if (body.classList.contains('text-mode')) return;
  // While a demo runs in the monitor, freeze the road behind it and give the demo the GPU.
  if (demo.isOpen()) return;

  stepDrive(dt);
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
  dist += (target - dist) * k;
  if (Math.abs(target - dist) < 0.01) dist = target;
  velocity = dt > 0 ? (dist - prevDist) / dt : 0;
  prevDist = dist;
  speed += (Math.abs(velocity) - speed) * Math.min(1, dt * 6);
  if (speed < 0.05) speed = 0;

  // Parked: the waves, clouds and turbines still move, but 30 fps is plenty.
  const idle = !dirty && dist === target && speed === 0;
  if (idle && now - lastRender < 32) return;
  dirty = false;
  lastRender = now;
  update(now, dt);
  render();
  renderMirror();

  // Auto quality: if driving runs slowly (under ~32 fps), step down one tier and measure again.
  if (!forced && quality !== 'low' && !idle) {
    perf.frames++;
    perf.time += dt;
    if (perf.frames === 90) {
      if (perf.time / perf.frames > 1 / 32) {
        quality = TIERS[TIERS.indexOf(quality) - 1];
        setupQuality();
        resize();
      }
      perf.frames = perf.time = 0;
    }
  }
}

/* ───────────────────────── start ───────────────────────── */
async function start() {
  await loadFonts();
  const photo = content.about.photo ? await loadImage(content.about.photo) : null;

  terrain = createTerrain({ road, zones, island, detail: quality === 'low' ? 0.7 : 1, texture: texture(drawGroundDetailTexture(), { repeat: true }) });
  scene.add(terrain.mesh);
  buildSigns({ scene, road, stops, photo, mats, texture, height: terrain.height });
  scenery = buildScenery({ scene, road, zones, height: terrain.height, stops, island, texture, mats });
  timeOfDay = createTimeOfDay({
    scene, sky, water: waters, hemi, sunLight, headlight,
    nightMaterials: scenery.nightMaterials, glowMaterials: scenery.glowMaterials, beams: scenery.beams,
  });

  setupQuality();
  addEventListener('resize', resize);
  addEventListener('resize', measureMirror);
  addEventListener('scroll', readScroll, { passive: true });
  resize();

  route.items.forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    const g = groups.find((x) => x.name === el.dataset.group);
    history.replaceState(null, '', `#${g.id}`);
    scrollToStop(g.first.index);
  }));
  $('#brand').addEventListener('click', (e) => {
    e.preventDefault();
    if (body.classList.contains('text-mode')) scrollTo({ top: 0, behavior: 'smooth' });
    else scrollToStop(0);
  });

  // ↑ / W and ↓ / S are the pedals (see stepDrive). ← / → hop straight to the previous or next
  // stop; quick repeated presses keep counting while the smooth scroll is still underway.
  const FORWARD = ['ArrowUp', 'w', 'W'], REVERSE = ['ArrowDown', 's', 'S'];
  let keyStop = 0, keyTime = 0;
  addEventListener('keydown', (e) => {
    if (body.classList.contains('text-mode') || demo.isOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable], [role="slider"]')) return;
    const fwd = FORWARD.includes(e.key), rev = REVERSE.includes(e.key);
    if (fwd || rev) {
      e.preventDefault();
      if (!drive.active) Object.assign(drive, { active: true, pos: target, vel: 0 });
      if (fwd) drive.fwd = true; else drive.back = true;
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    cancelDrive();
    const from = performance.now() - keyTime < 900 ? keyStop : Math.round(target / SPACING);
    keyStop = M.clamp(from + (e.key === 'ArrowRight' ? 1 : -1), 0, stops.length - 1);
    keyTime = performance.now();
    scrollToStop(keyStop);
  });
  addEventListener('keyup', (e) => {
    if (FORWARD.includes(e.key)) drive.fwd = false;
    else if (REVERSE.includes(e.key)) drive.back = false;
    else return;
    if (!drive.fwd && !drive.back) releasePedals();
  });
  addEventListener('blur', () => {
    drive.fwd = drive.back = false;
    releasePedals();
  });
  // Grabbing the wheel (mouse wheel, touch) takes over from the pedals immediately.
  addEventListener('wheel', () => { if (drive.active) { cancelDrive(); readScroll(); } }, { passive: true });
  addEventListener('touchstart', () => { if (drive.active) { cancelDrive(); readScroll(); } }, { passive: true });

  // Deep links (#projects, or ?stop=5) start the car at that exit; later hash changes drive there.
  addEventListener('hashchange', () => {
    const g = groups.find((x) => `#${x.id}` === location.hash);
    if (g && !body.classList.contains('text-mode')) scrollToStop(g.first.index);
  });
  const linked = groups.find((g) => `#${g.id}` === location.hash)?.first
    ?? stops[M.clamp(parseInt(params.get('stop'), 10), 0, stops.length - 1)];
  if (linked) scrollTo(0, (linked.viewDist / END) * scrollMax());
  readScroll();
  dist = prevDist = target;

  if (params.has('debug')) window.__drive = { renderer, scene, get quality() { return quality; } };
  update(performance.now(), 0);
  measureMirror();
  render();
  renderMirror();
  requestAnimationFrame(loop);
  $('#loader').classList.add('done');
}

if (renderer) {
  if (params.get('mode') === 'text') setTextMode(true);
  start().catch((err) => {
    console.error(err);
    setTextMode(true);
    toggle.hidden = true;
    $('#loader').classList.add('done');
  });
} else {
  setTextMode(true);
  toggle.hidden = true;
  $('#loader').classList.add('done');
}
