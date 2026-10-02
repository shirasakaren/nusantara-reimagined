// The coaster train. Chubby cars with a smiling lead car, and tiny riders whose arms go
// up when the ride gets good.
import * as THREE from 'three';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK, TRAIN_THEMES } from '../core/palette.js';

export const CAR_SPACING = 2.05;

const SKIN = [0xffd9b8, 0xf2c19b, 0xd99a6c, 0xb87a4b, 0x8d5a3b, 0xffe4cf];
const HAIR = [0x3a2a20, 0x6b4226, 0xe0b04a, 0xd2573a, 0x222033, 0xa77fd8, 0xffffff, 0x5bb3e8];
const SHIRT = [0xff6b6b, 0x5ed6b4, 0x7cc6fe, 0xffc94a, 0xb79cf2, 0xff9ec7, 0xff9f43, 0x7bcf5e, 0xf7fbff];

const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function buildCarBody(theme, lead, last) {
  const th = TRAIN_THEMES[theme] || TRAIN_THEMES.classic;
  const b = new GeoBuilder();
  // chassis and wheels
  b.add(P('box', 0.78, 0.22, 1.5), 0x3a2f52, M(0, -0.18, 0), 0.03);
  for (const x of [-0.42, 0.42]) for (const z of [-0.5, 0.5]) {
    b.add(P('cyl', 0.14, 0.14, 0.12, 10), 0x2a2240, M(x, -0.16, z, 0, 0, Math.PI / 2), 0.02);
    b.add(P('cyl', 0.06, 0.06, 0.14, 8), 0xb8b2c4, M(x, -0.16, z, 0, 0, Math.PI / 2), 0);
  }
  // tub
  b.add(P('box', 1.28, 0.52, 1.62), th.body, M(0, 0.2, 0.02), 0.05);
  b.add(P('cyl', 0.26, 0.26, 1.28, 14), th.body, M(0, 0.2, -0.8, 0, 0, Math.PI / 2, 1, 1, 1), 0.05);
  // rim
  b.add(P('box', 1.34, 0.1, 1.68), th.accent, M(0, 0.48, 0.02), 0.035);
  // stripe
  b.add(P('box', 1.31, 0.09, 1.2), th.stripe, M(0, 0.18, 0.1), 0);
  // seat backs
  b.add(P('box', 1.1, 0.5, 0.16), th.accent, M(0, 0.62, 0.62), 0.04);
  b.add(P('box', 1.0, 0.1, 0.5), 0x3a2f52, M(0, 0.38, 0.32), 0);
  // lap bar
  b.add(P('cyl', 0.045, 0.045, 1.0, 6), PAL.sun, M(0, 0.78, -0.12, 0, 0, Math.PI / 2), 0.025);
  for (const x of [-0.5, 0.5]) b.add(P('cyl', 0.04, 0.04, 0.36, 6), PAL.sun, M(x, 0.62, -0.1, 0.3), 0.02);

  if (lead) {
    // big front bumper and face
    b.add(P('sphere', 0.5, 16, 12), th.body, M(0, 0.26, -0.95, 0, 0, 0, 1.25, 0.72, 0.62), 0.05);
    if (th.face) {
      for (const x of [-0.26, 0.26]) {
        b.add(P('sphere', 0.16, 14, 10), 0xffffff, M(x, 0.38, -1.22, 0, 0, 0, 1, 1.15, 0.6), 0.03);
        b.add(P('sphere', 0.085, 10, 8), INK, M(x * 0.92, 0.37, -1.3, 0, 0, 0, 1, 1.1, 0.6), 0);
        b.add(P('sphere', 0.03, 6, 4), 0xffffff, M(x * 0.92 + 0.03, 0.41, -1.34), 0);
        b.add(P('sphere', 0.08, 8, 6), PAL.pink, M(x * 1.55, 0.2, -1.18, 0, 0, 0, 1, 0.7, 0.4), 0);
      }
      b.add(P('torus', 0.1, 0.025, 6, 12, Math.PI), INK, M(0, 0.2, -1.27, 0, 0, Math.PI), 0);
    }
    if (theme === 'rocket') {
      for (const x of [-0.7, 0.7]) b.add(P('cone', 0.2, 0.55, 4), th.accent, M(x, 0.3, 0.7, 0, 0, x > 0 ? -1.1 : 1.1), 0.03);
    }
    if (theme === 'bee') {
      for (const x of [-0.18, 0.18]) {
        b.add(P('cyl', 0.02, 0.02, 0.4, 4), INK, M(x, 0.75, -0.9, -0.4, 0, x * 1.5), 0);
        b.add(P('sphere', 0.06, 8, 6), INK, M(x * 1.6, 0.93, -0.98), 0);
      }
    }
    if (theme === 'midnight') {
      for (const x of [-0.3, 0.3]) b.add(P('cone', 0.12, 0.28, 4), th.body, M(x, 0.62, -0.8, 0, 0.78), 0.03);
    }
  }
  if (theme === 'bee') {
    for (const z of [-0.35, 0.25]) b.add(P('box', 1.3, 0.48, 0.16), INK, M(0, 0.2, z), 0);
  }
  if (theme === 'melon') {
    for (let q = 0; q < 10; q++) b.add(P('sphere', 0.04, 6, 4), INK, M((q % 2 ? 1 : -1) * 0.645, 0.1 + (q % 3) * 0.12, -0.6 + q * 0.13, 0, 0, 0, 0.5, 1, 1.4), 0);
  }
  if (theme === 'midnight') {
    for (let q = 0; q < 6; q++) b.add(P('ico', 0.05, 0), PAL.sun, M((q % 2 ? 1 : -1) * 0.645, 0.15 + (q % 3) * 0.1, -0.6 + q * 0.25), 0);
  }
  if (last) {
    b.add(P('box', 1.2, 0.18, 0.12), th.accent, M(0, 0.0, 0.88), 0.03);
    b.add(P('sphere', 0.07, 8, 6), 0xff3355, M(-0.45, 0.05, 0.95), 0);
    b.add(P('sphere', 0.07, 8, 6), 0xff3355, M(0.45, 0.05, 0.95), 0);
  }
  return b.build();
}

function buildRiders(seed) {
  const b = new GeoBuilder();
  const arms = new GeoBuilder();
  const riders = [];
  for (const x of [-0.3, 0.3]) {
    const skin = rnd(SKIN), hair = rnd(HAIR), shirt = rnd(SHIRT);
    b.add(P('capsule', 0.17, 0.28, 3, 8), shirt, M(x, 0.62, 0.18), 0.03);
    b.add(P('sphere', 0.2, 14, 10), skin, M(x, 1.05, 0.15), 0.03);
    // hair styles
    const style = Math.floor(Math.random() * 4);
    if (style === 0) b.add(P('sphere', 0.21, 14, 10), hair, M(x, 1.1, 0.19, 0, 0, 0, 1, 0.8, 1), 0.02);
    else if (style === 1) { b.add(P('sphere', 0.21, 14, 10), hair, M(x, 1.1, 0.19, 0, 0, 0, 1, 0.8, 1), 0.02); b.add(P('sphere', 0.1, 8, 6), hair, M(x, 1.28, 0.3), 0.02); }
    else if (style === 2) { b.add(P('cone', 0.2, 0.25, 8), hair, M(x, 1.32, 0.15), 0.02); b.add(P('sphere', 0.06, 6, 4), 0xffffff, M(x, 1.46, 0.15), 0); }
    else { for (let q = 0; q < 3; q++) b.add(P('sphere', 0.09, 8, 6), hair, M(x - 0.1 + q * 0.1, 1.24, 0.12 + (q % 2) * 0.05), 0.02); }
    // face
    for (const e of [-0.07, 0.07]) b.add(P('sphere', 0.03, 6, 4), INK, M(x + e, 1.07, -0.03), 0);
    b.add(P('sphere', 0.045, 6, 4), 0x9b3b4a, M(x, 0.97, -0.04, 0, 0, 0, 1, 0.8, 0.5), 0);
    b.add(P('sphere', 0.04, 6, 4), PAL.pink, M(x - 0.12, 1.0, -0.01, 0, 0, 0, 1, 0.7, 0.5), 0);
    b.add(P('sphere', 0.04, 6, 4), PAL.pink, M(x + 0.12, 1.0, -0.01, 0, 0, 0, 1, 0.7, 0.5), 0);
    // arms: built pointing up from the shoulder pivot at origin
    for (const s of [-1, 1]) {
      const ax = x + s * 0.2;
      arms.add(P('capsule', 0.055, 0.34, 3, 6), shirt, M(ax, 0.22, 0), 0.02);
      arms.add(P('sphere', 0.07, 8, 6), skin, M(ax, 0.45, 0), 0.02);
    }
    riders.push({ skin, hair, shirt });
  }
  return { body: b.build(), arms: arms.build(), riders };
}

export class Train {
  constructor(scene, theme = 'classic', cars = 3) {
    this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'train';
    scene.add(this.group);
    this.mat = toonMat();
    this.cars = [];
    this.theme = theme;
    this.build(theme, cars);
  }

  build(theme, count) {
    this.theme = theme;
    for (const c of this.cars) { this.group.remove(c.root); c.body.geometry.dispose(); c.riders.geometry.dispose(); c.arms.geometry.dispose(); }
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(buildCarBody(theme, i === 0, i === count - 1), this.mat);
      body.castShadow = true;
      const r = buildRiders(i);
      const riders = new THREE.Mesh(r.body, this.mat); riders.castShadow = true;
      const arms = new THREE.Mesh(r.arms, this.mat); arms.castShadow = true;
      arms.position.set(0, 0.82, 0.16);
      arms.rotation.x = -1.2;
      const riderGroup = new THREE.Group();
      riderGroup.add(riders, arms);
      root.add(body, riderGroup);
      this.group.add(root);
      this.cars.push({ root, body, riders, arms, riderGroup, armT: -1.2, bob: Math.random() * 6, people: r.riders });
    }
    this.length = count * CAR_SPACING;
  }

  get count() { return this.cars.length; }

  /** Place car i using two sampled points for a stable orientation. */
  placeCar(i, front, back, up) {
    const car = this.cars[i];
    const fwd = new THREE.Vector3().subVectors(front, back).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const u = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const m = new THREE.Matrix4().makeBasis(right, u, fwd.clone().negate());
    car.root.quaternion.setFromRotationMatrix(m);
    car.root.position.copy(front).add(back).multiplyScalar(0.5).addScaledVector(u, 0.12);
  }

  /** excitement 0..1 drives the arms and bounce */
  animate(dt, excite, time) {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const wiggle = Math.sin(time * 9 + i * 1.7) * 0.15 * excite;
      const target = -1.25 + excite * 1.45 + wiggle;
      c.armT += (target - c.armT) * (1 - Math.exp(-dt * 8));
      c.arms.rotation.x = c.armT;
      c.riderGroup.position.y = Math.abs(Math.sin(time * 14 + i)) * 0.03 * excite;
    }
  }
}
