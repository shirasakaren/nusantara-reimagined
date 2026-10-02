// Farm friends and wild neighbours. Every creature wanders its own patch, hops when it
// walks and has something to say when you click it.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { heightAt, SITES, PAD } from './terrain.js';
import { addInteractive, hop } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { mulberry32 } from './noise.js';

function eyes(b, x, y, z, s = 1) {
  for (const sx of [-x, x]) {
    b.add(P('sphere', 0.07 * s, 8, 6), 0xffffff, M(sx, y, z), 0.015);
    b.add(P('sphere', 0.04 * s, 6, 4), INK, M(sx, y, z + 0.04 * s), 0);
  }
}

const MODELS = {
  cow() {
    const b = new GeoBuilder();
    b.add(P('capsule', 0.55, 1.0, 4, 10), 0xffffff, M(0, 1.05, 0, Math.PI / 2), 0.06);
    b.add(P('sphere', 0.32, 10, 8), INK, M(0.35, 1.3, 0.2, 0, 0, 0, 1, 0.8, 1.2), 0);
    b.add(P('sphere', 0.26, 10, 8), INK, M(-0.4, 1.0, -0.35, 0, 0, 0, 1, 1, 1.2), 0);
    b.add(P('box', 0.6, 0.6, 0.6), 0xffffff, M(0, 1.35, 1.0), 0.05);
    b.add(P('box', 0.62, 0.32, 0.25), 0xffb3c1, M(0, 1.16, 1.33), 0.04);
    b.add(P('sphere', 0.04, 6, 4), INK, M(-0.12, 1.18, 1.46), 0);
    b.add(P('sphere', 0.04, 6, 4), INK, M(0.12, 1.18, 1.46), 0);
    eyes(b, 0.18, 1.5, 1.29);
    for (const s of [-1, 1]) {
      b.add(P('cone', 0.06, 0.25, 6), PAL.cream, M(s * 0.22, 1.75, 0.95, 0, 0, -s * 0.4), 0.02);
      b.add(P('box', 0.28, 0.1, 0.16), INK, M(s * 0.4, 1.55, 0.95, 0, 0, s * 0.3), 0.02);
    }
    for (const x of [-0.3, 0.3]) for (const z of [-0.55, 0.55]) b.add(P('cyl', 0.11, 0.1, 0.65, 6), 0xffffff, M(x, 0.33, z), 0.03);
    for (const x of [-0.3, 0.3]) for (const z of [-0.55, 0.55]) b.add(P('cyl', 0.12, 0.12, 0.12, 6), 0x3a2f52, M(x, 0.06, z), 0);
    b.add(P('cyl', 0.03, 0.03, 0.6, 4), 0xffffff, M(0, 1.0, -0.98, 0.5), 0.02);
    b.add(P('sphere', 0.08, 6, 4), INK, M(0, 0.75, -1.12), 0);
    b.add(P('cone', 0.1, 0.16, 8), PAL.sun, M(0, 0.95, 0.95, Math.PI), 0.02);
    return b.build();
  },
  sheep() {
    const b = new GeoBuilder();
    const puffs = [[0, 0.9, 0, 0.55], [0.32, 1.0, 0.25, 0.38], [-0.32, 1.0, 0.25, 0.38], [0.3, 0.95, -0.3, 0.38], [-0.3, 0.95, -0.3, 0.38], [0, 1.25, 0, 0.4], [0, 0.95, 0.45, 0.35], [0, 0.95, -0.5, 0.35]];
    for (const [x, y, z, r] of puffs) b.add(P('ico', r, 1), 0xfffaf2, M(x, y, z), 0.05);
    b.add(P('sphere', 0.26, 10, 8), 0x3a2f52, M(0, 1.05, 0.68, 0, 0, 0, 0.9, 1, 1.1), 0.04);
    b.add(P('ico', 0.18, 1), 0xfffaf2, M(0, 1.3, 0.62), 0.03);
    for (const s of [-1, 1]) b.add(P('sphere', 0.1, 8, 6), 0x3a2f52, M(s * 0.25, 1.1, 0.62, 0, 0, 0, 1.4, 0.6, 0.8), 0.02);
    for (const sx of [-0.09, 0.09]) b.add(P('sphere', 0.045, 6, 4), 0xffffff, M(sx, 1.1, 0.88), 0);
    for (const x of [-0.22, 0.22]) for (const z of [-0.3, 0.3]) b.add(P('cyl', 0.06, 0.06, 0.55, 6), 0x3a2f52, M(x, 0.27, z), 0.02);
    return b.build();
  },
  pig() {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.55, 14, 10), 0xffb3c1, M(0, 0.62, 0, 0, 0, 0, 0.95, 0.85, 1.25), 0.05);
    b.add(P('cyl', 0.16, 0.18, 0.15, 10), 0xff97ab, M(0, 0.62, 0.72, Math.PI / 2), 0.03);
    b.add(P('sphere', 0.03, 6, 4), INK, M(-0.06, 0.62, 0.8), 0);
    b.add(P('sphere', 0.03, 6, 4), INK, M(0.06, 0.62, 0.8), 0);
    eyes(b, 0.2, 0.82, 0.58);
    for (const s of [-1, 1]) b.add(P('cone', 0.12, 0.2, 4), 0xff97ab, M(s * 0.28, 1.05, 0.35, 0.5, 0, -s * 0.3), 0.02);
    for (const x of [-0.25, 0.25]) for (const z of [-0.35, 0.35]) b.add(P('cyl', 0.08, 0.08, 0.3, 6), 0xff97ab, M(x, 0.15, z), 0.02);
    b.add(P('torus', 0.08, 0.025, 4, 10), 0xff97ab, M(0, 0.75, -0.68, 0, Math.PI / 2), 0);
    return b.build();
  },
  chicken() {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.28, 12, 8), 0xffffff, M(0, 0.42, 0, 0, 0, 0, 1, 0.9, 1.2), 0.035);
    b.add(P('sphere', 0.17, 10, 8), 0xffffff, M(0, 0.7, 0.2), 0.03);
    b.add(P('cone', 0.05, 0.14, 4), PAL.sun, M(0, 0.68, 0.38, Math.PI / 2), 0.015);
    for (let k = 0; k < 3; k++) b.add(P('sphere', 0.05, 6, 4), PAL.cherry, M(0, 0.88 + (k % 2) * 0.02, 0.12 + k * 0.07), 0);
    b.add(P('sphere', 0.04, 6, 4), PAL.cherry, M(0, 0.6, 0.34), 0);
    for (const sx of [-0.09, 0.09]) b.add(P('sphere', 0.03, 6, 4), INK, M(sx, 0.75, 0.33), 0);
    b.add(P('cone', 0.15, 0.25, 5), 0xf4f0e6, M(0, 0.55, -0.3, -0.8), 0.02);
    for (const x of [-0.09, 0.09]) b.add(P('cyl', 0.02, 0.02, 0.22, 4), PAL.tangerine, M(x, 0.1, 0), 0);
    return b.build();
  },
  rabbit() {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.3, 12, 8), 0xd8cfc4, M(0, 0.32, 0, 0, 0, 0, 1, 0.9, 1.2), 0.035);
    b.add(P('sphere', 0.2, 10, 8), 0xd8cfc4, M(0, 0.58, 0.25), 0.03);
    for (const s of [-1, 1]) {
      b.add(P('capsule', 0.06, 0.3, 3, 6), 0xd8cfc4, M(s * 0.08, 0.92, 0.2, -0.2, 0, s * 0.15), 0.02);
      b.add(P('capsule', 0.03, 0.22, 3, 6), PAL.pink, M(s * 0.08, 0.92, 0.24, -0.2, 0, s * 0.15), 0);
    }
    for (const sx of [-0.08, 0.08]) b.add(P('sphere', 0.03, 6, 4), INK, M(sx, 0.62, 0.42), 0);
    b.add(P('sphere', 0.03, 6, 4), PAL.pink, M(0, 0.56, 0.45), 0);
    b.add(P('sphere', 0.1, 8, 6), 0xffffff, M(0, 0.32, -0.38), 0.02);
    return b.build();
  },
  duck() {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.3, 12, 8), 0xffffff, M(0, 0.2, 0, 0, 0, 0, 1, 0.8, 1.35), 0.035);
    b.add(P('sphere', 0.17, 10, 8), 0x2f7d4f, M(0, 0.55, 0.28), 0.03);
    b.add(P('box', 0.14, 0.05, 0.18), PAL.tangerine, M(0, 0.52, 0.48), 0.015);
    for (const sx of [-0.08, 0.08]) b.add(P('sphere', 0.03, 6, 4), INK, M(sx, 0.6, 0.4), 0);
    b.add(P('cone', 0.1, 0.2, 5), 0xffffff, M(0, 0.32, -0.42, -1.1), 0.02);
    b.add(P('torus', 0.13, 0.03, 4, 12), 0xffffff, M(0, 0.4, 0.25, Math.PI / 2), 0);
    return b.build();
  },
  dog() {
    const b = new GeoBuilder();
    b.add(P('capsule', 0.26, 0.55, 4, 10), 0xd9a066, M(0, 0.6, 0, Math.PI / 2), 0.04);
    b.add(P('sphere', 0.28, 12, 8), 0xd9a066, M(0, 0.9, 0.5), 0.04);
    b.add(P('sphere', 0.15, 10, 8), 0xfff3df, M(0, 0.82, 0.72, 0, 0, 0, 1, 0.8, 1), 0.02);
    b.add(P('sphere', 0.06, 6, 4), INK, M(0, 0.86, 0.86), 0);
    eyes(b, 0.11, 0.98, 0.72, 0.9);
    for (const s of [-1, 1]) b.add(P('sphere', 0.12, 8, 6), 0x8d5a3b, M(s * 0.27, 0.92, 0.45, 0, 0, s * 0.4, 0.6, 1.4, 0.8), 0.02);
    for (const x of [-0.16, 0.16]) for (const z of [-0.3, 0.3]) b.add(P('cyl', 0.07, 0.07, 0.4, 6), 0xd9a066, M(x, 0.2, z), 0.02);
    b.add(P('torus', 0.2, 0.04, 4, 12), PAL.cherry, M(0, 0.82, 0.38, Math.PI / 2.4), 0);
    return b.build();
  },
  cat() {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.32, 12, 8), PAL.tangerine, M(0, 0.32, 0, 0, 0, 0, 1, 0.85, 1.3), 0.035);
    b.add(P('sphere', 0.24, 12, 8), PAL.tangerine, M(0, 0.6, 0.32), 0.03);
    for (const s of [-1, 1]) b.add(P('cone', 0.08, 0.18, 4), PAL.tangerine, M(s * 0.13, 0.85, 0.32, 0, 0.78, 0), 0.02);
    for (const sx of [-0.09, 0.09]) b.add(P('box', 0.07, 0.02, 0.02), INK, M(sx, 0.63, 0.55), 0);
    b.add(P('sphere', 0.03, 6, 4), PAL.pink, M(0, 0.58, 0.56), 0);
    for (let k = 0; k < 3; k++) b.add(P('box', 0.06, 0.25, 0.04), 0xd9782a, M(0, 0.32 + (k - 1) * 0.1, -0.05 + k * 0.1, 0, 0, Math.PI / 2), 0);
    return b.build();
  },
};

const SPECIES = {
  cow: { sound: 'moo', say: ['Moo.', 'Mooo!', 'Moo?'], names: ['Daisy', 'Clover', 'Buttercup', 'Mabel'], hint: 'Loves clover. Hates rain.', speed: 0.9, hop: 0.05, radius: 1.5, graze: true },
  sheep: { sound: 'baa', say: ['Baa!', 'Baaa.', 'Meh.'], names: ['Cotton', 'Pudding', 'Nimbus', 'Waffle', 'Dot', 'Biscuit'], hint: 'Mostly fluff.', speed: 0.8, hop: 0.12, radius: 1.1, graze: true },
  pig: { sound: 'oink', say: ['Oink!', 'Snrk.', 'Oink oink.'], names: ['Truffle', 'Peaches'], hint: 'Professional mud tester.', speed: 0.9, hop: 0.06, radius: 1, graze: true },
  chicken: { sound: 'cluck', say: ['Bawk!', 'Cluck.', 'Bok bok.'], names: ['Nugget', 'Penny', 'Olive', 'Pip', 'Sunny', 'Toast'], hint: 'Counts seeds all day.', speed: 1.6, hop: 0.08, radius: 0.6, peck: true },
  rabbit: { sound: 'pop', say: ['*twitch*', 'Hop!', '...'], names: ['Mochi', 'Thumper', 'Bean', 'Juniper', 'Pebble'], hint: 'Very shy. Very fast.', speed: 2.6, hop: 0.45, radius: 0.7, bouncy: true },
  duck: { sound: 'quack', say: ['Quack!', 'Quack quack.'], names: ['Puddles', 'Admiral', 'Dandelion', 'Splash'], hint: 'Captain of the pond.', speed: 0.7, hop: 0, radius: 0.7, swim: true },
  dog: { sound: 'bark', say: ['Woof!', 'Arf arf!', '*wags*'], names: ['Biscuit the dog'], hint: 'The goodest boy in the valley.', speed: 3.2, hop: 0.12, radius: 0.9 },
  cat: { sound: 'meow', say: ['Mrrp.', 'Meow.', '*ignores you*'], names: ['Marmalade'], hint: 'Owns the village. Allows you to live here.', speed: 0, hop: 0, radius: 0.8, sit: true },
};

export class Animals {
  constructor(scene, village) {
    this.scene = scene;
    this.list = [];
    this.time = 0;
    const rnd = mulberry32(31);
    this.rnd = rnd;
    const geos = {};
    for (const k of Object.keys(MODELS)) geos[k] = MODELS[k]();
    const mat = toonMat();
    const pasture = village.pasture;
    const zones = {
      cow: pasture, sheep: pasture, pig: { x: SITES.farm.x - 4, z: SITES.farm.z + 10, r: 6 }, chicken: { x: SITES.farm.x - 12, z: SITES.farm.z + 2, r: 7 },
      rabbit: null, duck: { x: SITES.pond.x, z: SITES.pond.z, r: SITES.pond.r * 0.7 }, dog: { x: SITES.village.x, z: SITES.village.z, r: 18 }, cat: null,
    };
    const counts = { cow: 4, sheep: 6, pig: 2, chicken: 6, rabbit: 6, duck: 4, dog: 1, cat: 1 };
    const rabbitZones = [{ x: -50, z: 20, r: 8 }, { x: 54, z: -30, r: 9 }, { x: -20, z: -54, r: 9 }, { x: 30, z: 62, r: 7 }];
    for (const type of Object.keys(counts)) {
      for (let i = 0; i < counts[type]; i++) {
        const sp = SPECIES[type];
        let zone = zones[type];
        if (type === 'rabbit') zone = rabbitZones[i % rabbitZones.length];
        const mesh = new THREE.Mesh(geos[type], mat);
        mesh.castShadow = true;
        const holder = new THREE.Group();
        holder.add(mesh);
        let x, z;
        if (type === 'cat') {
          // on the roof ridge of the first cottage
          x = SITES.village.x - 12; z = SITES.village.z - 10;
          holder.position.set(x, heightAt(x, z) + 5.6, z);
          holder.rotation.y = 0.3;
        } else {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * zone.r;
          x = zone.x + Math.cos(a) * r; z = zone.z + Math.sin(a) * r;
          holder.position.set(x, sp.swim ? -0.55 : heightAt(x, z), z);
          holder.rotation.y = rnd() * Math.PI * 2;
        }
        const sc = type === 'cow' ? 1 : 0.9 + rnd() * 0.25;
        holder.scale.setScalar(sc);
        this.scene.add(holder);
        const a = {
          type, sp, holder, mesh, zone, sc,
          name: sp.names[i % sp.names.length],
          state: 'idle', timer: rnd() * 3, target: new THREE.Vector3(x, 0, z), phase: rnd() * 10, heading: holder.rotation.y, react: 0,
        };
        this.list.push(a);
        addInteractive({
          obj: holder, radius: sp.radius * sc + 0.3, offset: new THREE.Vector3(0, 0.6 * sc, 0),
          name: a.name, hint: sp.hint,
          onClick: () => this.poke(a),
        });
      }
    }
  }

  poke(a) {
    audio.play(a.sp.sound);
    a.react = 1.2;
    hop(a.mesh, a.type === 'cow' ? 0.6 : 0.9, a.type === 'rabbit' ? Math.PI * 2 : 0);
    const top = a.holder.position.clone().add(new THREE.Vector3(0, 1.8 * a.sc, 0));
    bus.emit('fx:burst', { pos: top, kind: 'hearts', n: 6 });
    bus.emit('fx:say', { pos: top.clone().add(new THREE.Vector3(0, 0.6, 0)), text: a.sp.say[Math.floor(Math.random() * a.sp.say.length)], ms: 1600, small: true });
    bus.emit('stat:animal', a.type);
    if (a.type === 'rabbit') { a.state = 'flee'; a.timer = 1.5; this._pickTarget(a, 1); }
  }

  _pickTarget(a, far = 0) {
    const z = a.zone;
    if (!z) return;
    const ang = this.rnd() * Math.PI * 2, r = Math.sqrt(this.rnd()) * z.r;
    a.target.set(z.x + Math.cos(ang) * r, 0, z.z + Math.sin(ang) * r);
  }

  update(dt, night) {
    this.time += dt;
    for (const a of this.list) {
      const sp = a.sp;
      a.phase += dt;
      if (sp.sit) {
        // the cat grooms and swishes on the roof
        a.mesh.rotation.z = Math.sin(this.time * 0.8) * 0.04;
        a.mesh.position.y = Math.abs(Math.sin(this.time * 0.5)) * 0.02;
        continue;
      }
      a.timer -= dt;
      const pos = a.holder.position;
      if (a.state === 'idle' || a.state === 'graze') {
        if (sp.graze && a.state === 'graze') a.mesh.rotation.x += (0.35 - a.mesh.rotation.x) * dt * 3;
        else a.mesh.rotation.x += (0 - a.mesh.rotation.x) * dt * 4;
        if (sp.peck) a.mesh.rotation.x = Math.max(0, Math.sin(a.phase * 9)) * 0.5;
        if (sp.swim) pos.y = -0.55 + Math.sin(a.phase * 2) * 0.03;
        if (a.timer <= 0) {
          if (sp.graze && this.rnd() < 0.4) { a.state = 'graze'; a.timer = 2 + this.rnd() * 4; }
          else { a.state = 'walk'; this._pickTarget(a); a.timer = 6; }
        }
      } else if (a.state === 'walk' || a.state === 'flee') {
        a.mesh.rotation.x += (0 - a.mesh.rotation.x) * dt * 4;
        const dx = a.target.x - pos.x, dz = a.target.z - pos.z;
        const d = Math.hypot(dx, dz);
        const speed = sp.speed * (a.state === 'flee' ? 2.2 : 1) * (night > 0.7 ? 0.5 : 1);
        if (d < 0.3 || a.timer <= 0) {
          a.state = 'idle'; a.timer = 1 + this.rnd() * (sp.bouncy ? 2 : 5);
        } else {
          const want = Math.atan2(dx, dz);
          let dh = want - a.heading;
          while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
          a.heading += dh * Math.min(1, dt * 4);
          a.holder.rotation.y = a.heading;
          const step = Math.min(d, speed * dt);
          pos.x += Math.sin(a.heading) * step; pos.z += Math.cos(a.heading) * step;
          const ground = sp.swim ? -0.55 : heightAt(pos.x, pos.z);
          const hopH = sp.hop * Math.abs(Math.sin(a.phase * (sp.bouncy ? 7 : 9)));
          pos.y = ground + hopH;
          a.mesh.rotation.z = Math.sin(a.phase * 9) * 0.06 * (sp.hop > 0 ? 1 : 0.3);
          if (sp.swim && Math.random() < dt * 0.6) bus.emit('fx:ripple', pos.clone());
        }
      }
      // rabbits avoid the board so they do not get under tracks
      if (a.type === 'rabbit' && Math.abs(pos.x) < PAD + 2 && Math.abs(pos.z) < PAD + 2) { this._pickTarget(a); }
    }
  }
}
