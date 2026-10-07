import * as THREE from 'three';
import { SEG, ORIGIN } from './config.js';

const M = THREE.MathUtils;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The road: a gentle Catmull-Rom curve heading down -Z.
 * `d` is distance along the road in metres, with d = 0 at the start line.
 */
export function createRoad(minLength) {
  const pts = [];
  const n = Math.ceil((minLength + ORIGIN) / SEG) + 2;
  for (let i = -2; i <= n; i++) {
    const ramp = M.clamp((i - 1) / 3, 0, 1); // straight start, then gentle bends
    const x = ramp * (Math.sin(i * 0.72) * 30 + Math.sin(i * 1.83 + 1.3) * 9);
    pts.push(new THREE.Vector3(x, 0, -i * SEG));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = pts.length * 60;
  curve.updateArcLengths();
  const length = curve.getLength();
  const end = length - ORIGIN - 2;

  /** Position (p), forward tangent (t) and right vector (r) at distance d. */
  function frameAt(d, f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() }) {
    const u = M.clamp((d + ORIGIN) / length, 0, 1);
    curve.getPointAt(u, f.p);
    curve.getTangentAt(u, f.t);
    f.r.crossVectors(f.t, UP).normalize();
    return f;
  }

  // 1 m lookup table so terrain and scenery can ask "where is the road near (x, z)?" cheaply.
  // The road only ever heads down -Z, so z is monotonic along it.
  const count = Math.floor(end + ORIGIN) + 1;
  const lx = new Float32Array(count), lz = new Float32Array(count);
  const rx = new Float32Array(count), rz = new Float32Array(count);
  const f = frameAt(0);
  for (let i = 0; i < count; i++) {
    frameAt(i - ORIGIN, f);
    lx[i] = f.p.x; lz[i] = f.p.z; rx[i] = f.r.x; rz[i] = f.r.z;
  }

  /** Signed lateral offset from the road (right = +) and road distance for a world point. */
  function local(x, z, out = { lat: 0, d: 0 }) {
    let lo = 0, hi = count - 1;
    if (z >= lz[0]) hi = 1;
    else if (z <= lz[hi]) lo = hi - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lz[mid] > z) lo = mid; else hi = mid;
    }
    out.lat = (x - lx[lo]) * rx[lo] + (z - lz[lo]) * rz[lo];
    out.d = lo - ORIGIN;
    return out;
  }

  /** Flat strip that follows the road; v is measured in metres / vScale. */
  function ribbon(half, y, vScale, from, to, step) {
    const pos = [], uv = [], idx = [];
    const g = frameAt(0);
    let row = 0;
    for (let d = from; d <= to; d += step, row++) {
      frameAt(d, g);
      pos.push(g.p.x - g.r.x * half, y, g.p.z - g.r.z * half, g.p.x + g.r.x * half, y, g.p.z + g.r.z * half);
      uv.push(0, d / vScale, 1, d / vScale);
      if (row > 0) {
        const a = (row - 1) * 2, b = a + 1, c = row * 2, e = c + 1;
        idx.push(a, b, c, b, e, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  const heading = (t) => Math.atan2(t.x, -t.z);
  /** rotation.y that points an object's local +X along the road. */
  const alongY = (t) => Math.atan2(-t.z, t.x);
  /** rotation.y that points an object's local +Z along the road. */
  const facingY = (t) => Math.atan2(t.x, t.z);

  return { curve, length, end, frameAt, local, ribbon, heading, alongY, facingY };
}
