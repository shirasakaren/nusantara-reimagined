// Geometry for coaster pieces: tubular rails, a chunky spine, ties, and the special
// dressing for lifts, boosters, brakes, tunnels, splash pools and photo spots.
import * as THREE from 'three';
import { GeoBuilder, P } from '../core/toon.js';
import { INK, SWATCHES, PAL } from '../core/palette.js';
import { T, BASE } from './pieces.js';

const GAUGE = 0.42;
const RAIL_R = 0.11;
const SPINE_DOWN = 0.36;
const SPINE_R = 0.19;
const OUTLINE = 0.045;

const _c = new THREE.Color();
const _ink = new THREE.Color(INK);
const _m4 = new THREE.Matrix4();
const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3();

export function swatch(i) { return SWATCHES[((i % SWATCHES.length) + SWATCHES.length) % SWATCHES.length].hex; }
function lighten(hex, k) { _c.set(hex); _c.lerp(new THREE.Color(0xffffff), k); return _c.getHex(); }
function darken(hex, k) { _c.set(hex); _c.multiplyScalar(1 - k); return _c.getHex(); }

/** Sweep a tube along sample frames with an offset in (right, up). */
export function sweep(b, sm, oR, oU, radius, segs, color, outline = OUTLINE, k0 = 0, k1 = sm.n, phase = 0) {
  const P3 = sm.pos, R3 = sm.right, U3 = sm.up;
  const ringCount = k1 - k0 + 1;
  const pos = [], nor = [], idx = [];
  const hpos = [], hnor = [];
  for (let k = k0; k <= k1; k++) {
    const px = P3[k * 3] + R3[k * 3] * oR + U3[k * 3] * oU;
    const py = P3[k * 3 + 1] + R3[k * 3 + 1] * oR + U3[k * 3 + 1] * oU;
    const pz = P3[k * 3 + 2] + R3[k * 3 + 2] * oR + U3[k * 3 + 2] * oU;
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2 + phase;
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = R3[k * 3] * ca + U3[k * 3] * sa, ny = R3[k * 3 + 1] * ca + U3[k * 3 + 1] * sa, nz = R3[k * 3 + 2] * ca + U3[k * 3 + 2] * sa;
      pos.push(px + nx * radius, py + ny * radius, pz + nz * radius);
      nor.push(nx, ny, nz);
      if (outline) { hpos.push(px + nx * (radius + outline), py + ny * (radius + outline), pz + nz * (radius + outline)); hnor.push(-nx, -ny, -nz); }
    }
  }
  const W = segs + 1;
  const hidx = [];
  for (let k = 0; k < ringCount - 1; k++) {
    for (let s = 0; s < segs; s++) {
      const a = k * W + s, b2 = (k + 1) * W + s, c = (k + 1) * W + s + 1, d = k * W + s + 1;
      idx.push(a, b2, d, b2, c, d);
      hidx.push(a, d, b2, b2, d, c);
    }
  }
  // end caps so tube ends are not hollow
  b.addRaw(pos, nor, color, idx);
  if (outline) b.addRaw(hpos, hnor, INK, hidx);
}

function frameMatrix(sm, k, oR = 0, oU = 0, oF = 0) {
  _t.set(sm.tan[k * 3], sm.tan[k * 3 + 1], sm.tan[k * 3 + 2]);
  _u.set(sm.up[k * 3], sm.up[k * 3 + 1], sm.up[k * 3 + 2]);
  _r.set(sm.right[k * 3], sm.right[k * 3 + 1], sm.right[k * 3 + 2]);
  _v.set(sm.pos[k * 3], sm.pos[k * 3 + 1], sm.pos[k * 3 + 2])
    .addScaledVector(_r, oR).addScaledVector(_u, oU).addScaledVector(_t, oF);
  const m = new THREE.Matrix4().makeBasis(_r, _u, _t.clone().negate());
  m.setPosition(_v);
  return m;
}

/** Index of the sample at fraction t. */
const kAt = (sm, t) => Math.max(0, Math.min(sm.n, Math.round(t * sm.n)));

/**
 * Build the main geometry and glow geometry for a piece.
 * @returns {{ main: THREE.BufferGeometry, glow: THREE.BufferGeometry|null }}
 */
export function buildPieceGeometry(piece, opts = {}) {
  const sm = piece.samples;
  const def = piece.def;
  const rail = swatch(piece.colors.rail);
  const spine = swatch(piece.colors.spine);
  const tie = lighten(spine, 0.35);
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  const lite = opts.lite;
  const segs = lite ? 5 : 7;

  sweep(b, sm, -GAUGE, 0, RAIL_R, segs, rail, lite ? 0 : OUTLINE);
  sweep(b, sm, GAUGE, 0, RAIL_R, segs, rail, lite ? 0 : OUTLINE);
  sweep(b, sm, 0, -SPINE_DOWN, SPINE_R, 4, spine, lite ? 0 : OUTLINE, 0, sm.n, Math.PI / 4);

  // ties
  const len = sm.length;
  const nTies = Math.max(2, Math.round(len / 0.72));
  for (let q = 0; q < nTies; q++) {
    const t = (q + 0.5) / nTies;
    const k = kAt(sm, t);
    const m = frameMatrix(sm, k, 0, -0.1);
    b.add(P('box', GAUGE * 2 + 0.16, 0.1, 0.16), tie, m, lite ? 0 : 0.035);
    const m2 = frameMatrix(sm, k, 0, -0.24);
    b.add(P('box', 0.12, 0.26, 0.12), tie, m2, 0);
    // LED bulbs on alternate ties, both sides
    if (!lite && q % 2 === 0) {
      const hue = (piece.index * 0.13 + q * 0.07) % 1;
      const col = new THREE.Color().setHSL(hue, 0.85, 0.66).getHex();
      g.add(P('sphere', 0.07, 6, 4), col, frameMatrix(sm, k, -GAUGE - 0.2, -0.08), 0);
      g.add(P('sphere', 0.07, 6, 4), col, frameMatrix(sm, k, GAUGE + 0.2, -0.08), 0);
    }
  }

  const f = def.flags;
  if (f.chain) {
    const n = Math.round(len / 0.32);
    for (let q = 0; q < n; q++) {
      const k = kAt(sm, (q + 0.5) / n);
      const m = frameMatrix(sm, k, 0, -0.06);
      m.multiply(_m4.makeRotationZ(q % 2 ? 0 : Math.PI / 2));
      b.add(P('box', 0.16, 0.05, 0.22), 0x4a4060, m, 0);
    }
    // little warning stripes on the spine
    for (let q = 0; q < 6; q++) {
      const k = kAt(sm, (q + 0.5) / 6);
      b.add(P('box', 0.5, 0.06, 0.3), q % 2 ? PAL.sun : INK, frameMatrix(sm, k, 0, -SPINE_DOWN + SPINE_R + 0.02), 0);
    }
  }
  if (f.boost) {
    for (let q = 0; q < 4; q++) {
      const k = kAt(sm, (q + 0.6) / 4.4);
      const m = frameMatrix(sm, k, 0, -0.02);
      g.add(P('box', 0.5, 0.04, 0.1), 0xff4fa0, m.clone().multiply(_m4.makeRotationY(0.6)).multiply(new THREE.Matrix4().makeTranslation(0.16, 0, 0)), 0);
      g.add(P('box', 0.5, 0.04, 0.1), 0xff4fa0, m.clone().multiply(_m4.makeRotationY(-0.6)).multiply(new THREE.Matrix4().makeTranslation(-0.16, 0, 0)), 0);
    }
    b.add(P('box', 0.3, 0.3, T * 0.8), 0x3a2f52, frameMatrix(sm, kAt(sm, 0.5), 0, -SPINE_DOWN - 0.1), 0.04);
  }
  if (f.brake) {
    const n = f.station ? 10 : 4;
    for (let q = 0; q < n; q++) {
      const k = kAt(sm, (q + 0.5) / n);
      b.add(P('box', 0.06, 0.22, 0.5), PAL.tangerine, frameMatrix(sm, k, 0.12, -0.02), 0.03);
      b.add(P('box', 0.06, 0.22, 0.5), PAL.tangerine, frameMatrix(sm, k, -0.12, -0.02), 0.03);
    }
  }
  if (f.tunnel) buildTunnel(b, piece);
  if (f.splash) buildSplash(b, g, piece);
  if (f.photo) buildPhoto(b, g, piece);

  return { main: b.build(), glow: g.empty ? null : g.build() };
}

function pieceBasis(piece) {
  const sm = piece.samples;
  const mid = kAt(sm, 0.5);
  const center = new THREE.Vector3(sm.pos[mid * 3], BASE, sm.pos[mid * 3 + 2]);
  const fwd = new THREE.Vector3(sm.tan[mid * 3], 0, sm.tan[mid * 3 + 2]).normalize();
  const right = new THREE.Vector3(sm.right[mid * 3], 0, sm.right[mid * 3 + 2]).normalize();
  const yaw = Math.atan2(-fwd.x, -fwd.z);
  return { center, fwd, right, yaw };
}

function at(basis, f, r, y) {
  return new THREE.Vector3().copy(basis.center).addScaledVector(basis.fwd, f).addScaledVector(basis.right, r).setY(y);
}

function buildTunnel(b, piece) {
  const B = pieceBasis(piece);
  const L = T * 2 - 0.6;
  const R = 1.9;
  // shell: half cylinder along the track, open ends
  const shell = new THREE.CylinderGeometry(R, R, L, 18, 1, true, -Math.PI / 2, Math.PI);
  shell.deleteAttribute('uv');
  const m = new THREE.Matrix4().makeRotationY(B.yaw).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  m.setPosition(B.center.x, 0, B.center.z);
  // CylinderGeometry axis is Y. Rotate so axis runs along the track and the arch points up.
  const mm = new THREE.Matrix4().makeRotationY(B.yaw).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  mm.setPosition(B.center.x, 0, B.center.z);
  b.add(shell, PAL.grass, mm, 0.06);
  // dark inside: smaller shell with flipped winding
  const inner = new THREE.CylinderGeometry(R - 0.12, R - 0.12, L - 0.02, 18, 1, true, -Math.PI / 2, Math.PI);
  inner.deleteAttribute('uv');
  const idx = inner.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  b.add(inner, 0x2a2440, mm, 0);
  // stone portals at both ends
  for (const s of [-1, 1]) {
    const pm = new THREE.Matrix4().makeRotationY(B.yaw);
    const p = at(B, s * L / 2, 0, 0);
    pm.setPosition(p.x, 0, p.z);
    b.add(P('torus', R + 0.05, 0.28, 6, 14, Math.PI), PAL.stone, pm, 0.05);
    // keystone
    const kp = at(B, s * L / 2, 0, R + 0.25);
    b.add(P('box', 0.5, 0.5, 0.5), PAL.stoneDark, new THREE.Matrix4().makeRotationY(B.yaw).setPosition(kp), 0.04);
  }
  // hill bumps, tufts and flowers on top
  const bumps = [[0, 0, 1.15, 1.0], [-1.6, 0.6, 0.8, 0.9], [1.5, -0.5, 0.85, 0.85]];
  for (const [f, r, sc, h] of bumps) {
    const p = at(B, f, r, R - 0.4);
    b.add(P('ico', 1, 1), PAL.leaf, new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(sc * 1.4, h * 0.8, sc * 1.4)), 0.05);
  }
  const fl = [PAL.pink, PAL.sun, PAL.white, PAL.lilac];
  for (let q = 0; q < 7; q++) {
    const p = at(B, (Math.random() - 0.5) * L * 0.8, (Math.random() - 0.5) * 2.2, R + 0.25 + Math.random() * 0.3);
    b.add(P('cyl', 0.03, 0.03, 0.35, 4), PAL.moss, new THREE.Matrix4().setPosition(p), 0);
    b.add(P('ico', 0.13, 0), fl[q % 4], new THREE.Matrix4().setPosition(p.x, p.y + 0.2, p.z), 0.02);
  }
}

function buildSplash(b, g, piece) {
  const B = pieceBasis(piece);
  const L = T * 2 - 0.2, W = 3.2;
  const m = new THREE.Matrix4().makeRotationY(B.yaw);
  // rim
  for (const s of [-1, 1]) {
    const p = at(B, 0, s * W / 2, 0.15);
    b.add(P('box', 0.35, 0.4, L), PAL.stone, m.clone().setPosition(p), 0.05);
    const p2 = at(B, s * L / 2, 0, 0.15);
    b.add(P('box', W + 0.35, 0.4, 0.35), PAL.stone, m.clone().setPosition(p2), 0.05);
  }
  // water
  const w = at(B, 0, 0, 0.3);
  b.add(P('box', W - 0.1, 0.1, L - 0.1), 0x5cc8f0, m.clone().setPosition(w), 0);
  // glinting ripples
  for (let q = 0; q < 6; q++) {
    const p = at(B, (Math.random() - 0.5) * L * 0.8, (Math.random() - 0.5) * W * 0.7, 0.37);
    g.add(P('box', 0.5 + Math.random() * 0.5, 0.01, 0.08), 0xdff6ff, m.clone().setPosition(p), 0);
  }
  // a rubber duck guardian
  const d = at(B, L / 2 - 0.6, W / 2 - 0.6, 0.45);
  b.add(P('sphere', 0.22, 10, 8), PAL.sun, m.clone().setPosition(d), 0.03);
  b.add(P('sphere', 0.14, 10, 8), PAL.sun, m.clone().setPosition(d.x, d.y + 0.22, d.z), 0.03);
  b.add(P('cone', 0.06, 0.14, 6), PAL.tangerine, m.clone().multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).setPosition(at(B, L / 2 - 0.6 - 0.16, W / 2 - 0.6, 0.67)), 0.02);
}

function buildPhoto(b, g, piece) {
  const B = pieceBasis(piece);
  const side = 1.6;
  const p = at(B, 0, side, 0);
  const m = new THREE.Matrix4().makeRotationY(B.yaw);
  const top = piece.samples.pos[1] + 2.1;
  b.add(P('cyl', 0.09, 0.12, 1, 8), PAL.ink, new THREE.Matrix4().compose(new THREE.Vector3(p.x, top / 2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, top, 1)), 0.03);
  const head = new THREE.Vector3(p.x, top + 0.1, p.z);
  b.add(P('box', 0.7, 0.5, 0.45), PAL.coral, m.clone().setPosition(head), 0.04);
  const lens = head.clone().addScaledVector(B.right, -0.3);
  const lm = new THREE.Matrix4().makeRotationY(B.yaw).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  lm.setPosition(lens);
  b.add(P('cyl', 0.17, 0.2, 0.25, 12), INK, lm, 0.02);
  g.add(P('sphere', 0.1, 8, 6), 0xfff6c8, new THREE.Matrix4().setPosition(head.x, head.y + 0.36, head.z), 0);
}

// ---------------------------------------------------------------------------
// Supports for the whole track, rebuilt after any change.
export function buildSupports(track, space) {
  const b = new GeoBuilder();
  const tmp = new THREE.Vector3();
  for (const piece of track.pieces) {
    if (piece.type === 'station') continue;
    const sm = piece.samples;
    const col = swatch(piece.colors.support);
    const colDark = darken(col, 0.18);
    const spacing = piece.def.flags.loop ? 99 : 2.0;
    let next = sm.length * 0.5 % spacing;
    if (sm.length < spacing * 1.2) next = sm.length * 0.5;
    for (let k = 0; k <= sm.n; k++) {
      if (sm.s[k] < next) continue;
      next += spacing;
      const upY = sm.up[k * 3 + 1];
      if (upY < 0.6) continue;
      const x = sm.pos[k * 3], y = sm.pos[k * 3 + 1], z = sm.pos[k * 3 + 2];
      const ux = sm.up[k * 3], uz = sm.up[k * 3 + 2];
      const topY = y - SPINE_DOWN * upY - SPINE_R;
      const ci = Math.floor(x / T), cj = Math.floor(z / T);
      const floor = space.floorBelow(ci, cj, topY, (o) => o.kind === 'track' && o.idx === piece.index);
      const h = topY - floor;
      if (h < 0.45) continue;
      const bx = x - ux * SPINE_DOWN, bz = z - uz * SPINE_DOWN;
      tmp.set(bx, floor + h / 2, bz);
      b.add(P('cyl', 0.15, 0.17, 1, 8), col, new THREE.Matrix4().compose(tmp, new THREE.Quaternion(), new THREE.Vector3(1, h, 1)), 0.04);
      if (floor < 0.01) {
        b.add(P('cyl', 0.38, 0.45, 0.22, 10), colDark, new THREE.Matrix4().setPosition(bx, 0.11, bz), 0.04);
      }
      // saddle under the spine
      const rx = sm.right[k * 3], rz = sm.right[k * 3 + 2];
      const yaw = Math.atan2(rx, rz);
      b.add(P('box', 0.2, 0.18, 0.62), colDark, new THREE.Matrix4().makeRotationY(yaw).setPosition(bx, topY - 0.05, bz), 0.03);
      // decorative collars on tall columns
      for (let hh = 2.6; hh < h - 0.6; hh += 2.6) {
        b.add(P('cyl', 0.22, 0.22, 0.14, 8), colDark, new THREE.Matrix4().setPosition(bx, floor + hh, bz), 0.02);
      }
    }
  }
  return b.empty ? null : b.build();
}
