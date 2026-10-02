// Trees, grass, flowers, rocks and mushrooms. Everything is instanced and sways in the
// wind. Trees shake when clicked and sometimes drop an apple.
import * as THREE from 'three';
import { GeoBuilder, P, M, toonMat, addSway } from '../core/toon.js';
import { PAL } from '../core/palette.js';
import { heightAt, pathDist, SITES, PAD, coastR } from './terrain.js';
import { mulberry32 } from './noise.js';
import { addInteractive } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import gsap from 'gsap';

function treeGeo(type) {
  const b = new GeoBuilder();
  switch (type) {
    case 'round':
      b.add(P('cyl', 0.28, 0.4, 2.6, 8), PAL.wood, M(0, 1.3, 0), 0.06);
      b.add(P('ico', 1, 1), PAL.leaf, M(0, 3.6, 0, 0, 0, 0, 2.2), 0.09);
      b.add(P('ico', 1, 1), 0x6cc354, M(0.9, 3.0, 0.4, 0, 0, 0, 1.5), 0.08);
      b.add(P('ico', 1, 1), 0x8bd96a, M(-0.8, 4.3, -0.3, 0, 0, 0, 1.4), 0.08);
      break;
    case 'blossom':
      b.add(P('cyl', 0.26, 0.38, 2.4, 8), PAL.woodDark, M(0, 1.2, 0), 0.06);
      b.add(P('ico', 1, 1), 0xffb3d1, M(0, 3.4, 0, 0, 0, 0, 2.1), 0.09);
      b.add(P('ico', 1, 1), 0xff9ec7, M(0.9, 2.9, 0.4, 0, 0, 0, 1.4), 0.08);
      b.add(P('ico', 1, 1), 0xffd0e4, M(-0.8, 4.1, -0.2, 0, 0, 0, 1.3), 0.08);
      break;
    case 'fruit':
      b.add(P('cyl', 0.28, 0.4, 2.4, 8), PAL.wood, M(0, 1.2, 0), 0.06);
      b.add(P('ico', 1, 1), 0x5fbf4f, M(0, 3.4, 0, 0, 0, 0, 2.3), 0.09);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4, y = 2.8 + (i % 3) * 0.6;
        b.add(P('sphere', 0.22, 8, 6), PAL.cherry, M(Math.cos(a) * 1.9, y, Math.sin(a) * 1.9), 0.03);
      }
      break;
    case 'pine':
      b.add(P('cyl', 0.24, 0.34, 1.8, 7), PAL.woodDark, M(0, 0.9, 0), 0.05);
      b.add(P('cone', 2.0, 2.6, 8), PAL.pine, M(0, 2.6, 0), 0.08);
      b.add(P('cone', 1.6, 2.3, 8), 0x3a8f5b, M(0, 3.9, 0), 0.08);
      b.add(P('cone', 1.1, 2.0, 8), 0x4aa36a, M(0, 5.1, 0), 0.07);
      break;
    case 'palm': {
      let x = 0, y = 0;
      for (let i = 0; i < 6; i++) {
        b.add(P('cyl', 0.24 - i * 0.015, 0.28 - i * 0.015, 0.95, 7), i % 2 ? PAL.wood : 0xc58b56, M(x, y + 0.45, 0, 0, 0, -0.08 * i), 0.05);
        x += 0.08 * i; y += 0.9;
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        b.add(P('box', 0.5, 0.08, 2.4), 0x4fb35a, M(x + Math.cos(a) * 1.0, y + 0.1, Math.sin(a) * 1.0, 0.45, -a + Math.PI / 2, 0), 0.04);
      }
      b.add(P('sphere', 0.25, 8, 6), 0x7d5232, M(x + 0.2, y - 0.2, 0.1), 0.03);
      b.add(P('sphere', 0.25, 8, 6), 0x7d5232, M(x - 0.15, y - 0.25, -0.15), 0.03);
      break;
    }
    case 'bush':
      b.add(P('ico', 1, 1), 0x6cc354, M(0, 0.7, 0, 0, 0, 0, 1.2, 1.0, 1.2), 0.07);
      b.add(P('ico', 1, 1), 0x7fd065, M(0.8, 0.55, 0.2, 0, 0, 0, 0.8), 0.06);
      b.add(P('ico', 1, 1), 0x5fae4e, M(-0.7, 0.5, -0.2, 0, 0, 0, 0.8), 0.06);
      break;
    default: break;
  }
  const g = b.build();
  return g;
}

export class Nature {
  constructor(scene, tier) {
    this.scene = scene;
    this.trees = [];
    this.shakes = [];
    this.apples = [];
    this.time = 0;
    const rnd = mulberry32(2024);
    this.rnd = rnd;
    const swayMat = addSway(toonMat().clone(), 0.22);
    swayMat.customProgramCacheKey = () => 'tree-sway';
    this.treeMat = swayMat;
    this._placeTrees(scene, rnd, tier);
    this._grass(scene, rnd, tier);
    this._flowers(scene, rnd, tier);
    this._rocks(scene, rnd);
    this._mushrooms(scene, rnd);
  }

  _ok(x, z, margin = 3) {
    const r = Math.hypot(x, z);
    if (r > coastR(Math.atan2(z, x)) - 11) return false;
    if (Math.abs(x) < PAD + 5 && Math.abs(z) < PAD + 5) return false;
    if (pathDist(x, z) < margin) return false;
    const near = (s, rr) => Math.hypot(x - s.x, z - s.z) < rr;
    if (near(SITES.village, SITES.village.r - 2)) return false;
    if (near(SITES.farm, SITES.farm.r)) return false;
    if (near(SITES.pond, SITES.pond.r + 3)) return false;
    if (near(SITES.windmill, 9) || near(SITES.lighthouse, 9) || near(SITES.dock, 10)) return false;
    // the queue and station area south of the board
    if (x > -20 && x < 16 && z > 40 && z < 52) return false;
    return heightAt(x, z) > 0.4;
  }

  _placeTrees(scene, rnd, tier) {
    const want = { round: 70, blossom: 26, fruit: 22, pine: 110, palm: 18, bush: 70 };
    const spots = { round: [], blossom: [], fruit: [], pine: [], palm: [], bush: [] };
    const taken = [];
    const free = (x, z, d) => taken.every((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 > d * d);
    let guard = 0;
    for (const type of Object.keys(want)) {
      const n = Math.round(want[type] * tier.trees);
      let placed = 0;
      while (placed < n && guard++ < 40000) {
        let x, z;
        if (type === 'pine' && rnd() < 0.6) {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * SITES.forest.r;
          x = SITES.forest.x + Math.cos(a) * r * 1.6; z = SITES.forest.z + Math.sin(a) * r * 0.7;
        } else if (type === 'palm') {
          const a = rnd() * Math.PI * 2; const cr = coastR(a);
          const r = cr - 12.5 - rnd() * 2;
          x = Math.cos(a) * r; z = Math.sin(a) * r;
          if (heightAt(x, z) < 0.3 || !free(x, z, 3)) continue;
          spots[type].push([x, z]); taken.push([x, z]); placed++;
          continue;
        } else {
          const a = rnd() * Math.PI * 2, r = 48 + rnd() * 52;
          x = Math.cos(a) * r; z = Math.sin(a) * r;
        }
        if (!this._ok(x, z, type === 'bush' ? 2.2 : 3.2) || !free(x, z, type === 'bush' ? 2 : 3.2)) continue;
        spots[type].push([x, z]); taken.push([x, z]); placed++;
      }
    }
    // a hedge of bushes and blossoms framing the station plaza
    const extra = [[-22, 47, 'blossom'], [18, 47, 'blossom'], [-26, 52, 'bush'], [22, 52, 'bush'], [-48, 44, 'round'], [46, 44, 'fruit']];
    for (const [x, z, t] of extra) spots[t].push([x, z]);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    for (const type of Object.keys(spots)) {
      const list = spots[type];
      if (!list.length) continue;
      const geo = treeGeo(type);
      const inst = new THREE.InstancedMesh(geo, this.treeMat, list.length);
      inst.castShadow = true; inst.receiveShadow = true;
      list.forEach(([x, z], i) => {
        const sc = (type === 'bush' ? 0.8 : 0.85) + rnd() * 0.5;
        const y = heightAt(x, z) - 0.1;
        const rotY = rnd() * Math.PI * 2;
        p.set(x, y, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY); s.setScalar(sc);
        inst.setMatrixAt(i, m.compose(p, q, s));
        col.setHSL(0, 0, 0.88 + rnd() * 0.12);
        inst.setColorAt(i, col);
        const tree = { inst, i, x, y, z, sc, rotY, type };
        this.trees.push(tree);
        const names = { round: 'Oak tree', blossom: 'Blossom tree', fruit: 'Apple tree', pine: 'Pine tree', palm: 'Palm tree', bush: 'Bush' };
        const hints = { round: 'Give it a shake.', blossom: 'Shake loose some petals.', fruit: 'Maybe an apple will fall.', pine: 'Smells like a holiday.', palm: 'Coconuts not included. Mostly.', bush: 'Something rustles inside.' };
        addInteractive({
          center: () => new THREE.Vector3(x, y + (type === 'bush' ? 0.8 : 3.2) * sc, z),
          radius: (type === 'bush' ? 1.6 : 2.6) * sc,
          name: names[type], hint: hints[type],
          onClick: () => this.shake(tree),
        });
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
    }
  }

  shake(tree) {
    if (this.shakes.find((s) => s.tree === tree)) return;
    this.shakes.push({ tree, t: 0 });
    audio.play('whoosh', { dur: 0.4, gain: 0.07 });
    const top = new THREE.Vector3(tree.x, tree.y + 3.5 * tree.sc, tree.z);
    bus.emit('fx:burst', { pos: top, kind: tree.type === 'blossom' ? 'petals' : 'leaves', n: 26 });
    bus.emit('stat:tree');
    if (tree.type === 'fruit' && Math.random() < 0.75) this._dropApple(tree);
    if ((tree.type === 'round' || tree.type === 'pine') && Math.random() < 0.4) bus.emit('fx:birdflee', top);
    if (tree.type === 'bush' && Math.random() < 0.5) { audio.play('chirp', { n: 2 }); bus.emit('fx:birdflee', top); }
  }

  _dropApple(tree) {
    const geo = P('sphere', 0.24, 10, 8);
    const b = new GeoBuilder();
    b.add(geo, PAL.cherry, M(), 0.04);
    b.add(P('cyl', 0.03, 0.03, 0.2, 4), PAL.woodDark, M(0, 0.25, 0), 0);
    b.add(P('box', 0.18, 0.03, 0.1), PAL.leaf, M(0.1, 0.3, 0, 0, 0, 0.4), 0);
    const apple = new THREE.Mesh(b.build(), toonMat());
    apple.castShadow = true;
    const a = Math.random() * Math.PI * 2;
    apple.position.set(tree.x + Math.cos(a) * 1.5 * tree.sc, tree.y + 3 * tree.sc, tree.z + Math.sin(a) * 1.5 * tree.sc);
    this.scene.add(apple);
    const groundY = heightAt(apple.position.x, apple.position.z) + 0.24;
    const tl = gsap.timeline({ onComplete: () => { this.scene.remove(apple); apple.geometry.dispose(); } });
    tl.to(apple.position, { y: groundY, duration: 0.6, ease: 'bounce.out', onStart: () => setTimeout(() => audio.play('plop'), 380) })
      .to(apple.position, { x: apple.position.x + Math.cos(a) * 1.2, z: apple.position.z + Math.sin(a) * 1.2, duration: 1.2, ease: 'power2.out' }, '<0.3')
      .to(apple.rotation, { x: 4, duration: 1.2, ease: 'power2.out' }, '<')
      .to(apple.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.4, delay: 3 });
  }

  _grass(scene, rnd, tier) {
    const b = new GeoBuilder();
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI;
      const g = new THREE.ConeGeometry(0.09, 0.7, 3, 1);
      g.translate(0, 0.35, 0);
      b.add(g, k === 1 ? 0x8fd16a : 0x7bc35c, M(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08, (k - 1) * 0.25, a, (k - 1) * 0.2), 0);
    }
    const geo = b.build();
    // tip lightening via vertex color by height
    const pos = geo.attributes.position, col = geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / 0.7;
      col.setXYZ(i, col.getX(i) * (0.75 + h * 0.45), col.getY(i) * (0.8 + h * 0.35), col.getZ(i) * (0.75 + h * 0.3));
    }
    const mat = addSway(toonMat().clone(), 3.2);
    mat.customProgramCacheKey = () => 'grass-sway';
    const n = tier.grass;
    const inst = new THREE.InstancedMesh(geo, mat, n);
    inst.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0, guard = 0;
    while (k < n && guard++ < n * 8) {
      // clump around noise patches so it looks natural
      const a = rnd() * Math.PI * 2, r = 44 + Math.pow(rnd(), 0.8) * 60;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h < 0.35) continue;
      if (Math.hypot(x, z) > coastR(a) - 12) continue;
      if (Math.abs(x) < PAD + 2.2 && Math.abs(z) < PAD + 2.2) continue;
      if (pathDist(x, z) < 1.8) continue;
      if (Math.hypot(x - SITES.pond.x, z - SITES.pond.z) < SITES.pond.r) continue;
      p.set(x, h - 0.05, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
      s.set(1, 0.6 + rnd() * 0.9, 1);
      inst.setMatrixAt(k, m.compose(p, q, s));
      c.setHSL(0.27 + rnd() * 0.06, 0.55, 0.42 + rnd() * 0.16).multiplyScalar(1.6);
      inst.setColorAt(k, c.setRGB(Math.min(1, c.r), Math.min(1, c.g), Math.min(1, c.b)));
      k++;
    }
    inst.count = k;
    inst.computeBoundingSphere();
    scene.add(inst);
    this.grass = inst;
  }

  _flowers(scene, rnd, tier) {
    const stem = new GeoBuilder();
    stem.add(P('cyl', 0.03, 0.03, 0.6, 4), 0x4e9a48, M(0, 0.3, 0), 0);
    stem.add(P('box', 0.18, 0.02, 0.08), 0x5fae4e, M(0.08, 0.25, 0, 0, 0, 0.5), 0);
    const head = new GeoBuilder();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      head.add(P('ico', 0.1, 0), 0xffffff, M(Math.cos(a) * 0.11, 0.62, Math.sin(a) * 0.11, 0, 0, 0, 1, 0.5, 1), 0);
    }
    head.add(P('ico', 0.07, 0), 0xfff1a8, M(0, 0.64, 0), 0);
    const n = tier.flowers;
    const mat = addSway(toonMat().clone(), 2.2);
    mat.customProgramCacheKey = () => 'flower-sway';
    const iS = new THREE.InstancedMesh(stem.build(), mat, n);
    const iH = new THREE.InstancedMesh(head.build(), mat, n);
    const colors = [0xff9ec7, 0xffffff, 0xffc94a, 0xb79cf2, 0xff6b6b, 0x7cc6fe, 0xff9f43];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0, guard = 0;
    // flowers grow in patches
    const patches = [];
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2, r = 46 + rnd() * 50;
      patches.push([Math.cos(a) * r, Math.sin(a) * r, colors[i % colors.length]]);
    }
    // and a ring around the board
    while (k < n && guard++ < n * 10) {
      let x, z, col;
      if (rnd() < 0.3) {
        const side = Math.floor(rnd() * 4), t = (rnd() * 2 - 1) * (PAD + 3);
        const e = PAD + 3 + rnd() * 2;
        [x, z] = side === 0 ? [t, -e] : side === 1 ? [e, t] : side === 2 ? [t, e] : [-e, t];
        col = colors[Math.floor(rnd() * colors.length)];
        if (x > -20 && x < 16 && z > 40) continue;
      } else {
        const pt = patches[Math.floor(rnd() * patches.length)];
        x = pt[0] + (rnd() - 0.5) * 9; z = pt[1] + (rnd() - 0.5) * 9; col = rnd() < 0.8 ? pt[2] : colors[Math.floor(rnd() * colors.length)];
        if (!this._ok(x, z, 1.6)) continue;
      }
      const h = heightAt(x, z);
      if (h < 0.3) continue;
      p.set(x, h - 0.05, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
      s.setScalar(0.8 + rnd() * 0.6);
      m.compose(p, q, s);
      iS.setMatrixAt(k, m); iH.setMatrixAt(k, m);
      iH.setColorAt(k, c.set(col));
      k++;
    }
    iS.count = iH.count = k;
    iS.computeBoundingSphere(); iH.computeBoundingSphere();
    scene.add(iS, iH);
    this.flowers = { iS, iH };
  }

  _rocks(scene, rnd) {
    const b = new GeoBuilder();
    b.add(P('dodeca', 1, 0), 0xb8b2c4, M(0, 0.3, 0, 0, 0, 0, 1, 0.7, 1), 0.07);
    const n = 46;
    const inst = new THREE.InstancedMesh(b.build(), toonMat(), n);
    inst.castShadow = true; inst.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0, guard = 0;
    while (k < n && guard++ < 4000) {
      const a = rnd() * Math.PI * 2;
      const nearCoast = rnd() < 0.55;
      const r = nearCoast ? coastR(a) - 9 - rnd() * 6 : 50 + rnd() * 45;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!nearCoast && !this._ok(x, z)) continue;
      const h = heightAt(x, z);
      if (h < -0.4) continue;
      p.set(x, h - 0.2, z);
      q.setFromEuler(new THREE.Euler(rnd(), rnd() * 6, rnd() * 0.4));
      const sc = 0.4 + rnd() * 1.4;
      s.set(sc, sc * (0.7 + rnd() * 0.5), sc);
      inst.setMatrixAt(k, m.compose(p, q, s));
      inst.setColorAt(k, c.setHSL(0.72, 0.08, 0.62 + rnd() * 0.2));
      k++;
    }
    // the lighthouse sits on a rocky knoll
    for (let i = 0; i < 9 && k < n; i++) {
      const a = (i / 9) * Math.PI * 2;
      const x = SITES.lighthouse.x + Math.cos(a) * 7, z = SITES.lighthouse.z + Math.sin(a) * 7;
      p.set(x, heightAt(x, z) - 0.2, z); q.setFromEuler(new THREE.Euler(rnd(), rnd() * 6, 0)); s.setScalar(1 + rnd());
      inst.setMatrixAt(k, m.compose(p, q, s)); inst.setColorAt(k, c.setHSL(0.72, 0.08, 0.6)); k++;
    }
    inst.count = k;
    inst.computeBoundingSphere();
    scene.add(inst);
  }

  _mushrooms(scene, rnd) {
    const b = new GeoBuilder();
    b.add(P('cyl', 0.12, 0.16, 0.4, 8), PAL.cream, M(0, 0.2, 0), 0.03);
    b.add(P('sphere', 0.34, 12, 8, 0, Math.PI * 2), PAL.cherry, M(0, 0.42, 0, 0, 0, 0, 1, 0.65, 1), 0.04);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      b.add(P('sphere', 0.06, 6, 4), 0xffffff, M(Math.cos(a) * 0.22, 0.56, Math.sin(a) * 0.22, 0, 0, 0, 1, 0.5, 1), 0);
    }
    const geo = b.build();
    this.mushrooms = [];
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * SITES.forest.r;
      const x = SITES.forest.x + Math.cos(a) * r * 1.5, z = SITES.forest.z + Math.sin(a) * r * 0.7;
      const h = heightAt(x, z);
      if (h < 0.5) continue;
      const mesh = new THREE.Mesh(geo, toonMat());
      mesh.position.set(x, h - 0.05, z);
      mesh.scale.setScalar(0.8 + rnd() * 0.9);
      mesh.castShadow = true;
      scene.add(mesh);
      this.mushrooms.push(mesh);
      addInteractive({
        obj: mesh, radius: 0.9 * mesh.scale.x, offset: new THREE.Vector3(0, 0.4, 0), name: 'Bouncy mushroom', hint: 'Boing.',
        onClick: () => {
          audio.play('boing');
          const s0 = mesh.scale.x;
          gsap.timeline().to(mesh.scale, { y: s0 * 0.5, x: s0 * 1.3, z: s0 * 1.3, duration: 0.1 }).to(mesh.scale, { y: s0, x: s0, z: s0, duration: 0.7, ease: 'elastic.out(1.2, 0.3)' });
          bus.emit('fx:burst', { pos: mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)), kind: 'spores', n: 14 });
        },
      });
    }
  }

  update(dt) {
    this.time += dt;
    if (!this.shakes.length) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const touched = new Set();
    this.shakes = this.shakes.filter((sh) => {
      sh.t += dt;
      const tr = sh.tree;
      const k = Math.max(0, 1 - sh.t / 1.1);
      const a = Math.sin(sh.t * 26) * 0.16 * k;
      e.set(a * 0.6, tr.rotY, a);
      q.setFromEuler(e);
      const sq = 1 + Math.sin(sh.t * 20) * 0.05 * k;
      p.set(tr.x, tr.y, tr.z); s.set(tr.sc / Math.sqrt(sq), tr.sc * sq, tr.sc / Math.sqrt(sq));
      tr.inst.setMatrixAt(tr.i, m.compose(p, q, s));
      touched.add(tr.inst);
      if (sh.t >= 1.1) {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr.rotY); s.setScalar(tr.sc);
        tr.inst.setMatrixAt(tr.i, m.compose(p, q, s));
        return false;
      }
      return true;
    });
    for (const inst of touched) inst.instanceMatrix.needsUpdate = true;
  }
}
