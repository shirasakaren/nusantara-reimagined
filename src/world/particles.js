// Particles: confetti, leaves, petals, smoke, splashes, hearts, sparkles, rain, fireworks,
// plus ambient pollen by day and fireflies by night, swirling wind ribbons and rainbows.
import * as THREE from 'three';
import gsap from 'gsap';
import { bus } from '../core/bus.js';
import { uNight } from '../core/toon.js';
import { heightAt } from './terrain.js';
import { audio } from '../core/audio.js';

const VERT = `
  attribute float aSize; attribute float aAlpha; attribute float aShape; attribute float aRot; attribute vec3 aColor;
  varying float vAlpha; varying float vShape; varying float vRot; varying vec3 vColor;
  uniform float uScale;
  #include <fog_pars_vertex>
  void main(){
    vAlpha = aAlpha; vShape = aShape; vRot = aRot; vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const FRAG = `
  varying float vAlpha; varying float vShape; varying float vRot; varying vec3 vColor;
  #include <fog_pars_fragment>
  void main(){
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c, -s, s, c) * p;
    float a = 0.0; float edge = 0.0;
    if (vShape < 0.5) { float d = length(p); a = 1.0 - smoothstep(0.8, 1.0, d); edge = smoothstep(0.55, 0.8, d); }
    else if (vShape < 1.5) { vec2 q = abs(p) * vec2(1.0, 1.7); float d = max(q.x, q.y); a = 1.0 - step(0.85, d); edge = step(0.6, d); }
    else if (vShape < 2.5) { vec2 q = p * 1.15; q.y = -q.y + 0.25; float d = pow(q.x*q.x + q.y*q.y - 0.5, 3.0) - q.x*q.x*q.y*q.y*q.y; a = 1.0 - step(0.0, d); edge = 0.0; }
    else if (vShape < 3.5) { vec2 q = abs(p); float d = pow(q.x, 0.5) + pow(q.y, 0.5); a = 1.0 - smoothstep(0.85, 1.0, d); edge = 0.0; }
    else if (vShape < 4.5) { float d = length(p); a = smoothstep(0.6, 0.72, d) * (1.0 - smoothstep(0.88, 1.0, d)); }
    else { vec2 q = p * vec2(1.0, 2.0); float d = length(q); a = 1.0 - smoothstep(0.85, 1.0, d); edge = smoothstep(0.5, 0.85, d); }
    if (a < 0.01) discard;
    vec3 col = mix(vColor, vColor * 0.72, edge * 0.6);
    gl_FragColor = vec4(col, a * vAlpha);
    #include <fog_fragment>
  }`;

class PointPool {
  constructor(scene, max, additive) {
    this.max = max;
    this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shape = new Float32Array(max);
    this.rot = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 600 } }]);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.p = []; // live particle records
  }

  spawn(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push(o);
  }

  update(dt) {
    const arr = this.p;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      o.age += dt;
      if (o.age >= o.life) continue;
      const k = o.age / o.life;
      o.vy -= o.g * dt;
      const dr = Math.exp(-o.drag * dt);
      o.vx *= dr; o.vy *= o.g ? 1 : dr; o.vz *= dr;
      if (o.swirl) { o.vx += Math.sin(o.age * 4 + o.seed) * o.swirl * dt; o.vz += Math.cos(o.age * 3 + o.seed) * o.swirl * dt; }
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      if (o.floor !== undefined && o.y < o.floor) { o.y = o.floor; o.vy *= -0.3; o.vx *= 0.6; o.vz *= 0.6; if (o.stick) o.vy = 0; }
      o.rot += o.rv * dt;
      arr[w++] = o;
      const j = w - 1;
      this.pos[j * 3] = o.x; this.pos[j * 3 + 1] = o.y; this.pos[j * 3 + 2] = o.z;
      this.col[j * 3] = o.r; this.col[j * 3 + 1] = o.gg; this.col[j * 3 + 2] = o.b;
      this.size[j] = o.s0 + (o.s1 - o.s0) * k;
      const fadeIn = Math.min(1, o.age / (o.fadeIn || 0.05));
      this.alpha[j] = fadeIn * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) * (o.a ?? 1) * (o.twinkle ? 0.6 + 0.4 * Math.sin(o.age * 20 + o.seed) : 1);
      this.shape[j] = o.shape;
      this.rot[j] = o.rot;
    }
    arr.length = w;
    this.n = w;
    this.geo.setDrawRange(0, w);
    for (const k of ['position', 'aColor', 'aSize', 'aAlpha', 'aShape', 'aRot']) this.geo.attributes[k].needsUpdate = true;
  }
}

const KINDS = {
  confetti: { pool: 'n', colors: [0xff6b6b, 0xffc94a, 0x5ed6b4, 0x7cc6fe, 0xb79cf2, 0xff9ec7], speed: [4, 9], up: 6, g: 9, drag: 1.5, life: [1.8, 2.8], size: [0.42, 0.36], shape: 1, spin: 10, swirl: 3 },
  leaves: { pool: 'n', colors: [0x7bcf5e, 0x5fae4e, 0x9ad66f, 0xc9e27a], speed: [1, 3], up: 1, g: 1.4, drag: 2, life: [2, 3.2], size: [0.45, 0.4], shape: 5, spin: 4, swirl: 4 },
  petals: { pool: 'n', colors: [0xffb3d1, 0xff9ec7, 0xffd0e4, 0xffffff], speed: [1, 3], up: 1, g: 1.1, drag: 2, life: [2.4, 3.6], size: [0.42, 0.38], shape: 5, spin: 4, swirl: 5 },
  smoke: { pool: 'n', colors: [0xf4f1fb, 0xe6e1f0, 0xffffff], speed: [0.2, 0.5], up: 1.4, g: -0.2, drag: 0.6, life: [2.4, 3.4], size: [0.8, 2.6], shape: 0, spin: 0, a: 0.75, fadeIn: 0.4 },
  splash: { pool: 'n', colors: [0xdff6ff, 0x9fe0ff, 0xffffff], speed: [1.5, 3.5], up: 5, g: 14, drag: 0.6, life: [0.7, 1.1], size: [0.4, 0.2], shape: 0, spin: 0 },
  spout: { pool: 'n', colors: [0xdff6ff, 0xffffff, 0xbfe9ff], speed: [0.6, 2], up: 13, g: 11, drag: 0.4, life: [1.6, 2.2], size: [0.7, 0.4], shape: 0, spin: 0 },
  hearts: { pool: 'n', colors: [0xff6b8a, 0xff9ec7, 0xff4f7b], speed: [0.3, 1], up: 1.8, g: -0.2, drag: 1.2, life: [1.3, 1.8], size: [0.55, 0.65], shape: 2, spin: 0, swirl: 1 },
  hay: { pool: 'n', colors: [0xf2c94c, 0xe3b23c, 0xffe08a], speed: [2, 5], up: 4, g: 8, drag: 1.8, life: [1.4, 2], size: [0.3, 0.25], shape: 5, spin: 8 },
  spores: { pool: 'a', colors: [0xd4b8ff, 0xffe08a, 0xffffff], speed: [0.5, 1.5], up: 1.5, g: -0.3, drag: 1, life: [1.6, 2.4], size: [0.3, 0.1], shape: 0, spin: 0, twinkle: true },
  feathers: { pool: 'n', colors: [0xffffff, 0xf4f0ff], speed: [0.5, 2], up: 0.5, g: 0.8, drag: 2.5, life: [2, 3], size: [0.35, 0.3], shape: 5, spin: 3, swirl: 3 },
  sparkle: { pool: 'a', colors: [0xfff1a8, 0xffffff, 0xffd34d, 0xb8f3ff], speed: [1, 3.5], up: 1.5, g: 0.5, drag: 2.5, life: [0.8, 1.4], size: [0.55, 0.1], shape: 3, spin: 2, twinkle: true },
  sparks: { pool: 'a', colors: [0xffb347, 0xffe08a, 0xff7b54], speed: [2, 5], up: 3, g: 12, drag: 1, life: [0.3, 0.6], size: [0.25, 0.05], shape: 0, spin: 0 },
  dust: { pool: 'n', colors: [0xe8d8b8, 0xd8c8a6], speed: [0.6, 1.6], up: 0.8, g: 0.4, drag: 2, life: [0.8, 1.4], size: [0.45, 0.9], shape: 0, spin: 0, a: 0.6 },
  ripple: { pool: 'n', colors: [0xffffff], speed: [0, 0], up: 0, g: 0, drag: 0, life: [1.2, 1.6], size: [0.4, 2.4], shape: 4, spin: 0, a: 0.7 },
  wake: { pool: 'n', colors: [0xffffff, 0xe8f8ff], speed: [0.2, 0.6], up: 0, g: 0, drag: 1, life: [1.5, 2.4], size: [0.6, 1.6], shape: 0, spin: 0, a: 0.6 },
};

export class Particles {
  constructor(scene, tier, camera) {
    this.scene = scene;
    this.camera = camera;
    this.k = tier.particles;
    this.normal = new PointPool(scene, Math.round(1600 * this.k) + 200, false);
    this.add = new PointPool(scene, Math.round(1400 * this.k) + 200, true);
    this.time = 0;
    this.rains = [];
    this.fireworks = [];
    this._ambient(scene);
    this._windRibbons(scene);
    this._bind();
    this.windDir = new THREE.Vector3(1, 0, 0.35).normalize();
  }

  setScale(h, pr) {
    const s = h * pr * 0.5;
    this.normal.uniforms.uScale.value = s;
    this.add.uniforms.uScale.value = s;
    if (this.amb) this.amb.material.uniforms.uScale.value = s;
  }

  _bind() {
    bus.on('fx:burst', ({ pos, kind, n = 12, color }) => this.burst(pos, kind, n, color));
    bus.on('fx:smoke', (pos) => this.burst(pos, 'smoke', 1));
    bus.on('fx:ripple', (pos) => this.burst(pos.clone().setY(-0.5), 'ripple', 1));
    bus.on('fx:wake', (pos) => this.burst(pos.clone().setY(-0.45), 'wake', 2));
    bus.on('fx:rain', ({ cloud, w }) => { this.rains.push({ cloud, w, t: 3 }); this.rainbow(cloud.position, w); });
    bus.on('fx:fireworks', (o) => this.show(o?.count || 6, o?.center));
    bus.on('ride:splash', (pos) => { this.burst(pos.clone().add(new THREE.Vector3(0, 0.6, 0)), 'splash', 50); audio.play('splash'); });
    bus.on('ride:boost', (pos) => this.burst(pos.clone(), 'sparkle', 20));
    bus.on('ride:sparks', (pos) => this.burst(pos, 'sparks', 6));
  }

  burst(pos, kind, n = 12, color) {
    const K = KINDS[kind];
    if (!K) return;
    const pool = K.pool === 'a' ? this.add : this.normal;
    const count = Math.max(1, Math.round(n * (this.k * 0.6 + 0.4)));
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = K.speed[0] + Math.random() * (K.speed[1] - K.speed[0]);
      c.set(color ?? K.colors[Math.floor(Math.random() * K.colors.length)]);
      pool.spawn({
        x: pos.x + (Math.random() - 0.5) * 0.4, y: pos.y + (Math.random() - 0.5) * 0.4, z: pos.z + (Math.random() - 0.5) * 0.4,
        vx: Math.cos(a) * sp, vy: K.up * (0.6 + Math.random() * 0.6), vz: Math.sin(a) * sp,
        g: K.g, drag: K.drag, life: K.life[0] + Math.random() * (K.life[1] - K.life[0]), age: 0,
        s0: K.size[0], s1: K.size[1], shape: K.shape, rot: Math.random() * 6, rv: (Math.random() - 0.5) * K.spin,
        r: c.r, gg: c.g, b: c.b, a: K.a, fadeIn: K.fadeIn, twinkle: K.twinkle, swirl: K.swirl || 0, seed: Math.random() * 10,
        floor: kind === 'confetti' || kind === 'leaves' || kind === 'petals' || kind === 'hay' ? heightAt(pos.x, pos.z) + 0.05 : undefined,
      });
    }
  }

  /** A gust of wind: leaves and petals sweep across the view. */
  gust(focus) {
    const d = this.windDir;
    const n = Math.round(60 * (0.4 + this.k * 0.6));
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const kind = Math.random() < 0.6 ? KINDS.leaves : KINDS.petals;
      c.set(kind.colors[Math.floor(Math.random() * kind.colors.length)]);
      const side = (Math.random() - 0.5) * 70, back = 30 + Math.random() * 20;
      this.normal.spawn({
        x: focus.x - d.x * back - d.z * side, y: 1 + Math.random() * 9, z: focus.z - d.z * back + d.x * side,
        vx: d.x * (9 + Math.random() * 6), vy: 0.5 + Math.random(), vz: d.z * (9 + Math.random() * 6),
        g: 0.4, drag: 0.2, life: 5 + Math.random() * 2, age: 0, s0: 0.45, s1: 0.4, shape: 5, rot: Math.random() * 6, rv: (Math.random() - 0.5) * 8,
        r: c.r, gg: c.g, b: c.b, swirl: 6, seed: Math.random() * 10, fadeIn: 0.6,
      });
    }
    for (const r of this.ribbons) if (r.t < 0) r.t = -Math.random() * 0.5;
  }

  rainbow(pos, w) {
    const g = new THREE.Group();
    const cols = [0xff6b6b, 0xff9f43, 0xffc94a, 0x7bcf5e, 0x7cc6fe, 0x7a8cff, 0xb79cf2];
    const mats = [];
    cols.forEach((c, i) => {
      const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      mats.push(m);
      const t = new THREE.Mesh(new THREE.TorusGeometry(14 - i * 0.7, 0.36, 4, 40, Math.PI), m);
      g.add(t);
    });
    const ground = heightAt(pos.x, pos.z);
    g.position.set(pos.x + w * 0.4, Math.max(ground, 0) - 1, pos.z);
    g.lookAt(this.camera.position.x, g.position.y, this.camera.position.z);
    this.scene.add(g);
    gsap.to(mats, { opacity: 0.55, duration: 1.2, delay: 1.2 });
    gsap.to(mats, { opacity: 0, duration: 1.6, delay: 5.5, onComplete: () => { this.scene.remove(g); g.traverse((o) => o.geometry?.dispose()); mats.forEach((m) => m.dispose()); } });
  }

  show(count = 6, center) {
    const c = center || new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 30;
        this.fireworks.push({ x: c.x + Math.cos(a) * r, y: 1, z: c.z + Math.sin(a) * r, vy: 26 + Math.random() * 8, t: 1.0 + Math.random() * 0.4, color: [0xff6b6b, 0xffc94a, 0x5ed6b4, 0x7cc6fe, 0xb79cf2, 0xff9ec7][i % 6] });
        audio.play('whoosh', { dur: 0.9, gain: 0.06 });
      }, i * 380 + Math.random() * 200);
    }
  }

  _ambient(scene) {
    // pollen by day, fireflies by night, all in one additive cloud around the camera focus
    const N = Math.round(260 * this.k) + 40;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; seed[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uNight: uNight, uScale: { value: 600 }, uFocus: { value: new THREE.Vector3() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSeed; uniform float uTime, uNight, uScale; uniform vec3 uFocus; varying float vA; varying float vS;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * (0.3 + aSeed * 0.4) + aSeed * 30.0) * 2.0 + uTime * 0.6;
          p.z += cos(uTime * (0.25 + aSeed * 0.3) + aSeed * 17.0) * 2.0 + uTime * 0.2;
          p.y += sin(uTime * (0.5 + aSeed) + aSeed * 9.0) * 0.8;
          // wrap around the focus in a 120 unit box
          p.xz = mod(p.xz - uFocus.xz + 60.0, 120.0) - 60.0 + uFocus.xz;
          p.y = mix(0.6 + p.y * 0.6, 0.8 + p.y * 0.35, uNight);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float pulse = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0);
          vA = mix(0.35, pulse, uNight);
          vS = aSeed;
          gl_PointSize = mix(0.22, 0.32, uNight) * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uNight; varying float vA; varying float vS;
        void main(){
          float d = length(gl_PointCoord * 2.0 - 1.0);
          float a = (1.0 - smoothstep(0.2, 1.0, d)) * vA;
          vec3 day = vec3(1.0, 0.93, 0.7) * 0.6;
          vec3 night = mix(vec3(0.75, 1.0, 0.4), vec3(1.0, 0.85, 0.4), vS);
          gl_FragColor = vec4(mix(day, night, uNight), a);
        }`,
    });
    this.amb = new THREE.Points(g, mat);
    this.amb.frustumCulled = false;
    scene.add(this.amb);
  }

  _windRibbons(scene) {
    this.ribbons = [];
    for (let i = 0; i < 5; i++) {
      const seg = 40;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array((seg + 1) * 2 * 3), u = new Float32Array((seg + 1) * 2);
      const idx = [];
      for (let k = 0; k <= seg; k++) {
        u[k * 2] = k / seg; u[k * 2 + 1] = k / seg;
        if (k < seg) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aU', new THREE.BufferAttribute(u, 1));
      geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uProg: { value: 0 }, uNight: uNight },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uProg, uNight; varying float vU;
          void main(){
            float head = uProg * 1.6; float tail = head - 0.55;
            float a = smoothstep(tail, tail + 0.25, vU) * (1.0 - smoothstep(head - 0.1, head, vU));
            gl_FragColor = vec4(vec3(1.0), a * 0.75 * (1.0 - uNight * 0.6));
          }`,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      this.ribbons.push({ mesh, geo, mat, t: -Math.random() * 6, seg, p0: new THREE.Vector3(), curl: 0 });
    }
  }

  _layRibbon(r, focus) {
    const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 40;
    r.p0.set(focus.x + Math.cos(a) * d, 2 + Math.random() * 12, focus.z + Math.sin(a) * d);
    r.curl = Math.random() < 0.55 ? 1 : 0;
    r.len = 16 + Math.random() * 12;
    r.ph = Math.random() * 6;
    const pos = r.geo.attributes.position;
    const dir = this.windDir;
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let k = 0; k <= r.seg; k++) {
      const u = k / r.seg;
      let f = u * r.len, y = Math.sin(u * 6 + r.ph) * 0.6, s = Math.sin(u * 3 + r.ph) * 1.2;
      if (r.curl) {
        // a little loop in the middle, like a breeze doing its own coaster
        const c = Math.max(0, 1 - Math.abs(u - 0.55) / 0.18);
        const ang = c * Math.PI * 2;
        f -= Math.sin(ang) * 1.6 * (c > 0 ? 1 : 0);
        y += (1 - Math.cos(ang)) * 1.4 * (c > 0 ? 1 : 0);
      }
      const x = r.p0.x + dir.x * f + side.x * s, z = r.p0.z + dir.z * f + side.z * s;
      const yy = r.p0.y + y;
      pos.setXYZ(k * 2, x, yy + 0.07, z);
      pos.setXYZ(k * 2 + 1, x, yy - 0.07, z);
    }
    pos.needsUpdate = true;
  }

  update(dt, focus, night, wind) {
    this.time += dt;
    this.normal.update(dt);
    this.add.update(dt);
    this.amb.material.uniforms.uTime.value = this.time;
    this.amb.material.uniforms.uFocus.value.copy(focus);
    // wind ribbons
    for (const r of this.ribbons) {
      r.t += dt * 0.45 * (0.6 + wind * 0.5);
      if (r.t >= 1) { r.t = -2 - Math.random() * 6; r.mesh.visible = false; }
      if (r.t >= 0 && !r.mesh.visible) { this._layRibbon(r, focus); r.mesh.visible = true; }
      r.mat.uniforms.uProg.value = Math.max(0, r.t);
    }
    // rain under clicked clouds
    this.rains = this.rains.filter((rn) => {
      rn.t -= dt;
      const n = Math.round(30 * dt * 10 * (0.5 + this.k));
      for (let i = 0; i < n; i++) {
        const p = rn.cloud.position;
        this.normal.spawn({ x: p.x + (Math.random() - 0.5) * rn.w, y: p.y - 2, z: p.z + (Math.random() - 0.5) * 6, vx: 0.5, vy: -26, vz: 0, g: 10, drag: 0, life: 2.6, age: 0, s0: 0.28, s1: 0.28, shape: 5, rot: 0, rv: 0, r: 0.62, gg: 0.82, b: 1, a: 0.8, seed: 0, floor: undefined });
      }
      return rn.t > 0;
    });
    // fireworks rockets
    this.fireworks = this.fireworks.filter((fw) => {
      fw.t -= dt;
      fw.y += fw.vy * dt; fw.vy -= 8 * dt;
      const c = new THREE.Color(fw.color);
      this.add.spawn({ x: fw.x, y: fw.y, z: fw.z, vx: (Math.random() - 0.5), vy: -1, vz: (Math.random() - 0.5), g: 2, drag: 2, life: 0.6, age: 0, s0: 0.5, s1: 0.1, shape: 0, rot: 0, rv: 0, r: 1, gg: 0.9, b: 0.7, seed: 0 });
      if (fw.t <= 0) {
        const n = Math.round(90 * (0.5 + this.k * 0.5));
        for (let i = 0; i < n; i++) {
          const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
          const sp = 9 + Math.random() * 4;
          this.add.spawn({ x: fw.x, y: fw.y, z: fw.z, vx: s * Math.cos(th) * sp, vy: u * sp, vz: s * Math.sin(th) * sp, g: 3, drag: 1.6, life: 1.4 + Math.random() * 0.8, age: 0, s0: 1.1, s1: 0.2, shape: i % 3 === 0 ? 3 : 0, rot: Math.random() * 6, rv: 2, r: c.r, gg: c.g, b: c.b, twinkle: true, seed: Math.random() * 10 });
        }
        audio.play('boom');
        return false;
      }
      return true;
    });
  }
}
