// Chibi characters: big heads, bright eyes, clothes of each era, and a walk cycle.
// Each type is split into body, arms and legs so a whole crowd can walk with instancing.
import * as THREE from 'three';
import { Builder, P, M, lathe, tube, extrude, toonMat, INK } from './toon.js';

const SKINS = ['#f2c9a0', '#e0ad7e', '#c98c5a', '#a8693e', '#8a5532'];
const PALB = { gold: '#f2c14e' };
const O = 0.012; // outline thickness for small parts

function face(b, skin) {
  b.add(P('sphere', 0.2, 20, 16), skin, M(0, 0.79, 0, 0, 0, 0, 1, 0.95, 0.96), 0.014);
  b.add(P('sphere', 0.05, 10, 8), skin, M(0, 0.76, 0.19, 0, 0, 0, 0.5, 0.45, 0.4), 0.006); // nose bump
  for (const s of [-1, 1]) {
    b.add(P('sphere', 0.03, 10, 8), INK, M(s * 0.075, 0.8, 0.178, 0, 0, 0, 0.85, 1.35, 0.5), 0);
    b.add(P('sphere', 0.01, 6, 4), '#ffffff', M(s * 0.075 + 0.008, 0.815, 0.19), 0);
    b.add(P('sphere', 0.03, 8, 6), '#ff9d9d', M(s * 0.12, 0.735, 0.158, 0, 0, 0, 1.1, 0.5, 0.3), 0);
    b.add(P('sphere', 0.035, 8, 6), skin, M(s * 0.195, 0.78, 0, 0, 0, 0, 0.4, 0.8, 0.7), 0.006); // ears
  }
  b.add(P('torus', 0.025, 0.006, 4, 10, Math.PI), '#7a3a2a', M(0, 0.725, 0.178, 0, 0, Math.PI), 0);
}

const HAIR = {
  short: (b, c) => { b.add(P('sphere', 0.206, 18, 12, 0), c, M(0, 0.83, -0.02, -0.25, 0, 0, 1, 0.82, 1), 0.012); b.add(P('sphere', 0.07, 10, 8), c, M(0.06, 0.93, 0.13, 0, 0, 0.4, 1.4, 0.6, 0.8), 0.008); },
  bun: (b, c) => { b.add(P('sphere', 0.207, 18, 12), c, M(0, 0.83, -0.03, -0.2, 0, 0, 1, 0.8, 1), 0.012); b.add(P('sphere', 0.09, 12, 10), c, M(0, 0.82, -0.22), 0.01); b.add(P('sphere', 0.03, 8, 6), '#ffffff', M(0.06, 0.88, -0.24), 0.006); b.add(P('sphere', 0.025, 8, 6), '#ffd14a', M(0.06, 0.88, -0.27), 0); },
  queue: (b, c) => { b.add(P('sphere', 0.205, 18, 12), c, M(0, 0.84, -0.03, -0.3, 0, 0, 1, 0.7, 1), 0.012); b.add(tube([[0, 0.76, -0.18], [0, 0.6, -0.22], [0.02, 0.45, -0.2], [0, 0.32, -0.18]], 0.025, 12, 6), c, null, 0.008); },
  hijab: (b, c) => {
    const back = new THREE.SphereGeometry(0.225, 20, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.82); back.deleteAttribute('uv');
    const cap = new THREE.SphereGeometry(0.226, 20, 6, 0, Math.PI * 2, 0, 0.75); cap.deleteAttribute('uv');
    b.add(back, c, M(0, 0.8, -0.01), 0.012); b.add(cap, c, M(0, 0.8, -0.01), 0.012);
    b.add(lathe([[0.0, 0.64], [0.2, 0.64], [0.25, 0.5], [0.16, 0.48], [0, 0.48]], 18), c, null, 0.01);
  },
};
const HATS = {
  tricorn: (b) => { b.add(lathe([[0, 1.07], [0.11, 1.07], [0.15, 1.03], [0.17, 1.0], [0.28, 0.99], [0.28, 0.96], [0, 0.96]], 3), '#2a2235', M(0, 0, 0, 0, Math.PI / 6), 0.012); b.add(P('sphere', 0.03, 8, 6), '#f2c14e', M(0.13, 1.0, 0.1), 0); },
  caping: (b) => { b.add(lathe([[0, 1.08], [0.06, 1.05], [0.36, 0.9], [0.37, 0.88], [0, 0.93]], 20), '#e6c27a', null, 0.012); b.add(P('torus', 0.12, 0.012, 4, 20), '#a6783a', M(0, 0.99, 0, Math.PI / 2), 0); },
  blangkon: (b) => { b.add(P('sphere', 0.212, 18, 12, 0), '#6b4220', M(0, 0.84, -0.01, -0.15, 0, 0, 1, 0.72, 1), 0.012); b.add(P('sphere', 0.07, 12, 8), '#6b4220', M(0, 0.8, -0.2, 0, 0, 0, 1, 0.8, 1), 0.01); b.add(P('torus', 0.2, 0.012, 4, 24), '#d9b45a', M(0, 0.86, 0, Math.PI / 2 - 0.15), 0); },
  cap: (b) => { b.add(P('hemi', 0.205, 18, 8), '#1f1b2a', M(0, 0.86, -0.01, -0.1), 0.012); b.add(P('sphere', 0.025, 8, 6), '#c8372d', M(0, 1.06, 0), 0.006); },
  brim: (b) => { b.add(P('cyl', 0.13, 0.15, 0.14, 16), '#3a2a22', M(0, 1.0, 0), 0.012); b.add(P('cyl', 0.28, 0.28, 0.025, 20), '#3a2a22', M(0, 0.93, 0), 0.012); b.add(P('torus', 0.145, 0.015, 4, 18), '#c8372d', M(0, 0.95, 0, Math.PI / 2), 0); },
  bonnet: (b) => { b.add(P('sphere', 0.22, 16, 12), '#f6efe0', M(0, 0.84, -0.03, -0.2, 0, 0, 1, 0.9, 1), 0.012); b.add(P('torus', 0.16, 0.03, 6, 20), '#ff8fb1', M(0, 0.82, 0.06, 0.2), 0.008); },
  baseball: (b, c = '#2a7be0') => { b.add(P('hemi', 0.21, 16, 8), c, M(0, 0.86, 0, -0.1), 0.012); b.add(P('cyl', 0.12, 0.12, 0.02, 14), c, M(0, 0.87, 0.18, 0.15, 0, 0, 1, 1, 1.4), 0.008); },
};

// body styles: torso + clothes. Returns nothing; adds to builder.
const BODY = {
  coat: (b, c) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.14, 0.55], [0.15, 0.42], [0.18, 0.28], [0.17, 0.25], [0, 0.25]], 18), c.coat, null, O);
    b.add(P('box', 0.1, 0.12, 0.05), '#f6f2ea', M(0, 0.54, 0.12, -0.2), 0.008);
    for (let i = 0; i < 4; i++) b.add(P('sphere', 0.012, 6, 4), '#e8c25a', M(0.035, 0.52 - i * 0.065, 0.14), 0);
    b.add(P('torus', 0.155, 0.02, 4, 20), c.belt || '#3a2a22', M(0, 0.4, 0, Math.PI / 2), 0);
  },
  baju: (b, c) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.14, 0.54], [0.14, 0.4], [0.15, 0.36], [0, 0.36]], 18), c.top, null, O);
    b.add(lathe([[0, 0.38], [0.16, 0.38], [0.17, 0.2], [0.15, 0.16], [0, 0.16]], 18), c.kain, null, O);
    for (let i = 0; i < 5; i++) b.add(P('box', 0.02, 0.2, 0.01), c.motif || '#f2d08a', M(Math.sin(i * 1.26) * 0.16, 0.27, Math.cos(i * 1.26) * 0.16, 0, i * 1.26), 0);
  },
  kebaya: (b, c) => {
    b.add(lathe([[0, 0.6], [0.1, 0.6], [0.13, 0.54], [0.12, 0.44], [0.15, 0.38], [0, 0.38]], 18), c.top, null, O);
    for (let i = 0; i < 3; i++) b.add(P('sphere', 0.014, 6, 4), '#d9b45a', M(0, 0.55 - i * 0.05, 0.125), 0);
    b.add(lathe([[0, 0.4], [0.14, 0.4], [0.16, 0.2], [0.15, 0.03], [0.13, 0.0], [0, 0.0]], 20), c.kain, null, O);
    for (let k = 0; k < 8; k++) b.add(P('box', 0.025, 0.025, 0.01), c.motif || '#7a3e1c', M(Math.sin(k * 0.785) * 0.158, 0.12 + (k % 2) * 0.12, Math.cos(k * 0.785) * 0.158, 0, k * 0.785, Math.PI / 4), 0);
  },
  robe: (b, c) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.14, 0.54], [0.15, 0.4], [0.19, 0.06], [0.18, 0.02], [0, 0.02]], 18), c.coat, null, O);
    b.add(P('box', 0.03, 0.45, 0.02), c.trim || '#d9b45a', M(0.05, 0.36, 0.165, -0.1, 0.3), 0);
  },
  bare: (b, c, skin) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.14, 0.54], [0.13, 0.4], [0, 0.4]], 18), skin, null, O);
    b.add(lathe([[0, 0.42], [0.15, 0.42], [0.16, 0.26], [0, 0.26]], 18), c.kain, null, O);
    b.add(P('torus', 0.145, 0.018, 4, 20), c.belt || '#c8372d', M(0, 0.41, 0, Math.PI / 2), 0);
  },
  dress: (b, c) => {
    b.add(lathe([[0, 0.6], [0.1, 0.6], [0.12, 0.52], [0.11, 0.44], [0.24, 0.05], [0.23, 0.01], [0, 0.01]], 20), c.coat, null, O);
    b.add(P('torus', 0.115, 0.02, 4, 20), c.trim || '#ffffff', M(0, 0.45, 0, Math.PI / 2), 0);
  },
  uniform: (b, c) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.14, 0.54], [0.14, 0.4], [0, 0.4]], 18), '#fbfbf7', null, O);
    b.add(lathe([[0, 0.42], [0.15, 0.42], [0.17, 0.24], [0, 0.24]], 18), '#d43b32', null, O);
    b.add(P('rbox', 0.2, 0.22, 0.1, 0.03), c.bag || '#2a7be0', M(0, 0.47, -0.17), 0.01);
    b.add(P('box', 0.04, 0.12, 0.01), '#c8372d', M(0, 0.52, 0.14), 0);
  },
  tee: (b, c) => {
    b.add(lathe([[0, 0.6], [0.11, 0.6], [0.145, 0.54], [0.145, 0.4], [0, 0.4]], 18), c.top, null, O);
    b.add(lathe([[0, 0.42], [0.15, 0.42], [0.15, 0.28], [0, 0.28]], 18), c.kain || '#3a5a8a', null, O);
    b.add(P('rbox', 0.08, 0.06, 0.05, 0.015), '#222222', M(0, 0.47, 0.16), 0.008);
  },
};

// accessory props on the body (not animated separately)
const EXTRA = {
  pikulan: (b) => {
    b.add(P('cyl', 0.015, 0.015, 0.9, 6), '#a6783a', M(0, 0.62, 0, 0, 0, Math.PI / 2), 0.006);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) b.add(P('cyl', 0.003, 0.003, 0.3, 3), '#6b4a2e', M(s * 0.42 + (k - 1) * 0.04, 0.48, (k - 1) * 0.03), 0);
      b.add(lathe([[0, 0.24], [0.1, 0.24], [0.12, 0.36], [0.115, 0.37], [0, 0.37]], 14), '#c99a52', M(s * 0.42, 0, 0), 0.008);
      b.add(P('sphere', 0.06, 8, 6), s > 0 ? '#ff7a3c' : '#7ccf5a', M(s * 0.42, 0.37, 0), 0.006);
    }
  },
  musket: (b) => { b.add(P('cyl', 0.012, 0.012, 0.75, 6), '#3a3a3a', M(0.16, 0.62, -0.05, 0.2, 0, 0.1), 0.006); b.add(P('rbox', 0.04, 0.2, 0.05, 0.01), '#6b4220', M(0.15, 0.3, -0.1, 0.2), 0.006); },
  parasol: (b, c) => { b.add(P('cyl', 0.008, 0.008, 0.75, 4), '#5a4028', M(0.15, 0.82, 0.05), 0); b.add(lathe([[0, 1.24], [0.08, 1.22], [0.34, 1.12], [0.35, 1.1], [0, 1.15]], 12), c.parasol || '#ff8fb1', M(0.15, 0, 0.05), 0.01); },
  camera: (b) => { b.add(P('rbox', 0.09, 0.06, 0.04, 0.012), '#222', M(0.05, 0.5, 0.15), 0.006); b.add(P('cyl', 0.02, 0.02, 0.03, 10), '#555', M(0.05, 0.5, 0.18, Math.PI / 2), 0); },
  guitar: (b) => { b.add(P('sphere', 0.11, 14, 10), '#e0904a', M(0.02, 0.4, 0.17, 0, 0, 0.6, 1, 1.2, 0.45), 0.008); b.add(P('cyl', 0.03, 0.03, 0.05, 10), INK, M(0.02, 0.41, 0.22, Math.PI / 2), 0); b.add(P('box', 0.04, 0.32, 0.03), '#8a5a32', M(0.15, 0.55, 0.18, 0, 0, -0.95), 0.006); },
  fan: (b) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, 0.2, Math.PI * 0.15, Math.PI * 0.85, false); s.closePath(); b.add(extrude(s, 0.01, 0), '#ff5b4d', M(0.2, 0.46, 0.16, 0, 0, -0.4), 0.006); },
  jug: (b) => { b.add(lathe([[0, 0], [0.1, 0], [0.14, 0.12], [0.08, 0.24], [0.06, 0.3], [0, 0.3]], 14), '#c97a4a', M(0.0, 1.0, -0.02), 0.01); b.add(P('torus', 0.05, 0.015, 4, 10), '#a8573a', M(0.1, 1.15, -0.02, 0, Math.PI / 2, 0), 0); },
  canting: (b) => { b.add(P('rbox', 0.32, 0.2, 0.02, 0.01), '#ffffff', M(0.0, 0.42, 0.19, -0.3, 0, 0), 0.006); for (let k = 0; k < 4; k++) b.add(P('sphere', 0.022, 6, 4), ['#3a5fbf', '#c8742e'][k % 2], M(-0.1 + k * 0.07, 0.43, 0.205), 0); b.add(P('cyl', 0.008, 0.008, 0.16, 4), '#8a5a32', M(0.17, 0.5, 0.16, 0, 0, -0.6), 0); b.add(P('sphere', 0.025, 6, 4), PALB.gold, M(0.12, 0.46, 0.17), 0.004); },
  hoe: (b) => { b.add(P('cyl', 0.014, 0.014, 0.75, 6), '#a6783a', M(0.2, 0.6, 0.05, 0, 0, 0.2), 0.006); b.add(P('box', 0.14, 0.12, 0.02), '#7a7a82', M(0.12, 0.98, 0.05, 0, 0, 0.2), 0.006); },
  basket: (b) => { b.add(lathe([[0, 0.98], [0.12, 0.98], [0.15, 1.08], [0.145, 1.09], [0, 1.09]], 14), '#c99a52', null, 0.01); for (let k = 0; k < 4; k++) b.add(P('sphere', 0.045, 8, 6), ['#ffcf3c', '#ff6a3c', '#7ccf5a', '#c8372d'][k], M(Math.cos(k * 1.6) * 0.06, 1.1, Math.sin(k * 1.6) * 0.06), 0.005); },
};

export const TYPES = {
  clerk: { hat: 'tricorn', hair: 'short', hairC: '#e9e2d4', body: 'coat', c: { coat: '#2f4f8f' }, legs: '#f6f2ea', shoes: '#2a2235' },
  soldier: { hat: 'brim', hair: 'short', hairC: '#6b4a2e', body: 'coat', c: { coat: '#b8432f', belt: '#f2e6c8' }, legs: '#e8dcc0', shoes: '#2a2235', extra: 'musket' },
  jawa: { hat: 'blangkon', hair: null, body: 'baju', c: { top: '#f6f2ea', kain: '#7a4a24', motif: '#e2b45a' }, legs: null, shoes: null },
  kebaya: { hat: null, hair: 'bun', hairC: '#1f1b2a', body: 'kebaya', c: { top: '#ffc2cf', kain: '#8a5a2b', motif: '#f2d08a' }, legs: null, shoes: '#6b4220', skirt: true },
  cina: { hat: 'cap', hair: 'queue', hairC: '#1f1b2a', body: 'robe', c: { coat: '#2f7fb0', trim: '#e8c25a' }, legs: null, shoes: '#1f1b2a', skirt: true },
  kuli: { hat: 'caping', hair: 'short', hairC: '#1f1b2a', body: 'bare', c: { kain: '#4a6a8a', belt: '#c8372d' }, legs: 'skin', shoes: null, extra: 'pikulan' },
  lady: { hat: 'bonnet', hair: 'bun', hairC: '#c98c3a', body: 'dress', c: { coat: '#8ad0c4', trim: '#ffffff', parasol: '#ff8fb1' }, legs: null, shoes: '#3a2a22', skirt: true, extra: 'parasol' },
  seller: { hat: null, hair: 'bun', hairC: '#1f1b2a', body: 'kebaya', c: { top: '#ffe08a', kain: '#3f6b5a', motif: '#ffffff' }, legs: null, shoes: null, skirt: true, extra: 'basket' },
  student: { hat: null, hair: 'short', hairC: '#1f1b2a', body: 'uniform', c: { bag: '#2a7be0' }, legs: 'skin', shoes: '#222' },
  tourist: { hat: 'baseball', hair: 'short', hairC: '#d9a441', body: 'tee', c: { top: '#ffcf3c', kain: '#3a6aa0' }, legs: 'skin', shoes: '#ffffff', extra: 'camera' },
  hijab: { hat: null, hair: 'hijab', hairC: '#3cc8b4', body: 'dress', c: { coat: '#8f7cff', trim: '#ffffff' }, legs: null, shoes: '#222', skirt: true },
  mardijker: { hat: 'brim', hair: 'short', hairC: '#1f1b2a', body: 'coat', c: { coat: '#7a4a2a', belt: '#2a2235' }, legs: '#f6f2ea', shoes: '#2a2235', extra: null, skin: 3 },
  kroncong: { hat: 'brim', hair: 'short', hairC: '#1f1b2a', body: 'coat', c: { coat: '#2f8f6f', belt: '#2a2235' }, legs: '#f6f2ea', shoes: '#2a2235', extra: 'guitar', skin: 3 },
  kapitan: { hat: 'cap', hair: 'queue', hairC: '#1f1b2a', body: 'robe', c: { coat: '#c8372d', trim: '#f2c14e' }, legs: null, shoes: '#1f1b2a', skirt: true, extra: 'fan', skin: 1 },
  budak: { hat: null, hair: 'short', hairC: '#1f1b2a', body: 'bare', c: { kain: '#c9a26a', belt: '#8a5a32' }, legs: 'skin', shoes: null, extra: 'jug', skin: 4 },
  nyai: { hat: null, hair: 'bun', hairC: '#1f1b2a', body: 'kebaya', c: { top: '#ffffff', kain: '#3a5fbf', motif: '#ffd14a', parasol: '#ffc93c' }, legs: null, shoes: '#6b4220', skirt: true, extra: 'parasol', skin: 2 },
  batikmaker: { hat: null, hair: 'bun', hairC: '#3a2a1a', body: 'kebaya', c: { top: '#a8d8ff', kain: '#c8742e', motif: '#ffffff' }, legs: null, shoes: null, skirt: true, extra: 'canting', skin: 1 },
  farmer: { hat: 'caping', hair: 'short', hairC: '#1f1b2a', body: 'bare', c: { kain: '#3a3a4a', belt: '#7a4a2a' }, legs: 'skin', shoes: null, extra: 'hoe', skin: 3 },
  local: { hat: null, hair: 'short', hairC: '#1f1b2a', body: 'tee', c: { top: '#ff5b4d', kain: '#2a2a3a' }, legs: 'skin', shoes: '#222' },
};

function skinFor(type) { const T = TYPES[type]; if (T.skin != null) return SKINS[T.skin]; return { clerk: SKINS[0], soldier: SKINS[0], lady: SKINS[0], tourist: SKINS[0] }[type] || SKINS[1 + (type.length % 4)]; }

// builds the four kinds of parts in local space (arm and leg pivots at origin)
export function buildParts(type) {
  const T = TYPES[type]; const skin = skinFor(type);
  const body = new Builder({ outline: 0.016 });
  BODY[T.body](body, T.c, skin);
  body.add(P('cyl', 0.05, 0.06, 0.08, 10), skin, M(0, 0.6, 0), 0.008);
  face(body, skin);
  if (T.hair && HAIR[T.hair]) HAIR[T.hair](body, T.hairC);
  if (T.hat && HATS[T.hat]) HATS[T.hat](body, T.c.hatC);
  if (T.extra && EXTRA[T.extra]) EXTRA[T.extra](body, T.c);
  const sleeve = T.body === 'bare' ? skin : (T.c.top || T.c.coat || skin);
  const arm = new Builder({ outline: 0.012 });
  arm.add(P('capsule', 0.038, 0.13, 4, 8), sleeve, M(0, -0.09, 0), O);
  arm.add(P('sphere', 0.038, 10, 8), skin, M(0, -0.2, 0.01), O);
  const leg = new Builder({ outline: 0.012 });
  const legC = T.legs === 'skin' ? skin : T.legs || (T.c.kain || '#3a2a22');
  if (!T.skirt) leg.add(P('capsule', 0.045, 0.12, 4, 8), legC, M(0, -0.1, 0), O);
  leg.add(P('rbox', 0.08, 0.05, 0.13, 0.02), T.shoes || skin, M(0, -0.2, 0.025), O);
  return { body: body.build(), arm: arm.build(), leg: leg.build(), skirt: !!T.skirt };
}

const PIV = { armL: [-0.165, 0.565, 0], armR: [0.165, 0.565, 0], legL: [-0.065, 0.24, 0], legR: [0.065, 0.24, 0] };

// A single posable character (used for portrait cards).
export function makeCharacter(type, opts = {}) {
  const parts = buildParts(type); const mat = toonMat(opts);
  const g = new THREE.Group();
  const body = new THREE.Mesh(parts.body, mat); g.add(body);
  const limbs = {};
  for (const [k, p] of Object.entries(PIV)) {
    const pv = new THREE.Group(); pv.position.set(...p);
    pv.add(new THREE.Mesh(k.startsWith('arm') ? parts.arm : parts.leg, mat));
    g.add(pv); limbs[k] = pv;
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return {
    group: g, limbs,
    pose(t, { walk = 0, wave = 0 } = {}) {
      const s = Math.sin(t * 8) * walk;
      limbs.armL.rotation.x = s * 0.7; limbs.armR.rotation.x = -s * 0.7 - wave * (2.6 + Math.sin(t * 10) * 0.25);
      limbs.armR.rotation.z = wave * 0.5;
      limbs.legL.rotation.x = -s * 0.6; limbs.legR.rotation.x = s * 0.6;
      body.position.y = Math.abs(Math.sin(t * 8)) * 0.03 * walk + Math.sin(t * 2) * 0.006;
      body.rotation.z = Math.sin(t * 8) * 0.03 * walk;
    },
  };
}

// A walking crowd of one character type, fully instanced.
export class Crowd {
  constructor(type, count, opts = {}) {
    const parts = buildParts(type); this.count = count; this.items = [];
    const mat = opts.material || toonMat(opts.mat || {});
    const mk = (g) => { const m = new THREE.InstancedMesh(g, mat, count); m.castShadow = true; m.frustumCulled = false; return m; };
    this.body = mk(parts.body); this.armL = mk(parts.arm); this.armR = mk(parts.arm); this.legL = mk(parts.leg); this.legR = mk(parts.leg);
    this.group = new THREE.Group(); this.group.add(this.body, this.armL, this.armR, this.legL, this.legR);
    this._m = new THREE.Matrix4(); this._l = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  set(i, x, y, z, yaw, walk, t, scale = 1, phase = 0) {
    const m = this._m; this._e.set(0, yaw, Math.sin(t * 8 + phase) * 0.03 * walk); this._q.setFromEuler(this._e);
    this._p.set(x, y + Math.abs(Math.sin(t * 8 + phase)) * 0.03 * walk * scale, z); this._s.setScalar(scale); m.compose(this._p, this._q, this._s);
    this.body.setMatrixAt(i, m);
    const sw = Math.sin(t * 8 + phase) * walk;
    const limb = (mesh, piv, ang) => { this._l.makeRotationX(ang); this._l.setPosition(piv[0], piv[1], piv[2]); mesh.setMatrixAt(i, this._l.premultiply(m)); };
    limb(this.armL, PIV.armL, sw * 0.7); limb(this.armR, PIV.armR, -sw * 0.7); limb(this.legL, PIV.legL, -sw * 0.6); limb(this.legR, PIV.legR, sw * 0.6);
  }
  commit() { for (const m of [this.body, this.armL, this.armR, this.legL, this.legR]) m.instanceMatrix.needsUpdate = true; }
  setColor(i, c) { for (const m of [this.body, this.armL, this.armR, this.legL, this.legR]) m.setColorAt(i, c); }
}
