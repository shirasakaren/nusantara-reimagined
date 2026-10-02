// Visitors. The valley starts quiet with a few curious folks. As the coaster brings joy
// back, more people stroll in from the village, queue up and cheer the train.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { heightAt, SITES, PAD } from './terrain.js';
import { addInteractive, hop } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { mulberry32 } from './noise.js';

const SKIN = [0xffd9b8, 0xf2c19b, 0xd99a6c, 0xb87a4b, 0x8d5a3b, 0xffe4cf];
const HAIR = [0x3a2a20, 0x6b4226, 0xe0b04a, 0xd2573a, 0x222033, 0xa77fd8, 0xf7fbff, 0x5bb3e8, 0xff9ec7];
const SHIRT = [0xff6b6b, 0x5ed6b4, 0x7cc6fe, 0xffc94a, 0xb79cf2, 0xff9ec7, 0xff9f43, 0x7bcf5e, 0xf7fbff, 0x2a6fb0];
const PANTS = [0x3a2f52, 0x2a6fb0, 0x7d5232, 0x857e96, 0x2f7d4f];
const LINES = [
  'Is it safe? It looks safe.', 'One more ride, please!', 'My hat flew off on the loop!', 'This is the best day of my summer.',
  'I am not scared. You are scared.', 'Can we go again?', 'The front row is the best row.', 'I saw the whole valley from the top!',
  'My grandma rode the old one!', 'Ten out of ten. Would scream again.', 'Who built this? Amazing.', 'I need a snack after that.',
];

// Zones are axis aligned rectangles outside the board where people stroll.
const ZONES = [
  { x0: -18, x1: 14, z0: 44, z1: 55, w: 4 },            // plaza
  { x0: -46, x1: 46, z0: 42, z1: 46, w: 2 },            // south ring
  { x0: 42, x1: 47, z0: -44, z1: 44, w: 1.5 },          // east ring
  { x0: -47, x1: -42, z0: -44, z1: 44, w: 1.5 },        // west ring
  { x0: -44, x1: 44, z0: -47, z1: -42, w: 1 },          // north ring
  { x0: SITES.village.x - 8, x1: SITES.village.x + 8, z0: SITES.village.z - 6, z1: SITES.village.z + 8, w: 2 },
];

function buildPerson(rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const skin = pick(SKIN), hair = pick(HAIR), shirt = pick(SHIRT), pants = pick(PANTS);
  const kid = rnd() < 0.3;
  const s = kid ? 0.72 : 1;
  const b = new GeoBuilder();
  for (const x of [-0.12, 0.12]) {
    b.add(P('capsule', 0.09, 0.32, 3, 6), pants, M(x * s, 0.25 * s, 0, 0, 0, 0, s), 0.025);
    b.add(P('sphere', 0.1, 6, 4), INK, M(x * s, 0.06 * s, 0.05 * s, 0, 0, 0, s, s * 0.6, s * 1.3), 0);
  }
  b.add(P('capsule', 0.22, 0.32, 4, 8), shirt, M(0, 0.72 * s, 0, 0, 0, 0, s), 0.035);
  b.add(P('sphere', 0.24, 14, 10), skin, M(0, 1.22 * s, 0, 0, 0, 0, s), 0.035);
  const style = Math.floor(rnd() * 5);
  if (style === 0) b.add(P('sphere', 0.25, 14, 10), hair, M(0, 1.28 * s, -0.04 * s, 0, 0, 0, s, s * 0.85, s), 0.02);
  else if (style === 1) { b.add(P('sphere', 0.25, 14, 10), hair, M(0, 1.28 * s, -0.04 * s, 0, 0, 0, s, s * 0.85, s), 0.02); b.add(P('sphere', 0.12, 8, 6), hair, M(0, 1.3 * s, -0.28 * s, 0, 0, 0, s), 0.02); }
  else if (style === 2) { b.add(P('cyl', 0.27, 0.27, 0.08, 12), pick(SHIRT), M(0, 1.4 * s, 0, 0, 0, 0, s), 0.02); b.add(P('cyl', 0.18, 0.2, 0.22, 12), pick(SHIRT), M(0, 1.52 * s, 0, 0, 0, 0, s), 0.02); }
  else if (style === 3) { for (let k = 0; k < 2; k++) b.add(P('sphere', 0.11, 8, 6), hair, M((k ? 0.22 : -0.22) * s, 1.3 * s, -0.05 * s, 0, 0, 0, s), 0.02); b.add(P('sphere', 0.25, 14, 10), hair, M(0, 1.3 * s, -0.04 * s, 0, 0, 0, s, s * 0.8, s), 0.02); }
  else { b.add(P('cone', 0.26, 0.3, 10), pick([PAL.cherry, PAL.sun, PAL.mint]), M(0, 1.5 * s, 0, 0, 0, 0, s), 0.02); b.add(P('sphere', 0.06, 6, 4), 0xffffff, M(0, 1.66 * s, 0), 0); }
  for (const x of [-0.08, 0.08]) b.add(P('sphere', 0.035, 6, 4), INK, M(x * s, 1.25 * s, 0.22 * s), 0);
  b.add(P('torus', 0.05, 0.015, 4, 8, Math.PI), INK, M(0, 1.15 * s, 0.22 * s, 0, 0, Math.PI), 0);
  for (const x of [-0.14, 0.14]) b.add(P('sphere', 0.04, 6, 4), PAL.pink, M(x * s, 1.17 * s, 0.2 * s, 0, 0, 0, 1, 0.6, 0.5), 0);
  const arms = new GeoBuilder();
  for (const x of [-0.27, 0.27]) {
    arms.add(P('capsule', 0.065, 0.3, 3, 6), shirt, M(x * s, -0.2 * s, 0, 0, 0, 0, s), 0.02);
    arms.add(P('sphere', 0.07, 6, 4), skin, M(x * s, -0.42 * s, 0, 0, 0, 0, s), 0.015);
  }
  let balloon = null;
  if (rnd() < 0.25) {
    const bb = new GeoBuilder();
    bb.add(P('cyl', 0.01, 0.01, 1.5, 3), INK, M(0.3 * s, 0.6 * s, 0), 0);
    bb.add(P('sphere', 0.26, 12, 10), pick([PAL.cherry, PAL.sun, PAL.sky, PAL.pink, PAL.mint]), M(0.3 * s, 1.5 * s, 0, 0, 0, 0, 1, 1.15, 1), 0.03);
    balloon = bb.build();
  }
  return { body: b.build(), arms: arms.build(), balloon, s, kid };
}

export class Visitors {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.rnd = mulberry32(99);
    this.time = 0;
    this.max = 30;
    this.mat = toonMat();
    for (let i = 0; i < 7; i++) this.spawn(false);
  }

  get count() { return this.list.length; }

  spawn(walkIn = true) {
    if (this.list.length >= this.max) return;
    const rnd = this.rnd;
    const m = buildPerson(rnd);
    const root = new THREE.Group();
    const body = new THREE.Mesh(m.body, this.mat); body.castShadow = true;
    const arms = new THREE.Mesh(m.arms, this.mat); arms.castShadow = true;
    arms.position.y = 0.95 * m.s;
    root.add(body, arms);
    let balloon = null;
    if (m.balloon) { balloon = new THREE.Mesh(m.balloon, this.mat); root.add(balloon); }
    const zi = walkIn ? 0 : Math.floor(rnd() * ZONES.length);
    const zone = ZONES[zi];
    const p = this._inZone(zone);
    if (walkIn) { p.set(SITES.village.x - 30 + rnd() * 4, 0, SITES.village.z + rnd() * 4); }
    root.position.set(p.x, heightAt(p.x, p.z), p.z);
    this.scene.add(root);
    const v = { root, body, arms, balloon, s: m.s, zone, target: this._inZone(zone), state: 'walk', timer: 2, phase: rnd() * 10, heading: 0, cheer: 0, speed: 1.3 + rnd() * 0.8, wave: 0 };
    if (walkIn) { v.walkIn = true; v.target.set(0, 0, 48); v.speed = 2.6; }
    this.list.push(v);
    addInteractive({
      obj: root, radius: 0.9 * m.s, offset: new THREE.Vector3(0, 0.9 * m.s, 0), name: m.kid ? 'Little visitor' : 'Visitor', hint: 'Say hello.',
      onClick: () => this.poke(v),
    });
    if (walkIn) bus.emit('visitors:arrive', this.list.length);
    return v;
  }

  _inZone(z) {
    return new THREE.Vector3(z.x0 + this.rnd() * (z.x1 - z.x0), 0, z.z0 + this.rnd() * (z.z1 - z.z0));
  }

  poke(v) {
    audio.play('pop');
    hop(v.root, 0.8);
    v.wave = 1.5;
    bus.emit('fx:say', { pos: v.root.position.clone().add(new THREE.Vector3(0, 2.2, 0)), text: LINES[Math.floor(Math.random() * LINES.length)], ms: 2600 });
    bus.emit('stat:visitor');
  }

  cheerAll() {
    for (const v of this.list) { v.cheer = 2 + Math.random(); }
  }

  update(dt, trainPos, trainActive, camera) {
    this.time += dt;
    for (const v of this.list) {
      v.phase += dt;
      const pos = v.root.position;
      const near = trainActive && trainPos && trainPos.distanceTo(pos) < 16;
      if (near && v.cheer <= 0 && Math.random() < dt * 2) v.cheer = 1.2 + Math.random();
      v.cheer -= dt; v.wave -= dt;
      if (v.cheer > 0 || v.wave > 0) {
        const t = v.phase;
        v.arms.rotation.z = 0;
        v.arms.rotation.x = Math.PI + Math.sin(t * 14) * 0.3;
        v.body.position.y = Math.abs(Math.sin(t * 9)) * 0.25;
        v.arms.position.y = 0.95 * v.s + v.body.position.y;
        // face the train or the camera
        const tgt = near ? trainPos : camera.position;
        v.heading = Math.atan2(tgt.x - pos.x, tgt.z - pos.z);
        v.root.rotation.y += (v.heading - v.root.rotation.y) * Math.min(1, dt * 6);
        continue;
      }
      v.arms.rotation.x = Math.sin(v.phase * 6) * 0.3 * (v.state === 'walk' ? 1 : 0.1);
      v.body.position.y += (0 - v.body.position.y) * Math.min(1, dt * 8);
      v.arms.position.y = 0.95 * v.s + v.body.position.y;
      v.timer -= dt;
      if (v.state === 'idle') {
        if (v.timer <= 0) { v.state = 'walk'; v.target = this._inZone(v.zone); v.timer = 12; }
      } else {
        const dx = v.target.x - pos.x, dz = v.target.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3 || v.timer <= 0) {
          if (v.walkIn) { v.walkIn = false; v.zone = ZONES[Math.floor(this.rnd() * 5)]; v.target = this._inZone(v.zone); v.speed = 1.3 + this.rnd() * 0.8; v.timer = 20; continue; }
          v.state = 'idle'; v.timer = 1.5 + this.rnd() * 5;
        } else {
          const want = Math.atan2(dx, dz);
          let dh = want - v.root.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
          v.root.rotation.y += dh * Math.min(1, dt * 5);
          const step = Math.min(d, v.speed * dt);
          pos.x += Math.sin(v.root.rotation.y) * step; pos.z += Math.cos(v.root.rotation.y) * step;
          // stay off the build board unless walking around it
          if (Math.abs(pos.x) < PAD + 1 && Math.abs(pos.z) < PAD + 1 && !v.walkIn) {
            const ex = PAD + 1 - Math.abs(pos.x), ez = PAD + 1 - Math.abs(pos.z);
            if (ex < ez) pos.x = Math.sign(pos.x) * (PAD + 1); else pos.z = Math.sign(pos.z) * (PAD + 1);
          }
          pos.y = heightAt(pos.x, pos.z) + Math.abs(Math.sin(v.phase * 9)) * 0.06;
          v.root.rotation.z = Math.sin(v.phase * 9) * 0.04;
        }
      }
      if (v.balloon) v.balloon.rotation.z = Math.sin(this.time * 1.5 + v.phase) * 0.12;
    }
  }
}
