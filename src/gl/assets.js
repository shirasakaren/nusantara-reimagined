// Hand-built toon assets for Batavia: canal houses, the Stadhuis, the castle, shops, temples,
// trees, street furniture, boats and the modern city. Every asset is many small parts.
import * as THREE from 'three';
import { Builder, P, M, lathe, tube, extrude, toonMat, INK, geo } from './toon.js';
import { mulberry } from './noise.js';

export const PAL = {
  stone: '#cfc6b4', stoneD: '#a99f8c', glass: '#3d6f8f', glassD: '#2a4e6a', white: '#fff9ef', cream: '#f7ead0',
  wood: '#8a5a32', woodD: '#5e3a20', red: '#e2553f', roof: ['#e0704a', '#d0603f', '#c95a44', '#e88a5a', '#b9563c'],
  walls: ['#fff4e2', '#ffe3b8', '#ffd7a8', '#f6efe4', '#ffe9c9', '#e8f0e6', '#ffd9cc', '#f3e1c4', '#dfe9f2', '#ffeec2'],
  shutters: ['#3cae8a', '#2f8f6f', '#e2553f', '#3a7bd5', '#2c9c9c', '#5a8f3a'],
  flowers: ['#ff5b6e', '#ffc93c', '#ff8fb1', '#ffffff', '#a98bff', '#ff8a3c'],
  leaf: '#5fae4a', leafD: '#3f8a3a', leafL: '#8fd06a', bark: '#7a5236', gold: '#f2c14e', ink: INK,
};

// ---------- small parts ----------
function windowParts(b, x, y, fz, o, r) {
  const T = o.trim, w = 0.42, h = 0.62;
  b.add(P('box', w + 0.08, h + 0.08, 0.06), T, M(x, y, fz - 0.01), 0.012);
  b.add(P('box', w - 0.04, h - 0.04, 0.05), r() < 0.2 ? '#ffd88a' : PAL.glass, M(x, y, fz - 0.02), 0);
  b.add(P('box', 0.03, h - 0.04, 0.04), T, M(x, y, fz - 0.045), 0);
  b.add(P('box', w - 0.04, 0.03, 0.04), T, M(x, y + 0.06, fz - 0.045), 0);
  b.add(P('box', w + 0.16, 0.05, 0.14), PAL.stone, M(x, y - h / 2 - 0.06, fz - 0.06), 0.012);
  b.add(P('box', w + 0.14, 0.07, 0.08), PAL.stone, M(x, y + h / 2 + 0.07, fz - 0.03), 0.012);
  b.add(P('box', 0.09, 0.13, 0.1), PAL.stoneD, M(x, y + h / 2 + 0.08, fz - 0.05), 0.01);
  if (o.shutters) {
    for (const s of [-1, 1]) {
      const sx = x + s * (w / 2 + 0.11);
      b.at(M(sx - s * 0.11, y, fz - 0.03, 0, s * 0.45, 0), (bb) => {
        bb.add(P('box', 0.22, h + 0.02, 0.03), o.shutter, M(s * 0.11, 0, 0), 0.01);
        bb.add(P('box', 0.15, 0.22, 0.02), o.shutterD || o.shutter, M(s * 0.11, 0.14, -0.02), 0);
        bb.add(P('box', 0.15, 0.22, 0.02), o.shutterD || o.shutter, M(s * 0.11, -0.14, -0.02), 0);
      });
    }
  }
  if (o.flowers && r() < 0.6) {
    b.add(P('box', w + 0.06, 0.12, 0.14), '#b0683a', M(x, y - h / 2 - 0.15, fz - 0.1), 0.01);
    for (let k = 0; k < 6; k++) {
      b.add(P('sphere', 0.045, 8, 6), PAL.leaf, M(x - 0.2 + k * 0.08, y - h / 2 - 0.07, fz - 0.1 - (k % 2) * 0.03), 0.006);
      b.add(P('sphere', 0.035, 8, 6), PAL.flowers[Math.floor(r() * PAL.flowers.length)], M(x - 0.2 + k * 0.08 + 0.02, y - h / 2 - 0.03, fz - 0.14), 0.005);
    }
  }
}

function doorParts(b, x, fz, o) {
  const s = new THREE.Shape(); s.moveTo(-0.28, 0); s.lineTo(-0.28, 0.82); s.absarc(0, 0.82, 0.28, Math.PI, 0, true); s.lineTo(0.28, 0); s.closePath();
  b.add(extrude(s, 0.06, 0.012), o.trim, M(x, 0.28, fz - 0.02), 0.012);
  const s2 = new THREE.Shape(); s2.moveTo(-0.22, 0); s2.lineTo(-0.22, 0.8); s2.absarc(0, 0.8, 0.22, Math.PI, 0, true); s2.lineTo(0.22, 0); s2.closePath();
  b.add(extrude(s2, 0.05, 0), o.door, M(x, 0.28, fz - 0.035), 0);
  b.add(P('box', 0.15, 0.3, 0.02), o.doorD || PAL.woodD, M(x - 0.09, 0.55, fz - 0.065), 0);
  b.add(P('box', 0.15, 0.3, 0.02), o.doorD || PAL.woodD, M(x + 0.09, 0.55, fz - 0.065), 0);
  b.add(P('sphere', 0.025, 8, 6), PAL.gold, M(x + 0.14, 0.75, fz - 0.08), 0);
  b.add(P('box', 0.3, 0.12, 0.02), '#ffd88a', M(x, 1.18, fz - 0.06), 0);
  for (let k = 0; k < 2; k++) b.add(P('box', 0.78 - k * 0.12, 0.1, 0.28 - k * 0.1), PAL.stone, M(x, 0.05 + k * 0.1, fz - 0.14 + k * 0.05), 0.012);
  // a lantern on a bracket
  b.add(P('box', 0.03, 0.03, 0.22), '#2a2235', M(x + 0.48, 1.15, fz - 0.1), 0);
  b.add(lathe([[0, 0.92], [0.06, 0.95], [0.07, 1.05], [0.05, 1.1], [0, 1.13]], 6), '#2a2235', M(x + 0.48, 0, fz - 0.2), 0.008);
  b.add(P('sphere', 0.045, 8, 6), '#ffd36a', M(x + 0.48, 1.02, fz - 0.2), 0);
}

function tileSlope(b, side, hw, rh, depth, rows, color, y0) {
  // corrugated tile sheet lying on one slope of a gable roof (ridge along z)
  const ex = side * hw, nx = side * rh, ny = hw; const nl = Math.hypot(nx, ny);
  const N = rows * 3, hd = depth / 2; const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N; const f = (u * rows) % 1; const bump = 0.012 + f * 0.05;
    const x = ex * (1 - u) + (nx / nl) * bump, y = y0 + rh * u + (ny / nl) * bump;
    pos.push(x, y, -hd, x, y, hd);
    if (i < N) { const a = i * 2; if (side < 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const n = g.toNonIndexed(); n.computeVertexNormals();
  b.add(n, color, null, 0);
}

function gableRoof(b, w, d, h, rh, roof, r) {
  const core = new THREE.BufferGeometry();
  const hw = w / 2 + 0.08, hd = d / 2 + 0.06;
  core.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, -hd, hw, 0, -hd, 0, rh, -hd, -hw, 0, hd, hw, 0, hd, 0, rh, hd], 3));
  core.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
  const cg = core.toNonIndexed(); cg.computeVertexNormals();
  b.add(cg, roof, M(0, h, 0), 0.02);
  const rows = Math.max(4, Math.round(Math.hypot(hw, rh) / 0.17));
  const dark = new THREE.Color(roof).multiplyScalar(0.92).getStyle();
  tileSlope(b, -1, hw, rh, d + 0.14, rows, dark, h);
  tileSlope(b, 1, hw, rh, d + 0.14, rows, dark, h);
  b.add(P('cyl', 0.05, 0.05, d + 0.2, 8), '#b04a32', M(0, h + rh + 0.01, 0, Math.PI / 2), 0.012);
  if (r() < 0.7) {
    const cx = (r() - 0.5) * w * 0.5, cz = d * (0.15 + r() * 0.2);
    b.add(P('rbox', 0.24, rh * 0.8, 0.24, 0.03), '#c98a6a', M(cx, h + rh * 0.65, cz), 0.014);
    b.add(P('box', 0.32, 0.06, 0.32), PAL.stone, M(cx, h + rh * 1.06, cz), 0.012);
    b.add(P('cyl', 0.05, 0.06, 0.12, 8), '#b0683a', M(cx, h + rh * 1.14, cz), 0.008);
  }
}

// ---------- canal house ----------
export function canalHouse(b, o) {
  const r = mulberry(o.seed || 1);
  const { w, d, floors } = o; const fh = 1.12; const h = 0.28 + floors * fh + 0.15; const fz = -d / 2;
  const rh = w * 0.75;
  b.add(P('box', w + 0.1, 0.3, d + 0.1), PAL.stone, M(0, 0.15, 0), 0.02);
  b.add(P('rbox', w, h - 0.28, d, 0.04, 2), o.wall, M(0, 0.28 + (h - 0.28) / 2, 0), 0.025);
  // quoins
  for (let y = 0.4; y < h - 0.1; y += 0.24) for (const s of [-1, 1]) b.add(P('box', ((y * 10) | 0) % 2 ? 0.18 : 0.12, 0.12, 0.05), o.trim, M(s * (w / 2 - 0.06), y, fz - 0.015), 0.008);
  // string courses
  for (let f = 1; f <= floors; f++) b.add(P('box', w + 0.06, 0.06, 0.08), o.trim, M(0, 0.28 + f * fh, fz - 0.02), 0.01);
  // windows
  const cols = Math.max(2, Math.round(w / 0.85));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + 0.5) * (w / cols); const y = 0.28 + f * fh + 0.6;
    if (f === 0 && c === (cols === 3 ? 1 : 0)) { doorParts(b, x, fz, o); continue; }
    windowParts(b, x, y, fz, { ...o, flowers: f > 0 && o.flowers }, r);
  }
  // side windows
  for (let f = 1; f < floors; f++) for (const s of [-1, 1]) { b.add(P('box', 0.05, 0.5, 0.36), o.trim, M(s * (w / 2 + 0.01), 0.28 + f * fh + 0.6, 0), 0.01); b.add(P('box', 0.04, 0.42, 0.28), PAL.glass, M(s * (w / 2 + 0.03), 0.28 + f * fh + 0.6, 0), 0); }
  // cornice
  b.add(P('box', w + 0.16, 0.1, 0.18), o.trim, M(0, h, fz - 0.04), 0.012);
  gableRoof(b, w, d, h, rh, o.roof, r);
  // gable front
  const gz = fz - 0.06;
  if (o.gable === 'step') {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const ww = w * (1 - (i / n) * 0.84); const sh = rh / n; const yy = h + i * sh;
      b.add(P('box', ww, sh + 0.02, 0.18), o.wall, M(0, yy + sh / 2, gz), 0.016);
      b.add(P('box', ww + 0.06, 0.05, 0.22), o.trim, M(0, yy + sh + 0.02, gz), 0.01);
      for (const s of [-1, 1]) b.add(P('sphere', 0.045, 8, 6), o.trim, M(s * (ww / 2), yy + sh + 0.08, gz), 0.008);
    }
    b.add(P('cone', 0.06, 0.22, 8), o.trim, M(0, h + rh + 0.16, gz), 0.008);
  } else if (o.gable === 'bell' || o.gable === 'neck') {
    const s = new THREE.Shape(); const hw = w / 2;
    if (o.gable === 'bell') { s.moveTo(-hw, 0); s.bezierCurveTo(-hw, rh * 0.55, -hw * 0.25, rh * 0.62, -hw * 0.3, rh * 1.02); s.lineTo(hw * 0.3, rh * 1.02); s.bezierCurveTo(hw * 0.25, rh * 0.62, hw, rh * 0.55, hw, 0); }
    else { s.moveTo(-hw, 0); s.quadraticCurveTo(-hw * 0.62, rh * 0.12, -hw * 0.4, rh * 0.42); s.lineTo(-hw * 0.4, rh * 0.94); s.quadraticCurveTo(0, rh * 1.18, hw * 0.4, rh * 0.94); s.lineTo(hw * 0.4, rh * 0.42); s.quadraticCurveTo(hw * 0.62, rh * 0.12, hw, 0); }
    s.closePath();
    b.add(extrude(s, 0.16, 0.02, 10), o.wall, M(0, h, gz), 0.018);
    const pts = s.getPoints(30).map((p) => [p.x, h + p.y + 0.01, gz - 0.085]);
    b.add(tube(pts.slice(0, -1), 0.03, 60, 5), o.trim, null, 0.008);
    for (const sx of [-1, 1]) b.add(P('torus', 0.1, 0.03, 6, 14, Math.PI * 1.4), o.trim, M(sx * hw * 0.72, h + 0.12, gz - 0.08, 0, 0, sx > 0 ? 0.6 : 2.2), 0.008);
    b.add(P('sphere', 0.06, 8, 6), o.trim, M(0, h + rh * (o.gable === 'bell' ? 1.08 : 1.12), gz), 0.008);
  } else {
    b.add(P('box', w + 0.2, 0.08, 0.22), o.trim, M(0, h + 0.05, gz), 0.01);
  }
  if (o.gable !== 'plain') {
    // oculus and hoist beam
    b.add(P('torus', 0.13, 0.03, 6, 16), o.trim, M(0, h + rh * 0.45, gz - 0.09), 0.008);
    b.add(P('cyl', 0.11, 0.11, 0.04, 14), PAL.glass, M(0, h + rh * 0.45, gz - 0.07, Math.PI / 2), 0);
    b.add(P('box', 0.08, 0.08, 0.5), PAL.woodD, M(0, h + rh * 0.78, gz - 0.2), 0.008);
    b.add(P('torus', 0.04, 0.01, 4, 8), '#555', M(0, h + rh * 0.74, gz - 0.42), 0);
  }
}

const GABLES = ['step', 'bell', 'neck', 'step', 'bell', 'plain', 'neck', 'step'];
export function housePrototypes(n = 10, lod = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = mulberry(100 + i);
    const o = {
      w: 1.7 + r() * 0.9, d: 3.8 + r() * 1.2, floors: 2 + Math.floor(r() * 2.4), gable: GABLES[i % GABLES.length], seed: 9 + i,
      wall: PAL.walls[i % PAL.walls.length], trim: i % 3 === 0 ? '#ffffff' : PAL.white, roof: PAL.roof[i % PAL.roof.length],
      shutter: PAL.shutters[i % PAL.shutters.length], door: ['#3a7bd5', '#2f8f6f', '#c8372d', '#8a5a32'][i % 4], shutters: i % 4 !== 3, flowers: i % 2 === 0,
    };
    out.push({ o, geo: geo((b) => canalHouse(b, o), { lod }) });
  }
  return out;
}

// ---------- the Stadhuis ----------
export function stadhuis(b) {
  const w = 15, d = 5.4, h = 6.4, fz = -d / 2; const wall = '#fff8ec', trim = '#f2e2c4', roof = '#e0704a';
  b.add(P('box', w + 0.3, 0.45, d + 0.3), PAL.stone, M(0, 0.22, 0), 0.03);
  b.add(P('rbox', w, h, d, 0.06, 2), wall, M(0, 0.45 + h / 2, 0), 0.03);
  for (let i = 0; i <= 14; i++) { const x = -w / 2 + 0.25 + i * ((w - 0.5) / 14); b.add(P('box', 0.18, h, 0.08), trim, M(x, 0.45 + h / 2, fz - 0.03), 0.01); }
  b.add(P('box', w + 0.3, 0.12, 0.18), trim, M(0, 0.45 + h * 0.5, fz - 0.06), 0.012);
  b.add(P('box', w + 0.5, 0.22, d + 0.5), trim, M(0, 0.45 + h + 0.1, 0), 0.02);
  const r = mulberry(17);
  for (let f = 0; f < 2; f++) for (let i = 0; i < 14; i++) {
    const x = -w / 2 + 0.25 + (i + 0.5) * ((w - 0.5) / 14); if (Math.abs(x) < 2.3) continue;
    const y = 0.45 + 1.55 + f * 3.1;
    b.add(P('box', 0.58, 1.6, 0.06), '#ffffff', M(x, y, fz - 0.03), 0.012);
    b.add(P('box', 0.46, 1.46, 0.06), PAL.glass, M(x, y, fz - 0.04), 0);
    for (let k = 1; k < 4; k++) b.add(P('box', 0.46, 0.025, 0.03), '#ffffff', M(x, y - 0.73 + k * 0.365, fz - 0.07), 0);
    b.add(P('box', 0.025, 1.46, 0.03), '#ffffff', M(x, y, fz - 0.07), 0);
    b.add(P('box', 0.7, 0.07, 0.14), PAL.stone, M(x, y - 0.86, fz - 0.07), 0.01);
    for (const s of [-1, 1]) b.add(P('box', 0.24, 1.5, 0.03), '#2f8f6f', M(x + s * 0.4, y, fz - 0.1, 0, s * 0.4, 0), 0.008);
  }
  // central bay, balcony, pediment
  const BF = fz - 1.05;
  b.add(P('rbox', 4.4, h + 0.7, 1.1, 0.05), wall, M(0, 0.45 + (h + 0.7) / 2, fz - 0.5), 0.025);
  for (const x of [-1.9, -0.65, 0.65, 1.9]) b.add(lathe([[0, 0], [0.13, 0], [0.11, 0.2], [0.1, 2.5], [0.14, 2.6], [0, 2.62]], 12), '#ffffff', M(x, 0.45, BF - 0.35), 0.012);
  b.add(P('box', 4.6, 0.25, 0.8), trim, M(0, 3.1, BF - 0.3), 0.015);
  for (let k = 0; k < 13; k++) b.add(lathe([[0, 0], [0.04, 0], [0.06, 0.15], [0.03, 0.3], [0, 0.32]], 8), '#ffffff', M(-1.9 + k * 0.32, 3.22, BF - 0.62), 0.006);
  b.add(P('box', 4.5, 0.06, 0.08), '#ffffff', M(0, 3.56, BF - 0.62), 0.006);
  for (const x of [-1.1, 0, 1.1]) { b.add(P('box', 0.62, 1.7, 0.06), '#ffffff', M(x, 4.7, BF - 0.02), 0.012); b.add(P('box', 0.5, 1.56, 0.06), PAL.glass, M(x, 4.7, BF - 0.04), 0); b.add(P('box', 0.5, 0.025, 0.03), '#ffffff', M(x, 4.9, BF - 0.08), 0); }
  for (const x of [-1.6, 1.6]) { b.add(P('box', 0.56, 1.5, 0.06), '#ffffff', M(x, 1.55, BF - 0.02), 0.012); b.add(P('box', 0.44, 1.36, 0.06), PAL.glass, M(x, 1.55, BF - 0.04), 0); }
  const ped = new THREE.Shape(); ped.moveTo(-2.35, 0); ped.lineTo(0, 1.25); ped.lineTo(2.35, 0); ped.closePath();
  b.add(extrude(ped, 1.1, 0.03), wall, M(0, 0.45 + h + 0.7, fz - 0.5), 0.02);
  b.add(P('torus', 0.32, 0.06, 6, 20), PAL.gold, M(0, 0.45 + h + 1.15, BF - 0.08), 0.01);
  b.add(P('cyl', 0.27, 0.27, 0.04, 20), '#fff4d8', M(0, 0.45 + h + 1.15, BF - 0.06, Math.PI / 2), 0);
  const ds = new THREE.Shape(); ds.moveTo(-0.6, 0); ds.lineTo(-0.6, 1.8); ds.absarc(0, 1.8, 0.6, Math.PI, 0, true); ds.lineTo(0.6, 0); ds.closePath();
  b.add(extrude(ds, 0.08, 0.02), '#ffffff', M(0, 0.45, BF - 0.03), 0.012);
  const ds2 = new THREE.Shape(); ds2.moveTo(-0.5, 0); ds2.lineTo(-0.5, 1.8); ds2.absarc(0, 1.8, 0.5, Math.PI, 0, true); ds2.lineTo(0.5, 0); ds2.closePath();
  b.add(extrude(ds2, 0.06, 0), '#7a4a2a', M(0, 0.45, BF - 0.06), 0);
  b.add(P('sphere', 0.04, 8, 6), PAL.gold, M(0.3, 1.4, BF - 0.12), 0);
  for (let k = 0; k < 4; k++) b.add(P('box', 3.4 - k * 0.3, 0.12, 0.5), PAL.stone, M(0, 0.06 + k * 0.12, BF - 1.0 + k * 0.22), 0.012);
  for (const x of [-1.5, 1.5]) b.add(P('box', 0.5, 0.28, 0.06), '#2a2235', M(x, 0.25, fz - 0.06), 0.006);
  // hip roof with tiles and dormers
  const rw = w + 0.5, rd = d + 0.7, rhh = 2.7; const rr = (rw - rd) / 2;
  const hip = new THREE.BufferGeometry();
  hip.setAttribute('position', new THREE.Float32BufferAttribute([-rw / 2, 0, -rd / 2, rw / 2, 0, -rd / 2, rw / 2, 0, rd / 2, -rw / 2, 0, rd / 2, -rr, rhh, 0, rr, rhh, 0], 3));
  hip.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 2, 2, 5, 4, 2, 4, 3, 3, 4, 0]);
  const hg = hip.toNonIndexed(); hg.computeVertexNormals();
  b.add(hg, roof, M(0, 0.45 + h + 0.2, 0), 0.03);
  for (let k = 1; k < 9; k++) { const t = k / 9; b.add(P('box', rw * (1 - t) + rr * 2 * t, 0.03, 0.04), '#c95a3a', M(0, 0.45 + h + 0.2 + rhh * t, -rd / 2 * (1 - t) - 0.015, Math.atan2(rhh, rd / 2), 0, 0), 0); }
  for (const x of [-5, -2.8, 2.8, 5]) {
    b.add(P('box', 0.7, 0.8, 0.9), wall, M(x, 0.45 + h + 0.9, -rd / 2 + 0.75), 0.012);
    b.add(P('box', 0.42, 0.5, 0.05), PAL.glass, M(x, 0.45 + h + 0.88, -rd / 2 + 0.28), 0);
    b.add(P('cone', 0.62, 0.5, 4), roof, M(x, 0.45 + h + 1.55, -rd / 2 + 0.75, 0, Math.PI / 4), 0.012);
  }
  // tower and cupola
  const ty = 0.45 + h + 0.2 + rhh;
  b.add(P('rbox', 2.3, 1.2, 2.3, 0.05), wall, M(0, ty - 0.1, 0.3), 0.02);
  b.add(P('box', 2.5, 0.14, 2.5), trim, M(0, ty + 0.55, 0.3), 0.012);
  b.add(P('cyl', 0.98, 1.05, 1.9, 8), wall, M(0, ty + 1.55, 0.3, 0, Math.PI / 8), 0.02);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const ax = Math.sin(a) * 0.98, az = Math.cos(a) * 0.98;
    const arch = new THREE.Shape(); arch.moveTo(-0.22, 0); arch.lineTo(-0.22, 0.7); arch.absarc(0, 0.7, 0.22, Math.PI, 0, true); arch.lineTo(0.22, 0); arch.closePath();
    b.add(extrude(arch, 0.06, 0), '#2a2235', M(ax, ty + 0.85, 0.3 + az, 0, a, 0), 0);
    b.add(P('box', 0.1, 1.9, 0.1), trim, M(Math.sin(a + Math.PI / 8) * 1.0, ty + 1.55, 0.3 + Math.cos(a + Math.PI / 8) * 1.0, 0, a, 0), 0.008);
  }
  b.add(P('cyl', 1.15, 1.15, 0.14, 8), trim, M(0, ty + 2.55, 0.3, 0, Math.PI / 8), 0.012);
  b.add(P('hemi', 1.05, 20, 10), '#4a8a8a', M(0, ty + 2.6, 0.3), 0.02);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.add(tube(Array.from({ length: 8 }, (_, k) => { const t = (k / 7) * Math.PI / 2; return [Math.sin(a) * Math.cos(t) * 1.07, ty + 2.6 + Math.sin(t) * 1.07, 0.3 + Math.cos(a) * Math.cos(t) * 1.07]; }), 0.025, 16, 4), '#3a7070', null, 0); }
  b.add(P('cyl', 0.28, 0.3, 0.7, 8), wall, M(0, ty + 3.95, 0.3), 0.012);
  b.add(P('hemi', 0.32, 12, 6), '#4a8a8a', M(0, ty + 4.3, 0.3), 0.01);
  b.add(P('cone', 0.12, 0.9, 8), PAL.gold, M(0, ty + 5.0, 0.3), 0.008);
  b.add(P('sphere', 0.1, 10, 8), PAL.gold, M(0, ty + 4.6, 0.3), 0.006);
  return { towerTop: new THREE.Vector3(0, ty + 5.4, 0.3) };
}

// ---------- the castle ----------
export function castle(b) {
  const c = '#e4d6bc', c2 = '#cdbd9e', W = 15.6, D = 10.4;
  const wall = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    b.add(P('box', 1, 2.3, len), c, M((x0 + x1) / 2, 1.15, (z0 + z1) / 2, 0, ang, 0), 0.03);
    const n = Math.floor(len / 0.7);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.add(P('box', 0.32, 0.35, 0.36), c2, M(x0 + (x1 - x0) * t + Math.cos(ang) * 0.38, 2.45, z0 + (z1 - z0) * t - Math.sin(ang) * 0.38, 0, ang, 0), 0.01); }
  };
  const h = W / 2, d = D / 2;
  wall(-h, -d, h, -d); wall(h, -d, h, d); wall(h, d, 1.2, d); wall(-1.2, d, -h, d); wall(-h, d, -h, -d);
  for (const [x, z] of [[-h, -d], [h, -d], [h, d], [-h, d]]) {
    b.add(P('box', 3.4, 2.7, 3.4), c, M(x, 1.35, z, 0, Math.PI / 4), 0.03);
    b.add(P('box', 3.6, 0.22, 3.6), c2, M(x, 2.75, z, 0, Math.PI / 4), 0.015);
    b.add(P('cyl', 0.32, 0.34, 0.9, 10), c2, M(x + Math.sign(x) * 1.6, 3.2, z + Math.sign(z) * 1.6), 0.012);
    b.add(P('cone', 0.42, 0.5, 10), '#d0603f', M(x + Math.sign(x) * 1.6, 3.9, z + Math.sign(z) * 1.6), 0.012);
    for (const a of [0, Math.PI / 2]) { b.add(P('cyl', 0.09, 0.11, 0.9, 10), '#3a3a42', M(x + Math.cos(a) * 1.1, 3.05, z + Math.sin(a) * 1.1, 0, 0, Math.PI / 2 - 0.1), 0.008); }
  }
  // gate
  b.add(P('rbox', 3, 3.6, 1.6, 0.05), '#f2e6cc', M(0, 1.8, d), 0.025);
  const arch = new THREE.Shape(); arch.moveTo(-0.7, 0); arch.lineTo(-0.7, 1.4); arch.absarc(0, 1.4, 0.7, Math.PI, 0, true); arch.lineTo(0.7, 0); arch.closePath();
  b.add(extrude(arch, 0.1, 0), '#3a2a22', M(0, 0, d + 0.82), 0);
  const ped = new THREE.Shape(); ped.moveTo(-1.6, 0); ped.lineTo(0, 0.9); ped.lineTo(1.6, 0); ped.closePath();
  b.add(extrude(ped, 1.6, 0.02), '#f2e6cc', M(0, 3.6, d), 0.02);
  // buildings inside
  const r = mulberry(4);
  for (const [x, z, w, dd, hh] of [[-4, -2, 6, 3, 4.2], [3.5, -1.8, 3.2, 5.6, 3.6], [-1.5, 2.6, 5, 2.4, 3.2], [4.5, 3, 3, 2.4, 2.8]]) {
    const ox = { wall: '#fff4e2', trim: '#ffffff', roof: '#d0603f', shutter: '#2f8f6f', door: '#8a5a32', shutters: true };
    b.at(M(x, 0, z, 0, w > dd ? 0 : Math.PI / 2, 0), (bb) => {
      const W2 = Math.max(w, dd), D2 = Math.min(w, dd);
      bb.add(P('rbox', W2, hh, D2, 0.05), ox.wall, M(0, hh / 2, 0), 0.025);
      gableRoof(bb, D2, W2, hh, D2 * 0.6, ox.roof, r);
      for (let i = 0; i < Math.floor(W2 / 0.9); i++) for (let f = 0; f < 2; f++) windowParts(bb, -W2 / 2 + 0.6 + i * 0.9, 0.9 + f * 1.4, -D2 / 2, { ...ox, shutters: true }, r);
    });
  }
  b.add(P('cyl', 0.06, 0.08, 7.5, 8), '#5a4028', M(0, 3.75, -0.5), 0.01);
  b.add(P('sphere', 0.12, 8, 6), PAL.gold, M(0, 7.55, -0.5), 0.008);
  return { flag: new THREE.Vector3(0, 7.1, -0.5) };
}

// ---------- shops, warehouses, temples, churches, kampung ----------
export function warehouse(b, o = {}) {
  const w = 4.2, d = 7.4, h = 3.4; const r = mulberry(o.seed || 3);
  b.add(P('box', w + 0.1, 0.25, d + 0.1), PAL.stone, M(0, 0.12, 0), 0.02);
  b.add(P('rbox', w, h, d, 0.05), o.wall || '#f6efe4', M(0, h / 2 + 0.2, 0), 0.025);
  for (let i = 0; i < 4; i++) { const z = -d / 2 + 0.9 + i * 1.85; for (const s of [-1, 1]) b.add(P('box', 0.12, h, 0.3), '#e8dcc6', M(s * (w / 2 + 0.03), h / 2 + 0.2, z), 0.01); }
  for (let k = 0; k < 3; k++) {
    const x = -1.3 + k * 1.3;
    b.add(P('box', 0.9, 1.7, 0.08), '#7a4a2a', M(x, 1.05, -d / 2 - 0.03), 0.012);
    for (let p = 0; p < 4; p++) b.add(P('box', 0.02, 1.6, 0.02), '#5e3a20', M(x - 0.3 + p * 0.2, 1.05, -d / 2 - 0.08), 0);
    b.add(P('box', 0.6, 0.45, 0.06), PAL.glass, M(x, 2.6, -d / 2 - 0.03), 0);
  }
  gableRoof(b, w, d, h + 0.2, 2.2, o.roof || '#d0603f', r);
  b.add(P('box', 0.1, 0.1, 0.8), PAL.woodD, M(0, h + 1.2, -d / 2 - 0.4), 0.008);
}

export function stall(b, color = '#e2553f', goods = 'fruit', seed = 1) {
  const r = mulberry(seed);
  b.add(P('rbox', 1.3, 0.75, 0.9, 0.04), '#a8743e', M(0, 0.38, 0), 0.015);
  for (const sx of [-0.6, 0.6]) for (const sz of [-0.4, 0.4]) b.add(P('cyl', 0.03, 0.03, 1.6, 6), '#6b4a2e', M(sx, 0.8, sz), 0.006);
  for (let k = 0; k < 6; k++) b.add(P('box', 0.24, 0.04, 1.2), k % 2 ? '#fffaf0' : color, M(-0.6 + k * 0.24, 1.62 - Math.abs(k - 2.5) * 0.02, 0, 0.25, 0, 0), 0.008);
  for (let k = 0; k < 6; k++) b.add(P('cone', 0.12, 0.14, 3), k % 2 ? '#fffaf0' : color, M(-0.6 + k * 0.24, 1.48, -0.6, Math.PI, 0, 0), 0.006);
  const items = goods === 'fish' ? ['#9fb7c9', '#c9d6df', '#7f99ad'] : goods === 'cloth' ? ['#c8372d', '#3a7bd5', '#ffc93c', '#2f8f6f'] : ['#ffc93c', '#ff7a3c', '#7ccf5a', '#e2553f', '#a98bff'];
  for (let k = 0; k < 3; k++) {
    const x = -0.4 + k * 0.4;
    b.add(lathe([[0, 0.75], [0.15, 0.75], [0.18, 0.86], [0.17, 0.87], [0, 0.87]], 10), '#c99a52', M(x, 0, 0), 0.008);
    for (let i = 0; i < 5; i++) {
      if (goods === 'fish') b.add(P('sphere', 0.05, 8, 6), items[i % 3], M(x + (r() - 0.5) * 0.18, 0.88, (r() - 0.5) * 0.18, 0, r() * 3, 0, 2, 0.5, 0.8), 0.005);
      else if (goods === 'cloth') b.add(P('rbox', 0.16, 0.05, 0.12, 0.01), items[i % 4], M(x, 0.88 + i * 0.05, 0), 0.005);
      else b.add(P('sphere', 0.055, 8, 6), items[Math.floor(r() * items.length)], M(x + (r() - 0.5) * 0.15, 0.9 + r() * 0.04, (r() - 0.5) * 0.15), 0.005);
    }
  }
  b.add(P('box', 0.5, 0.25, 0.04), '#fffaf0', M(0, 1.3, -0.62), 0.006);
}

export function shophouse(b, o) {
  const r = mulberry(o.seed || 7); const w = 2.2, d = 3.6, h = 3.2;
  b.add(P('box', w + 0.1, 0.25, d + 0.1), PAL.stone, M(0, 0.12, 0), 0.02);
  b.add(P('rbox', w, h, d - 0.8, 0.04), o.wall, M(0, h / 2 + 0.25, 0.4), 0.025);
  b.add(P('box', w, 1.4, 0.8), o.wall, M(0, h - 0.45, -d / 2 + 0.4), 0.02);
  for (const s of [-1, 1]) b.add(P('cyl', 0.08, 0.08, 1.7, 10), '#c8372d', M(s * (w / 2 - 0.12), 1.1, -d / 2 + 0.12), 0.01);
  b.add(P('box', 1.2, 1.4, 0.06), '#5e2a1a', M(0, 0.95, -d / 2 + 0.8), 0.01);
  b.add(P('box', 1.0, 0.25, 0.04), '#c8372d', M(0, 1.9, -d / 2 + 0.78), 0.006);
  for (let k = 0; k < 2; k++) windowParts(b, -0.5 + k * 1.0, h - 0.35, -d / 2, { trim: '#fff4e2', shutter: '#2f8f6f', shutters: true, flowers: false }, r);
  // swallowtail roof
  const roofC = '#3d3a42';
  b.add(P('box', w + 0.5, 0.12, d + 0.4), roofC, M(0, h + 0.3, 0), 0.015);
  gableRoof(b, w + 0.2, d + 0.2, h + 0.3, 0.9, '#4a4650', r);
  for (const s of [-1, 1]) b.add(tube([[0, h + 1.2, s * (d / 2 - 0.1)], [0, h + 1.3, s * (d / 2 + 0.2)], [0, h + 1.55, s * (d / 2 + 0.4)]], 0.06, 10, 6), roofC, null, 0.01);
  for (const s of [-1, 1]) { b.add(P('sphere', 0.16, 12, 10), '#e2302a', M(s * 0.6, 1.95, -d / 2 + 0.05, 0, 0, 0, 1, 1.2, 1), 0.01); b.add(P('cyl', 0.07, 0.07, 0.06, 10), PAL.gold, M(s * 0.6, 2.17, -d / 2 + 0.05), 0.006); b.add(P('cyl', 0.07, 0.07, 0.06, 10), PAL.gold, M(s * 0.6, 1.73, -d / 2 + 0.05), 0.006); }
}

export function klenteng(b) {
  b.add(P('box', 7, 0.5, 5.4), PAL.stone, M(0, 0.25, 0), 0.025);
  b.add(P('rbox', 6, 2.6, 4.4, 0.05), '#e2402e', M(0, 1.8, 0), 0.025);
  for (let i = 0; i < 6; i++) b.add(P('cyl', 0.13, 0.13, 2.6, 12), '#c8372d', M(-2.6 + i * 1.04, 1.8, -2.5), 0.012);
  const roof = (y, w, d, hh) => {
    b.add(P('box', w, 0.15, d), '#2f6f6a', M(0, y, 0), 0.015);
    const g = new THREE.BufferGeometry(); const hw = w / 2, hd = d / 2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, -hd, hw, 0, -hd, hw * 0.6, hh, 0, -hw * 0.6, hh, 0, -hw, 0, hd, hw, 0, hd], 3));
    g.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5]); const n = g.toNonIndexed(); n.computeVertexNormals();
    b.add(n, '#3d8f88', M(0, y, 0), 0.02);
    for (const s of [-1, 1]) b.add(tube([[s * hw * 0.6, y + hh, 0], [s * hw * 0.85, y + hh + 0.1, 0], [s * (hw + 0.2), y + hh + 0.55, 0]], 0.07, 10, 6), '#3d8f88', null, 0.01);
    b.add(P('cyl', 0.06, 0.06, w * 0.6, 8), PAL.gold, M(0, y + hh + 0.05, 0, 0, 0, Math.PI / 2), 0.008);
  };
  roof(3.1, 7.2, 5.6, 1.1); b.add(P('rbox', 3.4, 1, 2.6, 0.04), '#e2402e', M(0, 4.6, 0), 0.02); roof(5.1, 4.4, 3.4, 0.9);
  b.add(P('sphere', 0.25, 12, 10), PAL.gold, M(0, 6.2, 0), 0.01);
  for (const s of [-1, 1]) { b.add(P('rbox', 0.5, 0.6, 0.5, 0.05), PAL.stone, M(s * 2.2, 0.8, -3.2), 0.01); b.add(P('sphere', 0.28, 12, 10), PAL.stone, M(s * 2.2, 1.35, -3.2, 0, 0, 0, 1, 1.1, 1), 0.01); }
  for (let k = 0; k < 4; k++) b.add(P('sphere', 0.18, 12, 10), '#e2302a', M(-1.8 + k * 1.2, 2.7, -2.7, 0, 0, 0, 1, 1.2, 1), 0.008);
}

export function church(b) {
  const w = 5.6, d = 9, h = 4;
  b.add(P('box', w + 0.2, 0.35, d + 0.2), PAL.stone, M(0, 0.17, 0), 0.025);
  b.add(P('rbox', w, h, d, 0.05), '#fffaf0', M(0, h / 2 + 0.3, 0), 0.025);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const z = -d / 2 + 1.4 + i * 2.1;
    const arch = new THREE.Shape(); arch.moveTo(-0.3, 0); arch.lineTo(-0.3, 1.4); arch.absarc(0, 1.4, 0.3, Math.PI, 0, true); arch.lineTo(0.3, 0); arch.closePath();
    b.add(extrude(arch, 0.06, 0.01), PAL.glass, M(s * (w / 2 + 0.01), 1.3, z, 0, s * Math.PI / 2, 0), 0.008);
  }
  gableRoof(b, w, d, h + 0.3, 3.4, '#c95a44', mulberry(3));
  const fz = -d / 2;
  const s = new THREE.Shape(); s.moveTo(-0.6, 0); s.lineTo(-0.6, 1.6); s.absarc(0, 1.6, 0.6, Math.PI, 0, true); s.lineTo(0.6, 0); s.closePath();
  b.add(extrude(s, 0.1, 0.02), '#7a4a2a', M(0, 0.35, fz - 0.03), 0.012);
  b.add(P('torus', 0.4, 0.06, 6, 20), '#ffffff', M(0, h + 1.3, fz - 0.06), 0.008);
  b.add(P('cyl', 0.36, 0.36, 0.04, 20), '#ffd88a', M(0, h + 1.3, fz - 0.05, Math.PI / 2), 0);
  b.add(P('box', 0.08, 0.6, 0.08), PAL.gold, M(0, h + 3.95, fz + 0.1), 0.006); b.add(P('box', 0.36, 0.08, 0.08), PAL.gold, M(0, h + 4.05, fz + 0.1), 0.006);
}

export function stiltHouse(b, seed = 1) {
  const r = mulberry(seed); const w = 2 + r(), d = 2.4 + r();
  for (const sx of [-0.45, 0, 0.45]) for (const sz of [-0.45, 0.45]) b.add(P('cyl', 0.07, 0.07, 1.1, 6), PAL.woodD, M(sx * w, 0.55, sz * d), 0.008);
  b.add(P('box', w + 0.3, 0.1, d + 0.3), PAL.wood, M(0, 1.1, 0), 0.012);
  b.add(P('rbox', w, 1.4, d, 0.04), '#d9b67a', M(0, 1.85, 0), 0.02);
  for (let k = 0; k < 8; k++) b.add(P('box', 0.02, 1.36, d + 0.02), '#b8935a', M(-w / 2 + 0.12 + k * (w - 0.24) / 7, 1.85, 0), 0);
  b.add(P('box', 0.6, 0.5, 0.05), '#3a2a22', M(-w * 0.2, 1.95, -d / 2 - 0.02), 0);
  b.add(P('box', 0.5, 1.0, 0.05), '#5e3a20', M(w * 0.2, 1.7, -d / 2 - 0.02), 0);
  const roof = new THREE.BufferGeometry(); const hw = w / 2 + 0.45, hd = d / 2 + 0.35, rh = 1.5;
  roof.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, -hd, hw, 0, -hd, 0, rh, -hd * 0.7, -hw, 0, hd, hw, 0, hd, 0, rh, hd * 0.7], 3));
  roof.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4]); const rg = roof.toNonIndexed(); rg.computeVertexNormals();
  b.add(rg, '#a8823e', M(0, 2.55, 0), 0.02);
  for (let k = 0; k < 6; k++) b.add(P('box', 0.04, 0.04, d + 0.7), '#8a6a2e', M(-hw * 0.8 + k * hw * 0.32, 2.55 + (1 - Math.abs(-hw * 0.8 + k * hw * 0.32) / hw) * rh * 0.95, 0), 0);
  for (let k = 0; k < 4; k++) b.add(P('box', 0.6, 0.08, 0.12), PAL.wood, M(w * 0.2, 0.25 + k * 0.25, -d / 2 - 0.3 - k * 0.0), 0.006);
}

// ---------- vegetation ----------
export function tree(b, seed = 1, kind = 'kenari') {
  const r = mulberry(seed);
  const h = kind === 'tamarind' ? 2.2 : 2.8 + r() * 0.8;
  b.add(tube([[0, 0, 0], [0.05, h * 0.4, 0.03], [-0.05, h * 0.75, 0], [0.02, h, 0.02]], 0.16, 12, 7), PAL.bark, null, 0.02);
  for (let k = 0; k < 4; k++) { const a = k * 1.7 + r(); b.add(tube([[0, h * 0.6, 0], [Math.cos(a) * 0.5, h * 0.82, Math.sin(a) * 0.5], [Math.cos(a) * 0.9, h * 0.95, Math.sin(a) * 0.9]], 0.06, 8, 5), PAL.bark, null, 0.012); }
  const cols = [PAL.leafD, PAL.leaf, PAL.leafL];
  const n = kind === 'tamarind' ? 9 : 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(); const rr = 0.55 + r() * 0.45; const y = h + 0.2 + r() * 0.8 - (k % 3) * 0.15;
    const g = P('ico', 0.6 + r() * 0.35, 2);
    b.add(g, cols[k % 3], M(Math.cos(a) * rr, y, Math.sin(a) * rr, r(), r(), r(), 1, 0.85, 1), 0.03);
  }
  b.add(P('ico', 0.9, 2), PAL.leafL, M(0, h + 1.1, 0, 0, 0, 0, 1, 0.8, 1), 0.03);
  if (kind === 'flower') for (let k = 0; k < 14; k++) { const a = r() * 7, e = r() * 1.2; b.add(P('sphere', 0.08, 6, 4), '#ff8fb1', M(Math.cos(a) * 1.1 * Math.cos(e), h + 0.7 + Math.sin(e) * 0.8, Math.sin(a) * 1.1 * Math.cos(e)), 0); }
}

export function palm(b, seed = 1) {
  const r = mulberry(seed); const H = 4.6 + r() * 1.6; const lean = 0.4 + r() * 0.6;
  const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([Math.sin(t * 1.4) * lean, t * H, 0]); }
  b.add(tube(pts, 0.13, 16, 7), '#a07850', null, 0.02);
  for (let k = 1; k < 10; k++) { const t = k / 10; b.add(P('torus', 0.13, 0.025, 4, 10), '#8a6440', M(Math.sin(t * 1.4) * lean, t * H, 0, Math.PI / 2, 0, -Math.cos(t * 1.4) * lean * 0.3), 0); }
  const top = [Math.sin(1.4) * lean, H, 0];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + r() * 0.3; const L = 1.8 + r() * 0.6;
    const ptsF = []; for (let i = 0; i <= 6; i++) { const t = i / 6; ptsF.push([top[0] + Math.cos(a) * L * t, top[1] + Math.sin(t * Math.PI * 0.9) * 0.5 - t * t * 1.1, top[2] + Math.sin(a) * L * t]); }
    b.add(tube(ptsF, 0.025, 10, 4), '#4f8f3a', null, 0.006);
    for (let i = 1; i < 6; i++) {
      const p = ptsF[i]; const t = i / 6; const len = 0.5 * Math.sin(t * Math.PI) + 0.12;
      for (const s of [-1, 1]) b.add(P('box', len, 0.015, 0.09), k % 2 ? '#5fae4a' : '#4f9a3a', M(p[0] + Math.cos(a + s * 1.4) * len * 0.45, p[1] - 0.06, p[2] + Math.sin(a + s * 1.4) * len * 0.45, 0, -(a + s * 1.4), -0.5), 0.005);
    }
  }
  for (let k = 0; k < 4; k++) b.add(P('sphere', 0.13, 8, 6), '#6b8a3a', M(top[0] + Math.cos(k * 1.6) * 0.15, H - 0.2, Math.sin(k * 1.6) * 0.15), 0.01);
}

export function banana(b, seed = 1) {
  const r = mulberry(seed);
  b.add(P('cyl', 0.1, 0.14, 1.4, 8), '#7aa05a', M(0, 0.7, 0), 0.012);
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + r(); const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.25, 0.6, 0, 1.4); s.quadraticCurveTo(-0.25, 0.6, 0, 0); b.add(extrude(s, 0.02, 0), k % 2 ? '#6fbf4a' : '#5aa83a', M(Math.cos(a) * 0.1, 1.3, Math.sin(a) * 0.1, 0, -a, -0.9), 0.008); }
}

export function bush(b, seed = 1, flowers = true) {
  const r = mulberry(seed);
  for (let k = 0; k < 5; k++) b.add(P('ico', 0.35 + r() * 0.2, 1), k % 2 ? PAL.leaf : PAL.leafD, M((r() - 0.5) * 0.7, 0.3 + r() * 0.15, (r() - 0.5) * 0.7), 0.015);
  if (flowers) for (let k = 0; k < 8; k++) b.add(P('sphere', 0.06, 6, 4), PAL.flowers[k % 6], M((r() - 0.5) * 0.8, 0.5 + r() * 0.25, (r() - 0.5) * 0.8), 0);
}

// ---------- street furniture ----------
export function lamp(b, modern = false) {
  if (modern) {
    b.add(P('cyl', 0.05, 0.07, 3.2, 8), '#2a2a32', M(0, 1.6, 0), 0.01);
    b.add(tube([[0, 3.2, 0], [0.15, 3.4, 0], [0.5, 3.45, 0]], 0.04, 8, 5), '#2a2a32', null, 0.008);
    b.add(P('rbox', 0.3, 0.1, 0.18, 0.03), '#2a2a32', M(0.55, 3.4, 0), 0.008); b.add(P('box', 0.24, 0.02, 0.12), '#fff3b0', M(0.55, 3.34, 0), 0);
    return;
  }
  b.add(P('cyl', 0.16, 0.2, 0.3, 8), '#2a2235', M(0, 0.15, 0), 0.01);
  b.add(P('cyl', 0.045, 0.06, 2.2, 8), '#2a2235', M(0, 1.3, 0), 0.01);
  b.add(P('torus', 0.1, 0.02, 4, 10), '#2a2235', M(0, 2.0, 0, Math.PI / 2), 0);
  b.add(lathe([[0, 2.35], [0.14, 2.4], [0.16, 2.7], [0.1, 2.78], [0, 2.85]], 6), '#2a2235', null, 0.01);
  b.add(P('cyl', 0.11, 0.11, 0.26, 6), '#ffe08a', M(0, 2.56, 0), 0);
  b.add(P('cone', 0.2, 0.18, 6), '#2a2235', M(0, 2.95, 0), 0.008);
}
export function bench(b) { for (const s of [-0.6, 0.6]) b.add(P('box', 0.08, 0.45, 0.4), '#2a2235', M(s, 0.22, 0), 0.008); for (let k = 0; k < 3; k++) b.add(P('rbox', 1.5, 0.06, 0.1, 0.02), PAL.wood, M(0, 0.46, -0.13 + k * 0.13), 0.008); for (let k = 0; k < 2; k++) b.add(P('rbox', 1.5, 0.06, 0.08, 0.02), PAL.wood, M(0, 0.65 + k * 0.15, 0.22, -0.2), 0.008); }
export function barrel(b) { b.add(lathe([[0, 0], [0.22, 0], [0.27, 0.3], [0.22, 0.6], [0, 0.6]], 12), '#a8743e', null, 0.012); for (const y of [0.08, 0.3, 0.52]) b.add(P('torus', y === 0.3 ? 0.27 : 0.24, 0.018, 4, 14), '#5a5a62', M(0, y, 0, Math.PI / 2), 0); }
export function crate(b, s = 0.45) { b.add(P('rbox', s, s, s, 0.02), '#c9965a', M(0, s / 2, 0), 0.012); for (const a of [-1, 1]) b.add(P('box', s * 1.25, 0.05, 0.02), '#9a6a3a', M(0, s / 2, -s / 2 - 0.01, 0, 0, a * 0.78), 0); }
export function sack(b) { b.add(P('sphere', 0.22, 10, 8), '#e2c98e', M(0, 0.2, 0, 0, 0, 0, 1, 0.9, 0.8), 0.012); b.add(P('cyl', 0.06, 0.1, 0.12, 8), '#d4b77a', M(0, 0.42, 0), 0.008); }
export function bollard(b) { b.add(lathe([[0, 0], [0.12, 0], [0.1, 0.4], [0.14, 0.45], [0.1, 0.5], [0, 0.52]], 10), '#3a3a42', null, 0.01); }
export function cart(b, seed = 1) {
  const r = mulberry(seed);
  b.add(P('rbox', 1.6, 0.35, 1.0, 0.04), PAL.wood, M(0, 0.75, 0), 0.015);
  for (let k = 0; k < 4; k++) b.add(P('box', 0.03, 0.35, 1.02), PAL.woodD, M(-0.7 + k * 0.47, 0.78, 0), 0);
  for (const s of [-1, 1]) {
    b.add(P('torus', 0.42, 0.05, 6, 20), '#6b4a2e', M(0, 0.45, s * 0.58), 0.01);
    for (let k = 0; k < 6; k++) b.add(P('box', 0.04, 0.8, 0.03), '#8a5a32', M(0, 0.45, s * 0.58, 0, 0, (k / 6) * Math.PI), 0);
    b.add(P('cyl', 0.07, 0.07, 0.08, 10), '#4a3a28', M(0, 0.45, s * 0.6, Math.PI / 2), 0.006);
  }
  b.add(P('box', 1.6, 0.06, 0.06), PAL.woodD, M(1.4, 0.7, -0.35), 0.006); b.add(P('box', 1.6, 0.06, 0.06), PAL.woodD, M(1.4, 0.7, 0.35), 0.006);
  for (let k = 0; k < 5; k++) b.add(P('sphere', 0.18, 8, 6), ['#e2c98e', '#7ccf5a', '#ffc93c'][k % 3], M(-0.5 + k * 0.25, 1.0, (r() - 0.5) * 0.4), 0.01);
}
export function buffalo(b) {
  const c = '#5a5560', d = '#3f3b45';
  b.add(P('capsule', 0.36, 0.9, 6, 12), c, M(0, 0.8, 0, 0, 0, Math.PI / 2), 0.02);
  b.add(P('sphere', 0.3, 12, 10), c, M(0.8, 0.85, 0, 0, 0, 0, 1.1, 0.9, 0.9), 0.016);
  b.add(P('rbox', 0.25, 0.2, 0.3, 0.06), '#7a7480', M(1.05, 0.72, 0), 0.01);
  for (const s of [-1, 1]) {
    b.add(tube([[0.82, 1.05, s * 0.18], [0.8, 1.2, s * 0.45], [0.65, 1.25, s * 0.62]], 0.05, 10, 6), '#e8dcc0', null, 0.008);
    b.add(P('sphere', 0.035, 6, 4), INK, M(1.0, 0.95, s * 0.16), 0);
    for (const x of [-0.45, 0.45]) b.add(P('capsule', 0.09, 0.35, 4, 8), d, M(x, 0.3, s * 0.2), 0.012);
  }
  b.add(tube([[-0.8, 0.95, 0], [-0.95, 0.7, 0], [-0.98, 0.45, 0.05]], 0.03, 8, 4), d, null, 0.006);
}
export function chicken(b, c = '#ffffff') {
  b.add(P('sphere', 0.12, 12, 10), c, M(0, 0.16, 0, 0, 0, 0, 1.2, 1, 0.9), 0.008);
  b.add(P('sphere', 0.07, 10, 8), c, M(0.11, 0.27, 0), 0.006);
  b.add(P('cone', 0.025, 0.06, 6), '#ffb43c', M(0.18, 0.26, 0, 0, 0, -Math.PI / 2), 0);
  b.add(P('sphere', 0.03, 6, 4), '#e2302a', M(0.11, 0.34, 0, 0, 0, 0, 0.6, 1, 0.4), 0);
  b.add(P('cone', 0.06, 0.12, 6), c, M(-0.14, 0.22, 0, 0, 0, 0.9), 0.006);
  for (const s of [-1, 1]) { b.add(P('sphere', 0.012, 4, 4), INK, M(0.15, 0.29, s * 0.04), 0); b.add(P('cyl', 0.01, 0.01, 0.08, 4), '#ffb43c', M(0, 0.04, s * 0.04), 0); }
}
export function cat(b, c = '#f2a24a') {
  b.add(P('capsule', 0.08, 0.2, 4, 8), c, M(0, 0.12, 0, 0, 0, Math.PI / 2), 0.008);
  b.add(P('sphere', 0.09, 10, 8), c, M(0.18, 0.2, 0), 0.008);
  for (const s of [-1, 1]) { b.add(P('cone', 0.035, 0.06, 4), c, M(0.2, 0.3, s * 0.05), 0.004); b.add(P('sphere', 0.012, 4, 4), INK, M(0.26, 0.21, s * 0.035), 0); }
  b.add(tube([[-0.16, 0.12, 0], [-0.26, 0.2, 0], [-0.28, 0.32, 0.04]], 0.02, 8, 4), c, null, 0.004);
}
export function well(b) {
  b.add(lathe([[0, 0], [0.6, 0], [0.62, 0.7], [0.5, 0.72], [0.48, 0.1], [0, 0.1]], 16), PAL.stone, null, 0.015);
  for (const s of [-1, 1]) b.add(P('box', 0.1, 1.5, 0.1), PAL.woodD, M(s * 0.55, 1.2, 0), 0.008);
  b.add(P('cyl', 0.05, 0.05, 1.2, 8), PAL.wood, M(0, 1.7, 0, 0, 0, Math.PI / 2), 0.006);
  b.add(P('cone', 0.95, 0.6, 4), '#c95a44', M(0, 2.2, 0, 0, Math.PI / 4), 0.012);
  b.add(lathe([[0, 0.9], [0.12, 0.9], [0.14, 1.12], [0, 1.12]], 10), '#8a5a32', null, 0.006);
}
export function fountain(b) {
  b.add(lathe([[0, 0], [1.4, 0], [1.45, 0.45], [1.3, 0.5], [1.25, 0.15], [0, 0.15]], 8), PAL.stone, M(0, 0, 0, 0, Math.PI / 8, 0), 0.02);
  b.add(P('cyl', 1.25, 1.25, 0.04, 8), '#66c4e0', M(0, 0.4, 0, 0, Math.PI / 8, 0), 0);
  b.add(lathe([[0, 0], [0.32, 0], [0.24, 0.3], [0.18, 1.0], [0.5, 1.15], [0.52, 1.25], [0.15, 1.3], [0.12, 1.7], [0.22, 1.85], [0, 2.0]], 12), '#e8dfcc', null, 0.012);
  b.add(P('cyl', 0.45, 0.45, 0.03, 12), '#8fd6ec', M(0, 1.22, 0), 0);
}
export function bunting(b, from, to, sag = 0.5, colors = ['#ff5b4d', '#ffffff']) {
  const [x0, y0, z0] = from, [x1, y1, z1] = to; const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, z0 + (z1 - z0) * t]); }
  b.add(tube(pts, 0.01, 24, 3), '#3a3a42', null, 0);
  const ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 1; i < 12; i++) { const p = pts[i]; b.add(P('cone', 0.1, 0.22, 3), colors[i % colors.length], M(p[0], p[1] - 0.12, p[2], Math.PI, ang, 0, 1, 1, 0.2), 0.006); }
}
export function cannon(b) { b.add(P('rbox', 0.5, 0.25, 0.4, 0.04), PAL.woodD, M(0, 0.2, 0), 0.01); b.add(lathe([[0, 0], [0.12, 0], [0.1, 0.9], [0.13, 0.95], [0, 0.97]], 10), '#3a3a42', M(0.2, 0.4, 0, 0, 0, -Math.PI / 2 + 0.1), 0.01); for (const s of [-1, 1]) b.add(P('cyl', 0.16, 0.16, 0.05, 10), PAL.woodD, M(0, 0.16, s * 0.22, Math.PI / 2), 0.008); }

// ---------- boats ----------
function hullGeo(L, W, H, sheer = 0.5, bow = 2.2) {
  const g = new THREE.BoxGeometry(L, H, W, 20, 4, 6); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); const t = x / (L / 2); const yt = Math.min(1, Math.max(0, (y + H / 2) / H));
    const narrow = (1 - Math.pow(Math.abs(t), t > 0 ? bow : 3.2)) * (0.3 + 0.7 * Math.pow(yt, 0.5));
    p.setZ(i, p.getZ(i) * Math.max(0.03, narrow));
    p.setY(i, y + Math.pow(Math.abs(t), 2) * sheer * yt);
  }
  g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
}
export function sampan(b, c = '#8a5a32', roof = true) {
  b.add(hullGeo(2.2, 0.7, 0.35, 0.25), c, M(0, 0.12, 0), 0.015);
  b.add(P('box', 1.9, 0.04, 0.55), '#c9965a', M(0, 0.24, 0), 0.006);
  if (roof) { const s = new THREE.Shape(); s.absarc(0, 0, 0.36, 0, Math.PI, false); s.lineTo(-0.36, 0); b.add(extrude(s, 0.8, 0.01), '#d9b67a', M(-0.2, 0.28, 0, 0, Math.PI / 2, 0), 0.01); for (let k = 0; k < 4; k++) b.add(P('torus', 0.37, 0.012, 4, 12, Math.PI), '#a8823e', M(-0.55 + k * 0.23, 0.28, 0, 0, Math.PI / 2, 0), 0); }
  for (let k = 0; k < 2; k++) b.add(P('rbox', 0.3, 0.2, 0.3, 0.03), ['#c9965a', '#e2c98e'][k], M(0.5 + k * 0.32, 0.36, 0), 0.008);
}
export function indiaman(b) {
  const wood = '#7a4a2a', dark = '#4a2c18', gold = '#f2c14e', paint = '#2f6f8f';
  b.add(hullGeo(9, 2.6, 2.4, 1.0), wood, M(0, 0, 0), 0.04);
  b.add(hullGeo(8.4, 2.66, 0.5, 0.95), paint, M(0, 0.55, 0), 0.02);
  b.add(P('box', 8, 0.08, 2.4), '#c9965a', M(0, 1.0, 0), 0.01);
  for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { b.add(P('box', 0.28, 0.26, 0.05), dark, M(-3.2 + k * 0.75, 0.25, s * 1.22 * (1 - Math.pow(Math.abs((-3.2 + k * 0.75) / 4.5), 3))), 0.006); }
  b.add(P('rbox', 2.2, 1.6, 2.2, 0.08), wood, M(-3.4, 1.9, 0), 0.025);
  b.add(P('rbox', 1.2, 0.9, 1.8, 0.06), wood, M(-3.9, 3.05, 0), 0.02);
  for (let k = 0; k < 4; k++) b.add(P('box', 0.05, 0.4, 0.3), '#ffd88a', M(-4.52, 2.0, -0.75 + k * 0.5), 0.006);
  b.add(P('box', 0.06, 0.1, 2.2), gold, M(-4.5, 2.6, 0), 0.006);
  b.add(P('rbox', 1.4, 0.8, 1.8, 0.06), wood, M(3.6, 1.45, 0), 0.02);
  for (const s of [-1, 1]) b.add(P('box', 8.6, 0.08, 0.06), gold, M(0, 0.85, s * 1.24), 0);
  b.add(P('cyl', 0.07, 0.09, 3.2, 8), wood, M(5.4, 1.9, 0, 0, 0, -1.15), 0.012);
  const sail = '#fff6e4';
  const masts = [[-1.8, 8.2], [0.8, 9.6], [3.0, 7.2]];
  for (const [x, h] of masts) {
    b.add(P('cyl', 0.1, 0.14, h, 8), wood, M(x, 1 + h / 2, 0), 0.015);
    for (const [yy, s] of [[0.38, 1], [0.64, 0.8], [0.86, 0.55]]) {
      const g = new THREE.PlaneGeometry(2.4 * s, 1.9 * s, 8, 4); const sp = g.attributes.position;
      for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / (1.2 * s), v = sp.getY(i) / (0.95 * s); sp.setZ(i, (1 - u * u) * 0.45 * s * (0.6 + 0.4 * (1 - v * v))); }
      g.computeVertexNormals(); g.deleteAttribute('uv');
      b.add(g, sail, M(x + 0.12, 1 + h * yy, 0, 0, Math.PI / 2, 0), 0.012);
      b.add(P('cyl', 0.045, 0.045, 2.8 * s, 6), wood, M(x + 0.12, 1 + h * yy + 0.98 * s, 0, Math.PI / 2), 0.006);
    }
    b.add(P('cyl', 0.36, 0.3, 0.2, 10), wood, M(x, 1 + h * 0.74, 0), 0.008);
    for (const s of [-1, 1]) b.add(tube([[x, 1 + h * 0.95, 0], [x - 0.4, 1 + h * 0.4, s * 1.25], [x - 0.6, 1.0, s * 1.3]], 0.008, 8, 3), '#3a2a22', null, 0);
  }
  b.add(tube([[-1.8, 9, 0], [0.8, 10.5, 0], [3, 8.1, 0], [6.6, 3.1, 0]], 0.01, 20, 3), '#3a2a22', null, 0);
  b.add(P('sphere', 0.25, 10, 8), gold, M(4.4, 1.6, 0), 0.01);
}
export function pinisi(b, hull = '#ffc93c') {
  b.add(hullGeo(7.5, 2.2, 1.8, 1.6, 1.8), hull, M(0, 0, 0), 0.035);
  b.add(hullGeo(7.2, 2.24, 0.35, 1.55, 1.8), '#ffffff', M(0, 0.6, 0), 0.015);
  b.add(P('box', 6.8, 0.06, 2.0), '#c9965a', M(0, 0.95, 0), 0.008);
  b.add(P('rbox', 2.2, 1.1, 1.7, 0.08), '#fff4e2', M(-2.1, 1.5, 0), 0.02);
  for (let k = 0; k < 3; k++) b.add(P('box', 0.04, 0.35, 0.3), PAL.glass, M(-3.22, 1.6, -0.5 + k * 0.5), 0.006);
  b.add(P('box', 2.5, 0.12, 2.0), '#2a7be0', M(-2.1, 2.1, 0), 0.012);
  for (const [x, h] of [[-0.3, 7], [1.9, 6.2]]) {
    b.add(P('cyl', 0.08, 0.11, h, 8), PAL.wood, M(x, 1 + h / 2, 0), 0.012);
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(2.2, 0.3); s.lineTo(1.9, h * 0.62); s.lineTo(0, h * 0.7); s.closePath();
    b.add(extrude(s, 0.03, 0), '#fff1d6', M(x + 0.05, 1.5, 0, 0, Math.PI, 0), 0.012);
  }
  b.add(P('cyl', 0.06, 0.06, 4.2, 6), PAL.wood, M(4.9, 2.2, 0, 0, 0, -1.2), 0.008);
}

// ---------- modern ----------
export function car(b, c = '#ff5b4d') {
  b.add(P('rbox', 1.7, 0.45, 0.85, 0.15), c, M(0, 0.42, 0), 0.02);
  b.add(P('rbox', 1.0, 0.4, 0.78, 0.14), c, M(-0.1, 0.8, 0), 0.016);
  b.add(P('rbox', 0.92, 0.3, 0.8, 0.1), '#9fd6ec', M(-0.1, 0.82, 0), 0);
  for (const sx of [-0.55, 0.55]) for (const sz of [-1, 1]) { b.add(P('cyl', 0.2, 0.2, 0.14, 14), '#2a2a32', M(sx, 0.22, sz * 0.4, Math.PI / 2), 0.01); b.add(P('cyl', 0.1, 0.1, 0.15, 10), '#d8d8e0', M(sx, 0.22, sz * 0.41, Math.PI / 2), 0); }
  for (const s of [-1, 1]) { b.add(P('sphere', 0.07, 8, 6), '#fff6c8', M(0.86, 0.48, s * 0.28), 0); b.add(P('sphere', 0.06, 8, 6), '#ff3b3b', M(-0.86, 0.48, s * 0.3), 0); }
}
export function bajaj(b) {
  b.add(P('rbox', 1.3, 0.9, 0.9, 0.18), '#e2302a', M(0, 0.75, 0), 0.02);
  b.add(P('rbox', 0.5, 0.5, 0.85, 0.12), '#9fd6ec', M(0.38, 0.95, 0), 0);
  b.add(P('rbox', 1.4, 0.08, 1.0, 0.04), '#2a2a32', M(-0.05, 1.25, 0), 0.01);
  for (const [x, z] of [[0.55, 0], [-0.45, -0.42], [-0.45, 0.42]]) b.add(P('cyl', 0.18, 0.18, 0.12, 12), '#2a2a32', M(x, 0.2, z, Math.PI / 2), 0.008);
}
export function onthel(b, c = '#ff8fb1') {
  for (const x of [-0.42, 0.42]) { b.add(P('torus', 0.3, 0.025, 6, 20), '#2a2a32', M(x, 0.32, 0), 0.006); for (let k = 0; k < 6; k++) b.add(P('box', 0.6, 0.008, 0.008), '#c0c0c8', M(x, 0.32, 0, 0, 0, (k / 6) * Math.PI), 0); }
  b.add(tube([[-0.42, 0.32, 0], [-0.05, 0.75, 0], [0.38, 0.8, 0], [0.42, 0.32, 0]], 0.03, 12, 5), c, null, 0.006);
  b.add(tube([[-0.05, 0.75, 0], [0.05, 0.32, 0], [-0.42, 0.32, 0]], 0.025, 8, 5), c, null, 0.006);
  b.add(P('rbox', 0.22, 0.06, 0.12, 0.03), '#3a2a22', M(-0.08, 0.84, 0), 0.006);
  b.add(P('cyl', 0.015, 0.015, 0.5, 5), '#c0c0c8', M(0.38, 0.95, 0, Math.PI / 2), 0);
  b.add(lathe([[0, 0], [0.16, 0], [0.18, 0.18], [0, 0.18]], 10), '#c99a52', M(0.48, 0.8, 0), 0.006);
}
export function tower(b, seed = 1) {
  const r = mulberry(seed); const w = 4 + r() * 5, d = 4 + r() * 5, h = 10 + r() * 34;
  const cols = ['#cfe3f2', '#e8eef2', '#b9d0e0', '#f2e6d8', '#d6dce6', '#c8e6dc'];
  const c = cols[Math.floor(r() * cols.length)];
  b.add(P('rbox', w, h, d, 0.15), c, M(0, h / 2, 0), 0.04);
  for (let y = 1.5; y < h - 0.5; y += 1.4) { b.add(P('box', w + 0.04, 0.55, d + 0.04), '#5a8fb8', M(0, y, 0), 0); }
  b.add(P('rbox', w * 0.6, 1.2, d * 0.6, 0.1), '#9aa3ad', M(0, h + 0.6, 0), 0.02);
  if (r() < 0.5) b.add(P('cyl', 0.04, 0.04, 3, 4), '#ff5b4d', M(w * 0.2, h + 2.5, 0), 0);
}
export function umbrellaStall(b, c = '#ffc93c') {
  b.add(P('cyl', 0.03, 0.03, 2, 6), '#555', M(0, 1, 0), 0.006);
  b.add(lathe([[0, 2.2], [0.1, 2.18], [1.1, 1.85], [1.12, 1.82], [0, 1.95]], 10), c, null, 0.015);
  b.add(P('rbox', 1.2, 0.7, 0.7, 0.05), '#f6efe4', M(0, 0.35, 0), 0.012);
  for (let k = 0; k < 4; k++) b.add(P('cyl', 0.06, 0.05, 0.16, 8), ['#ff5b4d', '#3cc8b4', '#ffc93c', '#8f7cff'][k], M(-0.42 + k * 0.28, 0.78, 0), 0.006);
}

// ---------- dev preview ----------
export function PREVIEW(what) {
  const out = []; const add = (fn, x = 0, z = 0, ry = 0) => { const bb = new Builder(); fn(bb); const m = bb.mesh(); m.position.set(x, 0, z); m.rotation.y = ry; out.push(m); };
  if (what === 'houses') housePrototypes(8).forEach((p, i) => { const m = new THREE.Mesh(p.geo, toonMat()); m.castShadow = m.receiveShadow = true; m.position.set((i % 4 - 1.5) * 3, 0, Math.floor(i / 4) * 6); m.rotation.y = Math.PI; out.push(m); });
  if (what === 'stadhuis') add((b) => stadhuis(b), 0, 0, Math.PI);
  if (what === 'castle') add((b) => castle(b), 0, 0, Math.PI);
  if (what === 'misc') {
    add((b) => warehouse(b), -8, 0, Math.PI); add((b) => shophouse(b, { wall: '#ffd7a8' }), -4, 0, Math.PI); add((b) => klenteng(b), 2, 0, Math.PI); add((b) => church(b), 9, 0, Math.PI);
    add((b) => stiltHouse(b), -8, 7); add((b) => tree(b, 3), -4, 7); add((b) => palm(b, 4), -1, 7); add((b) => banana(b), 1.5, 7); add((b) => bush(b), 3, 7); add((b) => tree(b, 5, 'flower'), 6, 7);
    add((b) => stall(b, '#e2553f', 'fruit'), -6, 11); add((b) => stall(b, '#3a7bd5', 'fish'), -4, 11); add((b) => lamp(b), -2, 11); add((b) => lamp(b, true), -1, 11); add((b) => bench(b), 1, 11); add((b) => barrel(b), 2.5, 11); add((b) => crate(b), 3.2, 11); add((b) => sack(b), 3.8, 11); add((b) => well(b), 5.5, 11); add((b) => fountain(b), 8.5, 11);
    add((b) => cart(b), -6, 14); add((b) => buffalo(b), -3.5, 14); add((b) => chicken(b), -2, 14); add((b) => cat(b), -1.5, 14); add((b) => cannon(b), -1, 14); add((b) => sampan(b), 1, 14); add((b) => car(b), 4, 14); add((b) => bajaj(b), 6, 14); add((b) => onthel(b), 8, 14); add((b) => umbrellaStall(b), 10, 14);
  }
  if (what === 'ships') { add((b) => indiaman(b), -6, 0); add((b) => pinisi(b), 6, 0); add((b) => tower(b, 3), 0, -14); }
  return out;
}
