// The island: a flat lawn board for building, rolling hills around it, sandy beaches,
// winding dirt paths, a pond and two little hills for the windmill and the lighthouse.
import * as THREE from 'three';
import { fbm, vnoise } from './noise.js';
import { PAL } from '../core/palette.js';
import { toonMat, gradient3 } from '../core/toon.js';
import { GRID, T } from '../coaster/pieces.js';

export const PAD = GRID * T;            // half size of the build board (40)
export const SITES = {
  village: { x: 62, z: 50, r: 26 },
  farm: { x: -64, z: -46, r: 24 },
  windmill: { x: -78, z: 12 },
  lighthouse: { x: 76, z: -70 },
  pond: { x: -56, z: 58, r: 10 },
  dock: { x: 98, z: 6 },
  forest: { x: 10, z: -78, r: 30 },
};

export function coastR(th) {
  return 103 + 7 * Math.sin(3 * th + 0.4) + 4 * Math.sin(7 * th + 1.3) + 2.5 * Math.sin(13 * th + 2.1);
}

const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Paths are polylines. The station sits on the south edge of the board facing east, the queue plaza is just south of it.
export const PATHS = [
  [[-2, 46], [10, 50], [24, 50], [40, 50], [54, 52], [66, 50]],
  [[-2, 46], [-14, 50], [-30, 50], [-46, 54], [-52, 58]],
  [[-46, 54], [-58, 40], [-62, 20], [-74, 12]],
  [[-62, 20], [-60, 0], [-58, -22], [-62, -36]],
  [[66, 50], [80, 34], [92, 14], [100, 6]],
  [[40, 50], [56, 20], [62, -20], [70, -48], [74, -64]],
  [[-58, -22], [-30, -50], [0, -56], [26, -60]],
];

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function pathDist(x, z) {
  let d = Infinity;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const cr = coastR(th);
  const bx = Math.max(Math.abs(x) - (PAD + 4), 0), bz = Math.max(Math.abs(z) - (PAD + 4), 0);
  const d = Math.hypot(bx, bz);
  let h = (fbm(x * 0.022 + 3.1, z * 0.022 - 1.7, 4) - 0.35) * 11 * smoothstep(0, 22, d);
  h = Math.max(h, -0.2 * smoothstep(0, 22, d));
  // flatten sites
  const flat = (s, k) => { const dd = Math.hypot(x - s.x, z - s.z); return smoothstep(s.r * 0.6, s.r, dd) * (1 - k) + k; };
  h *= flat(SITES.village, 0.12) * flat(SITES.farm, 0.1);
  h += 6.5 * Math.exp(-((x - SITES.windmill.x) ** 2 + (z - SITES.windmill.z) ** 2) / 260);
  h += 5.5 * Math.exp(-((x - SITES.lighthouse.x) ** 2 + (z - SITES.lighthouse.z) ** 2) / 110);
  // paths are dug in slightly
  const pd = pathDist(x, z);
  h -= 0.25 * (1 - smoothstep(1.2, 2.6, pd)) * smoothstep(0, 6, d);
  // pond bowl
  const po = Math.hypot(x - SITES.pond.x, z - SITES.pond.z);
  h -= 2.4 * (1 - smoothstep(SITES.pond.r * 0.4, SITES.pond.r * 1.15, po));
  // coast falloff
  const coast = smoothstep(cr - 16, cr - 1, r);
  h = h * (1 - coast) + 0.25 * coast * (1 - smoothstep(cr - 1, cr + 3, r));
  h -= smoothstep(cr - 2, cr + 14, r) * 5.5;
  return h;
}

export function isLand(x, z, min = 0.35) { return heightAt(x, z) > min; }

export function buildTerrain(scene) {
  const size = 280, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color(PAL.grass), grassD = new THREE.Color(PAL.grassDark), leaf = new THREE.Color(0xa4dc78);
  const sand = new THREE.Color(PAL.sand), sandWet = new THREE.Color(0xe0bd82), dirt = new THREE.Color(PAL.dirt), seabed = new THREE.Color(0x9fd3c7);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const r = Math.hypot(x, z), cr = coastR(Math.atan2(z, x));
    const n = fbm(x * 0.06, z * 0.06, 3);
    c.copy(grass).lerp(grassD, Math.max(0, Math.min(1, (n - 0.35) * 2.2)));
    if (h > 3) c.lerp(leaf, Math.min(1, (h - 3) / 6));
    const pd = pathDist(x, z);
    if (pd < 2.1 && r < cr - 4) c.lerp(dirt, 1 - smoothstep(1.4, 2.1, pd));
    const beach = smoothstep(cr - 13, cr - 8, r);
    if (beach > 0) c.lerp(sand, beach);
    if (h < 0.15 && r > cr - 9) c.copy(sandWet).lerp(seabed, smoothstep(-0.5, -3, h));
    const po = Math.hypot(x - SITES.pond.x, z - SITES.pond.z);
    if (po < SITES.pond.r * 1.2) c.lerp(new THREE.Color(PAL.sand), 1 - smoothstep(SITES.pond.r * 0.9, SITES.pond.r * 1.2, po));
    // tiny speckle for a hand painted feel
    const sp = vnoise(x * 1.7, z * 1.7);
    c.multiplyScalar(0.96 + sp * 0.08);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toonMat({ soft: true }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);

  const board = buildBoard();
  scene.add(board.mesh);
  scene.add(board.grid);
  scene.add(buildBorder());

  // pond water
  const pondGeo = new THREE.CircleGeometry(SITES.pond.r * 1.05, 40);
  pondGeo.rotateX(-Math.PI / 2);
  const pond = new THREE.Mesh(pondGeo, new THREE.MeshToonMaterial({ color: 0x6fd0f2, gradientMap: gradient3, transparent: true, opacity: 0.92 }));
  pond.position.set(SITES.pond.x, -0.55, SITES.pond.z);
  pond.receiveShadow = true;
  scene.add(pond);

  return { mesh, board, pond };
}

function buildBoard() {
  const cv = document.createElement('canvas');
  const N = GRID * 2, px = 1024;
  cv.width = cv.height = px;
  const g = cv.getContext('2d');
  const cs = px / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const even = (i + j) % 2 === 0;
    g.fillStyle = even ? '#94d46d' : '#87cb62';
    g.fillRect(i * cs, j * cs, cs, cs);
    // mowing stripes inside each cell
    g.fillStyle = even ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
    for (let s = 0; s < 4; s++) if (s % 2) g.fillRect(i * cs + (s * cs) / 4, j * cs, cs / 4, cs);
  }
  // speckles
  for (let k = 0; k < 5000; k++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,230,0.18)' : 'rgba(40,90,30,0.12)';
    const x = Math.random() * px, y = Math.random() * px, r = 0.6 + Math.random() * 1.6;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // tiny clovers
  for (let k = 0; k < 160; k++) {
    const x = Math.random() * px, y = Math.random() * px;
    g.fillStyle = ['#ffffff', '#ffe08a', '#ffb3d1'][k % 3];
    for (let q = 0; q < 4; q++) { g.beginPath(); g.arc(x + Math.cos(q * 1.57) * 2.4, y + Math.sin(q * 1.57) * 2.4, 2, 0, Math.PI * 2); g.fill(); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(PAD * 2, PAD * 2);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, gradientMap: gradient3 }));
  mesh.position.y = 0.02;
  mesh.receiveShadow = true;
  mesh.name = 'board';

  // grid lines, faded in while building
  const pts = [];
  for (let i = -GRID; i <= GRID; i++) {
    pts.push(i * T, 0, -PAD, i * T, 0, PAD);
    pts.push(-PAD, 0, i * T, PAD, 0, i * T);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
  grid.position.y = 0.05;
  grid.name = 'grid';
  return { mesh, grid };
}

function buildBorder() {
  // a cobble rim and little bollards so the build board reads as a park lot
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const n = 4 * 40;
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradient3 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const colA = new THREE.Color(0xd9cfc0), colB = new THREE.Color(0xc4b8a6);
  let k = 0;
  const L = PAD * 2 + 2;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 40; i++) {
      const t = -L / 2 + (i + 0.5) * (L / 40);
      const e = PAD + 1;
      const [x, z] = side === 0 ? [t, -e] : side === 1 ? [e, t] : side === 2 ? [-t, e] : [-e, -t];
      p.set(x, 0.12, z);
      s.set(side % 2 ? 1.6 : 2.0, 0.28 + Math.random() * 0.06, side % 2 ? 2.0 : 1.6);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.12);
      inst.setMatrixAt(k, m.compose(p, q, s));
      inst.setColorAt(k, i % 2 ? colA : colB);
      k++;
    }
  }
  inst.receiveShadow = true;
  group.add(inst);
  return group;
}
