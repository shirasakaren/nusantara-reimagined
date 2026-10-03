// The Archipelago: an antique, living map of Nusantara built from real coastlines.
import * as THREE from 'three';
import data from '../data/archipelago.json';
import { MAP, MAP_W, MAP_H, project, PLACES, FOCUS, ROUTES, ROAD, VOLCANOES, CITIES } from './geo.js';
import { makeNoise, mulberry, GLSL_NOISE } from './noise.js';
import { state } from '../core/state.js';
import { Builder, P, M, toonMat, geo, INK } from './toon.js';
import { indiaman, pinisi } from './assets.js';

const C = (h) => new THREE.Color(h);
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

export const MOODS = {
  dawn:    { top: '#7fb6ff', hor: '#ffd9c2', fog: '#ffd2c8', deep: '#3a8fd8', shallow: '#7fd8e8', line: '#ffffff', land1: '#8fd46a', land2: '#5fb05a', nb: '#e8dcc2', sea0: '#3a7fc8', ink: '#2a2245', sun: '#fff1dc', sunDir: [-0.6, 0.55, -0.5], amb: 0.62, stars: 0.1, lights: 0, spec: 0.8, paper: 0 },
  trade:   { top: '#5ab4ff', hor: '#fff2d2', fog: '#dff0ff', deep: '#2f9be0', shallow: '#76e0e0', line: '#ffffff', land1: '#9ae070', land2: '#5fbf5a', nb: '#efe2c4', sea0: '#2f8fd8', ink: '#2a2245', sun: '#ffffff', sunDir: [0.5, 0.8, -0.3], amb: 0.66, stars: 0, lights: 0, spec: 0.8, paper: 0 },
  company: { top: '#6fb0f2', hor: '#ffe6bc', fog: '#f6e2c4', deep: '#348fd0', shallow: '#86d8d2', line: '#fff6dc', land1: '#a6d872', land2: '#6ab45a', nb: '#efdcb8', sea0: '#348ad0', ink: '#2a2245', sun: '#fff0d0', sunDir: [0.7, 0.55, 0.2], amb: 0.62, stars: 0, lights: 0, spec: 0.8, paper: 0 },
  iron:    { top: '#8fb2d8', hor: '#e6e8ee', fog: '#e2e6ee', deep: '#4a86c0', shallow: '#8ccad6', line: '#ffffff', land1: '#9ccf7a', land2: '#6aa65e', nb: '#e2dccd', sea0: '#4a80b8', ink: '#2a2245', sun: '#ffffff', sunDir: [-0.3, 0.7, 0.6], amb: 0.66, stars: 0, lights: 0, spec: 0.5, paper: 0 },
  sugar:   { top: '#ffb27a', hor: '#ffe2a8', fog: '#ffe0b8', deep: '#3a86c0', shallow: '#86ccc0', line: '#fff3d6', land1: '#b8d46a', land2: '#86b04e', nb: '#f2dcb0', sea0: '#3a7ab8', ink: '#2a2245', sun: '#ffe0b0', sunDir: [0.8, 0.4, -0.2], amb: 0.6, stars: 0, lights: 0, spec: 0.8, paper: 0 },
  awake:   { top: '#64c8ff', hor: '#e8fff2', fog: '#e2f6f0', deep: '#2fa0d8', shallow: '#7ae6d6', line: '#ffffff', land1: '#8fe07a', land2: '#4fbf6a', nb: '#e6e6d2', sea0: '#2f96d0', ink: '#2a2245', sun: '#ffffff', sunDir: [-0.4, 0.75, -0.4], amb: 0.68, stars: 0, lights: 0, spec: 0.7, paper: 0 },
  dark:    { top: '#2a2f5a', hor: '#6a6f9a', fog: '#4a4f78', deep: '#2a3f78', shallow: '#4a6a98', line: '#c9d4ff', land1: '#5a8a6a', land2: '#3f6a5a', nb: '#8a8aa0', sea0: '#283a70', ink: '#14112a', sun: '#c9d4ff', sunDir: [0.2, 0.55, 0.8], amb: 0.55, stars: 0, lights: 0.2, spec: 0.5, paper: 0 },
  joy:     { top: '#4ab8ff', hor: '#fff6e6', fog: '#eaf6ff', deep: '#2aa0f0', shallow: '#6ae6e8', line: '#ffffff', land1: '#9ee67a', land2: '#5ac85e', nb: '#f2e6cc', sea0: '#2a96e8', ink: '#2a2245', sun: '#ffffff', sunDir: [0.3, 0.9, -0.2], amb: 0.7, stars: 0, lights: 0, spec: 0.9, paper: 0 },
  fight:   { top: '#ff9a7a', hor: '#ffd6a8', fog: '#ffc8a8', deep: '#3a7ac0', shallow: '#86c2c8', line: '#fff0dc', land1: '#a8cc6a', land2: '#78a852', nb: '#f2d6b8', sea0: '#3a70b8', ink: '#2a2245', sun: '#ffc89a', sunDir: [-0.8, 0.35, 0.1], amb: 0.6, stars: 0, lights: 0.2, spec: 0.8, paper: 0 },
  paper:   { top: '#cfe6ff', hor: '#fff7e8', fog: '#fff4e2', deep: '#9fd0f2', shallow: '#c8ecf2', line: '#ffffff', land1: '#c8e6a0', land2: '#a8d48a', nb: '#f6ead2', sea0: '#9fcaee', ink: '#2a2245', sun: '#ffffff', sunDir: [0.3, 0.8, 0.2], amb: 0.75, stars: 0, lights: 0, spec: 0, paper: 0 },
  modern:  { top: '#1c1f4a', hor: '#5a4fa0', fog: '#3a3a78', deep: '#1f3a8a', shallow: '#3a6ab8', line: '#7ff0ff', land1: '#4a8a7a', land2: '#2f6a62', nb: '#6a6a8a', sea0: '#1c3080', ink: '#0c0a20', sun: '#b9d8ff', sunDir: [0.4, 0.6, -0.6], amb: 0.55, stars: 0.6, lights: 1, spec: 0.6, paper: 0 },
  night:   { top: '#141a46', hor: '#4a3f8a', fog: '#2f2f6a', deep: '#1f3480', shallow: '#3a5aa8', line: '#ffe08a', land1: '#3f7a6a', land2: '#2a5a52', nb: '#5a5a7a', sea0: '#1a2a70', ink: '#0c0a20', sun: '#d8e2ff', sunDir: [-0.5, 0.5, -0.6], amb: 0.52, stars: 1, lights: 0.7, spec: 0.9, paper: 0 },
  play:    null,
};
MOODS.play = MOODS.paper;

function smooth(e0, e1, x) { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

function boxBlur(src, w, h, r, passes = 3) {
  let a = Float32Array.from(src); let b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0; const row = y * w;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

const COMMON = /* glsl */`
uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;
uniform float uPaper; uniform vec3 uPaperA; uniform vec3 uPaperB;
vec3 finish(vec3 col, vec3 wp){
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(col, mix(uPaperA, uPaperB, smoothstep(0.1, 0.9, l)), uPaper);
  float d = distance(wp, cameraPosition);
  float f = smoothstep(uFogNear, uFogFar, d);
  return mix(col, uFogCol, f);
}`;

export class MapScene {
  constructor(renderer, { lite = false } = {}) {
    this.renderer = renderer;
    this.lite = lite;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 600);
    this.time = 0;
    this.noise = makeNoise(7);
    this.rig = { lon: FOCUS.gate[0], lat: FOCUS.gate[1], dist: FOCUS.gate[2], tilt: FOCUS.gate[3], az: FOCUS.gate[4] };
    this.target = { ...this.rig };
    this.parallax = { x: 0, y: 0 };
    this.mouseNdc = new THREE.Vector2(9, 9);
    this.uniforms = this.makeUniforms();
    this.moodName = 'dawn';
    this.hemi = new THREE.HemisphereLight(0xdff0ff, 0x8a7a5a, 1.5); this.sunL = new THREE.DirectionalLight(0xffffff, 2.2); this.scene.add(this.hemi, this.sunL);
    this.buildFields();
    this.buildTerrain();
    this.buildWater();
    this.buildSky();
    this.buildClouds();
    this.buildMarkers();
    this.buildRoutes();
    this.buildRoad();
    this.buildShips();
    this.buildRain();
    this.buildLights();
    this.buildEruption();
    this.applyMood('dawn', 0);
  }

  makeUniforms() {
    return {
      uTime: { value: 0 }, uMask: { value: null }, uField: { value: null },
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: C('#fff') }, uAmb: { value: 0.6 },
      uLand1: { value: C('#9aa86b') }, uLand2: { value: C('#6b7046') }, uNb: { value: C('#aaa') },
      uSea0: { value: C('#13243b') }, uInk: { value: C('#2a1d14') },
      uDeep: { value: C('#0f2240') }, uShallow: { value: C('#3f6f86') }, uLine: { value: C('#e9c88f') },
      uTop: { value: C('#2a2f5c') }, uHor: { value: C('#e8a77a') }, uStars: { value: 0 }, uSpec: { value: 0.6 },
      uFogCol: { value: C('#c98d73') }, uFogNear: { value: 30 }, uFogFar: { value: 120 },
      uPaper: { value: 0 }, uPaperA: { value: C('#8a6a44') }, uPaperB: { value: C('#f3e8cf') },
      uLights: { value: 0 }, uRain: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) }, uDim: { value: 0 },
      uFocus: { value: new THREE.Vector3(0, 0, 0) },
    };
  }

  // ---------- data fields ----------
  buildFields() {
    const W = this.lite ? 2048 : 4096, H = W / 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const px = (lon) => ((lon - MAP.lon0) / MAP_W) * W;
    const py = (lat) => ((MAP.lat1 - lat) / MAP_H) * H;
    const drawSet = (filter, style, op) => {
      ctx.globalCompositeOperation = op; ctx.fillStyle = style;
      for (const c of data) {
        if (!filter(c)) continue;
        ctx.beginPath();
        for (const ring of c.polys) {
          ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(px(lon), py(lat)) : ctx.moveTo(px(lon), py(lat))));
          ctx.closePath();
        }
        ctx.fill('nonzero');
      }
    };
    drawSet(() => true, 'rgb(255,0,0)', 'source-over');
    drawSet((c) => c.name === 'Indonesia', 'rgb(0,255,0)', 'lighter');
    ctx.globalCompositeOperation = 'source-over';
    this.maskCanvas = cv;
    const mask = new THREE.CanvasTexture(cv);
    mask.colorSpace = THREE.NoColorSpace; mask.minFilter = THREE.LinearMipmapLinearFilter; mask.magFilter = THREE.LinearFilter;
    mask.anisotropy = 4; mask.generateMipmaps = true;
    this.uniforms.uMask.value = mask;

    // low-res fields for heights and contour lines
    const fw = 512, fh = 256;
    const small = document.createElement('canvas'); small.width = fw; small.height = fh;
    const sctx = small.getContext('2d'); sctx.drawImage(cv, 0, 0, fw, fh);
    const img = sctx.getImageData(0, 0, fw, fh).data;
    const land = new Float32Array(fw * fh), indo = new Float32Array(fw * fh);
    for (let i = 0; i < fw * fh; i++) { land[i] = img[i * 4] / 255; indo[i] = img[i * 4 + 1] / 255; }
    const b1 = boxBlur(land, fw, fh, 1, 2), b2 = boxBlur(land, fw, fh, 5, 3), b3 = boxBlur(land, fw, fh, 18, 3), bi = boxBlur(indo, fw, fh, 2, 2);
    const out = new Uint8Array(fw * fh * 4);
    for (let i = 0; i < fw * fh; i++) {
      // texture rows go bottom to top
      const y = Math.floor(i / fw), x = i % fw; const j = (fh - 1 - y) * fw + x;
      out[j * 4] = Math.min(255, b1[i] * 255); out[j * 4 + 1] = Math.min(255, b2[i] * 255);
      out[j * 4 + 2] = Math.min(255, b3[i] * 255); out[j * 4 + 3] = Math.min(255, bi[i] * 255);
    }
    const ft = new THREE.DataTexture(out, fw, fh, THREE.RGBAFormat);
    ft.minFilter = THREE.LinearFilter; ft.magFilter = THREE.LinearFilter; ft.needsUpdate = true;
    this.uniforms.uField.value = ft;
    this.field = { w: fw, h: fh, b1, b2, b3, land };
  }

  sampleField(arr, lon, lat) {
    const { w, h } = this.field;
    const fx = ((lon - MAP.lon0) / MAP_W) * (w - 1), fy = ((MAP.lat1 - lat) / MAP_H) * (h - 1);
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(fy)));
    const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
    const a = arr[y0 * w + x0], b = arr[y0 * w + x0 + 1], c = arr[(y0 + 1) * w + x0], d = arr[(y0 + 1) * w + x0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  heightAt(lon, lat) {
    const f = this.field;
    if (lon < MAP.lon0 || lon > MAP.lon1 || lat < MAP.lat0 || lat > MAP.lat1) return -1.2;
    const ex = Math.min(1, (lon - MAP.lon0) / 2.5, (MAP.lon1 - lon) / 2.5), ey = Math.min(1, (lat - MAP.lat0) / 2.5, (MAP.lat1 - lat) / 2.5);
    const edge = Math.max(0, Math.min(ex, ey));
    const s = this.sampleField(f.b1, lon, lat) * edge, m = this.sampleField(f.b2, lon, lat) * edge, L = this.sampleField(f.b3, lon, lat);
    let h = (s - 0.55) * 0.42;
    if (s < 0.55) h -= (1 - L) * 0.9 * smooth(0.55, 0.0, s);
    const inland = smooth(0.5, 0.98, m);
    h += inland * 0.22;
    const n = this.noise.fbm(lon * 0.55, lat * 0.55, 4);
    h += Math.pow(Math.abs(n), 1.4) * inland * 0.7;
    h += this.noise.fbm(lon * 2.4, lat * 2.4, 2) * 0.05 * smooth(0.45, 0.8, s);
    for (const [vl, va, amp] of VOLCANOES) {
      const dx = lon - vl, dy = lat - va; const d2 = dx * dx + dy * dy;
      if (d2 < 1.2) h += amp * 0.5 * Math.exp(-d2 / 0.045) * smooth(0.3, 0.7, s);
    }
    return h;
  }

  buildTerrain() {
    const sx = this.lite ? 320 : 560, sy = sx / 2;
    const geo = new THREE.PlaneGeometry(MAP_W, MAP_H, sx, sy);
    geo.rotateX(-Math.PI / 2);
    // plane spans x -32..32 and z -16..16, matching project()
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const lon = x + MAP.cx, lat = -z + MAP.cy;
      pos.setY(i, this.heightAt(lon, lat));
      uv.setXY(i, (lon - MAP.lon0) / MAP_W, (lat - MAP.lat0) / MAP_H);
    }
    geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        varying vec2 vUv; varying vec3 vPos; varying vec3 vN; varying float vH;
        void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vPos = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vH = position.y;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMask; uniform sampler2D uField; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uAmb;
        uniform vec3 uLand1; uniform vec3 uLand2; uniform vec3 uNb; uniform vec3 uSea0; uniform vec3 uInk; uniform float uTime;
        uniform float uLights; uniform float uDim; uniform vec3 uFocus;
        varying vec2 vUv; varying vec3 vPos; varying vec3 vN; varying float vH;
        ${GLSL_NOISE}
        ${COMMON}
        void main(){
          vec4 m = texture2D(uMask, vUv); vec4 f = texture2D(uField, vUv);
          float edge = smoothstep(0.0, 0.035, vUv.x) * smoothstep(1.0, 0.965, vUv.x) * smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
          float land = m.r * edge; float indo = smoothstep(0.2, 0.8, m.g);
          vec3 n = normalize(vN); float diff = max(dot(n, normalize(uSun)), 0.0);
          float sp = snoise(vPos.xz * 2.0) * 0.5 + 0.5;
          float band = floor(clamp(vH, 0.0, 1.2) * 5.0 + sp * 0.6) / 5.0;
          vec3 lc = mix(uLand1, uLand2, smoothstep(0.1, 0.5, band));
          lc = mix(lc, vec3(0.86, 0.74, 0.52), smoothstep(0.55, 0.75, band));
          lc = mix(lc, vec3(0.98, 0.96, 0.92), smoothstep(0.92, 1.0, band));
          float beach = smoothstep(0.62, 0.52, f.r) * step(0.5, land);
          lc = mix(lc, vec3(1.0, 0.9, 0.66), beach * 0.75);
          lc = mix(lc, uNb, (1.0 - indo) * 0.8);
          float toon = diff > 0.55 ? 1.0 : diff > 0.2 ? 0.82 : 0.66;
          vec3 col = lc * (uAmb * 0.55 + toon * 0.62) * mix(vec3(1.0), uSunCol, 0.4);
          // ink coastline
          float w = fwidth(land) * 2.2 + 0.003; float e = abs(land - 0.5);
          float ink = 1.0 - smoothstep(0.0, w, e);
          vec3 sea = uSea0 * (0.7 + 0.3 * f.b);
          col = mix(sea, col, smoothstep(0.45, 0.55, land));
          col = mix(col, uInk, ink);
          // city glow hint for night moods
          col += vec3(1.0, 0.75, 0.4) * uLights * 0.05 * step(0.5, land) * indo;
          // focus glow
          float fd = distance(vPos.xz, uFocus.xy);
          col += vec3(1.0, 0.85, 0.55) * 0.08 * uFocus.z * smoothstep(1.2, 0.0, fd) * step(0.5, land);
          col *= 1.0 - uDim * 0.6;
          gl_FragColor = vec4(finish(col, vPos), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.terrain = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrain);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(420, 420, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`varying vec3 vPos; void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vPos = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMask; uniform sampler2D uField; uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uLine;
        uniform vec3 uSun; uniform vec3 uSunCol; uniform float uSpec; uniform vec3 uHor; uniform float uDim; uniform float uLights;
        varying vec3 vPos;
        ${GLSL_NOISE}
        ${COMMON}
        void main(){
          vec2 uv = vec2((vPos.x + 32.0) / 64.0, (-vPos.z + 16.0) / 32.0);
          float inb = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          vec4 m = texture2D(uMask, clamp(uv, 0.0, 1.0)); vec4 f = texture2D(uField, clamp(uv, 0.0, 1.0)) * inb;
          float edge = smoothstep(0.0, 0.035, uv.x) * smoothstep(1.0, 0.965, uv.x) * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
          if (m.r * inb * edge > 0.5) discard;
          float near = f.r, mid = f.g, far = f.b;
          float depth = clamp(smoothstep(0.0, 0.55, mid) * 0.8 + near * 0.4, 0.0, 1.0);
          vec3 col = mix(uDeep, uShallow, floor(depth * 3.0) / 3.0);
          // white cartoon contour lines and foam around every coast
          float d = mid * 0.65 + far * 0.35;
          float k = d * 10.0; float l = abs(fract(k - uTime * 0.04) - 0.5);
          float line = (1.0 - smoothstep(0.0, fwidth(k) * 1.6 + 0.02, l)) * smoothstep(0.02, 0.08, d) * (1.0 - smoothstep(0.24, 0.4, d));
          col = mix(col, uLine, line * 0.55);
          float foam = smoothstep(0.32, 0.4, near) * (1.0 - smoothstep(0.47, 0.5, near));
          col = mix(col, vec3(1.0), foam * (0.75 + 0.25 * sin(uTime * 2.0 + vPos.x * 3.0)));
          vec2 q = vPos.xz * 1.4;
          float wv = snoise(q + vec2(uTime * 0.12, uTime * 0.07));
          col = mix(col, col * 1.08, step(0.35, wv));
          float spark = step(0.94, snoise(vPos.xz * 6.0 + uTime * 0.5)) * uSpec * (1.0 - near);
          col += spark * 0.6;
          vec3 V = normalize(cameraPosition - vPos);
          float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
          col = mix(col, uHor, fres * 0.4);
          col *= 1.0 - uDim * 0.6;
          gl_FragColor = vec4(finish(col, vPos), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = 0;
    this.scene.add(this.water);
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(300, 32, 16);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false,
      vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uStars; uniform float uTime; uniform vec3 uFogCol;
        varying vec3 vDir;
        ${GLSL_NOISE}
        void main(){
          vec3 d = normalize(vDir); float t = d.y;
          vec3 col = mix(uFogCol, uHor, smoothstep(-0.2, 0.02, t));
          col = mix(col, uTop, smoothstep(0.02, 0.55, t));
          float s = max(dot(d, normalize(uSun)), 0.0);
          col += uSunCol * (pow(s, 6.0) * 0.25 + pow(s, 600.0) * 1.2);
          vec2 sp = d.xz / (d.y + 1.2) * 180.0;
          float h = hash12(floor(sp)); float star = step(0.985, h) * smoothstep(0.0, 0.3, t);
          star *= 0.6 + 0.4 * sin(uTime * 2.0 + h * 40.0);
          col += vec3(1.0, 0.95, 0.85) * star * uStars;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  buildClouds() {
    const protos = [];
    for (let v = 0; v < 5; v++) {
      const r = mulberry(20 + v); const b = new Builder({ outline: 0.06 });
      const n = 5 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) { const x = (k - n / 2) * 0.55 + r() * 0.2, y = Math.sin((k / (n - 1)) * Math.PI) * 0.45 + r() * 0.15; b.add(P('ico', 0.45 + r() * 0.35, 2), '#ffffff', M(x, y, (r() - 0.5) * 0.5), 0.05); }
      b.add(P('ico', 1, 2), '#ffffff', M(0, -0.05, 0, 0, 0, 0, n * 0.3, 0.35, 0.6), 0.05);
      protos.push(b.build());
    }
    this.clouds = []; const r = mulberry(11); const n = this.lite ? 12 : 18;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(protos[i % protos.length], toonMat({ rim: 0.15 }));
      const sc = 0.95 + r() * 1.0; m.scale.set(sc, sc * 0.8, sc);
      m.position.set(-34 + r() * 68, 1.4 + r() * 1.4, -16 + r() * 32); m.rotation.y = r() * 6;
      m.userData = { speed: 0.12 + r() * 0.16, base: sc, bob: r() * 6 };
      this.scene.add(m); this.clouds.push(m);
    }
  }

  buildMarkers() {
    this.markers = {};
    const pin = geo((b) => {
      b.add(P('sphere', 0.32, 18, 14), '#ff5b4d', M(0, 1.05, 0), 0.05);
      b.add(P('cone', 0.27, 0.62, 16), '#ff5b4d', M(0, 0.62, 0, Math.PI, 0, 0), 0.05);
      b.add(P('sphere', 0.14, 12, 10), '#ffffff', M(0, 1.1, 0.22, 0, 0, 0, 1, 1, 0.5), 0);
    });
    const ringGeo = new THREE.RingGeometry(0.4, 0.5, 40); ringGeo.rotateX(-Math.PI / 2);
    const shadowGeo = new THREE.CircleGeometry(0.3, 24); shadowGeo.rotateX(-Math.PI / 2);
    const pinMat = toonMat({ rim: 0.3 });
    const labels = document.getElementById('labels');
    for (const [id, p] of Object.entries(PLACES)) {
      const g = new THREE.Group();
      const { x, z } = project(p.lon, p.lat);
      const y = Math.max(0.02, this.heightAt(p.lon, p.lat) + 0.02);
      g.position.set(x, y, z);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      const dot = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x2a2245, transparent: true, opacity: 0, depthWrite: false }));
      const pinM = new THREE.Mesh(pin, pinMat);
      g.add(ring, dot, pinM);
      this.scene.add(g);
      const el = document.createElement('div'); el.className = 'mlabel';
      el.innerHTML = `${p.name}${p.note ? `<small>${p.note}</small>` : ''}`;
      labels.appendChild(el);
      this.markers[id] = { g, ring, dot, pin: pinM, el, on: 0, target: 0, y, dy: p.dy || 0, phase: Math.random() * 6 };
    }
    // little toon forests scattered over the land
    const tg = geo((b) => { b.add(P('cyl', 0.03, 0.04, 0.12, 6), '#8a5a32', M(0, 0.06, 0), 0.012); b.add(P('ico', 0.11, 1), '#5fb05a', M(0, 0.2, 0), 0.015); b.add(P('ico', 0.07, 1), '#8fd46a', M(0.04, 0.27, 0.02), 0.01); });
    const pts = []; const rnd = mulberry(31);
    for (let i = 0; i < (this.lite ? 2500 : 6000) && pts.length < (this.lite ? 700 : 1500); i++) {
      const lo = 94 + rnd() * 48, la = -10.5 + rnd() * 17; if (this.sampleField(this.field.b1, lo, la) < 0.75) continue;
      const h = this.heightAt(lo, la); if (h > 0.7) continue; pts.push([lo, la, h]);
    }
    const im = new THREE.InstancedMesh(tg, toonMat({ rim: 0.2, sway: 0.4 }), pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), e = new THREE.Euler();
    pts.forEach(([lo, la, h], i) => { const { x, z } = project(lo, la); const sc = 0.55 + rnd() * 0.6; m4.compose(pv.set(x, h, z), q.setFromEuler(e.set(0, rnd() * 6, 0)), sv.setScalar(sc)); im.setMatrixAt(i, m4); });
    this.forest = im; this.scene.add(im);
    this._v = new THREE.Vector3();
  }

  curveFrom(points, lift = 0.25) {
    const pts = points.map(([lon, lat]) => { const { x, z } = project(lon, lat); return new THREE.Vector3(x, 0, z); });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const len = curve.getLength();
    const samples = curve.getSpacedPoints(160).map((p, i, a) => { const t = i / (a.length - 1); p.y = 0.06 + Math.sin(t * Math.PI) * Math.min(1.6, len * 0.04) * lift / 0.25; return p; });
    return { curve: new THREE.CatmullRomCurve3(samples), len };
  }

  routeMaterial(color) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: this.uniforms.uTime, uProg: { value: 0 }, uAlpha: { value: 0 }, uColor: { value: C(color) }, uLen: { value: 10 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform float uProg; uniform float uAlpha; uniform vec3 uColor; uniform float uLen; varying vec2 vUv;
        void main(){ float show = smoothstep(uProg, uProg - 0.02, vUv.x);
          float dash = step(0.45, fract(vUv.x * uLen * 2.2 - uTime * 0.8));
          float head = smoothstep(uProg - 0.06, uProg, vUv.x) * show;
          float a = show * (0.35 + 0.65 * dash) * uAlpha + head * uAlpha * 1.5;
          gl_FragColor = vec4(uColor * (1.0 + head * 2.0), a); }`,
    });
  }

  buildRoutes() {
    this.routes = {};
    const colors = { portugal: '#ffd88a', spain: '#ffb48a', dutch: '#ff9e4a', voc: '#ffcf6a', modern: '#47e3ef', modern2: '#47e3ef', modern3: '#47e3ef' };
    for (const [id, pts] of Object.entries(ROUTES)) {
      const { curve, len } = this.curveFrom(pts, id.startsWith('modern') ? 0.35 : 0.25);
      const geo = new THREE.TubeGeometry(curve, 200, 0.03, 5, false);
      const mat = this.routeMaterial(colors[id]); mat.uniforms.uLen.value = len;
      const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3;
      this.scene.add(mesh);
      this.routes[id] = { mesh, mat, curve, on: 0 };
    }
  }

  buildRoad() {
    const pts = ROAD.map(([lon, lat]) => { const { x, z } = project(lon, lat); return new THREE.Vector3(x, Math.max(0.03, this.heightAt(lon, lat) + 0.04), z); });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 400, 0.028, 5, false);
    const mat = this.routeMaterial('#ff6a4a'); mat.uniforms.uLen.value = 2;
    this.road = { mesh: new THREE.Mesh(geo, mat), mat, curve, prog: 0, target: 0 };
    this.road.mesh.renderOrder = 4;
    this.scene.add(this.road.mesh);
  }

  makeShip(kind = 'old') {
    if (!this.shipGeo) { this.shipGeo = { old: geo((b) => indiaman(b), { outline: 0.06 }), modern: geo((b) => pinisi(b, '#ffc93c'), { outline: 0.06 }) }; }
    const m = new THREE.Mesh(this.shipGeo[kind], toonMat({ rim: 0.25 }));
    const g = new THREE.Group(); m.scale.setScalar(0.06); m.rotation.y = Math.PI; g.add(m); return g;
  }

  buildShips() {
    this.ships = [];
    const plan = [['portugal', 2], ['spain', 1], ['dutch', 2], ['voc', 3], ['modern', 2], ['modern2', 2], ['modern3', 2]];
    for (const [rid, n] of plan) {
      for (let i = 0; i < n; i++) {
        const s = this.makeShip(rid.startsWith('modern') ? 'modern' : 'old'); s.visible = false;
        this.scene.add(s);
        this.ships.push({ s, rid, t: i / n, speed: 0.012 + Math.random() * 0.01 });
      }
    }
  }

  buildRain() {
    const n = this.lite ? 1600 : 3200;
    const pos = new Float32Array(n * 6); const seed = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 16, y = Math.random() * 10, z = (Math.random() - 0.5) * 16;
      pos.set([x, y, z, x + 0.02, y - 0.35, z], i * 6);
      const s = Math.random(); seed.set([s, s], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime: this.uniforms.uTime, uRain: this.uniforms.uRain, uMouse: this.uniforms.uMouse, uCenter: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */`attribute float seed; uniform float uTime; uniform vec3 uCenter; varying float vA; uniform vec2 uMouse;
        void main(){ vec3 p = position; float fall = mod(p.y - uTime * (7.0 + seed * 4.0), 10.0); float dy = fall - p.y; p.y = fall + 0.0;
          p.x += uCenter.x; p.z += uCenter.z; p.y += uCenter.y - 2.0;
          vec4 cp = projectionMatrix * viewMatrix * vec4(p, 1.0); gl_Position = cp;
          vec2 ndc = cp.xy / cp.w; float md = distance(ndc * vec2(1.6, 1.0), uMouse * vec2(1.6, 1.0));
          vA = smoothstep(0.08, 0.4, md) * (0.4 + seed * 0.5); }`,
      fragmentShader: /* glsl */`uniform float uRain; varying float vA; void main(){ gl_FragColor = vec4(0.85, 0.9, 1.0, vA * uRain); }`,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false; this.rain.visible = false;
    this.scene.add(this.rain);
  }

  buildLights() {
    const rnd = mulberry(5); const pts = []; const sizes = [];
    for (const [lon, lat, s] of CITIES) {
      for (let i = 0; i < 6 + s * 30; i++) {
        const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 2) * 0.35 * (0.5 + s);
        const lo = lon + Math.cos(a) * r, la = lat + Math.sin(a) * r;
        if (this.sampleField(this.field.land, lo, la) < 0.5) continue;
        const { x, z } = project(lo, la); pts.push(x, Math.max(0.02, this.heightAt(lo, la)) + 0.03, z); sizes.push(0.6 + rnd() * s * 1.6);
      }
    }
    for (let i = 0; i < 2600; i++) {
      const lo = 95 + rnd() * 46, la = -10 + rnd() * 16;
      if (this.sampleField(this.field.land, lo, la) < 0.6) continue;
      const java = lo > 105 && lo < 115 && la < -5.8 && la > -8.8 ? 1 : 0.18;
      if (rnd() > java) continue;
      const { x, z } = project(lo, la); pts.push(x, Math.max(0.02, this.heightAt(lo, la)) + 0.03, z); sizes.push(0.3 + rnd() * 0.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uLights: this.uniforms.uLights, uTime: this.uniforms.uTime, uPx: { value: window.devicePixelRatio || 1 } },
      vertexShader: /* glsl */`attribute float size; uniform float uPx; uniform float uTime; varying float vT;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vT = fract(position.x * 7.1 + position.z * 3.3);
          gl_PointSize = size * uPx * (60.0 / -mv.z) * (0.85 + 0.15 * sin(uTime * 2.0 + vT * 30.0)); }`,
      fragmentShader: /* glsl */`uniform float uLights; varying float vT; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(1.0, 0.72, 0.38), vec3(0.6, 0.95, 1.0), step(0.75, vT)); gl_FragColor = vec4(c, a * uLights * 0.9); }`,
    });
    this.lights = new THREE.Points(geo, mat);
    this.scene.add(this.lights);
  }

  buildEruption() {
    const n = 500; const pos = new Float32Array(n * 3); const life = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('life', new THREE.BufferAttribute(life, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uPx: { value: window.devicePixelRatio || 1 } },
      vertexShader: /* glsl */`attribute float life; varying float vL; uniform float uPx; void main(){ vL = life; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (4.0 + (1.0 - life) * 22.0) * uPx * (8.0 / -mv.z); }`,
      fragmentShader: /* glsl */`varying float vL; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vL; vec3 c = mix(vec3(0.35,0.32,0.3), vec3(1.0,0.55,0.2), smoothstep(0.6, 1.0, vL)); gl_FragColor = vec4(c, a * 0.8); }`,
    });
    this.erupt = { points: new THREE.Points(geo, mat), vel: new Float32Array(n * 3), n, active: 0, t: 0 };
    const t = PLACES.tambora; const { x, z } = project(t.lon, t.lat);
    this.erupt.origin = new THREE.Vector3(x, this.heightAt(t.lon, t.lat) + 0.05, z);
    this.erupt.points.frustumCulled = false; this.erupt.points.visible = false;
    this.scene.add(this.erupt.points);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffc48a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(this.erupt.origin); ring.position.y = 0.05;
    this.erupt.ring = ring; this.scene.add(ring);
  }

  triggerEruption() {
    const e = this.erupt; e.active = 1; e.t = 0; e.points.visible = true;
    const pos = e.points.geometry.attributes.position.array; const life = e.points.geometry.attributes.life.array;
    for (let i = 0; i < e.n; i++) {
      pos[i * 3] = e.origin.x; pos[i * 3 + 1] = e.origin.y; pos[i * 3 + 2] = e.origin.z;
      const a = Math.random() * Math.PI * 2, sp = Math.random();
      e.vel[i * 3] = Math.cos(a) * sp * 0.6; e.vel[i * 3 + 1] = 1.2 + Math.random() * 2.6; e.vel[i * 3 + 2] = Math.sin(a) * sp * 0.6;
      life[i] = 1 + Math.random() * 0.2;
    }
  }

  // ---------- control ----------
  setFocus(name, immediate = false) {
    const f = FOCUS[name] || PLACES[name] && [PLACES[name].lon, PLACES[name].lat, 6, 50, 0];
    if (!f) return;
    this.target = { lon: f[0], lat: f[1], dist: f[2], tilt: f[3], az: f[4] };
    if (immediate) this.rig = { ...this.target };
  }
  setMarks(list) {
    const on = new Set(list || []);
    for (const [id, m] of Object.entries(this.markers)) m.target = on.has(id) ? 1 : 0;
    this.focusMark = list && list.length === 1 ? list[0] : null;
  }
  setRoutes(list) { const on = new Set(list || []); for (const [id, r] of Object.entries(this.routes)) r.target = on.has(id) ? 1 : 0; }
  setRoad(v) { this.road.target = v; }
  setRain(v) { this.rainTarget = v; }
  setDim(v) { this.dimTarget = v; }

  applyMood(name, dur = 2.2) {
    const m = MOODS[name]; if (!m) return;
    this.moodName = name;
    const u = this.uniforms;
    const from = {
      top: u.uTop.value.clone(), hor: u.uHor.value.clone(), fog: u.uFogCol.value.clone(), deep: u.uDeep.value.clone(), shallow: u.uShallow.value.clone(),
      line: u.uLine.value.clone(), land1: u.uLand1.value.clone(), land2: u.uLand2.value.clone(), nb: u.uNb.value.clone(), sea0: u.uSea0.value.clone(),
      ink: u.uInk.value.clone(), sun: u.uSunCol.value.clone(), sunDir: u.uSun.value.clone(), amb: u.uAmb.value, stars: u.uStars.value, lights: u.uLights.value, spec: u.uSpec.value, paper: u.uPaper.value,
    };
    const to = { ...m };
    this.moodTween = { from, to, t: dur <= 0 ? 1 : 0, dur: Math.max(0.001, dur) };
    if (dur <= 0) this.stepMood(0);
  }
  stepMood(dt) {
    const tw = this.moodTween; if (!tw || tw.t >= 1 && tw.done) return;
    tw.t = Math.min(1, tw.t + dt / tw.dur); const k = tw.t * tw.t * (3 - 2 * tw.t);
    const u = this.uniforms; const { from, to } = tw;
    const lc = (dst, a, b) => dst.copy(a).lerp(C(b), k);
    lc(u.uTop.value, from.top, to.top); lc(u.uHor.value, from.hor, to.hor); lc(u.uFogCol.value, from.fog, to.fog);
    lc(u.uDeep.value, from.deep, to.deep); lc(u.uShallow.value, from.shallow, to.shallow); lc(u.uLine.value, from.line, to.line);
    lc(u.uLand1.value, from.land1, to.land1); lc(u.uLand2.value, from.land2, to.land2); lc(u.uNb.value, from.nb, to.nb);
    lc(u.uSea0.value, from.sea0, to.sea0); lc(u.uInk.value, from.ink, to.ink); lc(u.uSunCol.value, from.sun, to.sun);
    u.uSun.value.copy(from.sunDir).lerp(new THREE.Vector3(...to.sunDir).normalize(), k).normalize();
    u.uAmb.value = from.amb + (to.amb - from.amb) * k; u.uStars.value = from.stars + (to.stars - from.stars) * k;
    u.uLights.value = from.lights + (to.lights - from.lights) * k; u.uSpec.value = from.spec + (to.spec - from.spec) * k;
    u.uPaper.value = from.paper + (to.paper - from.paper) * k;
    this.cloudColor = u.uHor.value;
    this.sunL.color.copy(u.uSunCol.value); this.sunL.position.copy(u.uSun.value).multiplyScalar(50); this.sunL.intensity = 1.6 + u.uAmb.value;
    this.hemi.color.copy(u.uTop.value).lerp(new THREE.Color(1, 1, 1), 0.5); this.hemi.groundColor.copy(u.uLand2.value); this.hemi.intensity = 0.8 + u.uAmb.value;
    if (tw.t >= 1) tw.done = true;
  }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h = h; }

  update(dt) {
    this.time += dt; const u = this.uniforms; u.uTime.value = this.time;
    const now = performance.now(); const rdt = this._lastNow ? Math.min(0.5, (now - this._lastNow) / 1000) : dt; this._lastNow = now;
    this.stepMood(state.snap ? 10 : rdt);
    // camera rig with soft damping
    const r = this.rig, t = this.target; const L = state.reduced || state.snap ? 30 : 1.6;
    r.lon = damp(r.lon, t.lon, L, dt); r.lat = damp(r.lat, t.lat, L, dt);
    r.dist = damp(r.dist, t.dist, L * 0.9, dt); r.tilt = damp(r.tilt, t.tilt, L, dt); r.az = damp(r.az, t.az, L, dt);
    const p = state.pointer;
    this.parallax.x = damp(this.parallax.x, state.touch ? 0 : p.nx, 2.5, dt);
    this.parallax.y = damp(this.parallax.y, state.touch ? 0 : p.ny, 2.5, dt);
    const { x, z } = project(r.lon, r.lat);
    const tilt = THREE.MathUtils.degToRad(r.tilt + this.parallax.y * 3 + Math.sin(this.time * 0.15) * 0.8);
    const az = THREE.MathUtils.degToRad(r.az + this.parallax.x * 5 + Math.sin(this.time * 0.1) * 1.2);
    const ground = Math.max(0, this.heightAt(r.lon, r.lat)) * 0.6;
    const cam = this.camera;
    cam.position.set(x + Math.sin(az) * Math.sin(tilt) * r.dist, ground + Math.cos(tilt) * r.dist, z + Math.cos(az) * Math.sin(tilt) * r.dist);
    cam.lookAt(x, ground, z);
    u.uFogNear.value = r.dist * 1.1; u.uFogFar.value = r.dist * 3.6 + 30;
    this.sky.position.copy(cam.position);
    // focus glow on single marker
    if (this.focusMark && this.markers[this.focusMark]) {
      const m = this.markers[this.focusMark]; u.uFocus.value.set(m.g.position.x, m.g.position.z, damp(u.uFocus.value.z, 1, 2, dt));
    } else u.uFocus.value.z = damp(u.uFocus.value.z, 0, 2, dt);
    u.uDim.value = damp(u.uDim.value, this.dimTarget || 0, 2, dt);
    // clouds
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt; if (c.position.x > 36) c.position.x = -36;
      c.position.y += Math.sin(this.time * 0.5 + c.userData.bob) * 0.002;
      const d = c.position.distanceTo(cam.position);
      const hf = Math.hypot(c.position.x - x, c.position.z - z);
      const k = smooth(2.5, 7, d) * smooth(r.dist * 0.45, r.dist * 1.05, hf) * smooth(1.5, 3.5, cam.position.y - c.position.y) * (this.moodName === 'modern' || this.moodName === 'night' ? 0.7 : 1);
      c.scale.set(c.userData.base * k, c.userData.base * 0.8 * k, c.userData.base * k); c.visible = k > 0.03;
    }
    // markers
    const scale = THREE.MathUtils.clamp(r.dist / 12, 0.3, 2.6);
    const v = this._v;
    for (const [id, m] of Object.entries(this.markers)) {
      m.on = damp(m.on, m.target, 3, dt);
      const vis = m.on > 0.01; m.g.visible = vis;
      if (!vis) { m.el.classList.remove('is-on'); continue; }
      const pulse = (this.time * 0.6 + m.phase) % 1;
      m.ring.scale.setScalar(scale * (0.5 + pulse * 1.1)); m.ring.material.opacity = (1 - pulse) * 0.9 * m.on;
      m.dot.scale.setScalar(scale * (0.9 - Math.abs(Math.sin(this.time * 3 + m.phase)) * 0.25)); m.dot.material.opacity = 0.25 * m.on;
      const pop = Math.min(1, m.on * 1.2); const bounce = Math.abs(Math.sin(this.time * 3 + m.phase)) * 0.25;
      m.pin.scale.setScalar(scale * 0.55 * (pop + (1 - pop) * 0) ); m.pin.position.y = bounce * scale * 0.55; m.pin.rotation.y = this.time * 1.2 + m.phase;
      v.set(m.g.position.x, m.g.position.y + scale * 0.95 * m.on, m.g.position.z).project(cam);
      const sx = (v.x * 0.5 + 0.5) * this.w, sy = (-v.y * 0.5 + 0.5) * this.h;
      const behind = v.z > 1;
      m.el.style.transform = `translate(${sx}px, ${sy + (m.dy ? 34 : 0)}px) translate(-50%, -100%)`;
      m.el.classList.toggle('is-on', m.on > 0.5 && !behind);
    }
    // routes and ships
    for (const rt of Object.values(this.routes)) {
      rt.on = damp(rt.on, rt.target || 0, 1.4, dt);
      rt.mat.uniforms.uProg.value = rt.on * 1.06; rt.mat.uniforms.uAlpha.value = Math.min(1, rt.on * 1.4);
      rt.mesh.visible = rt.on > 0.01;
    }
    for (const sh of this.ships) {
      const rt = this.routes[sh.rid]; const on = rt.on > 0.6;
      sh.s.visible = on;
      if (!on) continue;
      sh.t = (sh.t + sh.speed * dt) % 1;
      const pnt = rt.curve.getPointAt(sh.t); const tan = rt.curve.getTangentAt(sh.t);
      sh.s.position.set(pnt.x, 0.02, pnt.z);
      sh.s.rotation.y = Math.atan2(-tan.z, tan.x);
      sh.s.scale.setScalar(scale * 0.7);
      sh.s.position.y = 0.01 + Math.sin(this.time * 2 + sh.t * 30) * 0.004;
    }
    // road
    const rd = this.road; rd.prog = damp(rd.prog, rd.target, 0.9, dt);
    rd.mat.uniforms.uProg.value = rd.prog * 1.02; rd.mat.uniforms.uAlpha.value = Math.min(1, rd.prog * 6) * (rd.target > 0 ? 1 : rd.prog);
    rd.mesh.visible = rd.prog > 0.002;
    this.roadKm = Math.round(Math.min(1, rd.prog) * 1000);
    // rain
    u.uRain.value = damp(u.uRain.value, this.rainTarget || 0, 1.5, dt);
    this.rain.visible = u.uRain.value > 0.02;
    if (this.rain.visible) { this.rain.material.uniforms.uCenter.value.set(cam.position.x * 0.5 + x * 0.5, ground + 2, cam.position.z * 0.5 + z * 0.5); }
    u.uMouse.value.set(state.pointer.nx, -state.pointer.ny);
    // eruption
    const e = this.erupt;
    if (e.active) {
      e.t += dt; const pos = e.points.geometry.attributes.position.array; const life = e.points.geometry.attributes.life.array; let alive = 0;
      for (let i = 0; i < e.n; i++) {
        if (life[i] <= 0) continue; alive++;
        e.vel[i * 3 + 1] -= dt * 0.9; e.vel[i * 3] *= 0.995; e.vel[i * 3 + 2] *= 0.995;
        pos[i * 3] += e.vel[i * 3] * dt; pos[i * 3 + 1] = Math.max(e.origin.y, pos[i * 3 + 1] + e.vel[i * 3 + 1] * dt); pos[i * 3 + 2] += e.vel[i * 3 + 2] * dt;
        life[i] -= dt * (0.18 + (i % 7) * 0.02);
      }
      e.points.geometry.attributes.position.needsUpdate = true; e.points.geometry.attributes.life.needsUpdate = true;
      const rs = e.t * 2.4; e.ring.scale.setScalar(rs); e.ring.material.opacity = Math.max(0, 0.8 - e.t * 0.28);
      if (!alive) { e.active = 0; e.points.visible = false; }
    }
  }

  render(renderer) { renderer.render(this.scene, this.camera); }
}
