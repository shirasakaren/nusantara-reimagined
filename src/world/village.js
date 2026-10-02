// Waaw Village: candy colored cottages, a windmill on the hill, a striped lighthouse,
// a red barn with a silo, a little dock, lamp posts and bunting along the paths.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { heightAt, SITES, PATHS, coastR } from './terrain.js';
import { addInteractive, squash, wobble } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { mulberry32 } from './noise.js';

export const villageGlowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

function prism(w, h, d) {
  // triangular roof prism, ridge along Z
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  g.deleteAttribute('uv');
  return g;
}
const roofCache = new Map();
function roof(w, h, d) { const k = `${w},${h},${d}`; if (!roofCache.has(k)) roofCache.set(k, prism(w, h, d)); return roofCache.get(k); }

const WALLS = [0xfff3df, 0xffe1e8, 0xe3f4ff, 0xfff1c2, 0xe6ffe9, 0xf1e6ff];
const ROOFS = [0xe25b45, 0x7a4fb5, 0x2a6fb0, 0xff9f43, 0x2f7d4f, 0xe84a5f];
const NAMES = ['The Pemberton cottage', 'Baker Nori\'s house', 'Grandpa Ellis lives here', 'The twins\' house', 'Miss Odette\'s place', 'The quiet painter\'s home', 'Postmaster Juno', 'The Fig family', 'Old captain Brill', 'The noisy house'];
const GREETINGS = ['Hello, builder!', 'Is that a coaster I hear?', 'Mind the flowerbeds, dear.', 'We can see the loop from here!', 'Come by for tea later.', 'Make it taller!', 'My kids will not stop talking about it.', 'The valley feels brighter today.'];

export class Village {
  constructor(scene) {
    this.scene = scene;
    this.glow = new GeoBuilder();
    this.chimneys = [];
    this.time = 0;
    const rnd = mulberry32(9);
    this.rnd = rnd;
    this._houses(scene, rnd);
    this._windmill(scene);
    this._lighthouse(scene);
    this._farm(scene, rnd);
    this._dock(scene);
    this._lamps(scene, rnd);
    this._well(scene);
    const g = this.glow.build();
    this.glowMesh = new THREE.Mesh(g, villageGlowMat);
    scene.add(this.glowMesh);
  }

  _house(x, z, rot, i) {
    const b = new GeoBuilder();
    const w = 4.2 + (i % 3) * 0.6, d = 4.4, h = 3.2 + (i % 2) * 1.0;
    const wall = WALLS[i % WALLS.length], rf = ROOFS[i % ROOFS.length];
    b.add(P('box', w, h, d), wall, M(0, h / 2, 0), 0.07);
    b.add(P('box', w + 0.3, 0.35, d + 0.3), 0xd9cfc0, M(0, 0.17, 0), 0.05);
    b.add(roof(w + 0.9, 2.2, d + 0.9), rf, M(0, h, 0), 0.08);
    // chimney
    const cx = w * 0.25;
    b.add(P('box', 0.7, 1.8, 0.7), 0xc96a50, M(cx, h + 1.4, d * 0.15), 0.05);
    b.add(P('box', 0.85, 0.2, 0.85), 0x8f4a38, M(cx, h + 2.3, d * 0.15), 0.04);
    // door
    b.add(P('box', 1.0, 1.8, 0.12), PAL.woodDark, M(0, 0.9 + 0.35, d / 2 + 0.02), 0.04);
    b.add(P('sphere', 0.08, 6, 4), PAL.sun, M(0.32, 1.2, d / 2 + 0.12), 0);
    b.add(P('box', 1.4, 0.15, 0.7), 0xd9cfc0, M(0, 0.42, d / 2 + 0.4), 0.03);
    // windows: frames on the house, panes in the glow mesh
    const wins = [[-w * 0.3, h * 0.55], [w * 0.3, h * 0.55]];
    const mat = new THREE.Matrix4().makeRotationY(rot);
    mat.setPosition(x, heightAt(x, z), z);
    for (const [wx, wy] of wins) {
      b.add(P('box', 1.0, 1.0, 0.1), 0xffffff, M(wx, wy, d / 2 + 0.02), 0.04);
      b.add(P('box', 1.1, 0.14, 0.4), PAL.wood, M(wx, wy - 0.6, d / 2 + 0.2), 0.03);
      // flower box blooms
      for (let k = 0; k < 4; k++) b.add(P('sphere', 0.1, 6, 4), [PAL.pink, PAL.sun, PAL.coral, PAL.white][k], M(wx - 0.36 + k * 0.24, wy - 0.45, d / 2 + 0.25), 0);
      const pane = new THREE.Matrix4().multiplyMatrices(mat, M(wx, wy, d / 2 + 0.09));
      this.glow.add(P('box', 0.8, 0.8, 0.04), 0xffd27a, pane, 0);
      // side windows
    }
    const side = new THREE.Matrix4().multiplyMatrices(mat, M(w / 2 + 0.04, h * 0.55, 0, 0, Math.PI / 2));
    b.add(P('box', 1.0, 1.0, 0.1), 0xffffff, M(w / 2 + 0.02, h * 0.55, 0, 0, Math.PI / 2), 0.04);
    this.glow.add(P('box', 0.8, 0.8, 0.04), 0xffc864, side, 0);
    const mesh = new THREE.Mesh(b.build(), toonMat());
    mesh.position.set(x, heightAt(x, z), z);
    mesh.rotation.y = rot;
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    const chimneyTop = new THREE.Vector3(cx, h + 2.5, d * 0.15).applyMatrix4(mat);
    this.chimneys.push({ pos: chimneyTop, t: Math.random() * 2 });
    addInteractive({
      obj: mesh, radius: 3.6, offset: new THREE.Vector3(0, 2.2, 0),
      name: NAMES[i % NAMES.length], hint: 'Knock knock.',
      onClick: () => {
        squash(mesh, 0.5);
        audio.play('clunk');
        setTimeout(() => audio.play('pop'), 140);
        bus.emit('fx:burst', { pos: chimneyTop.clone(), kind: 'smoke', n: 12 });
        bus.emit('fx:say', { pos: mesh.position.clone().add(new THREE.Vector3(0, 6, 0)), text: GREETINGS[Math.floor(Math.random() * GREETINGS.length)] });
      },
    });
  }

  _houses(scene, rnd) {
    const S = SITES.village;
    const spots = [[-12, -10, 0.3], [0, -14, 0], [12, -11, -0.3], [-15, 4, 1.4], [16, 3, -1.5], [-8, 15, 2.9], [8, 16, 3.3], [22, -2, -1.2], [-22, -6, 1.2], [3, 26, 3.1]];
    spots.forEach(([dx, dz, r], i) => this._house(S.x + dx, S.z + dz, r, i));
    // market stalls in the square
    const stall = (x, z, rot, col) => {
      const b = new GeoBuilder();
      b.add(P('box', 2.6, 1.0, 1.4), PAL.wood, M(0, 0.5, 0), 0.05);
      for (const sx of [-1.2, 1.2]) for (const sz of [-0.6, 0.6]) b.add(P('cyl', 0.07, 0.07, 2.4, 6), PAL.woodDark, M(sx, 1.2, sz), 0.03);
      for (let k = 0; k < 6; k++) b.add(P('box', 0.5, 0.12, 1.9), k % 2 ? col : 0xffffff, M(-1.25 + k * 0.5, 2.5, 0, 0.25), 0.03);
      const goods = [PAL.cherry, PAL.sun, PAL.leaf, PAL.tangerine, PAL.pink];
      for (let k = 0; k < 8; k++) b.add(P('sphere', 0.17, 8, 6), goods[k % 5], M(-0.9 + (k % 4) * 0.6, 1.15, -0.3 + Math.floor(k / 4) * 0.5), 0.02);
      const mesh = new THREE.Mesh(b.build(), toonMat());
      mesh.position.set(x, heightAt(x, z), z); mesh.rotation.y = rot;
      mesh.castShadow = true; scene.add(mesh);
      addInteractive({ obj: mesh, radius: 2, offset: new THREE.Vector3(0, 1.2, 0), name: 'Fruit stall', hint: 'Fresh from the farm.', onClick: () => { squash(mesh); audio.play('pop'); bus.emit('fx:burst', { pos: mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), kind: 'confetti', n: 12 }); } });
    };
    stall(S.x - 3, S.z + 2, 0.2, PAL.coral);
    stall(S.x + 4, S.z + 4, -0.4, PAL.mint);
  }

  _windmill(scene) {
    const { x, z } = SITES.windmill;
    const y = heightAt(x, z);
    const b = new GeoBuilder();
    b.add(P('cyl', 2.2, 3.2, 8, 8), 0xfff3df, M(0, 4, 0), 0.08);
    b.add(P('cyl', 3.4, 3.6, 0.6, 8), 0xd9cfc0, M(0, 0.3, 0), 0.05);
    b.add(P('cone', 2.8, 3, 8), PAL.roof, M(0, 9.5, 0), 0.08);
    b.add(P('box', 1.3, 2.2, 0.3), PAL.woodDark, M(0, 1.2, 3.0, -0.12), 0.04);
    for (const hy of [3.5, 6]) {
      b.add(P('box', 0.9, 0.9, 0.2), 0xffffff, M(0, hy, 2.75 - (hy - 3.5) * 0.17, -0.12), 0.04);
    }
    b.add(P('cyl', 0.35, 0.35, 1.4, 8), INK, M(0, 8, 2.4, Math.PI / 2), 0.03);
    const mill = new THREE.Mesh(b.build(), toonMat());
    mill.position.set(x, y, z);
    mill.rotation.y = -1.2;
    mill.castShadow = true; mill.receiveShadow = true;
    scene.add(mill);
    const blades = new GeoBuilder();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      blades.add(P('box', 0.3, 6.5, 0.15), PAL.wood, M(Math.sin(a) * 3.2, Math.cos(a) * 3.2, 0, 0, 0, -a), 0.04);
      blades.add(P('box', 1.6, 5.2, 0.06), k % 2 ? 0xfff3df : PAL.coral, M(Math.sin(a) * 3.5 + Math.cos(a) * 0.85, Math.cos(a) * 3.5 - Math.sin(a) * 0.85, 0.06, 0, 0, -a), 0.03);
    }
    blades.add(P('sphere', 0.6, 10, 8), PAL.sun, M(0, 0, 0.2), 0.04);
    const bl = new THREE.Mesh(blades.build(), toonMat());
    bl.position.set(0, 8, 3.2);
    bl.castShadow = true;
    mill.add(bl);
    this.mill = { mill, blades: bl, speed: 0.6, boost: 0 };
    addInteractive({
      obj: mill, radius: 6, offset: new THREE.Vector3(0, 6, 0), name: 'The old windmill', hint: 'Give the sails a push.',
      onClick: () => { this.mill.boost = 7; audio.play('creak'); audio.play('wind'); wobble(mill, 0.04); bus.emit('stat:windmill'); },
    });
  }

  _lighthouse(scene) {
    const { x, z } = SITES.lighthouse;
    const y = heightAt(x, z);
    const b = new GeoBuilder();
    const seg = 6;
    for (let k = 0; k < seg; k++) {
      const r0 = 2.4 - k * 0.22, r1 = 2.4 - (k + 1) * 0.22;
      b.add(P('cyl', r1, r0, 2.2, 14), k % 2 ? 0xffffff : PAL.cherry, M(0, 1.1 + k * 2.2, 0), 0.07);
    }
    const top = seg * 2.2;
    b.add(P('cyl', 1.9, 1.9, 0.3, 14), INK, M(0, top + 0.15, 0), 0.03);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; b.add(P('cyl', 0.05, 0.05, 0.9, 4), INK, M(Math.cos(a) * 1.8, top + 0.75, Math.sin(a) * 1.8), 0); }
    b.add(P('torus', 1.8, 0.05, 4, 20), INK, M(0, top + 1.2, 0, Math.PI / 2), 0);
    b.add(P('cone', 1.5, 1.6, 14), PAL.cherry, M(0, top + 2.9, 0), 0.06);
    b.add(P('sphere', 0.25, 8, 6), PAL.sun, M(0, top + 3.8, 0), 0.03);
    b.add(P('box', 1.0, 1.8, 0.3), PAL.woodDark, M(0, 0.9, 2.3), 0.04);
    const tower = new THREE.Mesh(b.build(), toonMat());
    tower.position.set(x, y, z);
    tower.castShadow = true; tower.receiveShadow = true;
    scene.add(tower);
    // lamp room
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b0, toneMapped: false }));
    lamp.position.set(0, top + 1.1, 0);
    tower.add(lamp);
    // rotating beam
    const beamGeo = new THREE.ConeGeometry(4.5, 60, 20, 1, true);
    beamGeo.translate(0, -30, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beam = new THREE.Group();
    const b1 = new THREE.Mesh(beamGeo, beamMat); const b2 = new THREE.Mesh(beamGeo, beamMat); b2.rotation.y = Math.PI;
    beam.add(b1, b2);
    beam.position.set(0, top + 1.1, 0);
    tower.add(beam);
    this.light = { tower, beam, beamMat, lamp, flash: 0 };
    addInteractive({
      obj: tower, radius: 4, offset: new THREE.Vector3(0, 7, 0), name: 'Lighthouse', hint: 'It keeps the boats and the gulls safe.',
      onClick: () => { this.light.flash = 1.6; audio.play('honk'); squash(tower, 0.25); },
    });
  }

  _farm(scene, rnd) {
    const S = SITES.farm;
    // barn
    const b = new GeoBuilder();
    b.add(P('box', 9, 5.5, 7), PAL.cherry, M(0, 2.75, 0), 0.08);
    b.add(roof(10.2, 3.6, 8), 0x7a4a3a, M(0, 5.5, 0, 0, Math.PI / 2), 0.08);
    b.add(P('box', 3.6, 4, 0.2), 0xffffff, M(0, 2, 3.55), 0.04);
    b.add(P('box', 3.2, 3.6, 0.22), PAL.cherry, M(0, 2, 3.6), 0);
    b.add(P('box', 0.25, 4.6, 0.25), 0xffffff, M(0, 2, 3.75, 0, 0, 0.73), 0);
    b.add(P('box', 0.25, 4.6, 0.25), 0xffffff, M(0, 2, 3.75, 0, 0, -0.73), 0);
    b.add(P('box', 1.4, 1.4, 0.2), 0xffffff, M(0, 6.2, 3.6), 0.03);
    b.add(P('box', 1.1, 1.1, 0.22), 0x3a2f52, M(0, 6.2, 3.62), 0);
    // silo
    b.add(P('cyl', 2, 2, 9, 14), 0xd9cfc0, M(6.6, 4.5, -1), 0.07);
    b.add(P('sphere', 2, 14, 8), 0x8fb0c7, M(6.6, 9, -1, 0, 0, 0, 1, 0.75, 1), 0.06);
    for (let k = 1; k < 4; k++) b.add(P('torus', 2.02, 0.07, 4, 20), 0xa59a88, M(6.6, k * 2.3, -1, Math.PI / 2), 0);
    const barn = new THREE.Mesh(b.build(), toonMat());
    barn.position.set(S.x - 10, heightAt(S.x - 10, S.z - 10), S.z - 10);
    barn.rotation.y = 0.5;
    barn.castShadow = true; barn.receiveShadow = true;
    scene.add(barn);
    addInteractive({ obj: barn, radius: 6, offset: new THREE.Vector3(0, 4, 0), name: 'Red barn', hint: 'Home of hay and gossip.', onClick: () => { squash(barn, 0.3); audio.play('moo'); } });
    // haystacks
    for (let k = 0; k < 5; k++) {
      const hb = new GeoBuilder();
      hb.add(P('cyl', 1.1, 1.1, 1.6, 12), 0xf2c94c, M(0, 0.8, 0, 0, 0, Math.PI / 2), 0.05);
      for (const s of [-0.5, 0.5]) hb.add(P('torus', 1.12, 0.05, 4, 16), 0xc49a2c, M(s, 0.8, 0, 0, Math.PI / 2), 0);
      const hay = new THREE.Mesh(hb.build(), toonMat());
      const hx = S.x + 10 + (k % 3) * 2.6, hz = S.z - 14 + Math.floor(k / 3) * 2.8;
      hay.position.set(hx, heightAt(hx, hz), hz); hay.rotation.y = rnd() * 3;
      hay.castShadow = true; scene.add(hay);
      addInteractive({ obj: hay, radius: 1.4, offset: new THREE.Vector3(0, 0.8, 0), name: 'Hay bale', hint: 'A cow snack.', onClick: () => { squash(hay); bus.emit('fx:burst', { pos: hay.position.clone().add(new THREE.Vector3(0, 1.5, 0)), kind: 'hay', n: 16 }); audio.play('whoosh', { dur: 0.3 }); } });
    }
    // fence ring around the pasture
    const fb = new GeoBuilder();
    const R = S.r - 4;
    const posts = 40;
    for (let k = 0; k < posts; k++) {
      const a = (k / posts) * Math.PI * 2;
      if (k === 10 || k === 11) continue; // gate gap facing the path
      const px = S.x + 4 + Math.cos(a) * R, pz = S.z + 4 + Math.sin(a) * R;
      const py = heightAt(px, pz);
      fb.add(P('box', 0.25, 1.4, 0.25), 0xfff3df, M(px, py + 0.6, pz), 0.03);
      const a2 = ((k + 1) / posts) * Math.PI * 2;
      const qx = S.x + 4 + Math.cos(a2) * R, qz = S.z + 4 + Math.sin(a2) * R;
      if (k === 9) continue;
      const mx = (px + qx) / 2, mz = (pz + qz) / 2, len = Math.hypot(qx - px, qz - pz);
      const yaw = Math.atan2(qx - px, qz - pz);
      const my = (py + heightAt(qx, qz)) / 2;
      fb.add(P('box', 0.12, 0.16, len), 0xfff3df, M(mx, my + 0.95, mz, 0, yaw), 0.02);
      fb.add(P('box', 0.12, 0.16, len), 0xfff3df, M(mx, my + 0.5, mz, 0, yaw), 0.02);
    }
    const fence = new THREE.Mesh(fb.build(), toonMat());
    fence.castShadow = true; fence.receiveShadow = true;
    scene.add(fence);
    this.pasture = { x: S.x + 4, z: S.z + 4, r: R - 2 };
    // trough
    const tb = new GeoBuilder();
    tb.add(P('box', 3, 0.7, 1), PAL.wood, M(0, 0.35, 0), 0.04);
    tb.add(P('box', 2.7, 0.1, 0.75), 0x6fd0f2, M(0, 0.65, 0), 0);
    const trough = new THREE.Mesh(tb.build(), toonMat());
    trough.position.set(S.x + 6, heightAt(S.x + 6, S.z + 8), S.z + 8);
    scene.add(trough);
  }

  _dock(scene) {
    const { x, z } = SITES.dock;
    const b = new GeoBuilder();
    const len = 22;
    for (let k = 0; k < len; k++) {
      b.add(P('box', 1.0, 0.18, 3.4), k % 2 ? PAL.wood : 0xc08a58, M(k * 1.05, 0.6, 0), 0.03);
      if (k % 4 === 0) for (const s of [-1.6, 1.6]) b.add(P('cyl', 0.2, 0.2, 3.4, 8), PAL.woodDark, M(k * 1.05, -0.9, s), 0.03);
    }
    b.add(P('cyl', 0.25, 0.25, 1.2, 8), PAL.woodDark, M(len * 1.05 - 0.6, 1.2, 1.4), 0.03);
    const dock = new THREE.Mesh(b.build(), toonMat());
    dock.position.set(x - 4, 0, z);
    dock.castShadow = true; dock.receiveShadow = true;
    scene.add(dock);
    // rowboat
    const rb = new GeoBuilder();
    rb.add(P('sphere', 1, 14, 8), PAL.sky, M(0, 0, 0, 0, 0, 0, 1.1, 0.5, 2.4), 0.06);
    rb.add(P('box', 1.8, 0.2, 0.4), PAL.wood, M(0, 0.3, 0.4), 0.03);
    rb.add(P('box', 0.1, 0.1, 2.6), PAL.wood, M(0.7, 0.4, 0, 0, 0, 0.3), 0.02);
    const boat = new THREE.Mesh(rb.build(), toonMat());
    boat.position.set(x + 14, -0.3, z + 3.6);
    boat.rotation.y = 0.1;
    scene.add(boat);
    this.rowboat = boat;
    addInteractive({ obj: boat, radius: 2.5, name: 'Rowboat', hint: 'Tied up and dreaming of the sea.', onClick: () => { squash(boat); audio.play('splash'); bus.emit('fx:burst', { pos: boat.position.clone().add(new THREE.Vector3(0, 0.5, 0)), kind: 'splash', n: 22 }); } });
  }

  _lamps(scene, rnd) {
    const b = new GeoBuilder();
    this.lampSpots = [];
    for (const path of PATHS) {
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, az] = path[i], [bx, bz] = path[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const n = Math.floor(len / 13);
        for (let k = 0; k <= n; k++) {
          const t = n ? k / n : 0.5;
          const nx = -(bz - az) / len, nz = (bx - ax) / len;
          const x = ax + (bx - ax) * t + nx * 2.4, z = az + (bz - az) * t + nz * 2.4;
          if (Math.abs(x) < 46 && Math.abs(z) < 46) continue;
          if (Math.hypot(x, z) > coastR(Math.atan2(z, x)) - 10) continue;
          if (this.lampSpots.some((p) => Math.hypot(p.x - x, p.z - z) < 8)) continue;
          if (Math.hypot(x - SITES.farm.x - 4, z - SITES.farm.z - 4) < SITES.farm.r) continue;
          const y = heightAt(x, z);
          b.add(P('cyl', 0.1, 0.16, 3.4, 6), INK, M(x, y + 1.7, z), 0.03);
          b.add(P('cyl', 0.3, 0.36, 0.2, 8), INK, M(x, y + 0.1, z), 0.02);
          b.add(P('cone', 0.42, 0.4, 8), INK, M(x, y + 3.95, z), 0.03);
          this.glow.add(P('sphere', 0.3, 10, 8), 0xffe19a, M(x, y + 3.55, z), 0);
          this.lampSpots.push({ x, y: y + 3.55, z });
        }
      }
    }
    const mesh = new THREE.Mesh(b.build(), toonMat());
    mesh.castShadow = true;
    scene.add(mesh);
    // bunting across the station plaza
    const bb = new GeoBuilder();
    const cols = [PAL.coral, PAL.sun, PAL.mint, PAL.sky, PAL.lilac, PAL.pink];
    const strings = [[[-20, 48], [16, 48]], [[-20, 52], [16, 52]]];
    for (const [[ax, az], [bx, bz]] of strings) {
      const n = 22;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const sag = Math.sin(t * Math.PI) * 1.2;
        const flag = new THREE.ConeGeometry(0.35, 0.7, 3);
        flag.deleteAttribute('uv');
        bb.add(flag, cols[k % cols.length], M(x, 5.4 - sag, z, Math.PI, 0, 0, 1, 1, 0.25), 0.02);
      }
      for (const [px, pz] of [[ax, az], [bx, bz]]) bb.add(P('cyl', 0.12, 0.14, 6, 6), PAL.wood, M(px, 3, pz), 0.03);
    }
    const bunting = new THREE.Mesh(bb.build(), toonMat());
    scene.add(bunting);
  }

  _well(scene) {
    const S = SITES.village;
    const b = new GeoBuilder();
    b.add(P('cyl', 1.3, 1.4, 1.1, 12), PAL.stone, M(0, 0.55, 0), 0.06);
    b.add(P('cyl', 1.05, 1.05, 0.1, 12), 0x3fa7d6, M(0, 0.95, 0), 0);
    for (const s of [-1.1, 1.1]) b.add(P('box', 0.2, 2.6, 0.2), PAL.wood, M(s, 1.8, 0), 0.03);
    b.add(roof(3, 1.2, 1.8), PAL.roof, M(0, 3.1, 0, 0, Math.PI / 2), 0.05);
    b.add(P('cyl', 0.1, 0.1, 2.2, 6), PAL.woodDark, M(0, 2.6, 0, 0, 0, Math.PI / 2), 0.02);
    b.add(P('cyl', 0.25, 0.2, 0.35, 8), PAL.wood, M(0, 1.8, 0), 0.03);
    const well = new THREE.Mesh(b.build(), toonMat());
    well.position.set(S.x + 2, heightAt(S.x + 2, S.z - 3), S.z - 3);
    well.castShadow = true;
    scene.add(well);
    addInteractive({
      obj: well, radius: 2, offset: new THREE.Vector3(0, 1.5, 0), name: 'Wishing well', hint: 'Toss a wish in.',
      onClick: () => {
        audio.play('plop'); setTimeout(() => audio.play('sparkle'), 450);
        bus.emit('fx:burst', { pos: well.position.clone().add(new THREE.Vector3(0, 1.5, 0)), kind: 'sparkle', n: 30 });
        bus.emit('fx:say', { pos: well.position.clone().add(new THREE.Vector3(0, 4, 0)), text: ['Wish granted. Probably.', 'A wish for a taller loop.', 'Plink.'][Math.floor(Math.random() * 3)] });
        bus.emit('stat:wish');
      },
    });
  }

  update(dt, night, wind) {
    this.time += dt;
    const m = this.mill;
    m.boost = Math.max(0, m.boost - dt * 1.6);
    m.blades.rotation.z -= (m.speed * wind + m.boost) * dt;
    // lighthouse
    const L = this.light;
    L.beam.rotation.y += dt * 0.8;
    L.flash = Math.max(0, L.flash - dt);
    L.beamMat.opacity = Math.min(0.5, night * 0.32 + L.flash * 0.25);
    L.lamp.material.color.setRGB(1, 0.95, 0.7).multiplyScalar(0.7 + night * 0.5 + L.flash * 0.3);
    // windows and lamps
    const g = 0.25 + night * 1.0;
    villageGlowMat.color.setRGB(g, g, g * 0.95);
    // chimney smoke
    for (const c of this.chimneys) {
      c.t -= dt;
      if (c.t <= 0) { c.t = 0.5 + Math.random() * 0.6; bus.emit('fx:smoke', c.pos); }
    }
    if (this.rowboat) {
      this.rowboat.position.y = -0.3 + Math.sin(this.time * 1.4) * 0.12;
      this.rowboat.rotation.z = Math.sin(this.time * 1.1) * 0.05;
    }
  }
}
