import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROAD_HALF, ORIGIN, SEA_LEVEL } from './config.js';
import { blocksSign } from './signs.js';
import { mulberry32, drawRoadTexture, drawFieldTexture, drawFacadeTextures, drawBeamTexture } from '../textures.js';

const M = THREE.MathUtils;
const TAU = Math.PI * 2;
const dummy = new THREE.Object3D();
const palette = (...hex) => hex.map((h) => new THREE.Color(h));

/** Builds an InstancedMesh; `apply` positions the shared dummy (and may set a colour) for each item. */
function instanced(geo, mat, list, apply, shadow = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(list.length, 1));
  mesh.count = list.length;
  list.forEach((item, i) => {
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    apply(item, i, mesh);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Randomly dents a solid so rocks and leafy crowns look hand-made. */
function lumpy(geo, amount, seed) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo);
  const rand = mulberry32(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (rand() - 0.5) * amount;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.92, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export function buildScenery({ scene, road, zones, height, stops, island, texture, mats }) {
  const rand = mulberry32(1234);
  const f = road.frameAt(0);
  const loc = { lat: 0, d: 0 };
  const zw = {};
  const animated = [];
  const nightMaterials = [[mats.lamp, 2.4]];
  const glowMaterials = [[mats.pool, 0.5], [mats.halo, 0.85]];
  const beams = [];

  /** World point at road distance d, `off` metres to one side (side = ±1). */
  const at = (d, side, off, along = 0) => {
    road.frameAt(d, f);
    const x = f.p.x + f.r.x * side * off + f.t.x * along;
    const z = f.p.z + f.r.z * side * off + f.t.z * along;
    return { x, z, y: height(x, z), t: f.t.clone(), r: f.r.clone() };
  };
  const clearOfRoad = (x, z, min) => Math.abs(road.local(x, z, loc).lat) > min;

  /* ───────── road surface ───────── */
  {
    const roadTex = texture(drawRoadTexture());
    roadTex.wrapT = THREE.RepeatWrapping;
    // Shoulder above ground, road above shoulder: fixed order + depth nudge, so no flicker.
    const layer = (opts, offset) => new THREE.MeshLambertMaterial({ ...opts, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
    const roadMesh = new THREE.Mesh(road.ribbon(ROAD_HALF, 0.05, 12, -ORIGIN + 10, road.end, 2), layer({ map: roadTex }, -4));
    const shoulder = new THREE.Mesh(road.ribbon(ROAD_HALF + 2.3, 0.025, 12, -ORIGIN + 10, road.end, 3), layer({ color: 0xa0907a }, -2));
    roadMesh.receiveShadow = shoulder.receiveShadow = true;
    shoulder.renderOrder = -0.4;
    roadMesh.renderOrder = -0.3;
    scene.add(shoulder, roadMesh);
  }

  /* ───────── countryside: fields, barn, fences, hay, wind turbines ───────── */
  const fieldRects = [];
  const inField = (d, side, off) => fieldRects.some((r) => r.side === side && d > r.d0 - 3 && d < r.d1 + 3 && off > r.o0 - 3 && off < r.o1 + 3);
  const barn = { d: 95, side: -1, off: 46 };
  {
    const kinds = ['green', 'wheat', 'soil', 'lavender'];
    const buckets = Object.fromEntries(kinds.map((k) => [k, []]));
    const bales = [];
    for (const side of [-1, 1]) {
      let d0 = 10 + rand() * 20;
      while (d0 < zones.forest - 90) {
        const len = 38 + rand() * 40;
        const o0 = 24 + rand() * 16, o1 = o0 + 30 + rand() * 40;
        const nearBarn = side === barn.side && d0 < barn.d + 40 && d0 + len > barn.d - 40;
        const nearSign = stops.some((s) => s.side === side && s.signDist > d0 - 50 && s.signDist < d0 + len + 10);
        if (rand() < 0.85 && !nearBarn && !nearSign) {
          const kind = kinds[Math.floor(rand() * kinds.length)];
          const nx = 8, nz = Math.ceil(len / 5);
          const pos = [], uv = [], idx = [];
          for (let j = 0; j <= nz; j++) {
            const d = d0 + (len * j) / nz;
            road.frameAt(d, f);
            for (let i = 0; i <= nx; i++) {
              const lat = side > 0 ? o0 + ((o1 - o0) * i) / nx : -o1 + ((o1 - o0) * i) / nx;
              const x = f.p.x + f.r.x * lat, z = f.p.z + f.r.z * lat;
              pos.push(x, height(x, z) + 0.09, z);
              uv.push(lat / 8, (d - d0) / 16);
              if (i > 0 && j > 0) {
                const a = (j - 1) * (nx + 1) + i - 1, b = a + 1, c = j * (nx + 1) + i - 1, e = c + 1;
                idx.push(a, b, c, b, e, c);
              }
            }
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          geo.setIndex(idx);
          buckets[kind].push(geo);
          fieldRects.push({ side, d0, d1: d0 + len, o0, o1 });
          if (kind === 'wheat') {
            for (let k = 0; k < 6; k++) {
              const p = at(d0 + 6 + rand() * (len - 12), side, o0 + 5 + rand() * (o1 - o0 - 10));
              bales.push({ ...p, rot: rand() * TAU });
            }
          }
        }
        d0 += len + 6 + rand() * 18;
      }
    }
    for (const kind of kinds) {
      if (!buckets[kind].length) continue;
      const geo = mergeGeometries(buckets[kind]);
      geo.computeVertexNormals();
      const tex = texture(drawFieldTexture(kind), { repeat: true });
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    const baleGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.3, 14).rotateZ(Math.PI / 2).translate(0, 0.8, 0);
    scene.add(instanced(baleGeo, new THREE.MeshLambertMaterial({ color: 0xd8b75e }), bales, (b) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.y = b.rot;
    }));

    // red barn and silo
    const p = at(barn.d, barn.side, barn.off);
    const g = new THREE.Group();
    const red = new THREE.MeshLambertMaterial({ color: 0xa8392b });
    const trim = new THREE.MeshLambertMaterial({ color: 0xf1ede4 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4d3a33 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 10), red);
    body.position.y = 3.5;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 14.6, 3, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).scale(1, 0.55, 1), roofMat);
    roof.position.y = 7 + 7.4 * 0.55 * 0.5;
    const door = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5, 0.2), trim);
    door.position.set(0, 2.5, 5.05);
    const doorX = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.6, 0.25), trim);
    doorX.position.set(0, 2.5, 5.12);
    doorX.rotation.z = Math.atan2(5, 4.5);
    const doorX2 = doorX.clone();
    doorX2.rotation.z *= -1;
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 13, 18), new THREE.MeshLambertMaterial({ color: 0xc9ccd1 }));
    silo.position.set(10, 6.5, -1);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
    dome.position.set(10, 13, -1);
    g.add(body, roof, door, doorX, doorX2, silo, dome);
    g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    g.position.set(p.x, p.y - 0.3, p.z);
    g.rotation.y = Math.atan2(p.r.x, p.r.z); // door faces the road
    scene.add(g);

    // white farm fence along both sides of the country road
    const posts = [], rails = [];
    let prev = { [-1]: null, [1]: null };
    for (let d = -ORIGIN + 30; d < zones.forest - 60; d += 3) {
      for (const side of [-1, 1]) {
        const off = ROAD_HALF + 4.5;
        if (blocksSign(stops, d, side, off) || (side === barn.side && Math.abs(d - barn.d) < 10)) { prev[side] = null; continue; }
        const p2 = at(d, side, off);
        posts.push(p2);
        if (prev[side]) rails.push([prev[side], p2]);
        prev[side] = p2;
      }
    }
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0xeee8dc });
    scene.add(instanced(new THREE.BoxGeometry(0.16, 1.3, 0.16).translate(0, 0.55, 0), fenceMat, posts, (p2) => {
      dummy.position.set(p2.x, p2.y, p2.z);
    }));
    const railGeo = new THREE.BoxGeometry(1, 0.1, 0.06);
    const railList = rails.flatMap((r) => [[...r, 0.55], [...r, 1.0]]);
    scene.add(instanced(railGeo, fenceMat, railList, ([a, b, y]) => {
      dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + y, (a.z + b.z) / 2);
      dummy.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
      dummy.scale.x = Math.hypot(b.x - a.x, b.z - a.z);
    }, false));

    // wind turbines turning on the hills
    const towerMat = new THREE.MeshLambertMaterial({ color: 0xf2f3f5 });
    const turbineSpots = [[-60, 1, 150], [40, -1, 175], [150, 1, 210], [250, -1, 140], [330, 1, 175], [120, -1, 260]];
    for (const [d, side, off] of turbineSpots) {
      if (d > zones.forest + 120) continue;
      const p2 = at(d, side, off);
      const g2 = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 40, 10).translate(0, 20, 0), towerMat);
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 4).translate(0, 40.6, -0.6), towerMat);
      const rotor = new THREE.Group();
      rotor.position.set(0, 40.6, 1.6);
      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 10).rotateX(Math.PI / 2), towerMat);
      rotor.add(hub);
      for (let k = 0; k < 3; k++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 17, 0.2).translate(0.2, 8.6, 0), towerMat);
        blade.rotation.z = (k * TAU) / 3;
        rotor.add(blade);
      }
      g2.add(tower, nacelle, rotor);
      g2.traverse((o) => { o.castShadow = true; });
      g2.position.set(p2.x, p2.y - 0.5, p2.z);
      const toRoad = p2.r.clone().multiplyScalar(-side);
      g2.rotation.y = Math.atan2(toRoad.x, toRoad.z) + (rand() - 0.5) * 0.6;
      scene.add(g2);
      const phase = rand() * TAU, speed = 0.7 + rand() * 0.4;
      animated.push((t) => { rotor.rotation.z = phase + t * speed; });
    }
  }

  /* ───────── trees, palms and rocks ───────── */
  {
    const pines = [], rounds = [], palms = [], rocks = [];
    const push = (list, d, side, off, minY, extra = {}) => {
      if (blocksSign(stops, d, side, off) || inField(d, side, off)) return;
      if (side === barn.side && Math.abs(d - barn.d) < 30 && off < barn.off + 25) return;
      const p = at(d, side, off, (rand() - 0.5) * 3);
      if (!clearOfRoad(p.x, p.z, ROAD_HALF + 4.2) || p.y < minY) return;
      list.push({ ...p, s: 0.75 + rand() * 0.8, rot: rand() * TAU, c: rand(), ...extra });
    };
    for (let d = -ORIGIN + 20; d < road.end; d += 2) {
      zones.at(d, zw);
      for (const side of [-1, 1]) {
        const sea = side < 0 ? zw.coast : 0;
        const city = side > 0 ? zw.city : 0;
        const density = (zw.country * 0.3 + zw.forest * 1.0 + zw.coast * 0.32) * (1 - sea) * (1 - city * 0.94);
        if (rand() > density) continue;
        const off = ROAD_HALF + 5 + Math.pow(rand(), zw.forest > 0.5 ? 1.1 : 1.7) * 175;
        const r = rand();
        if (r < zw.forest * 0.88 + zw.country * 0.45) push(pines, d, side, off, SEA_LEVEL + 0.6, { tall: 1 + zw.forest * 0.45 });
        else if (r < 1 - zw.coast * 0.6) push(rounds, d, side, off, SEA_LEVEL + 0.6, { autumn: zw.coast < 0.5 && rand() < 0.16 });
        else push(palms, d, side, off, SEA_LEVEL + 0.6);
      }
      if (zw.forest > 0.4 && rand() < 0.08) push(rocks, d, rand() < 0.5 ? 1 : -1, ROAD_HALF + 6 + rand() * 40, -99, { big: 1.4 });
    }
    // beach palms and rocks along the waterline
    for (let d = zones.coast - 40; d < road.end; d += 5) {
      zones.at(d, zw);
      if (rand() < 0.5 * zw.coast) push(palms, d, -1, ROAD_HALF + 6 + rand() * 9, SEA_LEVEL + 0.35);
      if (rand() < 0.45 * zw.coast) push(rocks, d, -1, ROAD_HALF + 15 + rand() * 26, SEA_LEVEL - 2.4, { big: 1 });
    }
    if (island) {
      for (let k = 0; k < 18; k++) {
        const a = rand() * TAU, r = 14 + rand() * 12;
        const x = island.x + Math.cos(a) * r, z = island.z + Math.sin(a) * r;
        rocks.push({ x, y: height(x, z), z, s: 0.9 + rand() * 1.3, rot: rand() * TAU, c: rand(), big: 1.3 });
      }
    }

    // pines: three stacked cones
    const pineGeo = mergeGeometries([
      new THREE.ConeGeometry(2.3, 3.8, 8).translate(0, 3.4, 0),
      new THREE.ConeGeometry(1.8, 3.2, 8).translate(0, 5.1, 0),
      new THREE.ConeGeometry(1.15, 2.6, 8).translate(0, 6.7, 0),
    ]);
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 2.6, 6).translate(0, 1.3, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a32 });
    const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
    const pineTones = palette('#2f6b3a', '#3d7a38', '#356d33', '#47853c', '#2a5c31', '#3f7543');
    const leafTones = palette('#5d9b47', '#6aa84f', '#4f8a3d', '#79a948', '#86ad4a');
    const autumn = palette('#d39a3a', '#c7672e', '#e0b54a');
    const treeScale = (t) => {
      dummy.position.set(t.x, t.y - 0.2, t.z);
      dummy.rotation.y = t.rot;
      dummy.scale.set(t.s, t.s * (t.tall || 1) * (0.9 + t.c * 0.3), t.s);
    };
    scene.add(instanced(trunkGeo, trunkMat, [...pines, ...rounds], treeScale));
    scene.add(instanced(pineGeo, leafMat, pines, (t, i, m) => {
      treeScale(t);
      m.setColorAt(i, pineTones[Math.floor(t.c * pineTones.length)]);
    }));
    const roundGeo = lumpy(new THREE.IcosahedronGeometry(2.4, 1), 0.35, 5).translate(0, 4.2, 0);
    scene.add(instanced(roundGeo, leafMat, rounds, (t, i, m) => {
      treeScale(t);
      m.setColorAt(i, t.autumn ? autumn[Math.floor(t.c * autumn.length)] : leafTones[Math.floor(t.c * leafTones.length)]);
    }));

    // palms: curved trunk + drooping fronds
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, 3, 0), new THREE.Vector3(0.9, 6, 0), new THREE.Vector3(1.9, 8.6, 0),
    ]);
    const palmTrunk = new THREE.TubeGeometry(trunkCurve, 10, 0.24, 6, false);
    const fronds = [];
    for (let k = 0; k < 9; k++) {
      const droop = 0.35 + (k % 3) * 0.18;
      fronds.push(new THREE.ConeGeometry(0.55, 4.6, 4)
        .scale(1, 1, 0.22)
        .translate(0, 2.3, 0)
        .rotateZ(-(Math.PI / 2 + droop))
        .rotateY((k / 9) * TAU + k * 0.3)
        .translate(1.9, 8.6, 0));
    }
    fronds.push(new THREE.SphereGeometry(0.5, 6, 4).translate(1.9, 8.5, 0)); // coconuts, roughly
    const palmCrown = mergeGeometries(fronds.map((g) => { g.deleteAttribute('uv'); return g; }));
    const palmTones = palette('#3f8f3a', '#4c9a3f', '#367f34', '#5aa244');
    const palmPlace = (t) => {
      dummy.position.set(t.x, t.y - 0.2, t.z);
      dummy.rotation.y = t.rot;
      dummy.scale.setScalar(t.s * 1.05);
    };
    scene.add(instanced(palmTrunk, new THREE.MeshLambertMaterial({ color: 0x8c6d4c, flatShading: true }), palms, palmPlace));
    scene.add(instanced(palmCrown, leafMat, palms, (t, i, m) => {
      palmPlace(t);
      m.setColorAt(i, palmTones[Math.floor(t.c * palmTones.length)]);
    }));

    const rockGeo = lumpy(new THREE.DodecahedronGeometry(1.2, 0), 0.45, 9);
    const rockTones = palette('#8a8680', '#9b968d', '#77736d', '#a39d92');
    scene.add(instanced(rockGeo, new THREE.MeshLambertMaterial({ flatShading: true }), rocks, (t, i, m) => {
      dummy.position.set(t.x, t.y + 0.2, t.z);
      dummy.rotation.set(t.c * 3, t.rot, t.c * 2);
      dummy.scale.set(t.s * t.big * 1.4, t.s * t.big, t.s * t.big * 1.2);
      m.setColorAt(i, rockTones[Math.floor(t.c * rockTones.length)]);
    }));
  }

  /* ───────── coast: lighthouse and sailboats ───────── */
  if (island) {
    const g = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f1ea });
    const red = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
    const radiusAt = (y) => 2.3 - 0.8 * (y / 16);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.3, 16, 20).translate(0, 8, 0), white);
    g.add(tower);
    for (const y of [4, 11]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radiusAt(y + 1.1) + 0.03, radiusAt(y - 1.1) + 0.03, 2.2, 20), red);
      band.position.y = y;
      g.add(band);
    }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20), dark);
    gallery.position.y = 16.15;
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2, 14), mats.lamp);
    lantern.position.y = 17.3;
    const dome = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 14), red);
    dome.position.y = 19.15;
    const house = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), white);
    house.position.set(3.6, 1.5, 1.5);
    const houseRoof = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5.4, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).scale(1, 0.5, 1), red);
    houseRoof.position.set(3.6, 3.65, 1.5);
    g.add(gallery, lantern, dome, house, houseRoof);
    g.traverse((o) => { o.castShadow = o.receiveShadow = true; });

    const beamTex = texture(drawBeamTexture());
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex, color: 0xfff1c2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const spin = new THREE.Group();
    spin.position.y = 17.3;
    for (const a of [0, Math.PI]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 90, 20, 1, true).rotateZ(Math.PI / 2).translate(45, 0, 0), beamMat);
      beam.rotation.y = a;
      spin.add(beam);
      beams.push(beam);
    }
    g.add(spin);
    g.position.set(island.x, height(island.x, island.z) - 0.4, island.z);
    scene.add(g);
    animated.push((t) => { spin.rotation.y = t * 0.55; });

    // sailboats bobbing off the coast
    const hullMat = new THREE.MeshLambertMaterial({ color: 0xf6f6f2 });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x1f4e8c });
    const sailMat = new THREE.MeshLambertMaterial({ color: 0xfbfaf5, side: THREE.DoubleSide });
    const sail = (pts) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.computeVertexNormals();
      return geo;
    };
    const mainSail = sail([0.05, 1.4, 0.3, 0.05, 8.2, 0.25, 0.05, 1.4, -2.9]);
    const jib = sail([0.05, 7.2, 0.45, 0.05, 1.3, 2.6, 0.05, 1.3, 0.5]);
    for (let k = 0; k < 6; k++) {
      const d = zones.coast + 60 + k * ((road.end - zones.coast - 200) / 6) + rand() * 40;
      const p = at(d, -1, 110 + rand() * 300);
      if (p.y > SEA_LEVEL - 1.5) continue;
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 6.5).translate(0, 0.45, 0), hullMat);
      const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.05, 2.2, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.62, 1).translate(0, 0.62, 4.3), hullMat);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 6.55).translate(0, 0.72, 0), stripeMat);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 2).translate(0, 1.2, -0.6), hullMat);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 8, 6).translate(0, 4.6, 0.4), stripeMat);
      boat.add(hull, bow, stripe, cabin, mast, new THREE.Mesh(mainSail, sailMat), new THREE.Mesh(jib, sailMat));
      boat.traverse((o) => { o.castShadow = true; });
      boat.position.set(p.x, SEA_LEVEL, p.z);
      boat.rotation.y = rand() * TAU;
      boat.scale.setScalar(1.3);
      scene.add(boat);
      const phase = rand() * TAU;
      animated.push((t) => {
        boat.position.y = SEA_LEVEL - 0.15 + Math.sin(t * 1.1 + phase) * 0.16;
        boat.rotation.z = Math.sin(t * 0.8 + phase) * 0.06;
        boat.rotation.x = Math.sin(t * 0.63 + phase * 2) * 0.035;
      });
    }
  }

  /* ───────── harbour city ───────── */
  {
    const { map, glow } = drawFacadeTextures();
    const facade = texture(map, { repeat: true });
    const lights = texture(glow, { repeat: true });
    const tints = palette('#efe9dd', '#c9d3dc', '#dcc8ad', '#b8c0ca', '#efe0cb', '#a6aeb8', '#d6dde0');
    const geos = [];
    const beacons = [];
    for (const band of [[ROAD_HALF + 16, 18], [44, 24], [78, 30], [118, 36], [165, 40]]) {
      let d = zones.city - 30 + rand() * 20;
      while (d < road.end - 40) {
        zones.at(d, zw);
        const w = 12 + rand() * 14, dep = Math.min(band[1] - 4, 12 + rand() * 16);
        const mid = d + w / 2;
        const off = band[0] + dep / 2;
        if (rand() < 0.85 * zw.city && !blocksSign(stops, mid, 1, off - dep / 2)) {
          const p = at(mid, 1, off);
          if (clearOfRoad(p.x, p.z, ROAD_HALF + 12)) {
            const towerFactor = 0.55 + 0.75 * M.smoothstep(band[0], 20, 140);
            const h = (10 + Math.pow(rand(), 1.8) * 70) * towerFactor * zw.city + 6;
            const geo = new THREE.BoxGeometry(w, h, dep);
            const uv = geo.attributes.uv;
            const dims = [[dep, h], [dep, h], null, null, [w, h], [w, h]];
            for (let face = 0; face < 6; face++) {
              for (let k = 0; k < 4; k++) {
                const i = face * 4 + k;
                if (!dims[face]) uv.setXY(i, 0.01, 0.01);
                else uv.setXY(i, (uv.getX(i) * dims[face][0]) / 24, (uv.getY(i) * dims[face][1]) / 24);
              }
            }
            const tint = tints[Math.floor(rand() * tints.length)];
            const colors = new Float32Array(uv.count * 3);
            for (let i = 0; i < uv.count; i++) colors.set([tint.r, tint.g, tint.b], i * 3);
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geo.rotateY(road.alongY(p.t));
            geo.translate(p.x, p.y - 1 + h / 2, p.z);
            geos.push(geo);
            if (h > 48) beacons.push(p.x, p.y - 1 + h + 0.8, p.z);
          }
        }
        d += w + 4 + rand() * 7;
      }
    }
    if (geos.length) {
      const cityMat = new THREE.MeshLambertMaterial({ map: facade, emissiveMap: lights, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true });
      const city = new THREE.Mesh(mergeGeometries(geos), cityMat);
      city.castShadow = city.receiveShadow = true;
      scene.add(city);
      nightMaterials.push([cityMat, 1.7]);
    }
    if (beacons.length) {
      const beaconMat = new THREE.PointsMaterial({
        map: mats.halo.map, color: 0xff3b30, size: 4, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(beacons, 3));
      scene.add(new THREE.Points(geo, beaconMat));
      animated.push((t, lamps) => { beaconMat.opacity = lamps * (Math.sin(t * 3.2) > 0.2 ? 1 : 0.15); });
    }
  }

  /* ───────── street lights and roadside posts ───────── */
  {
    const lamps = [];
    for (let d = 12; d < road.end - 20; d += 46) {
      zones.at(d, zw);
      if (!blocksSign(stops, d, 1, ROAD_HALF + 1)) lamps.push([d, 1]);
      // a seafront promenade: lamps on the sea side too
      if (zw.coast > 0.6 && !blocksSign(stops, d + 23, -1, ROAD_HALF + 1)) lamps.push([d + 23, -1]);
    }
    const pole = mergeGeometries([
      new THREE.CylinderGeometry(0.1, 0.15, 7.6, 6).translate(0, 3.8, 0),
      new THREE.BoxGeometry(2.8, 0.12, 0.12).translate(1.3, 7.45, 0),
    ]);
    const head = new THREE.BoxGeometry(1.0, 0.2, 0.45).translate(2.55, 7.35, 0);
    const pool = new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2);
    const haloPts = [];
    const placed = lamps.map(([d, side]) => {
      road.frameAt(d, f);
      const inward = f.r.clone().multiplyScalar(-side);
      const base = f.p.clone().addScaledVector(f.r, side * (ROAD_HALF + 1.1));
      const lampPos = base.clone().addScaledVector(inward, 2.55);
      haloPts.push(lampPos.x, 7.2, lampPos.z);
      return { base, lampPos, rot: Math.atan2(-inward.z, inward.x) };
    });
    const lampPlace = (l) => { dummy.position.copy(l.base); dummy.rotation.y = l.rot; };
    scene.add(instanced(pole, mats.metal, placed, lampPlace));
    scene.add(instanced(head, mats.lamp, placed, lampPlace, false));
    scene.add(instanced(pool, mats.pool, placed, (l) => { dummy.position.copy(l.lampPos).setY(0.07); }, false));
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(haloPts, 3));
    scene.add(new THREE.Points(haloGeo, mats.halo));

    // white delineator posts on both sides: cheap, and they sell the sense of speed
    const marks = [];
    for (let d = -ORIGIN + 20; d < road.end; d += 20) for (const side of [-1, 1]) marks.push([d, side]);
    const postGeo = new THREE.BoxGeometry(0.13, 1.0, 0.13).translate(0, 0.5, 0);
    const refGeo = new THREE.BoxGeometry(0.15, 0.14, 0.15).translate(0, 0.84, 0);
    const markPlace = ([d, side]) => {
      road.frameAt(d, f);
      dummy.position.copy(f.p).addScaledVector(f.r, side * (ROAD_HALF + 1.7));
      dummy.rotation.y = road.heading(f.t);
    };
    scene.add(instanced(postGeo, mats.post, marks, markPlace, false));
    scene.add(instanced(refGeo, mats.reflector, marks, markPlace, false));
  }

  return {
    nightMaterials,
    glowMaterials,
    beams,
    update(t, lamps) { for (const fn of animated) fn(t, lamps); },
  };
}
