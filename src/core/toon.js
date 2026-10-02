// Toon look: banded light ramp, one shared vertex-colored material, and an inverted-hull
// outline baked straight into each geometry so outlines cost zero extra draw calls.
import * as THREE from 'three';
import { INK } from './palette.js';

export const uTime = { value: 0 };
export const uWind = { value: 1 };
export const uNight = { value: 0 };

function makeGradient(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    const c = Math.round(v * 255);
    data[i * 4] = c; data[i * 4 + 1] = c; data[i * 4 + 2] = c; data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export const gradient3 = makeGradient([0.42, 0.74, 1.0]);
export const gradient4 = makeGradient([0.38, 0.62, 0.86, 1.0]);

const matCache = new Map();

/** Shared vertex-colored toon material. */
export function toonMat(opts = {}) {
  const key = JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: opts.soft ? gradient4 : gradient3,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
  if (opts.sway) addSway(m, opts.sway);
  matCache.set(key, m);
  return m;
}

/** Inject a wind sway into any material. Height above local origin drives the bend. */
export function addSway(mat, strength = 1) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uWind = uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uWind;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 wp = vec3(0.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix[3].xyz;
          #endif
          float h = max(position.y, 0.0);
          float ph = wp.x * 0.13 + wp.z * 0.17;
          float sw = sin(uTime * 1.7 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.7) * 0.25;
          float k = h * h * ${(0.06 * strength).toFixed(4)} * uWind;
          transformed.x += sw * k;
          transformed.z += cos(uTime * 1.3 + ph) * k * 0.6;
        }`);
  };
  mat.customProgramCacheKey = () => 'sway' + strength;
  return mat;
}

export const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true });
export const inkMat = new THREE.MeshBasicMaterial({ color: INK });

// ---------------------------------------------------------------------------
// Geometry builder. Accumulates primitive parts with a color and a transform,
// then emits one indexed BufferGeometry with position / normal / color.

const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();
const inkColor = new THREE.Color(INK);

export class GeoBuilder {
  constructor() {
    this.pos = []; this.nor = []; this.col = []; this.idx = [];
    this.count = 0;
  }

  /**
   * @param {THREE.BufferGeometry} geo primitive (not consumed)
   * @param {number|THREE.Color} color
   * @param {THREE.Matrix4} [matrix]
   * @param {number} [outline] world-space hull thickness, 0 disables
   */
  add(geo, color, matrix, outline = 0.05) {
    const p = geo.attributes.position;
    let nAttr = geo.attributes.normal;
    if (!nAttr) { geo.computeVertexNormals(); nAttr = geo.attributes.normal; }
    const index = geo.index ? geo.index.array : null;
    const mat = matrix || _m.identity();
    _n.getNormalMatrix(mat);
    _c.set(color);
    const base = this.count;
    const vcount = p.count;
    const wp = new Float32Array(vcount * 3);
    const wn = new Float32Array(vcount * 3);
    for (let i = 0; i < vcount; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(mat);
      wp[i * 3] = _v.x; wp[i * 3 + 1] = _v.y; wp[i * 3 + 2] = _v.z;
      this.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nAttr, i).applyMatrix3(_n).normalize();
      wn[i * 3] = _v.x; wn[i * 3 + 1] = _v.y; wn[i * 3 + 2] = _v.z;
      this.nor.push(_v.x, _v.y, _v.z);
      this.col.push(_c.r, _c.g, _c.b);
    }
    const tri = index ? index.length : vcount;
    for (let i = 0; i < tri; i++) this.idx.push(base + (index ? index[i] : i));
    this.count += vcount;
    if (outline > 0) this._hull(wp, wn, index, vcount, outline);
    return this;
  }

  _hull(wp, wn, index, vcount, t) {
    // Smooth normals by welding coincident positions so hard-edged boxes get closed shells.
    const map = new Map();
    const sn = new Float32Array(vcount * 3);
    const keyOf = (i) => `${Math.round(wp[i * 3] * 1000)},${Math.round(wp[i * 3 + 1] * 1000)},${Math.round(wp[i * 3 + 2] * 1000)}`;
    const keys = new Array(vcount);
    for (let i = 0; i < vcount; i++) {
      const k = keyOf(i); keys[i] = k;
      let a = map.get(k);
      if (!a) { a = [0, 0, 0]; map.set(k, a); }
      a[0] += wn[i * 3]; a[1] += wn[i * 3 + 1]; a[2] += wn[i * 3 + 2];
    }
    for (let i = 0; i < vcount; i++) {
      const a = map.get(keys[i]);
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      sn[i * 3] = a[0] / l; sn[i * 3 + 1] = a[1] / l; sn[i * 3 + 2] = a[2] / l;
    }
    const base = this.count;
    for (let i = 0; i < vcount; i++) {
      this.pos.push(wp[i * 3] + sn[i * 3] * t, wp[i * 3 + 1] + sn[i * 3 + 1] * t, wp[i * 3 + 2] + sn[i * 3 + 2] * t);
      this.nor.push(-sn[i * 3], -sn[i * 3 + 1], -sn[i * 3 + 2]);
      this.col.push(inkColor.r, inkColor.g, inkColor.b);
    }
    const tri = index ? index.length : vcount;
    for (let i = 0; i < tri; i += 3) {
      const a = index ? index[i] : i, b = index ? index[i + 1] : i + 1, c = index ? index[i + 2] : i + 2;
      this.idx.push(base + a, base + c, base + b);
    }
    this.count += vcount;
  }

  /** Raw triangle soup push (already world space). */
  addRaw(positions, normals, colorHex, indices) {
    _c.set(colorHex);
    const base = this.count;
    for (let i = 0; i < positions.length; i++) this.pos.push(positions[i]);
    for (let i = 0; i < normals.length; i++) this.nor.push(normals[i]);
    const n = positions.length / 3;
    for (let i = 0; i < n; i++) this.col.push(_c.r, _c.g, _c.b);
    for (let i = 0; i < indices.length; i++) this.idx.push(base + indices[i]);
    this.count += n;
  }

  get empty() { return this.count === 0; }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const IndexArr = this.count > 65535 ? Uint32Array : Uint16Array;
    g.setIndex(new THREE.BufferAttribute(new IndexArr(this.idx), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Shorthand matrix composer
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// Primitive cache: geometries reused by the builder (never mutated)
const prim = new Map();
export function P(type, ...args) {
  const key = type + ':' + args.join(',');
  if (prim.has(key)) return prim.get(key);
  let g;
  switch (type) {
    case 'box': g = new THREE.BoxGeometry(...args); break;
    case 'sphere': g = new THREE.SphereGeometry(args[0], args[1] ?? 12, args[2] ?? 8); break;
    case 'ico': g = new THREE.IcosahedronGeometry(args[0], args[1] ?? 1); break;
    case 'cyl': g = new THREE.CylinderGeometry(args[0], args[1], args[2], args[3] ?? 10, 1); break;
    case 'cone': g = new THREE.ConeGeometry(args[0], args[1], args[2] ?? 10, 1); break;
    case 'torus': g = new THREE.TorusGeometry(args[0], args[1], args[2] ?? 8, args[3] ?? 16, args[4] ?? Math.PI * 2); break;
    case 'capsule': g = new THREE.CapsuleGeometry(args[0], args[1], args[2] ?? 4, args[3] ?? 10); break;
    case 'dodeca': g = new THREE.DodecahedronGeometry(args[0], args[1] ?? 0); break;
    default: throw new Error('prim ' + type);
  }
  if (g.attributes.uv) g.deleteAttribute('uv');
  prim.set(key, g);
  return g;
}

/** Build a mesh from a builder function. */
export function buildMesh(fn, matOpts) {
  const b = new GeoBuilder();
  fn(b);
  const mesh = new THREE.Mesh(b.build(), toonMat(matOpts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
