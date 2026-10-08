import * as THREE from 'three';
import { ROAD_HALF, SIDE, EYE } from './config.js';
import { drawSign } from '../textures.js';

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBillboard(panelMat, mats, neon = null) {
  const g = new THREE.Group();
  const W = 12, H = 6.75, B = 3.4, cy = B + H / 2;
  if (neon) {
    // Glowing tube around the signature billboard (bright enough to bloom on high quality).
    const tube = new THREE.MeshBasicMaterial({ color: new THREE.Color(neon).multiplyScalar(1.35), toneMapped: false });
    const t = 0.16;
    for (const [w, h, x, y] of [[W + 0.9, t, 0, cy + H / 2 + 0.36], [W + 0.9, t, 0, cy - H / 2 - 0.36], [t, H + 0.9, -W / 2 - 0.36, cy], [t, H + 0.9, W / 2 + 0.36, cy]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), tube);
      bar.position.set(x, y, 0.2);
      g.add(bar);
    }
  }
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W, H), panelMat);
  panel.position.set(0, cy, 0.17);
  const frame = shadowed(new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, H + 0.5, 0.3), mats.frame));
  frame.position.set(0, cy, 0);
  const walk = shadowed(new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.12, 1.1), mats.metal));
  walk.position.set(0, B - 0.4, 0.5);
  g.add(panel, frame, walk);
  for (const x of [-W * 0.28, W * 0.28]) {
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.42, cy + 1.5, 0.42), mats.metal));
    post.position.set(x, (cy - 1.5) / 2, -0.32); // sunk 1.5 m so slopes never leave it floating
    g.add(post);
  }
  for (const x of [-W * 0.33, 0, W * 0.33]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), mats.metal);
    arm.position.set(x, B + H + 0.5, 0.55);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.3), mats.lamp);
    lamp.position.set(x, B + H + 0.42, 1.15);
    g.add(arm, lamp);
  }
  return { group: g, centerY: cy };
}

function makeGantry(panelMat, mats) {
  const g = new THREE.Group();
  const W = 13.2, H = 4.95, B = 5.7, span = ROAD_HALF + 1.9, top = B + H + 0.8;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W, H), panelMat);
  panel.position.set(0, B + H / 2, 0.1);
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(W + 0.24, H + 0.24, 0.16), mats.metal));
  back.position.set(0, B + H / 2, -0.02);
  g.add(panel, back);
  for (const x of [-span, span]) {
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.5, top + 1.5, 0.5), mats.metal));
    post.position.set(x, (top - 1.5) / 2, -0.45);
    g.add(post);
  }
  for (const y of [B + H * 0.22, B + H * 0.78]) {
    const beam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 0.5, 0.32, 0.32), mats.metal));
    beam.position.set(0, y, -0.45);
    g.add(beam);
  }
  return { group: g, centerY: B + H / 2 };
}

/** Places every stop's sign and records where the camera should glance (stop.focus). */
export function buildSigns({ scene, road, stops, photo, mats, texture, height }) {
  const f = road.frameAt(0);
  for (const s of stops) {
    road.frameAt(s.signDist, f);
    const panelMat = new THREE.MeshBasicMaterial({ map: texture(drawSign(s, photo)), toneMapped: false });
    const signature = s.variant === 'signature';
    const built = s.kind === 'gantry' ? makeGantry(panelMat, mats) : makeBillboard(panelMat, mats, signature ? s.accent : null);
    const { group } = built;
    const scale = signature ? 1.3 : 1;
    const centerY = built.centerY * scale;
    group.scale.setScalar(scale);
    const toward = f.r.clone().multiplyScalar(-s.side); // from the sign toward the road
    const normal = f.t.clone().negate().addScaledVector(toward, s.side ? 0.45 : 0).normalize();
    group.position.copy(f.p).addScaledVector(f.r, s.side * (SIDE + (signature ? 2.5 : 0)));
    if (s.side) group.position.y = Math.min(0, height(group.position.x, group.position.z));
    group.rotation.y = Math.atan2(normal.x, normal.z);
    scene.add(group);
    s.focus = group.position.clone().setY(EYE + (centerY + group.position.y - EYE) * 0.45);
  }
}

/** True if something at road distance d / side / offset would block a sign. */
export function blocksSign(stops, d, side, off) {
  return stops.some((s) => {
    if (s.kind === 'gantry') return Math.abs(d - s.signDist) < 7 && off < ROAD_HALF + 7;
    return s.side === side && d > s.signDist - 48 && d < s.signDist + 8 && off < SIDE + 9;
  });
}
