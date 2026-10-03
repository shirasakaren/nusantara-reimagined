// Toon toolkit: banded light ramps, a rim-lit vertex-colour toon material, and a geometry
// builder that bakes an inverted-hull ink outline into every part (no extra draw calls).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const INK = '#241b3a';
export const uTime = { value: 0 };
export const uWind = { value: 1 };

function ramp(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { const c = Math.round(v * 255); data.set([c, c, c, 255], i * 4); });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
}
export const RAMP3 = ramp([0.5, 0.78, 1.0]);
export const RAMP4 = ramp([0.42, 0.66, 0.86, 1.0]);

const cache = new Map();
export function toonMat(opts = {}) {
  const key = JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({
    vertexColors: opts.vertexColors ?? true, color: opts.color ?? 0xffffff, gradientMap: opts.soft ? RAMP4 : RAMP3,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide,
  });
  const rim = opts.rim ?? 0.28; const sway = opts.sway || 0;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uWind = uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind; varying vec3 vWN; varying vec3 vWP;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      ${sway ? `{ vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
        float h = max(position.y, 0.0); float ph = ip.x * 0.13 + ip.z * 0.17 + position.x * 0.2;
        float sw = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 2.9 + ph * 1.7) * 0.25;
        float k = h * h * ${(0.02 * sway).toFixed(4)} * uWind; transformed.x += sw * k; transformed.z += cos(uTime * 1.2 + ph) * k * 0.6; }` : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 wpos4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos4 = instanceMatrix * wpos4;
      #endif
      wpos4 = modelMatrix * wpos4; vWP = wpos4.xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN; varying vec3 vWP;')
      .replace('#include <opaque_fragment>', `{ vec3 V = normalize(cameraPosition - vWP); float r = 1.0 - max(dot(normalize(vWN), V), 0.0);
        outgoingLight += diffuseColor.rgb * smoothstep(0.62, 0.78, r) * ${rim.toFixed(3)}; }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `toon-${rim}-${sway}`;
  cache.set(key, m);
  return m;
}

// ---------- primitives ----------
const prim = new Map();
export function P(type, ...a) {
  const key = type + ':' + a.join(',');
  if (prim.has(key)) return prim.get(key);
  let g;
  switch (type) {
    case 'box': g = new THREE.BoxGeometry(...a); break;
    case 'rbox': g = new RoundedBoxGeometry(a[0], a[1], a[2], a[4] ?? 2, a[3] ?? Math.min(a[0], a[1], a[2]) * 0.18); break;
    case 'sphere': g = new THREE.SphereGeometry(a[0], a[1] ?? 14, a[2] ?? 10); break;
    case 'hemi': g = new THREE.SphereGeometry(a[0], a[1] ?? 16, a[2] ?? 8, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'ico': g = new THREE.IcosahedronGeometry(a[0], a[1] ?? 1); break;
    case 'cyl': g = new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] ?? 12, a[4] ?? 1); break;
    case 'cone': g = new THREE.ConeGeometry(a[0], a[1], a[2] ?? 12, 1); break;
    case 'torus': g = new THREE.TorusGeometry(a[0], a[1], a[2] ?? 8, a[3] ?? 18, a[4] ?? Math.PI * 2); break;
    case 'capsule': g = new THREE.CapsuleGeometry(a[0], a[1], a[2] ?? 4, a[3] ?? 10); break;
    case 'dodeca': g = new THREE.DodecahedronGeometry(a[0], a[1] ?? 0); break;
    default: throw new Error('prim ' + type);
  }
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  prim.set(key, g); return g;
}
export function lathe(points, segs = 16) { if (points[0][1] > points[points.length - 1][1]) points = points.slice().reverse(); const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs); g.deleteAttribute('uv'); return g; }
export function extrude(shape, depth = 0.1, bevel = 0.02, curve = 8) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2); g.deleteAttribute('uv'); return g;
}
export function tube(points, r = 0.03, segs = 20, rs = 6) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segs, r, rs, false); g.deleteAttribute('uv'); return g; }

// ---------- matrices ----------
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// ---------- builder ----------
const _v = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _ink = new THREE.Color(INK);
export class Builder {
  constructor({ outline = 0.035, lod = 1 } = {}) { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.count = 0; this.outline = outline; this.lod = lod; this.stack = [new THREE.Matrix4()]; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(m) { this.stack.push(this.top.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  // run fn inside a local transform
  at(m, fn) { this.push(m); fn(this); this.pop(); return this; }
  add(geo, color, m, outline = this.outline) {
    const mat = m ? this.top.clone().multiply(m) : this.top;
    const p = geo.attributes.position; if (!geo.attributes.normal) geo.computeVertexNormals();
    const nA = geo.attributes.normal; const index = geo.index ? geo.index.array : null;
    _n3.getNormalMatrix(mat); _c.set(color);
    const base = this.count, vc = p.count; const wp = new Float32Array(vc * 3), wn = new Float32Array(vc * 3);
    for (let i = 0; i < vc; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(mat); wp[i * 3] = _v.x; wp[i * 3 + 1] = _v.y; wp[i * 3 + 2] = _v.z; this.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nA, i).applyMatrix3(_n3).normalize(); wn[i * 3] = _v.x; wn[i * 3 + 1] = _v.y; wn[i * 3 + 2] = _v.z; this.nor.push(_v.x, _v.y, _v.z);
      this.col.push(_c.r, _c.g, _c.b);
    }
    const tri = index ? index.length : vc; for (let i = 0; i < tri; i++) this.idx.push(base + (index ? index[i] : i));
    this.count += vc;
    if (outline > 0 && this.lod > 0.3) this.hull(wp, wn, index, vc, outline);
    return this;
  }
  hull(wp, wn, index, vc, t) {
    const map = new Map(); const keys = new Array(vc);
    for (let i = 0; i < vc; i++) { const k = `${Math.round(wp[i * 3] * 500)},${Math.round(wp[i * 3 + 1] * 500)},${Math.round(wp[i * 3 + 2] * 500)}`; keys[i] = k; let a = map.get(k); if (!a) { a = [0, 0, 0]; map.set(k, a); } a[0] += wn[i * 3]; a[1] += wn[i * 3 + 1]; a[2] += wn[i * 3 + 2]; }
    const base = this.count;
    for (let i = 0; i < vc; i++) { const a = map.get(keys[i]); const l = Math.hypot(a[0], a[1], a[2]) || 1; const nx = a[0] / l, ny = a[1] / l, nz = a[2] / l; this.pos.push(wp[i * 3] + nx * t, wp[i * 3 + 1] + ny * t, wp[i * 3 + 2] + nz * t); this.nor.push(-nx, -ny, -nz); this.col.push(_ink.r, _ink.g, _ink.b); }
    const tri = index ? index.length : vc;
    for (let i = 0; i < tri; i += 3) { const a = index ? index[i] : i, b = index ? index[i + 1] : i + 1, c = index ? index[i + 2] : i + 2; this.idx.push(base + a, base + c, base + b); }
    this.count += vc;
  }
  get empty() { return this.count === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(new THREE.BufferAttribute(this.count > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx), 1));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
  mesh(opts) { const m = new THREE.Mesh(this.build(), toonMat(opts)); m.castShadow = true; m.receiveShadow = true; return m; }
}
export function geo(fn, opts) { const b = new Builder(opts); fn(b); return b.build(); }
export function instanced(g, count, opts) { const m = new THREE.InstancedMesh(g, toonMat(opts), count); m.castShadow = true; m.receiveShadow = true; return m; }

// ---------- canvas textures ----------
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
