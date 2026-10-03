// Batavia Reimagined, toon edition: a hand-built cel-shaded diorama of the walled city
// around 1730, with a sweep that reveals Kota Tua today.
import * as THREE from 'three';
import gsap from 'gsap';
import { makeNoise, mulberry, GLSL_NOISE } from './noise.js';
import { Builder, P, M, toonMat, geo, tube, uTime } from './toon.js';
import * as A from './assets.js';
import { Crowd } from './chars.js';
import { state } from '../core/state.js';

const noise = makeNoise(42);
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const col = (h) => new THREE.Color(h);

const SHORE = (x) => -21 + Math.sin(x * 0.15) * 0.8 + Math.sin(x * 0.05 + 1) * 1.2;
const CANALS_THEN = [
  { a: [0, -34], b: [0, 31], w: 4.2 }, { a: [-28, 0], b: [28, 0], w: 2.6 }, { a: [-28, 18], b: [28, 18], w: 2.6 },
  { a: [-15, -12], b: [-15, 26], w: 2.4 }, { a: [15, 0], b: [15, 26], w: 2.4 },
  { a: [-31, -16], b: [-31, 29], w: 3.2 }, { a: [31, -8], b: [31, 29], w: 3.2 }, { a: [-31, 29], b: [31, 29], w: 3.2 },
  { a: [5, -22], b: [5, -8.5], w: 2.4 }, { a: [23, -22], b: [23, -8.5], w: 2.4 }, { a: [5, -8.5], b: [23, -8.5], w: 2.4 },
];
const CANALS_NOW = [{ a: [0, -34], b: [0, 31], w: 4.2 }];
function segDist(px, pz, [ax, az], [bx, bz]) { const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); }
function canalDepth(x, z, canals) { let d = 0; for (const c of canals) { const s = segDist(x, z, c.a, c.b); if (s < c.w / 2) d = 1; else if (s < c.w / 2 + 0.25) d = Math.max(d, 1 - (s - c.w / 2) / 0.25); } return d; }

export const STOPS = {
  intro: { pos: [-8, 24, -62], look: [2, 0, -4], mood: 'gold' },
  harbor: { pos: [-34, 9, -60], look: [4, 2.5, -30], mood: 'gold' },
  canal: { pos: [0.4, 3.4, -5.4], look: [0, 1.6, 14], mood: 'gold' },
  bridge: { pos: [0.6, 4.4, -19.5], look: [0, 1.8, -8], mood: 'gold' },
  stadhuis: { pos: [10, 6.5, -3.6], look: [10, 4.6, 12], mood: 'gold' },
  outside: { pos: [-34, 15, 18], look: [-12, 1, 38], mood: 'dusk' },
  today: { pos: [34, 30, -40], look: [0, 0, 6], mood: 'today' },
};
const LIGHT = {
  gold: { sun: '#fff1d6', sunI: 2.4, dir: [-0.55, 0.7, -0.5], sky: '#6fbfff', hor: '#ffe9c4', ground: '#b08a6a', hemi: '#bfe2ff', hemiI: 1.25, fog: '#cfe6f2' },
  dusk: { sun: '#ffb27a', sunI: 2.4, dir: [-0.85, 0.32, 0.25], sky: '#6a5ad6', hor: '#ffa0a0', ground: '#7a4a5a', hemi: '#c9a8ff', hemiI: 1.15, fog: '#d99ab8' },
  today: { sun: '#ffffff', sunI: 2.5, dir: [-0.4, 0.75, -0.5], sky: '#5ab4ff', hor: '#f2f6ff', ground: '#9a9a90', hemi: '#d8ecff', hemiI: 1.3, fog: '#dbe9f5' },
};

export class BataviaScene {
  constructor(renderer, { lite = false } = {}) {
    this.renderer = renderer; this.lite = lite; this.lod = lite ? 0.6 : 1;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
    this.time = 0; this.sweep = -95; this.now = false; this.rnd = mulberry(1730);
    this.camPos = new THREE.Vector3(...STOPS.intro.pos); this.camLook = new THREE.Vector3(...STOPS.intro.look);
    this.tPos = this.camPos.clone(); this.tLook = this.camLook.clone(); this.look = { yaw: 0, pitch: 0 }; this.stop = 'intro';
    this.thenPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 95); this.nowPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -95);
    this.mat = { common: toonMat({ rim: 0.22 }), then: toonMat({ rim: 0.22, clip: 'then' }), now: toonMat({ rim: 0.22, clip: 'now' }), sway: toonMat({ rim: 0.18, sway: 1 }) };
    this.mat.then.clippingPlanes = [this.thenPlane]; this.mat.now.clippingPlanes = [this.nowPlane];
    this.buildLights(); this.buildSky(); this.buildGround(); this.buildWater();
    this.B = { common: new Builder({ lod: this.lod }), then: new Builder({ lod: this.lod }), now: new Builder({ lod: this.lod }) };
    this.buildHouses(); this.buildQuays(); this.buildLandmarks(); this.buildOutside(); this.buildStreets(); this.buildModern();
    for (const [k, b] of Object.entries(this.B)) if (!b.empty) { const m = new THREE.Mesh(b.build(), this.mat[k]); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
    this.buildTrees(); this.buildBridge(); this.buildShips(); this.buildPeople(); this.buildBoats(); this.buildAnimals(); this.buildBirds(); this.buildSweep(); this.buildLanterns();
    this.setMood('gold', 0);
    this.hotspots = this.makeHotspots();
  }

  // ---------- light and sky ----------
  buildLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4); this.sun.castShadow = true;
    const s = this.lite ? 1024 : 4096; this.sun.shadow.mapSize.set(s, s);
    Object.assign(this.sun.shadow.camera, { left: -64, right: 64, top: 64, bottom: -64, near: 1, far: 240 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfe2ff, 0xb08a6a, 1.25); this.scene.add(this.hemi);
    this.scene.fog = new THREE.Fog(0xcfe6f2, 70, 230);
  }
  buildSky() {
    this.skyU = { uTop: { value: col('#6fbfff') }, uHor: { value: col('#ffe9c4') }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: col('#fff') }, uTime: { value: 0 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */`varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */`uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunCol; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float t = smoothstep(-0.05, 0.55, d.y); vec3 c = mix(uHor, uTop, pow(t, 0.8));
          float s = max(dot(d, normalize(uSun)), 0.0); c = mix(c, vec3(1.0, 0.98, 0.9), smoothstep(0.996, 0.998, s)); c += uSunCol * pow(s, 12.0) * 0.25;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.scene.add(this.sky);
    const cb = new Builder({ outline: 0 }); const r = mulberry(8);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3, R = 150 + r() * 70; const cx = Math.cos(a) * R, cz = Math.sin(a) * R, cy = 28 + r() * 30;
      for (let k = 0; k < 7; k++) cb.add(P('ico', 1, 3), '#ffffff', M(cx + (k - 3) * 6 + r() * 3, cy + Math.sin((k / 6) * Math.PI) * 6 + r() * 3, cz + r() * 5, 0, 0, 0, 7 + r() * 5, 6 + r() * 5, 7 + r() * 4), 0);
      for (let k = 0; k < 5; k++) cb.add(P('ico', 1, 2), '#ffffff', M(cx + (k - 2) * 8, cy - 3, cz, 0, 0, 0, 9, 3, 7), 0);
    }
    this.cloudU = { uSun: this.skyU.uSun, uShade: { value: col('#b9d4f2') }, uHor: this.skyU.uHor };
    const cmat = new THREE.ShaderMaterial({ uniforms: this.cloudU, fog: false,
      vertexShader: /* glsl */`varying vec3 vN; varying float vY; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uSun; uniform vec3 uShade; uniform vec3 uHor; varying vec3 vN; varying float vY;
        void main(){ float l = dot(normalize(vN), normalize(uSun)) * 0.5 + 0.5; vec3 c = mix(uShade, vec3(1.0), step(0.45, l)); c = mix(c, mix(c, uHor, 0.35), step(l, 0.25));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }` });
    this.clouds = new THREE.Mesh(cb.build(), cmat); this.scene.add(this.clouds);
  }

  // ---------- painted ground ----------
  paint(nowMode) {
    const S = this.lite ? 1536 : 3072; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const U = S / 150; const X = (x) => (x + 75) * U, Z = (z) => (z + 75) * U; const r = mulberry(nowMode ? 5 : 3);
    g.fillStyle = '#9fd27a'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { const x = r() * S, y = r() * S; g.strokeStyle = r() < 0.5 ? '#8cc46a' : '#b4e08a'; g.lineWidth = U * 0.06; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * U * 0.2, y - U * 0.25); g.stroke(); }
    g.fillStyle = '#c9e07a'; g.fillRect(X(36), Z(31), U * 30, U * 28);
    for (let x = 36; x < 66; x += 0.7) { g.fillStyle = '#a8cc5a'; g.fillRect(X(x), Z(31), U * 0.3, U * 28); }
    for (let i = 0; i < 18; i++) { const x = -66 + (i % 6) * 10, z = 46 + Math.floor(i / 6) * 8; g.fillStyle = '#9fd0d8'; g.fillRect(X(x), Z(z), U * 9, U * 7); g.strokeStyle = '#7ab04a'; g.lineWidth = U * 0.5; g.strokeRect(X(x), Z(z), U * 9, U * 7); for (let k = 0; k < 9; k++) for (let j = 0; j < 7; j++) { g.fillStyle = '#7cc45a'; g.fillRect(X(x + k + 0.3), Z(z + j + 0.3), U * 0.25, U * 0.25); } }
    g.fillStyle = nowMode ? '#d8d2c6' : '#e6d4b0'; g.fillRect(X(-33), Z(-21), U * 66, U * 52);
    const cob = nowMode ? ['#cfc8ba', '#e2dcd0', '#c4bdae'] : ['#dcc7a0', '#efdcb8', '#d2b98e'];
    const step = this.lite ? 0.6 : 0.42;
    for (let z = -21; z < 31; z += step) for (let x = -33 + ((Math.round(z / step) % 2) * step / 2); x < 33; x += step) { g.fillStyle = cob[Math.floor(r() * 3)]; const w = U * step * 0.86, h = U * step * 0.8; g.beginPath(); if (g.roundRect) g.roundRect(X(x), Z(z), w, h, U * 0.08); else g.rect(X(x), Z(z), w, h); g.fill(); }
    g.fillStyle = nowMode ? '#efe6d4' : '#f2e2c0'; g.fillRect(X(3), Z(2.4), U * 14, U * 7);
    for (let i = 0; i < 14; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) { g.fillStyle = nowMode ? '#e2d6be' : '#e6d0a8'; g.fillRect(X(3 + i), Z(2.4 + j), U, U); }
    if (nowMode) for (const cz of [0, 18]) { g.fillStyle = '#5a5f6a'; g.fillRect(X(-31), Z(cz - 1.5), U * 62, U * 3); g.fillStyle = '#ffffff'; for (let x = -30; x < 30; x += 2) g.fillRect(X(x), Z(cz - 0.06), U * 1, U * 0.12); }
    g.fillStyle = '#f2dca8'; g.beginPath(); g.moveTo(0, 0); for (let x = -75; x <= 75; x += 1) g.lineTo(X(x), Z(SHORE(x) + 1.8)); g.lineTo(S, 0); g.closePath(); g.fill();
    const canals = nowMode ? CANALS_NOW : CANALS_THEN;
    g.fillStyle = '#2f6f7f';
    for (let z = -75; z < 75; z += 0.5) for (let x = -75; x < 75; x += 0.5) if (z < SHORE(x) || canalDepth(x, z, canals) > 0.5) g.fillRect(X(x), Z(z), U * 0.52, U * 0.52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  groundMesh(canals, mat) {
    const S = 150, N = this.lite ? 200 : 300;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); const inCity = x > -33 && x < 33 && z > -22 && z < 31;
      let y = 0.1 + (inCity ? 0 : Math.max(0, noise.fbm(x * 0.02, z * 0.02, 3)) * 2.2 * Math.min(1, Math.max(0, (Math.hypot(x, z) - 42) / 30)));
      const cd = canalDepth(x, z, canals); const sh = SHORE(x);
      y = z < sh ? -1.6 - Math.min(3, (sh - z) * 0.12) : y * (1 - cd) - 1.3 * cd;
      p.setY(i, y);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
  }
  buildGround() {
    const mk = (clip, nowMode) => { const m = new THREE.MeshToonMaterial({ map: this.paint(nowMode), gradientMap: toonMat().gradientMap }); m.clippingPlanes = [clip]; return m; };
    this.scene.add(this.groundMesh(CANALS_THEN, mk(this.thenPlane, false)));
    this.scene.add(this.groundMesh(CANALS_NOW, mk(this.nowPlane, true)));
  }
  buildWater() {
    const S = 512; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i / S) * 150 - 75, z = (j / S) * 150 - 75; const k = (j * S + i) * 4;
      img.data[k] = z < SHORE(x) || canalDepth(x, z, CANALS_THEN) > 0.5 ? 255 : 0;
      img.data[k + 1] = z < SHORE(x) || canalDepth(x, z, CANALS_NOW) > 0.5 ? 255 : 0; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    try { const c2 = document.createElement('canvas'); c2.width = c2.height = S; const g2 = c2.getContext('2d'); g2.filter = 'blur(3px)'; g2.drawImage(c, 0, 0); g.drawImage(c2, 0, 0); } catch { /* no canvas filter */ }
    const tex = new THREE.CanvasTexture(c); tex.flipY = false;
    this.waterU = { uTime: { value: 0 }, uMask: { value: tex }, uSky: { value: col('#6fbfff') }, uNow: { value: 0 }, uFog: { value: col('#cfe6f2') } };
    const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: this.waterU,
      vertexShader: /* glsl */`varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform sampler2D uMask; uniform vec3 uSky; uniform float uNow; uniform vec3 uFog; varying vec3 vP;
        ${GLSL_NOISE}
        void main(){
          vec2 uv = (vP.xz + 75.0) / 150.0; vec4 m = texture2D(uMask, clamp(uv, 0.0, 1.0));
          float inb = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          float wv = mix(m.r, m.g, uNow); wv = mix(1.0, wv, inb);
          float shore = -21.0 + sin(vP.x * 0.15) * 0.8 + sin(vP.x * 0.05 + 1.0) * 1.2;
          float sea = 1.0 - smoothstep(shore - 1.0, shore + 2.0, vP.z);
          vec3 deep = vec3(0.16, 0.62, 0.78); vec3 shallow = vec3(0.42, 0.84, 0.86);
          vec3 canal = mix(vec3(0.36, 0.62, 0.52), vec3(0.32, 0.6, 0.66), uNow);
          float n = snoise(vP.xz * 0.12 + uTime * 0.05);
          vec3 c = mix(canal, mix(shallow, deep, smoothstep(-24.0, -50.0, vP.z)), sea);
          c = mix(c, c * 0.88, step(0.25, n));
          float f = smoothstep(0.55, 0.62, wv) * (1.0 - smoothstep(0.72, 0.8, wv));
          float f2 = smoothstep(0.78, 0.8, wv) * (1.0 - smoothstep(0.84, 0.86, wv)) * step(0.0, sin(uTime * 2.0 + vP.x * 0.8 + vP.z * 0.8));
          c = mix(c, vec3(1.0), clamp(f + f2 * 0.7, 0.0, 1.0));
          float rip = step(0.82, snoise(vec2(vP.x * 0.6, vP.z * 2.4) + vec2(uTime * 0.4, 0.0)));
          c = mix(c, vec3(1.0), rip * 0.35);
          float sp = step(0.93, snoise(vP.xz * 1.7 + uTime * 0.6)) * sea; c += sp * 0.5;
          float d = distance(vP, cameraPosition); c = mix(c, uFog, smoothstep(80.0, 260.0, d));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    water.position.y = -0.45; this.scene.add(water);
  }

  // ---------- houses ----------
  buildHouses() {
    const protos = A.housePrototypes(this.lite ? 7 : 12, this.lod); this.protos = protos;
    const rnd = this.rnd; const places = { common: protos.map(() => []), then: protos.map(() => []) };
    const row = (x0, z0, x1, z1, facing, skip) => {
      const len = Math.hypot(x1 - x0, z1 - z0); const dx = (x1 - x0) / len, dz = (z1 - z0) / len; let t = 0;
      while (t < len - 1.2) {
        const pi = Math.floor(rnd() * protos.length); const { w, d } = protos[pi].o;
        const cx = x0 + dx * (t + w / 2), cz = z0 + dz * (t + w / 2);
        if (!(skip && skip(cx, cz))) {
          const bx = cx + Math.sin(facing) * (-d / 2), bz = cz + Math.cos(facing) * (-d / 2);
          (rnd() < 0.78 ? places.common : places.then)[pi].push([bx, bz, facing + Math.PI]);
        }
        t += w + 0.05 + (rnd() < 0.08 ? 0.9 : 0);
      }
    };
    const near = (x, z, x0, x1, z0, z1) => x > x0 && x < x1 && z > z0 && z < z1;
    const skipCommon = (x, z) => near(x, z, -3, 3, -40, 40) || near(x, z, -16.6, -13.4, -20, 30) || near(x, z, 13.4, 16.6, -20, 30) || near(x, z, -10.5, -2.4, 1.5, 10.5) || near(x, z, 2.6, 19, 2, 16);
    const qa = 4.2 / 2 + 0.7;
    row(-qa, -7, -qa, 31, Math.PI / 2, (x, z) => Math.abs(z) < 2 || Math.abs(z - 18) < 2 || (z > 1.5 && z < 10.5));
    row(qa, 31, qa, -7, -Math.PI / 2, (x, z) => Math.abs(z) < 2 || Math.abs(z - 18) < 2 || (z > 2 && z < 16));
    for (const cz of [0, 18]) {
      const q = 2.6 / 2 + 0.7;
      row(-28, cz - q, 28, cz - q, 0, (x, z) => skipCommon(x, z) || (cz === 18 && x > 2 && x < 19) || (cz === 0 && x > 5.5 && x < 14.5));
      row(28, cz + q, -28, cz + q, Math.PI, (x, z) => skipCommon(x, z) || (cz === 0 && x > 2 && x < 19));
    }
    for (const cx of [-15, 15]) {
      const q = 2.4 / 2 + 0.7; const z0 = cx < 0 ? -11 : 2;
      row(cx - q, z0, cx - q, 27, Math.PI / 2, (x, z) => Math.abs(z) < 2 || Math.abs(z - 18) < 2 || (cx > 0 && z > 1.5 && z < 16));
      row(cx + q, 27, cx + q, z0, -Math.PI / 2, (x, z) => Math.abs(z) < 2 || Math.abs(z - 18) < 2 || (cx > 0 && z > 2 && z < 16));
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    for (const era of ['common', 'then']) protos.forEach((pr, i) => {
      const list = places[era][i]; if (!list.length) return;
      const im = new THREE.InstancedMesh(pr.geo, this.mat[era], list.length); im.castShadow = true; im.receiveShadow = true;
      list.forEach(([x, z, ry], k) => { m4.compose(p.set(x, 0, z), q.setFromEuler(e.set(0, ry, 0)), s); im.setMatrixAt(k, m4); const v = 0.94 + rnd() * 0.06; im.setColorAt(k, c.setRGB(v, v, v)); });
      this.scene.add(im);
    });
  }

  quayLine(b, x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0); const ang = Math.atan2(x1 - x0, z1 - z0); const n = Math.max(1, Math.floor(len / 0.7));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      b.add(P('box', 0.34, 1.5, len / n - 0.02), i % 2 ? '#cfc6b4' : '#bfb5a0', M(x, -0.6, z, 0, ang, 0), 0);
      b.add(P('box', 0.46, 0.14, len / n), '#e2dacb', M(x, 0.2, z, 0, ang, 0), 0.01);
    }
  }
  buildQuays() {
    const doQ = (canals, bucket) => {
      for (const c of canals) {
        const [ax, az] = c.a, [bx, bz] = c.b; const len = Math.hypot(bx - ax, bz - az); const ang = Math.atan2(bx - ax, bz - az);
        const nx = Math.cos(ang), nz = -Math.sin(ang);
        let t0 = 0; if (az < -20 || bz < -20) t0 = Math.max(0, (-20.5 - az) / (bz - az));
        for (const s of [-1, 1]) {
          const ox = nx * (c.w / 2 + 0.15) * s, oz = nz * (c.w / 2 + 0.15) * s;
          this.quayLine(this.B[bucket], ax + (bx - ax) * t0 + ox, az + (bz - az) * t0 + oz, bx + ox, bz + oz);
          for (let t = t0 + 0.05; t < 1; t += 6 / len) this.B[bucket].at(M(ax + (bx - ax) * t + ox * 1.12, 0.25, az + (bz - az) * t + oz * 1.12), (bb) => A.bollard(bb));
        }
      }
    };
    doQ(CANALS_THEN.slice(1), 'then'); doQ(CANALS_NOW, 'common');
    for (const s of [-1, 1]) {
      for (let k = 0; k < 18; k++) this.B.common.add(P('box', 1.2, 0.1, 0.6), k % 2 ? '#a8743e' : '#9a6a3a', M(s * 2.85, 0.15, -21.5 - k * 0.65), 0.01);
      for (let k = 0; k < 9; k++) this.B.common.add(P('cyl', 0.1, 0.1, 2.2, 8), '#6b4a2e', M(s * 2.85 + s * 0.5, -0.8, -21.8 - k * 1.3), 0.01);
    }
  }

  // ---------- landmarks ----------
  buildLandmarks() {
    const B = this.B;
    B.common.at(M(10, 0, 12), (b) => { const r = A.stadhuis(b); this.stadTop = new THREE.Vector3(10, r.towerTop.y, 12 + r.towerTop.z); });
    B.common.at(M(10, 0.1, 6), (b) => A.fountain(b));
    B.then.at(M(14, 0, -15), (b) => { const r = A.castle(b); this.flagPos = new THREE.Vector3(14, r.flag.y, -15 + r.flag.z); });
    B.common.at(M(-6.4, 0, 6, 0, -Math.PI / 2, 0), (b) => A.canalHouse(b, { w: 7.6, d: 5, floors: 3, gable: 'plain', seed: 3, wall: '#e8604a', trim: '#ffffff', roof: '#9a3a2a', shutter: '#2f8f6f', door: '#5e3a20', shutters: true, flowers: true }));
    for (let i = 0; i < 3; i++) B.common.at(M(-8 - i * 5.2, 0, -15.5), (b) => A.warehouse(b, { seed: i, wall: ['#fff4e2', '#ffe9c9', '#f6efe4'][i] }));
    B.common.at(M(13, 0, 36), (b) => A.church(b));
    const cols = ['#ff5b4d', '#3a7bd5', '#ffc93c', '#3cc8b4', '#ff8fb1', '#8f7cff'];
    for (let i = 0; i < 9; i++) B.then.at(M(-6.8 + (i % 3) * 1.6, 0.1, -19.6 + Math.floor(i / 3) * 1.4, 0, Math.PI, 0), (b) => A.stall(b, cols[i % cols.length], i % 3 === 1 ? 'fish' : i % 3 === 2 ? 'cloth' : 'fruit', i));
    for (let i = 0; i < 8; i++) B.now.at(M(4 + (i % 4) * 3.6, 0.1, 3.6 + Math.floor(i / 4) * 5, 0, i, 0), (b) => A.umbrellaStall(b, cols[i % cols.length]));
    const r = this.rnd;
    for (let i = 0; i < 16; i++) { const x = -20 + r() * 15, z = -19.6 + r() * 0.8; const k = i % 3; B.then.at(M(x, 0.1, z, 0, r() * 3, 0), (b) => (k === 0 ? A.barrel(b) : k === 1 ? A.crate(b) : A.sack(b))); }
  }

  buildOutside() {
    const B = this.B; const r = this.rnd;
    const walls = ['#ffd7a8', '#ffe9c9', '#ffcfc4', '#fff4e2', '#ffe3b8'];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) B.common.at(M(-24 + i * 2.3, 0, 33 + row * 4.4), (b) => A.shophouse(b, { wall: walls[(i + row) % walls.length], seed: i + row * 9 }));
    B.common.at(M(-14, 0, 47), (b) => A.klenteng(b));
    for (let i = 0; i < 24; i++) {
      const x = -62 + r() * 124, z = 40 + r() * 30; if (x > -27 && x < -2 && z < 52) continue; if (Math.abs(x - 13) < 6 && z < 43) continue; if (x > 34 && x < 68 && z < 60) continue;
      B.common.at(M(x, 0.1, z, 0, r() * 6, 0), (b) => A.stiltHouse(b, i));
    }
    B.then.at(M(34, 0, 38, 0, -Math.PI / 2, 0), (b) => A.warehouse(b, { seed: 9, wall: '#f2dca8', roof: '#a8823e' }));
    const cane = P('cone', 0.06, 1.8, 4);
    for (let i = 0; i < (this.lite ? 300 : 700); i++) { const x = 38 + r() * 26, z = 32 + r() * 26; B.common.add(cane, r() < 0.5 ? '#9bc84a' : '#7fb43a', M(x, 0.9, z, (r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.3), 0); }
  }

  buildStreets() {
    const B = this.B; const r = this.rnd;
    for (let z = -2.6; z < 30; z += 4.2) for (const s of [-1, 1]) if (Math.abs(z) > 2 && Math.abs(z - 18) > 2) B.then.at(M(s * 3.25, 0.1, z), (b) => A.lamp(b));
    for (let z = -6; z < 30; z += 4) for (const s of [-1, 1]) if (Math.abs(z) > 2 && Math.abs(z - 18) > 2) B.now.at(M(s * 3.25, 0.1, z, 0, s > 0 ? Math.PI : 0, 0), (b) => A.lamp(b, true));
    for (const [x, z, ry] of [[4.2, 4, Math.PI / 2], [15.8, 4, -Math.PI / 2], [4.2, 8, Math.PI / 2], [15.8, 8, -Math.PI / 2]]) B.now.at(M(x, 0.1, z, 0, ry, 0), (b) => A.bench(b));
    B.then.at(M(-11, 0.1, 13, 0, 0.4, 0), (b) => A.well(b));
    B.then.at(M(-9, 0.1, -10.5, 0, 0.3, 0), (b) => A.cart(b, 1)); B.then.at(M(-6.5, 0.1, -10.8, 0, 0.3, 0), (b) => A.buffalo(b));
    B.then.at(M(19, 0.1, 6, 0, -1.2, 0), (b) => A.cart(b, 2));
    for (let z = -4; z < 28; z += 5) A.bunting(B.now, [-3.4, 3.6, z], [3.4, 3.6, z + 0.5], 0.5);
    const bc = ['#ff8fb1', '#ffc93c', '#3cc8b4', '#ff5b4d', '#8f7cff', '#7cc45a', '#5ab4ff'];
    for (let i = 0; i < 14; i++) B.now.at(M(4.8 + (i % 7) * 1.7, 0.1, 9.6 + Math.floor(i / 7) * 0.01, 0, 0.1, 0), (b) => A.onthel(b, bc[i % 7]));
    for (let i = 0; i < 26; i++) { const x = -70 + r() * 140, z = 32 + r() * 40; if (x > -27 && x < 0 && z < 52) continue; B.common.at(M(x, 0.1, z, 0, r() * 6, 0), (b) => A.bush(b, i, i % 2 === 0)); }
  }

  buildModern() {
    const r = mulberry(2026);
    for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 1.15 + Math.PI * 0.92; const R = 58 + r() * 50; const x = Math.cos(a) * R * 1.2, z = 32 + Math.abs(Math.sin(a)) * R; this.B.now.at(M(x, 0, z), (b) => A.tower(b, i)); }
  }

  buildTrees() {
    const r = mulberry(77); const kinds = [];
    for (let z = -5; z < 30; z += 3.6) { if (Math.abs(z) < 2 || Math.abs(z - 18) < 2) continue; kinds.push(['tree', -3.3, z], ['tree', 3.3, z + 1.8]); }
    for (const cz of [0, 18]) for (let x = -26; x < 27; x += 4.4) { if (Math.abs(x) < 4.5 || Math.abs(Math.abs(x) - 15) < 2) continue; kinds.push(['tree', x, cz - 2.1]); }
    for (const [x, z] of [[3.6, 2.8], [16.4, 2.8], [3.6, 9.4], [16.4, 9.4]]) kinds.push(['tamarind', x, z]);
    for (let i = 0; i < 44; i++) { const x = -68 + r() * 136; const z = SHORE(x) + 2 + r() * 4; if (Math.abs(x) < 5 || (x > 4 && x < 24)) continue; kinds.push(['palm', x, z]); }
    for (let i = 0; i < 60; i++) { const x = -72 + r() * 144, z = 31 + r() * 42; if (x > -27 && x < 0 && z < 52) continue; if (x > 34 && x < 68 && z < 60) continue; kinds.push([r() < 0.4 ? 'palm' : r() < 0.6 ? 'banana' : 'tree', x, z]); }
    for (let i = 0; i < 14; i++) kinds.push(['flower', -12 + r() * 30, 28.5 + r() * 1.5]);
    const groups = {}; for (const [k, x, z] of kinds) (groups[k] = groups[k] || []).push([x, z]);
    const protoN = { tree: 4, tamarind: 1, palm: 4, banana: 2, flower: 1 };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [k, list] of Object.entries(groups)) {
      const n = protoN[k];
      for (let v = 0; v < n; v++) {
        const sub = list.filter((_, i) => i % n === v); if (!sub.length) continue;
        const g = geo((b) => (k === 'palm' ? A.palm(b, v + 1) : k === 'banana' ? A.banana(b, v) : A.tree(b, v + 3, k === 'tamarind' ? 'tamarind' : k === 'flower' ? 'flower' : 'kenari')), { lod: this.lod });
        const im = new THREE.InstancedMesh(g, this.mat.sway, sub.length); im.castShadow = true; im.receiveShadow = true;
        sub.forEach(([x, z], i) => { const sc = (k === 'tree' ? 0.75 : 0.8) + r() * 0.35; m4.compose(p.set(x, 0.1, z), q.setFromEuler(e.set(0, r() * 6, 0)), s.setScalar(sc)); im.setMatrixAt(i, m4); });
        this.scene.add(im);
      }
    }
  }

  buildBridge() {
    const g = new THREE.Group(); g.position.set(0, 0.25, -8);
    const red = '#d9483a', wood = '#a8743e', woodD = '#7a4a2a'; const leaves = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * 2.25, 0.12, 0);
      const db = new Builder({ outline: 0.02 });
      for (let k = 0; k < 9; k++) db.add(P('box', 0.24, 0.1, 2.4), k % 2 ? wood : '#b88048', M(-s * (0.13 + k * 0.25), 0, 0), 0.008);
      for (const zz of [-1.15, 1.15]) { db.add(P('box', 2.25, 0.06, 0.08), red, M(-s * 1.125, 0.55, zz), 0.01); for (let k = 0; k < 5; k++) db.add(P('box', 0.06, 0.5, 0.06), red, M(-s * (0.2 + k * 0.48), 0.3, zz), 0.006); }
      pivot.add(db.mesh()); g.add(pivot);
      const fb = new Builder({ outline: 0.025 });
      for (const zz of [-1.3, 1.3]) { fb.add(P('rbox', 0.28, 3.8, 0.28, 0.04), red, M(s * 2.6, 1.9, zz), 0.016); fb.add(P('sphere', 0.17, 10, 8), '#ffffff', M(s * 2.6, 3.9, zz), 0.01); }
      fb.add(P('rbox', 0.32, 0.3, 3.0, 0.05), red, M(s * 2.6, 3.6, 0), 0.016);
      fb.add(P('box', 1.1, 0.9, 3.1), '#cfc6b4', M(s * 2.85, -0.15, 0), 0.016);
      g.add(fb.mesh());
      const arm = new THREE.Group(); arm.position.set(s * 2.6, 3.85, 0);
      const ab = new Builder({ outline: 0.02 });
      for (const zz of [-1.3, 1.3]) { ab.add(P('rbox', 4.6, 0.18, 0.18, 0.04), red, M(-s * 0.5, 0, zz), 0.01); ab.add(tube([[-s * 2.7, 0, zz], [-s * 2.75, -1.8, zz], [-s * 2.25, -3.55, zz]], 0.02, 10, 4), '#3a3a42', null, 0); }
      ab.add(P('rbox', 0.55, 0.5, 2.8, 0.06), woodD, M(s * 1.6, -0.1, 0), 0.016);
      arm.add(ab.mesh()); g.add(arm);
      leaves.push({ pivot, arm, s });
    }
    this.bridge = { g, leaves, up: false }; this.scene.add(g);
  }
  toggleBridge() {
    const b = this.bridge; b.up = !b.up;
    for (const { pivot, arm, s } of b.leaves) { gsap.to(pivot.rotation, { z: b.up ? s * -1.15 : 0, duration: 2.6, ease: 'power2.inOut' }); gsap.to(arm.rotation, { z: b.up ? s * -0.42 : 0, duration: 2.6, ease: 'power2.inOut' }); }
    if (b.up) this.sailUnder(); return b.up;
  }

  flagMesh(draw, w = 1.5, h = 1) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 64; draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h, 10, 2), new THREE.MeshToonMaterial({ map: t, side: THREE.DoubleSide, gradientMap: toonMat().gradientMap }));
  }
  buildShips() {
    this.ships = []; this.flags = [];
    const vocFlag = (g) => { g.fillStyle = '#ff8a3c'; g.fillRect(0, 0, 96, 22); g.fillStyle = '#fff'; g.fillRect(0, 21, 96, 22); g.fillStyle = '#2f5fbf'; g.fillRect(0, 42, 96, 22); g.fillStyle = '#241b3a'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('VOC', 48, 39); };
    const ind = geo((b) => A.indiaman(b), { lod: this.lod });
    const pin = ['#ffc93c', '#3a7bd5', '#ff5b4d', '#3cc8b4', '#ffffff'].map((c) => geo((b) => A.pinisi(b, c), { lod: this.lod }));
    for (const [x, z, ry, s] of [[-18, -40, 0.3, 1], [9, -48, -0.2, 1.1], [27, -37, 0.5, 0.95]]) {
      const m = new THREE.Mesh(ind, this.mat.then); m.castShadow = true; m.position.set(x, -0.3, z); m.rotation.y = ry; m.scale.setScalar(s); this.scene.add(m); this.ships.push(m);
      const f = this.flagMesh(vocFlag); f.material.clippingPlanes = [this.thenPlane]; f.position.set(-4.6, 4.2, 0); m.add(f); this.flags.push(f);
    }
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(pin[i], this.mat.now); m.castShadow = true; m.position.set(i % 2 ? 5.4 : -5.4, -0.25, -25 - i * 3.4); m.rotation.y = Math.PI / 2 + (i % 2 ? 0.05 : -0.05); m.scale.setScalar(0.8); this.scene.add(m); this.ships.push(m); }
    const castleFlag = this.flagMesh(vocFlag); castleFlag.material.clippingPlanes = [this.thenPlane]; castleFlag.position.copy(this.flagPos).add(new THREE.Vector3(0.8, 0, 0)); this.scene.add(castleFlag); this.flags.push(castleFlag);
    const mf = this.flagMesh((g) => { g.fillStyle = '#ff3b3b'; g.fillRect(0, 0, 96, 32); g.fillStyle = '#fff'; g.fillRect(0, 32, 96, 32); }, 1.4, 0.93);
    mf.material.clippingPlanes = [this.nowPlane]; mf.position.copy(this.stadTop).add(new THREE.Vector3(0.75, 0.3, 0)); this.scene.add(mf); this.flags.push(mf);
    const poleMat = toonMat({ vertexColors: false, color: 0xeeeeee, clip: 'nowpole' }); poleMat.clippingPlanes = [this.nowPlane];
    const pole = new THREE.Mesh(P('cyl', 0.03, 0.03, 2, 5), poleMat); pole.position.copy(this.stadTop).add(new THREE.Vector3(0, -0.2, 0)); this.scene.add(pole);
  }

  buildPeople() {
    const rnd = mulberry(99); const paths = [];
    for (const s of [-1, 1]) paths.push([[s * 3.0, -19], [s * 3.0, -2], [s * 3.0, 2], [s * 3.0, 16], [s * 3.0, 30]]);
    for (const cz of [0, 18]) for (const s of [-1, 1]) paths.push([[-27, cz + s * 1.8], [-4, cz + s * 1.8], [4, cz + s * 1.8], [27, cz + s * 1.8]]);
    paths.push([[3.6, 3.2], [16.4, 3.2], [16.4, 9], [3.6, 9], [3.6, 3.2]], [[5, 5], [15, 7.5], [8, 8.5], [12, 4], [5, 5]]);
    paths.push([[-20, -18.6], [-3.5, -18.6], [-3.5, -12], [-20, -12]], [[-25, 31], [-4, 31], [-4, 42], [-25, 42]], [[3.4, -7.6], [-3.4, -7.6]], [[-9, 20], [-9, 28], [8, 28], [8, 20]]);
    this.paths = paths.map((pts) => { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.12, z)), false, 'catmullrom', 0.01); return { c, len: c.getLength() }; });
    const k = this.lite ? 0.5 : 1; this.crowds = [];
    const add = (type, n, era) => {
      const cr = new Crowd(type, Math.max(1, Math.floor(n * k)), { material: this.mat[era] }); cr.era = era;
      for (let i = 0; i < cr.count; i++) cr.items.push({ path: Math.floor(rnd() * this.paths.length), t: rnd(), speed: (0.5 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : -1), off: (rnd() - 0.5) * 0.6, ph: rnd() * 6, idle: rnd() < 0.22, sc: 1.05 + rnd() * 0.15 });
      for (let i = 0; i < cr.count; i++) { const v = 0.92 + rnd() * 0.08; cr.setColor(i, new THREE.Color(v, v, v)); }
      this.scene.add(cr.group); this.crowds.push(cr);
    };
    for (const [t, n] of [['clerk', 16], ['soldier', 12], ['jawa', 26], ['kebaya', 22], ['cina', 18], ['kuli', 18], ['lady', 8], ['seller', 14]]) add(t, n, 'then');
    for (const [t, n] of [['student', 26], ['tourist', 24], ['hijab', 24], ['local', 26], ['jawa', 8], ['seller', 8]]) add(t, n, 'now');
    const carGeos = ['#ff5b4d', '#ffffff', '#3a7bd5', '#ffc93c', '#3cc8b4'].map((c) => geo((b) => A.car(b, c)));
    const bajajGeo = geo((b) => A.bajaj(b));
    this.cars = [];
    for (let i = 0; i < 18; i++) {
      const g = i % 6 === 5 ? bajajGeo : carGeos[i % carGeos.length]; const m = new THREE.Mesh(g, this.mat.now); m.castShadow = true;
      const lane = i % 2 ? 0 : 18; const dir = rnd() < 0.5 ? 1 : -1;
      this.cars.push({ m, x: -28 + rnd() * 56, z: lane + dir * 0.7, v: dir * (2.5 + rnd() * 2.5) }); this.scene.add(m);
    }
  }

  buildBoats() {
    this.boats = [];
    const sThen = geo((b) => A.sampan(b, '#8a5a32', true)), sThen2 = geo((b) => A.sampan(b, '#a8743e', false)), sNow = geo((b) => A.sampan(b, '#3a7bd5', true));
    const mk = (g, era, lane, t, v, side) => { const m = new THREE.Mesh(g, this.mat[era]); m.castShadow = true; this.scene.add(m); this.boats.push({ m, era, lane, t, v, side }); };
    for (let i = 0; i < 6; i++) mk(i % 2 ? sThen : sThen2, 'then', 'kb', i / 6, 0.012 + Math.random() * 0.008, i % 2 ? 0.9 : -0.9);
    for (let i = 0; i < 5; i++) mk(sThen2, 'then', 'ca', i / 5, 0.01 + Math.random() * 0.006, 0);
    for (let i = 0; i < 3; i++) mk(sNow, 'now', 'kb', i / 3 + 0.1, 0.008, 0.7);
    for (let i = 0; i < 6; i++) mk(i % 2 ? sThen : sThen2, 'then', 'sea', i / 6, 0.005 + Math.random() * 0.004, i * 3);
    this.rowers = new Crowd('kuli', this.boats.length, { material: this.mat.common });
    this.scene.add(this.rowers.group); this.passing = null;
  }
  sailUnder() {
    const b = new Builder(); A.sampan(b, '#8a5a32', false);
    b.add(P('cyl', 0.05, 0.05, 3.2, 6), '#6b4a2e', M(0, 1.8, 0), 0.008);
    b.add(P('box', 0.04, 2, 1.4), '#fff1d6', M(0.05, 2.1, 0), 0.012);
    const m = b.mesh(); m.position.set(0.4, -0.3, 6); m.rotation.y = -Math.PI / 2; this.scene.add(m);
    if (this.passing) this.scene.remove(this.passing); this.passing = m;
    gsap.to(m.position, { z: -24, duration: 9, delay: 1.6, ease: 'none', onComplete: () => { this.scene.remove(m); if (this.passing === m) this.passing = null; } });
  }

  buildAnimals() {
    this.animals = [];
    const ch = ['#ffffff', '#c97a3a', '#3a3a42'].map((c) => geo((b) => A.chicken(b, c)));
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(ch[i % 3], this.mat.then); m.position.set(-5.5 + Math.random() * 2.5, 0.1, -10.8 + Math.random() * 2); m.rotation.y = Math.random() * 6; m.castShadow = true; this.scene.add(m); this.animals.push({ m, kind: 'chicken', ph: Math.random() * 6, base: m.position.clone() }); }
    const cat = ['#f2a24a', '#3a3a42', '#ffffff'].map((c) => geo((b) => A.cat(b, c)));
    for (const [x, z, i] of [[4.5, 2.5, 0], [-3.4, 12, 1], [16, 9.6, 2], [-12, 31.5, 0]]) { const m = new THREE.Mesh(cat[i], this.mat.common); m.position.set(x, 0.12, z); m.rotation.y = Math.random() * 6; this.scene.add(m); this.animals.push({ m, kind: 'cat', ph: Math.random() * 6, base: m.position.clone() }); }
  }

  buildBirds() {
    const b = new Builder({ outline: 0.02 });
    b.add(P('sphere', 0.12, 8, 6), '#ffffff', M(0, 0, 0, 0, 0, 0, 1.6, 0.8, 0.8), 0.015); b.add(P('cone', 0.03, 0.1, 4), '#ffb43c', M(0.22, 0, 0, 0, 0, -Math.PI / 2), 0);
    const body = b.build();
    const wb = new Builder({ outline: 0.015 }); wb.add(P('box', 0.18, 0.02, 0.5), '#ffffff', M(0, 0, 0.25), 0.01); wb.add(P('box', 0.1, 0.02, 0.2), '#3a3a42', M(-0.02, 0, 0.55), 0);
    const wing = wb.build(); this.birds = [];
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group(); g.add(new THREE.Mesh(body, this.mat.common));
      const wl = new THREE.Mesh(wing, this.mat.common), wr = new THREE.Mesh(wing, this.mat.common); wr.scale.z = -1; g.add(wl, wr); g.scale.setScalar(1.6);
      this.scene.add(g); this.birds.push({ g, wl, wr, r: 12 + Math.random() * 22, h: 12 + Math.random() * 10, a: Math.random() * 6, s: 0.12 + Math.random() * 0.15, cx: -10 + Math.random() * 20, cz: -15 + Math.random() * 20 });
    }
  }

  buildSweep() {
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uA: { value: 0 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */`uniform float uA; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(1.0, 0.0, vUv.y) * uA; gl_FragColor = vec4(1.0, 0.85, 0.4, a * 0.8); }` });
    this.sweepMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 40), mat); this.sweepMesh.rotation.y = Math.PI / 2; this.sweepMesh.position.y = 18;
    this.sweepGroup = new THREE.Group(); this.sweepGroup.add(this.sweepMesh); this.scene.add(this.sweepGroup);
  }
  buildLanterns() {
    const pts = []; for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) pts.push(-24 + i * 2.3, 2.0, 33 + r * 4.4 - 1.8);
    for (let i = 0; i < 4; i++) pts.push(-15.8 + i * 1.2, 2.7, 44.3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.lanternU = { uOn: { value: 0.3 }, uTime: { value: 0 }, uPx: { value: Math.min(2, window.devicePixelRatio || 1) } };
    this.lanterns = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.lanternU, fog: false,
      vertexShader: /* glsl */`uniform float uPx; uniform float uTime; varying float vF; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; vF = 0.8 + 0.2 * sin(uTime * 6.0 + position.x * 3.0); gl_PointSize = 48.0 * uPx / -mv.z; }`,
      fragmentShader: /* glsl */`uniform float uOn; varying float vF; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(1.0, 0.5, 0.3, a * uOn * vF); }` }));
    this.scene.add(this.lanterns);
  }
  lightLanterns(v = 1) { gsap.to(this.lanternU.uOn, { value: v, duration: 2 }); }

  makeHotspots() {
    const H = (id, p, title, kicker, html, art) => ({ id, p: new THREE.Vector3(...p), title, kicker, html, art });
    return {
      harbor: [
        H('ship', [9, 7, -48], 'An East Indiaman', 'The ships', '<p>The VOC sent ships like these from the Netherlands to Asia for two centuries. Voyages took many months. Many sailors died of scurvy and fever on the way.</p><p>Look at the flag: orange, white and blue, with the Company monogram.</p>', 'ship'),
        H('castle', [14, 4, -15], 'Kasteel Batavia', 'The fortress', '<p>The Company castle was developed from 1620 and enlarged in 1629. It held the Governor General, the offices, the stores and the soldiers.</p><p>In 1809, Daendels tore it down. Its stones went into his new palace at Weltevreden.</p>', 'castle'),
        H('market', [-5, 2, -19], 'The fish market', 'Pasar Ikan', '<p>Fish, salt, rice and gossip. Traders from across Asia met here at the mouth of the river.</p><p>A fish market still operates in this area today.</p>', 'stall'),
      ],
      canal: [
        H('houses', [-3.8, 5.5, 10], 'Gabled canal houses', 'Architecture', '<p>Step gables, bell gables, neck gables. The Dutch built Batavia like a city back home, right down to the hoisting beams under the roof.</p><p>The houses were tall, narrow and close together. Good for a cold climate. Hot and airless in the tropics.</p>', 'gables'),
        H('tokomerah', [-6.4, 6, 6], 'Toko Merah', 'Built 1730', '<p>Built for Gustaaf Willem van Imhoff, later Governor General. It was painted red after 1851, which gave it its name, the Red Shop.</p><p>It still stands on Kali Besar.</p>', 'house'),
        H('water', [0, 0.5, 14], 'Silted water', 'Health', '<p>The canals filled with mud and waste. Stagnant water and nearby fish ponds bred malaria mosquitoes.</p><p>From the 18th century, Batavia was known as a graveyard of Europeans.</p>', 'wave'),
      ],
      bridge: [H('bridgeraise', [0, 4.8, -8], 'Raise the bridge', 'Tap to try', '<p>A drawbridge first stood here in 1628. It was rebuilt in 1630 and 1655. People called it the Engelse Brug, then the Hoenderpasarbrug, after the chicken market nearby.</p><p>Today it is Jembatan Kota Intan.</p>', 'bridge')],
      stadhuis: [
        H('stadhuis', [10, 10, 8.5], 'The Stadhuis', 'Built 1707 to 1710', '<p>The City Hall housed the courts and the city council. Its domed cupola and proportions follow 17th century Dutch city halls.</p><p>Since 30 March 1974, it has been the Jakarta History Museum.</p>', 'hall'),
        H('fountain', [10, 2.8, 6], 'The fountain', 'Water', '<p>The fountain in the square was a water supply in colonial times. Today, people sit around it and rent colourful bicycles.</p>', 'fountain'),
        H('cells', [8.4, 1.1, 8.6], 'The cells', 'Below the porch', '<p>Cells beneath the front porch served as dungeons until 1846.</p><p>In 1830, Prince Diponegoro was held here after his arrest at Magelang, before his exile to Manado.</p>', 'bars'),
      ],
      outside: [
        H('glodok', [-15, 4.5, 36], 'Glodok', 'After 1740', '<p>After the massacre, the Chinese survivors were moved outside the walls to Glodok. It became one of the great Chinatowns of Asia.</p>', 'roof'),
        H('sion', [13, 6.5, 36], 'Gereja Sion', 'Consecrated 1695', '<p>Built as the Portuguese Outer Church for the Mardijkers. It is the oldest church still in use in Jakarta.</p>', 'church'),
        H('sugar', [44, 3, 40], 'The sugar lands', 'Ommelanden', '<p>Outside the walls lay the Ommelanden. Chinese settlers grew sugarcane and ran the mills. In the 1730s the sugar trade fell and many lost their work.</p>', 'cane'),
      ],
      today: [
        H('fatahillah', [10, 3, 6], 'Taman Fatahillah', 'Today', '<p>The old square is now full of students, tourists and buskers. Rent an onthel bicycle, put on a hat and ride where the Company once ruled.</p>', 'bike'),
        H('sunda', [0, 4, -28], 'Sunda Kelapa', 'Today', '<p>Wooden pinisi schooners from Sulawesi still load cargo here by hand. The old harbour is older than Batavia itself.</p>', 'ship'),
        H('kotaintan', [0, 3, -8], 'Jembatan Kota Intan', 'Still standing', '<p>The bridge survives as one of the last of its kind in Jakarta.</p>', 'bridge'),
      ],
    };
  }

  setStop(name) { const s = STOPS[name]; if (!s) return; this.stop = name; this.tPos.set(...s.pos); this.tLook.set(...s.look); this.setMood(this.now ? 'today' : s.mood); this.lightLanterns(name === 'outside' ? 1 : 0.3); }
  setNow(on) {
    this.now = on;
    gsap.to(this, { sweep: on ? 95 : -95, duration: state.reduced ? 0.01 : 3.2, ease: 'power2.inOut' });
    gsap.fromTo(this.sweepMesh.material.uniforms.uA, { value: 1 }, { value: 0, duration: 3.6, ease: 'power2.in' });
    gsap.to(this.waterU.uNow, { value: on ? 1 : 0, duration: 3 });
    this.setMood(on ? 'today' : (STOPS[this.stop] ? STOPS[this.stop].mood : 'gold'));
  }
  setMood(name, dur = 2) {
    const L = LIGHT[name]; if (!L) return;
    const from = { sun: this.sun.color.clone(), sky: this.skyU.uTop.value.clone(), hor: this.skyU.uHor.value.clone(), ground: this.hemi.groundColor.clone(), hemi: this.hemi.color.clone(), fog: this.scene.fog.color.clone(), dir: this.sunDir ? this.sunDir.clone() : new THREE.Vector3(...L.dir).normalize(), sunI: this.sun.intensity, hemiI: this.hemi.intensity };
    const to = { sun: col(L.sun), sky: col(L.sky), hor: col(L.hor), ground: col(L.ground), hemi: col(L.hemi), fog: col(L.fog), dir: new THREE.Vector3(...L.dir).normalize() };
    const tw = { k: 0 };
    const apply = () => {
      const k = tw.k;
      this.sun.color.copy(from.sun).lerp(to.sun, k); this.skyU.uTop.value.copy(from.sky).lerp(to.sky, k); this.skyU.uHor.value.copy(from.hor).lerp(to.hor, k);
      this.hemi.color.copy(from.hemi).lerp(to.hemi, k); this.hemi.groundColor.copy(from.ground).lerp(to.ground, k); this.scene.fog.color.copy(from.fog).lerp(to.fog, k);
      this.sunDir = from.dir.clone().lerp(to.dir, k).normalize(); this.sun.intensity = from.sunI + (L.sunI - from.sunI) * k; this.hemi.intensity = from.hemiI + (L.hemiI - from.hemiI) * k;
      this.skyU.uSun.value.copy(this.sunDir); this.skyU.uSunCol.value.copy(this.sun.color); this.waterU.uSky.value.copy(this.skyU.uTop.value); this.waterU.uFog.value.copy(this.scene.fog.color);
      this.cloudU.uShade.value.copy(this.hemi.color).lerp(this.skyU.uTop.value, 0.4);
    };
    if (dur <= 0 || state.snap) { tw.k = 1; apply(); return; }
    gsap.to(tw, { k: 1, duration: dur, ease: 'sine.inOut', onUpdate: apply });
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 58 : 42; this.camera.updateProjectionMatrix(); this.w = w; this.h = h; }
  drag(dx, dy) { this.look.yaw = Math.max(-0.9, Math.min(0.9, this.look.yaw - dx * 0.004)); this.look.pitch = Math.max(-0.35, Math.min(0.35, this.look.pitch + dy * 0.003)); this.dragging = true; }
  pick(nx, ny) {
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const bh = ray.intersectObject(this.bridge.g, true)[0];
    let best = null;
    for (const cr of this.crowds) { if ((cr.era === 'now') !== this.now) continue; cr.body.computeBoundingSphere(); const hit = ray.intersectObject(cr.body, false)[0]; if (hit && (!best || hit.distance < best.distance)) best = hit; }
    if (bh && (!best || bh.distance < best.distance)) return { type: 'bridge' };
    return best ? { type: 'person' } : null;
  }

  update(dt) {
    this.time += dt; const t = this.time; uTime.value = t;
    this.skyU.uTime.value = t; this.waterU.uTime.value = t; this.lanternU.uTime.value = t;
    this.thenPlane.constant = -this.sweep; this.nowPlane.constant = this.sweep; this.sweepGroup.position.x = this.sweep;
    const L = state.reduced || state.snap ? 30 : 1.25;
    for (const k of ['x', 'y', 'z']) { this.camPos[k] = damp(this.camPos[k], this.tPos[k], L, dt); this.camLook[k] = damp(this.camLook[k], this.tLook[k], L * 1.2, dt); }
    if (!this.dragging) { this.look.yaw *= Math.pow(0.35, dt); this.look.pitch *= Math.pow(0.35, dt); } this.dragging = false;
    const px = state.touch ? 0 : state.pointer.nx, py = state.touch ? 0 : state.pointer.ny;
    const cam = this.camera; cam.position.copy(this.camPos); cam.position.y += Math.sin(t * 0.5) * 0.06;
    const dir = new THREE.Vector3().subVectors(this.camLook, this.camPos);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.look.yaw + px * -0.06);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(); dir.applyAxisAngle(right, this.look.pitch + py * -0.04);
    cam.lookAt(this.camPos.x + dir.x, this.camPos.y + dir.y, this.camPos.z + dir.z);
    this.sky.position.copy(cam.position); this.clouds.position.set(cam.position.x * 0.9, 0, cam.position.z * 0.9); this.clouds.rotation.y = t * 0.004;
    const sd = this.sunDir || new THREE.Vector3(0, 1, 0);
    this.sun.position.set(this.camLook.x + sd.x * 100, sd.y * 100, this.camLook.z + sd.z * 100); this.sun.target.position.set(this.camLook.x, 0, this.camLook.z);
    this.ships.forEach((s, i) => { s.rotation.z = Math.sin(t * 0.8 + i) * 0.025; s.rotation.x = Math.sin(t * 0.6 + i * 2) * 0.015; });
    for (const f of this.flags) { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(t * 4 + x * 5) * 0.12 * (x + 0.7)); } p.needsUpdate = true; }
    for (const cr of this.crowds) {
      if ((cr.era === 'now' && this.sweep < -80) || (cr.era === 'then' && this.sweep > 80)) { cr.group.visible = false; continue; } cr.group.visible = true;
      for (let i = 0; i < cr.count; i++) {
        const a = cr.items[i]; const pth = this.paths[a.path];
        if (!a.idle) a.t = (a.t + (a.speed * dt) / pth.len + 1) % 1;
        const pt = pth.c.getPointAt(a.t); const tg = pth.c.getTangentAt(a.t);
        const yaw = Math.atan2(tg.x * Math.sign(a.speed), tg.z * Math.sign(a.speed));
        cr.set(i, pt.x + tg.z * a.off, 0.12, pt.z - tg.x * a.off, yaw, a.idle ? 0 : 1, t + a.ph, a.sc, a.ph);
      }
      cr.commit();
    }
    for (const c of this.cars) { c.x += c.v * dt; if (c.x > 29) c.x = -29; if (c.x < -29) c.x = 29; c.m.position.set(c.x, 0.1, c.z); c.m.rotation.y = c.v > 0 ? 0 : Math.PI; }
    this.boats.forEach((b, i) => {
      b.t = (b.t + b.v * dt) % 1; let x, z, ry;
      if (b.lane === 'kb') { z = -18 + b.t * 46; x = b.side; ry = -Math.PI / 2; }
      else if (b.lane === 'ca') { x = -26 + b.t * 52; z = b.side; ry = 0; }
      else { const a = b.t * Math.PI * 2; x = Math.cos(a + b.side) * 30; z = -42 + Math.sin(a + b.side) * 10; ry = -a - b.side; }
      b.m.position.set(x, -0.34 + Math.sin(t * 2 + i) * 0.03, z); b.m.rotation.y = ry;
      const vis = (b.era === 'now') === (this.sweep > 0);
      this.rowers.set(i, x - Math.cos(ry) * 0.6, vis ? -0.12 : -50, z + Math.sin(ry) * 0.6, ry + Math.PI / 2, 0.5, t * 0.6 + i, 1, i);
    });
    this.rowers.commit();
    for (const a of this.animals) {
      if (a.kind === 'chicken') { a.m.rotation.z = Math.max(0, Math.sin(t * 3 + a.ph)) * 0.6; a.m.position.x = a.base.x + Math.sin(t * 0.3 + a.ph) * 0.6; a.m.rotation.y = a.ph + Math.sin(t * 0.3 + a.ph) * 2; }
      else a.m.rotation.z = Math.sin(t * 1.5 + a.ph) * 0.03;
    }
    for (const b of this.birds) { b.a += b.s * dt; b.g.position.set(b.cx + Math.cos(b.a) * b.r, b.h + Math.sin(t + b.r) * 0.6, b.cz + Math.sin(b.a) * b.r); b.g.rotation.y = -b.a; const f = Math.sin(t * 9 + b.r) * 0.6; b.wl.rotation.x = f; b.wr.rotation.x = -f; }
  }
  render(r) { r.render(this.scene, this.camera); }
}
