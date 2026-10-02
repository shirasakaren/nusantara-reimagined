// Placeable park decorations. Trees, benches, balloons, fountains, a mini Ferris wheel,
// a carousel and a golden Wawa statue. They live on the board and block low track.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { T, cellCenter, inGrid } from './pieces.js';
import { addInteractive, removeInteractive, squash } from '../world/interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { villageGlowMat } from '../world/village.js';

const CREAM = 0xfff0d6;

export const DECOR = {
  tree: { name: 'Oak tree', h: 6, icon: 'tree', build(b) {
    b.add(P('cyl', 0.26, 0.36, 2.4, 8), PAL.wood, M(0, 1.2, 0), 0.05);
    b.add(P('ico', 1, 1), PAL.leaf, M(0, 3.3, 0, 0, 0, 0, 1.8), 0.08);
    b.add(P('ico', 1, 1), 0x6cc354, M(0.7, 2.8, 0.3, 0, 0, 0, 1.2), 0.07);
    b.add(P('ico', 1, 1), 0x8bd96a, M(-0.6, 3.9, -0.2, 0, 0, 0, 1.1), 0.07);
  } },
  pine: { name: 'Pine', h: 6, icon: 'pine', build(b) {
    b.add(P('cyl', 0.22, 0.3, 1.6, 7), PAL.woodDark, M(0, 0.8, 0), 0.05);
    b.add(P('cone', 1.6, 2.2, 8), PAL.pine, M(0, 2.3, 0), 0.07);
    b.add(P('cone', 1.25, 2.0, 8), 0x3a8f5b, M(0, 3.4, 0), 0.07);
    b.add(P('cone', 0.85, 1.7, 8), 0x4aa36a, M(0, 4.4, 0), 0.06);
  } },
  blossom: { name: 'Blossom tree', h: 6, icon: 'blossom', build(b) {
    b.add(P('cyl', 0.24, 0.34, 2.2, 8), PAL.woodDark, M(0, 1.1, 0), 0.05);
    b.add(P('ico', 1, 1), 0xffb3d1, M(0, 3.1, 0, 0, 0, 0, 1.75), 0.08);
    b.add(P('ico', 1, 1), 0xff9ec7, M(0.7, 2.7, 0.3, 0, 0, 0, 1.15), 0.07);
    b.add(P('ico', 1, 1), 0xffd0e4, M(-0.6, 3.7, -0.2, 0, 0, 0, 1.05), 0.07);
  } },
  bush: { name: 'Round bush', h: 1.8, icon: 'bush', build(b) {
    b.add(P('ico', 1, 1), 0x6cc354, M(0, 0.7, 0, 0, 0, 0, 1.1, 0.9, 1.1), 0.06);
    b.add(P('ico', 1, 1), 0x7fd065, M(0.7, 0.55, 0.2, 0, 0, 0, 0.7), 0.05);
    b.add(P('ico', 1, 1), 0x5fae4e, M(-0.6, 0.5, -0.2, 0, 0, 0, 0.7), 0.05);
    for (let k = 0; k < 5; k++) b.add(P('sphere', 0.1, 6, 4), [PAL.pink, PAL.white, PAL.sun][k % 3], M(Math.cos(k * 1.3) * 0.9, 0.9 + (k % 2) * 0.3, Math.sin(k * 1.3) * 0.8), 0);
  } },
  flowers: { name: 'Flower bed', h: 1, icon: 'flowers', build(b) {
    b.add(P('cyl', 1.5, 1.6, 0.35, 14), PAL.wood, M(0, 0.17, 0), 0.04);
    b.add(P('cyl', 1.35, 1.35, 0.1, 14), 0x7d5232, M(0, 0.36, 0), 0);
    const cols = [PAL.pink, PAL.sun, PAL.white, PAL.lilac, PAL.coral, PAL.sky];
    for (let k = 0; k < 16; k++) {
      const a = k * 2.4, r = 0.3 + (k % 4) * 0.3;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      b.add(P('cyl', 0.03, 0.03, 0.5, 4), PAL.moss, M(x, 0.6, z), 0);
      b.add(P('ico', 0.15, 0), cols[k % cols.length], M(x, 0.88, z), 0.02);
    }
  } },
  bench: { name: 'Bench', h: 1.4, icon: 'bench', build(b) {
    for (let k = 0; k < 3; k++) b.add(P('box', 2.4, 0.1, 0.22), PAL.wood, M(0, 0.6, -0.25 + k * 0.25), 0.03);
    for (let k = 0; k < 2; k++) b.add(P('box', 2.4, 0.22, 0.08), PAL.wood, M(0, 0.95 + k * 0.28, -0.42, -0.15), 0.03);
    for (const x of [-1, 1]) { b.add(P('box', 0.12, 0.6, 0.6), INK, M(x, 0.3, -0.05), 0.02); b.add(P('box', 0.1, 0.9, 0.1), INK, M(x, 0.95, -0.45), 0.02); }
  } },
  lamp: { name: 'Lamp post', h: 4.4, icon: 'lamp', glow: true, build(b, g) {
    b.add(P('cyl', 0.1, 0.16, 3.6, 6), INK, M(0, 1.8, 0), 0.03);
    b.add(P('cyl', 0.34, 0.4, 0.22, 8), INK, M(0, 0.11, 0), 0.02);
    b.add(P('cone', 0.45, 0.45, 8), INK, M(0, 4.15, 0), 0.03);
    g.add(P('sphere', 0.32, 10, 8), 0xffe19a, M(0, 3.7, 0), 0);
  } },
  balloons: { name: 'Balloon cart', h: 4.6, icon: 'balloons', anim: 'bob', build(b) {
    b.add(P('box', 1.4, 0.8, 0.9), PAL.sky, M(0, 0.7, 0), 0.04);
    for (const x of [-0.55, 0.55]) b.add(P('cyl', 0.22, 0.22, 0.1, 10), INK, M(x, 0.25, 0.48, Math.PI / 2), 0.02);
    b.add(P('box', 0.08, 0.9, 0.08), INK, M(0.7, 1.3, 0), 0.02);
  }, parts(b) {
    const cols = [PAL.cherry, PAL.sun, PAL.mint, PAL.lilac, PAL.pink];
    for (let k = 0; k < 5; k++) {
      const a = k * 1.25, x = Math.cos(a) * 0.5, z = Math.sin(a) * 0.5, y = 3.3 + (k % 2) * 0.5;
      b.add(P('cyl', 0.01, 0.01, y - 1.1, 3), INK, M(x * 0.5, 1.1 + (y - 1.1) / 2, z * 0.5, 0, 0, -x * 0.15), 0);
      b.add(P('sphere', 0.34, 12, 10), cols[k], M(x, y, z, 0, 0, 0, 1, 1.2, 1), 0.03);
    }
  } },
  icecream: { name: 'Ice cream stand', h: 3.8, icon: 'icecream', build(b) {
    b.add(P('box', 1.8, 1.1, 1.1), 0xffe1e8, M(0, 0.55, 0), 0.04);
    b.add(P('box', 1.9, 0.12, 1.2), PAL.pink, M(0, 1.15, 0), 0.03);
    b.add(P('cyl', 0.05, 0.05, 2.5, 6), INK, M(0, 2.3, 0), 0.02);
    for (let k = 0; k < 8; k++) b.add(P('cone', 1.6, 0.6, 8, 1), k % 2 ? 0xffffff : PAL.mint, M(0, 3.3, 0, 0, k * 0.785, 0, 1, 1, 1), 0);
    b.add(P('cone', 1.6, 0.6, 16), PAL.mint, M(0, 3.3, 0), 0.04);
    b.add(P('cone', 0.25, 0.6, 8), 0xe3b07a, M(-0.5, 1.5, 0, Math.PI), 0.02);
    b.add(P('sphere', 0.24, 10, 8), PAL.pink, M(-0.5, 1.9, 0), 0.02);
    b.add(P('cone', 0.25, 0.6, 8), 0xe3b07a, M(0.5, 1.5, 0, Math.PI), 0.02);
    b.add(P('sphere', 0.24, 10, 8), 0xfff3df, M(0.5, 1.9, 0), 0.02);
  } },
  fountain: { name: 'Fountain', h: 2.6, icon: 'fountain', anim: 'fountain', build(b) {
    b.add(P('cyl', 1.6, 1.75, 0.6, 16), PAL.stone, M(0, 0.3, 0), 0.05);
    b.add(P('cyl', 1.4, 1.4, 0.1, 16), 0x6fd0f2, M(0, 0.58, 0), 0);
    b.add(P('cyl', 0.25, 0.35, 1.4, 10), PAL.stone, M(0, 1.2, 0), 0.04);
    b.add(P('cyl', 0.7, 0.4, 0.3, 12), PAL.stone, M(0, 1.9, 0), 0.04);
  }, parts(b) {
    for (let k = 0; k < 6; k++) b.add(P('sphere', 0.16, 8, 6), 0xbfeeff, M(Math.cos(k) * 0.4, 2.3, Math.sin(k) * 0.4), 0);
    b.add(P('sphere', 0.22, 8, 6), 0xdff6ff, M(0, 2.5, 0), 0);
  } },
  flag: { name: 'Flag', h: 4, icon: 'flag', anim: 'flag', build(b) {
    b.add(P('cyl', 0.07, 0.09, 3.8, 6), INK, M(0, 1.9, 0), 0.02);
    b.add(P('sphere', 0.14, 8, 6), PAL.sun, M(0, 3.85, 0), 0.02);
  }, parts(b) {
    b.add(P('box', 1.4, 0.8, 0.04), PAL.coral, M(0.72, 0, 0), 0.03);
    b.add(P('box', 0.5, 0.3, 0.05), 0xffffff, M(0.72, 0, 0), 0);
  } },
  rock: { name: 'Big rock', h: 2, icon: 'rock', build(b) {
    b.add(P('dodeca', 1, 0), PAL.stone, M(0, 0.6, 0, 0.3, 0.2, 0, 1.2, 0.9, 1.1), 0.06);
    b.add(P('dodeca', 1, 0), PAL.stoneDark, M(0.9, 0.35, 0.4, 0.5, 0, 0, 0.6), 0.04);
    b.add(P('ico', 0.3, 0), PAL.moss, M(-0.2, 1.4, 0.1), 0.02);
  } },
  ferris: { name: 'Mini Ferris wheel', h: 6.5, icon: 'ferris', anim: 'spinZ', build(b) {
    for (const z of [-0.5, 0.5]) for (const s of [-1, 1]) b.add(P('box', 0.14, 3.8, 0.14), PAL.sky, M(s * 0.8, 1.8, z, 0, 0, s * 0.35), 0.03);
    b.add(P('box', 2.4, 0.2, 1.4), PAL.woodDark, M(0, 0.1, 0), 0.03);
  }, parts(b) {
    b.add(P('torus', 2.2, 0.08, 6, 24), PAL.cherry, M(0, 0, 0.35), 0.03);
    b.add(P('torus', 2.2, 0.08, 6, 24), PAL.cherry, M(0, 0, -0.35), 0.03);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.add(P('box', 0.06, 2.2, 0.06), 0xfff3df, M(Math.sin(a) * 1.1, Math.cos(a) * 1.1, 0, 0, 0, -a), 0);
      b.add(P('box', 0.5, 0.45, 0.6), [PAL.sun, PAL.mint, PAL.pink, PAL.lilac][k % 4], M(Math.sin(a) * 2.2, Math.cos(a) * 2.2 - 0.3, 0), 0.03);
    }
    b.add(P('sphere', 0.25, 8, 6), PAL.sun, M(0, 0, 0), 0.02);
  }, partY: 3.8 },
  carousel: { name: 'Mini carousel', h: 4, icon: 'carousel', anim: 'spinY', build(b) {
    b.add(P('cyl', 1.8, 1.9, 0.35, 16), PAL.cream, M(0, 0.17, 0), 0.04);
  }, parts(b) {
    b.add(P('cyl', 0.12, 0.12, 2.8, 8), PAL.sun, M(0, 1.6, 0), 0.03);
    b.add(P('cone', 2.0, 1.1, 16), PAL.coral, M(0, 3.4, 0), 0.05);
    for (let k = 0; k < 8; k++) b.add(P('sphere', 0.14, 6, 4), k % 2 ? PAL.sun : 0xffffff, M(Math.cos(k * 0.785) * 1.9, 2.8, Math.sin(k * 0.785) * 1.9), 0.02);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      const x = Math.cos(a) * 1.25, z = Math.sin(a) * 1.25;
      b.add(P('cyl', 0.04, 0.04, 2.6, 4), 0xffffff, M(x, 1.7, z), 0);
      b.add(P('capsule', 0.2, 0.5, 4, 8), [PAL.white, PAL.pink, PAL.sky, PAL.butter][k], M(x, 1.1, z, Math.PI / 2, -a, 0), 0.03);
      b.add(P('sphere', 0.17, 8, 6), [PAL.white, PAL.pink, PAL.sky, PAL.butter][k], M(x - Math.sin(a) * 0.45, 1.35, z + Math.cos(a) * 0.45), 0.02);
    }
  } },
  statue: { name: 'Golden Wawa', h: 3.2, icon: 'statue', sparkle: true, build(b) {
    b.add(P('box', 1.5, 0.8, 1.5), PAL.stone, M(0, 0.4, 0), 0.04);
    b.add(P('sphere', 0.6, 16, 12), 0xffcf4a, M(0, 1.5, 0, 0, 0, 0, 1, 1.18, 0.95), 0.05);
    b.add(P('sphere', 0.42, 14, 8), 0xffde7a, M(0, 2.4, 0, 0, 0, 0, 1, 0.75, 1), 0.04);
    for (const x of [-0.17, 0.17]) b.add(P('sphere', 0.07, 8, 6), INK, M(x, 1.72, 0.52), 0);
    for (const x of [-0.6, 0.6]) b.add(P('capsule', 0.1, 0.26, 4, 6), 0xffcf4a, M(x, 1.85, 0, 0, 0, x > 0 ? -2.4 : 2.4), 0.03);
  } },
  popcorn: { name: 'Popcorn cart', h: 3, icon: 'popcorn', build(b) {
    b.add(P('box', 1.3, 1.0, 0.9), PAL.cherry, M(0, 0.8, 0), 0.04);
    b.add(P('box', 1.1, 0.9, 0.8), 0xfff3df, M(0, 1.75, 0), 0.03);
    for (let k = 0; k < 10; k++) b.add(P('ico', 0.12, 0), PAL.butter, M(-0.4 + (k % 5) * 0.2, 1.45 + Math.floor(k / 5) * 0.15, 0), 0);
    b.add(P('cone', 0.9, 0.6, 4), PAL.cherry, M(0, 2.5, 0, 0, Math.PI / 4), 0.03);
    for (const x of [-0.5, 0.5]) b.add(P('cyl', 0.25, 0.25, 0.1, 10), INK, M(x, 0.25, 0.48, Math.PI / 2), 0.02);
  } },
  pond: { name: 'Lily pond', h: 0.6, icon: 'pond', build(b) {
    b.add(P('cyl', 1.8, 1.9, 0.2, 18), PAL.stone, M(0, 0.1, 0), 0.04);
    b.add(P('cyl', 1.6, 1.6, 0.1, 18), 0x5cc8f0, M(0, 0.22, 0), 0);
    for (let k = 0; k < 4; k++) b.add(P('cyl', 0.28, 0.28, 0.04, 10), PAL.leaf, M(Math.cos(k * 1.6) * 0.9, 0.29, Math.sin(k * 1.6) * 0.9), 0);
    b.add(P('ico', 0.13, 0), PAL.pink, M(0.9, 0.38, 0), 0.02);
  } },
};

export const DECOR_ORDER = ['tree', 'pine', 'blossom', 'bush', 'flowers', 'bench', 'lamp', 'balloons', 'icecream', 'popcorn', 'fountain', 'flag', 'rock', 'pond', 'ferris', 'carousel', 'statue'];
const glowGeoCache = new Map();
const geoCache = new Map();

function geosFor(type) {
  if (geoCache.has(type)) return geoCache.get(type);
  const d = DECOR[type];
  const b = new GeoBuilder(); const g = new GeoBuilder(); const p = new GeoBuilder();
  d.build(b, g);
  if (d.parts) d.parts(p);
  const out = { main: b.build(), glow: g.empty ? null : g.build(), parts: p.empty ? null : p.build() };
  geoCache.set(type, out);
  return out;
}

export function makeDecorObject(type, mat) {
  const d = DECOR[type];
  const gs = geosFor(type);
  const root = new THREE.Group();
  const main = new THREE.Mesh(gs.main, mat); main.castShadow = true; main.receiveShadow = true;
  root.add(main);
  let part = null;
  if (gs.parts) {
    part = new THREE.Mesh(gs.parts, mat); part.castShadow = true;
    if (d.anim === 'spinZ') part.position.y = d.partY || 3;
    if (d.anim === 'flag') part.position.y = 3.4;
    root.add(part);
  }
  if (gs.glow) root.add(new THREE.Mesh(gs.glow, mat === undefined ? villageGlowMat : (mat.isMeshToonMaterial ? villageGlowMat : mat)));
  return { root, part };
}

export class Decor {
  constructor(scene, space) {
    this.scene = scene; this.space = space;
    this.items = [];
    this.mat = toonMat();
    this.group = new THREE.Group(); this.group.name = 'decor';
    scene.add(this.group);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    this.ghost = null; this.ghostType = null;
    this.time = 0;
    this.uid = 1;
  }

  canPlace(type, i, j) {
    if (!inGrid(i, j)) return { ok: false, reason: 'Keep decorations inside the park.' };
    const d = DECOR[type];
    const hit = this.space.conflicts(i, j, 0, d.h);
    if (hit) return { ok: false, reason: hit.kind === 'decor' ? 'Something already stands here.' : hit.kind === 'station' ? 'The station needs this spot.' : 'A track runs too low here.' };
    return { ok: true };
  }

  place(type, i, j, rot = 0, animate = true) {
    const ok = this.canPlace(type, i, j);
    if (!ok.ok) return ok;
    const { root, part } = makeDecorObject(type, this.mat);
    root.position.set(cellCenter(i), 0.02, cellCenter(j));
    root.rotation.y = rot * Math.PI / 2;
    this.group.add(root);
    const item = { id: this.uid++, type, i, j, rot, root, part, ph: Math.random() * 6 };
    this.items.push(item);
    this.space.add(i, j, 0, DECOR[type].h, { kind: 'decor', id: item.id });
    if (animate) {
      root.scale.setScalar(0.01);
      gsap.to(root.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      root.position.y = 1.5;
      gsap.to(root.position, { y: 0.02, duration: 0.5, ease: 'bounce.out' });
    }
    item.hit = addInteractive({
      obj: root, radius: Math.max(1.2, DECOR[type].h * 0.45), offset: new THREE.Vector3(0, DECOR[type].h * 0.45, 0), name: DECOR[type].name, hint: 'Part of your park.',
      onClick: () => { squash(root, 0.5); audio.play('pop'); if (DECOR[type].sparkle) bus.emit('fx:burst', { pos: root.position.clone().add(new THREE.Vector3(0, 2.6, 0)), kind: 'sparkle', n: 20 }); },
      decorItem: item,
    });
    return { ok: true, item };
  }

  remove(item, animate = true) {
    const i = this.items.indexOf(item);
    if (i < 0) return;
    this.items.splice(i, 1);
    this.space.removeOwner((o) => o.kind === 'decor' && o.id === item.id);
    removeInteractive(item.hit);
    if (!animate) { this.group.remove(item.root); return; }
    gsap.to(item.root.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'back.in(2)', onComplete: () => this.group.remove(item.root) });
  }

  clear() { for (const it of [...this.items]) this.remove(it, false); }

  at(i, j) { return this.items.find((it) => it.i === i && it.j === j); }

  setGhost(type, i, j, rot, ok) {
    if (!type) { if (this.ghost) this.ghost.visible = false; return; }
    if (this.ghostType !== type) {
      if (this.ghost) this.group.remove(this.ghost);
      const { root } = makeDecorObject(type, this.ghostMat);
      root.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; } });
      this.ghost = root; this.ghostType = type;
      this.group.add(root);
    }
    this.ghost.visible = true;
    this.ghost.position.set(cellCenter(i), 0.05 + Math.sin(this.time * 6) * 0.08, cellCenter(j));
    this.ghost.rotation.y = rot * Math.PI / 2;
    this.ghostMat.color.set(ok ? 0xbff7e6 : 0xff5d73);
  }

  serialize() { return this.items.map((it) => [DECOR_ORDER.indexOf(it.type), it.i, it.j, it.rot]); }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const [t, i, j, r] of list) { const type = DECOR_ORDER[t]; if (type) this.place(type, i, j, r || 0, false); }
  }

  update(dt, wind) {
    this.time += dt;
    for (const it of this.items) {
      const d = DECOR[it.type];
      if (!it.part) continue;
      if (d.anim === 'spinZ') it.part.rotation.z += dt * 0.6;
      else if (d.anim === 'spinY') { it.part.rotation.y += dt * 0.9; it.part.position.y = Math.sin(this.time * 3) * 0.05; }
      else if (d.anim === 'bob') { it.part.position.y = Math.sin(this.time * 1.6 + it.ph) * 0.15; it.part.rotation.z = Math.sin(this.time * 1.1 + it.ph) * 0.05 * wind; }
      else if (d.anim === 'flag') { it.part.rotation.y = Math.sin(this.time * 4 + it.ph) * 0.25 * wind; it.part.scale.x = 1 + Math.sin(this.time * 6 + it.ph) * 0.05; }
      else if (d.anim === 'fountain') { it.part.position.y = Math.abs(Math.sin(this.time * 4 + it.ph)) * 0.25; it.part.scale.setScalar(1 + Math.sin(this.time * 8) * 0.08); }
    }
  }
}
