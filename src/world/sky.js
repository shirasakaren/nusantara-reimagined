// Sky dome, a smiling sun, a sleepy moon, puffy clouds and the day to night palette.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat, uNight, uTime } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { addInteractive, squash } from './interact.js';
import { state, setState } from '../core/state.js';
import { bus } from '../core/bus.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from './noise.js';

const KEYS = [
  { t: 0.00, top: 0x0d1033, hor: 0x2a2c6e, fog: 0x1d2052, sun: 0x9fb4ff, si: 0.55, hs: 0x41509a, hg: 0x1c1a33, hi: 0.75, am: 0.28 },
  { t: 0.20, top: 0x1f2662, hor: 0x5a4b8f, fog: 0x3a3a77, sun: 0xa8b8ff, si: 0.45, hs: 0x515fa8, hg: 0x2a2440, hi: 0.8, am: 0.28 },
  { t: 0.255, top: 0x5a69b8, hor: 0xffb38a, fog: 0xf2bca2, sun: 0xffad72, si: 1.1, hs: 0xffd2b8, hg: 0x6a5a6a, hi: 0.95, am: 0.24 },
  { t: 0.32, top: 0x6cc0ff, hor: 0xffead0, fog: 0xd2ebff, sun: 0xfff0d2, si: 1.9, hs: 0xdff3ff, hg: 0x8a7a5a, hi: 1.12, am: 0.25 },
  { t: 0.50, top: 0x54b4ff, hor: 0xcdeeff, fog: 0xbfe6ff, sun: 0xfff7e6, si: 2.1, hs: 0xe4f6ff, hg: 0x8c7d5c, hi: 1.15, am: 0.26 },
  { t: 0.66, top: 0x63a6f2, hor: 0xffdca8, fog: 0xffdcb2, sun: 0xffc98a, si: 1.9, hs: 0xfff0d8, hg: 0x8a6e52, hi: 1.08, am: 0.25 },
  { t: 0.735, top: 0x464596, hor: 0xff8f78, fog: 0xec9f9a, sun: 0xff8a5c, si: 1.05, hs: 0xffc0a8, hg: 0x5a4058, hi: 0.95, am: 0.24 },
  { t: 0.80, top: 0x1d2257, hor: 0x48407e, fog: 0x2c2c62, sun: 0xa8b8ff, si: 0.45, hs: 0x4c5aa2, hg: 0x221f3a, hi: 0.78, am: 0.28 },
  { t: 1.00, top: 0x0d1033, hor: 0x2a2c6e, fog: 0x1d2052, sun: 0x9fb4ff, si: 0.55, hs: 0x41509a, hg: 0x1c1a33, hi: 0.75, am: 0.28 },
];

const _a = new THREE.Color(), _b = new THREE.Color();
function lerpKey(t) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
  const A = KEYS[i], B = KEYS[i + 1];
  const f = (t - A.t) / (B.t - A.t);
  const mix = (k) => _a.set(A[k]).lerp(_b.set(B[k]), f).getHex();
  const num = (k) => A[k] + (B[k] - A[k]) * f;
  return { top: mix('top'), hor: mix('hor'), fog: mix('fog'), sun: mix('sun'), si: num('si'), hs: mix('hs'), hg: mix('hg'), hi: num('hi'), am: num('am') };
}

export const PRESETS = { morning: 0.3, day: 0.42, sunset: 0.715, night: 0.93 };

export class Sky {
  constructor(gfx) {
    this.gfx = gfx;
    const scene = gfx.scene;
    this.sunDir = new THREE.Vector3();
    this.night = 0;

    // dome
    this.uni = {
      uTop: { value: new THREE.Color(PAL.sky) },
      uHor: { value: new THREE.Color(0xcdeeff) },
      uBot: { value: new THREE.Color(0xbfe6ff) },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uNight: uNight,
      uTime: uTime,
    };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1300, 32, 20), new THREE.ShaderMaterial({
      uniforms: this.uni, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop, uHor, uBot, uSun; uniform float uNight, uTime; varying vec3 vDir;
        float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.55, h));
          c = mix(c, uBot, smoothstep(0.0, -0.25, h));
          // banded horizon glow toward the sun, toon style
          float sd = max(dot(d, normalize(uSun)), 0.0);
          float glow = pow(sd, 6.0) * (1.0 - uNight) * 0.35;
          glow = floor(glow * 5.0) / 5.0;
          c += vec3(1.0, 0.85, 0.6) * glow;
          // stars
          if (uNight > 0.01 && h > 0.0) {
            vec3 g = floor(d * 260.0);
            float s = hash(g);
            float tw = 0.6 + 0.4 * sin(uTime * (2.0 + s * 5.0) + s * 40.0);
            float star = step(0.9965, s) * tw * smoothstep(0.0, 0.25, h);
            vec3 g2 = floor(d * 90.0);
            float s2 = hash(g2 + 7.0);
            star += step(0.9985, s2) * 1.4 * smoothstep(0.05, 0.3, h);
            c += vec3(1.0, 0.97, 0.88) * star * uNight;
            // milky band
            float band = exp(-pow((d.x * 0.7 + d.z * 0.7 - d.y * 0.3) * 3.0, 2.0));
            c += vec3(0.25, 0.22, 0.45) * band * uNight * 0.35 * smoothstep(0.0, 0.4, h);
          }
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    scene.add(dome);
    this.dome = dome;

    this._buildSun(scene);
    this._buildMoon(scene);
    this._buildClouds(scene);
    this._buildFarIslands(scene);
    this.apply(state.timeOfDay);
  }

  _buildSun(scene) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 40), new THREE.MeshBasicMaterial({ color: 0xffd65a, fog: false, toneMapped: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(30, 34, 40), new THREE.MeshBasicMaterial({ color: INK, fog: false }));
    ring.position.z = -0.1;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(52, 40), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
    halo.position.z = -0.3;
    const rays = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(4.5, 14, 3), new THREE.MeshBasicMaterial({ color: 0xffc02e, fog: false }));
      const a = (i / 12) * Math.PI * 2;
      tri.position.set(Math.cos(a) * 43, Math.sin(a) * 43, -0.2);
      tri.rotation.z = a - Math.PI / 2;
      rays.add(tri);
    }
    // a happy face
    const face = new THREE.Group();
    for (const x of [-9, 9]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(3.4, 1.1, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: INK, fog: false }));
      eye.position.set(x, 4, 0.2);
      face.add(eye);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(3.6, 16), new THREE.MeshBasicMaterial({ color: 0xff9a7a, fog: false }));
      cheek.position.set(x * 1.5, -3, 0.15);
      face.add(cheek);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(6, 1.2, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: INK, fog: false }));
    mouth.rotation.z = Math.PI; mouth.position.set(0, -4, 0.2);
    face.add(mouth);
    g.add(halo, rays, ring, disc, face);
    g.renderOrder = -9;
    g.traverse((o) => { o.renderOrder = -9; if (o.material) o.material.depthWrite = false; });
    scene.add(g);
    this.sun = g; this.sunRays = rays; this.sunFace = face;
    addInteractive({
      obj: g, radius: 50, name: 'The Sun', hint: 'Click to roll the day into night.',
      onClick: () => { audio.play('sparkle'); squash(g, 1); this.setPreset(this.night > 0.5 ? 'day' : 'night'); },
      enabled: () => this.night < 0.6,
    });
  }

  _buildMoon(scene) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(20, 40), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, toneMapped: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(20, 23, 40), new THREE.MeshBasicMaterial({ color: INK, fog: false }));
    ring.position.z = -0.1;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xc8d4ff, transparent: true, opacity: 0.18, fog: false, depthWrite: false }));
    halo.position.z = -0.3;
    const craters = new THREE.Group();
    [[7, 8, 3.5], [-8, -6, 2.6], [10, -9, 2], [-4, 11, 1.8]].forEach(([x, y, r]) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0xe6dcc0, fog: false }));
      c.position.set(x, y, 0.1); craters.add(c);
    });
    for (const x of [-6, 6]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: INK, fog: false }));
      eye.position.set(x, 1, 0.2); eye.rotation.z = Math.PI;
      craters.add(eye);
    }
    g.add(halo, ring, disc, craters);
    g.traverse((o) => { o.renderOrder = -9; if (o.material) o.material.depthWrite = false; });
    scene.add(g);
    this.moon = g;
    // Zzz
    addInteractive({
      obj: g, radius: 34, name: 'The Moon', hint: 'Shh. It is napping. Click to wake the sun.',
      onClick: () => { audio.play('sparkle'); squash(g, 1); this.setPreset('day'); },
      enabled: () => this.night > 0.4,
    });
  }

  _buildClouds(scene) {
    const rnd = mulberry32(77);
    this.clouds = [];
    const mat = toonMat({ soft: true });
    for (let i = 0; i < 16; i++) {
      const b = new GeoBuilder();
      const n = 4 + Math.floor(rnd() * 4);
      const w = 8 + rnd() * 10;
      for (let k = 0; k < n; k++) {
        const x = (k / (n - 1) - 0.5) * w;
        const r = 3 + rnd() * 3.5 * (1 - Math.abs(x) / w);
        const top = new THREE.Color(0xffffff), bot = new THREE.Color(0xe9e4ff);
        b.add(P('ico', 1, 2), top.getHex(), M(x, r * 0.35, (rnd() - 0.5) * 4, 0, 0, 0, r, r * 0.82, r), 0.25);
        b.add(P('ico', 1, 1), bot.getHex(), M(x, -0.3, (rnd() - 0.5) * 3, 0, 0, 0, r * 0.9, r * 0.45, r * 0.9), 0);
      }
      const mesh = new THREE.Mesh(b.build(), mat);
      const ang = rnd() * Math.PI * 2, rad = 60 + rnd() * 190;
      mesh.position.set(Math.cos(ang) * rad, 46 + rnd() * 34, Math.sin(ang) * rad);
      mesh.rotation.y = rnd() * Math.PI;
      mesh.castShadow = i % 3 === 0;
      scene.add(mesh);
      const cloud = { mesh, speed: 0.6 + rnd() * 0.9, raining: 0, w };
      this.clouds.push(cloud);
      addInteractive({
        obj: mesh, radius: w * 0.7 + 3, name: 'Cloud', hint: 'Click for a tiny rain shower.',
        onClick: () => {
          squash(mesh, 0.7);
          cloud.raining = 3.2;
          audio.play('rain');
          bus.emit('fx:rain', { cloud: mesh, w });
          bus.emit('stat:cloud');
        },
      });
    }
  }

  _buildFarIslands(scene) {
    const rnd = mulberry32(5);
    const b = new GeoBuilder();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
      const r = 330 + rnd() * 160;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const peaks = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < peaks; k++) {
        const h = 40 + rnd() * 70, w = 30 + rnd() * 40;
        const px = x + (rnd() - 0.5) * 60, pz = z + (rnd() - 0.5) * 60;
        b.add(P('cone', 1, 1, 7), [0x6fa8a0, 0x7e9fc7, 0x8db58a][k % 3], M(px, h / 2 - 6, pz, 0, rnd() * 3, 0, w, h, w), 0);
        if (h > 75) b.add(P('cone', 1, 1, 7), PAL.snow, M(px, h - 6 - h * 0.12, pz, 0, rnd() * 3, 0, w * 0.26, h * 0.24, w * 0.26), 0);
      }
      b.add(P('cyl', 1, 1, 1, 12), PAL.sand, M(x, -4.5, z, 0, 0, 0, 70, 6, 70), 0);
    }
    const mesh = new THREE.Mesh(b.build(), toonMat({ soft: true }));
    scene.add(mesh);
    this.far = mesh;
  }

  /** Smoothly travel to a preset time of day. */
  setPreset(name) {
    const target = PRESETS[name] ?? PRESETS.day;
    const from = state.timeOfDay;
    let to = target;
    if (to < from) to += 1; // always move forward through time
    if (to - from > 0.75) to -= 1;
    const o = { t: from };
    setState({ dayPreset: name });
    if (this._tw) this._tw.kill();
    this._tw = gsap.to(o, {
      t: to, duration: 3.2, ease: 'power2.inOut',
      onUpdate: () => setState({ timeOfDay: ((o.t % 1) + 1) % 1 }),
    });
    bus.emit('sky:preset', name);
  }

  apply(t) {
    const k = lerpKey(t);
    const a = (t - 0.25) * Math.PI * 2;
    this.sunDir.set(Math.cos(a) * 0.82, Math.sin(a), 0.38 + 0.2 * Math.cos(a)).normalize();
    this.night = Math.min(1, Math.max(0, (0.05 - this.sunDir.y) / 0.22));
    uNight.value = this.night;
    this.uni.uTop.value.set(k.top);
    this.uni.uHor.value.set(k.hor);
    this.uni.uBot.value.set(k.fog);
    this.uni.uSun.value.copy(this.sunDir);
    const g = this.gfx;
    g.scene.fog.color.set(k.fog);
    g.scene.background.set(k.hor);
    g.hemi.color.set(k.hs); g.hemi.groundColor.set(k.hg); g.hemi.intensity = k.hi;
    g.ambient.intensity = k.am;
    g.sun.color.set(k.sun);
    g.sun.intensity = k.si;
    this.lightDir = this.sunDir.y > 0.02 ? this.sunDir.clone() : this.sunDir.clone().negate();
    if (this.lightDir.y < 0.25) this.lightDir.y = 0.25;
    this.lightDir.normalize();
    this.sun.visible = this.sunDir.y > -0.12;
    this.moon.visible = this.sunDir.y < 0.12;
  }

  update(dt, camera, focus) {
    this.apply(state.timeOfDay);
    if (state.liveTime) setState({ timeOfDay: (state.timeOfDay + dt / 600) % 1 });
    // celestial bodies ride with the camera so they always sit on the horizon
    const cp = camera.position;
    this.sun.position.copy(cp).addScaledVector(this.sunDir, 820);
    this.sun.lookAt(cp);
    this.sunRays.rotation.z += dt * 0.08;
    this.moon.position.copy(cp).addScaledVector(this.sunDir, -820);
    this.moon.lookAt(cp);
    this.dome.position.copy(cp);
    // directional light follows the camera focus, snapped to reduce shimmer
    const L = this.gfx.sun;
    const fx = Math.round(focus.x / 4) * 4, fz = Math.round(focus.z / 4) * 4;
    L.target.position.set(fx, 0, fz);
    L.position.set(fx, 0, fz).addScaledVector(this.lightDir, 130);
    // clouds drift
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt * 1.4;
      c.mesh.position.z += c.speed * dt * 0.5;
      const r = Math.hypot(c.mesh.position.x, c.mesh.position.z);
      if (r > 280) { c.mesh.position.x *= -0.95; c.mesh.position.z *= -0.95; }
      if (c.raining > 0) c.raining -= dt;
    }
  }
}
