// Museum objects that float inside DOM "vitrines". Each one can be turned, and some open, flip or light up.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import gsap from 'gsap';
import { makeNoise, mulberry } from './noise.js';
import { state, emit } from '../core/state.js';
import { RAMP4, INK } from './toon.js';
import { makeCharacter } from './chars.js';
import { sound } from '../core/audio.js';

const noise = makeNoise(21);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function jitter(geo, amt, freq = 2.2) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = noise.n2(x * freq + z, y * freq - z * 0.5) * amt;
    const l = Math.hypot(x, y, z) || 1;
    p.setXYZ(i, x + (x / l) * n, y + (y / l) * n, z + (z / l) * n);
  }
  geo.computeVertexNormals(); return geo;
}

// ---------- nutmeg ----------
function nutmeg() {
  const g = new THREE.Group();
  const fruitMat = new THREE.MeshStandardMaterial({ color: 0xc9902f, roughness: 0.5, metalness: 0, envMapIntensity: 0.5 });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xf6ead0, roughness: 0.8, side: THREE.DoubleSide });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0x4a2814, roughness: 0.35, metalness: 0.05 });
  const maceMat = new THREE.MeshStandardMaterial({ color: 0xc4231a, roughness: 0.45, emissive: 0x3a0503, emissiveIntensity: 0.4 });
  const halves = [];
  for (const s of [1, -1]) {
    const geo = jitter(new THREE.SphereGeometry(1, 48, 32, s > 0 ? 0 : Math.PI, Math.PI), 0.025, 1.6);
    geo.scale(1, 1.12, 1);
    const pivot = new THREE.Group(); pivot.position.x = 0;
    const m = new THREE.Mesh(geo, fruitMat);
    const capGeo = new THREE.CircleGeometry(0.98, 48); capGeo.scale(1, 1.1, 1); capGeo.rotateY(Math.PI / 2 * s);
    const cap = new THREE.Mesh(capGeo, innerMat); cap.position.x = 0.002 * s;
    const hinge = new THREE.Group(); hinge.position.set(0, 0, -0.95);
    m.position.z = 0.95; cap.position.z = 0.95;
    hinge.add(m, cap); g.add(hinge);
    halves.push({ hinge, s });
  }
  const seedGeo = jitter(new THREE.SphereGeometry(0.56, 40, 28), 0.03, 4); seedGeo.scale(1, 1.2, 1);
  const seed = new THREE.Mesh(seedGeo, seedMat); g.add(seed);
  const rnd = mulberry(4); const maceGeos = [];
  for (let k = 0; k < 11; k++) {
    const a0 = (k / 11) * Math.PI * 2 + rnd() * 0.3; const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14; const phi = -Math.PI / 2 + t * Math.PI * 0.92;
      const a = a0 + Math.sin(t * 6 + k) * 0.35;
      const r = 0.6 + Math.sin(t * Math.PI) * 0.03;
      pts.push(new THREE.Vector3(Math.cos(phi) * Math.cos(a) * r, Math.sin(phi) * r * 1.2, Math.cos(phi) * Math.sin(a) * r));
    }
    maceGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035 + rnd() * 0.03, 6, false));
  }
  const mace = new THREE.Mesh(mergeGeometries(maceGeos), maceMat); g.add(mace);
  // stem and leaf
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.8 }));
  stem.position.y = 1.32; g.add(stem);
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(0.35, 0.3, 0.3, 1.1, 0, 1.6); leafShape.bezierCurveTo(-0.3, 1.1, -0.35, 0.3, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 16);
  const lp = leafGeo.attributes.position; for (let i = 0; i < lp.count; i++) lp.setZ(i, Math.pow(lp.getX(i), 2) * 0.8 - Math.sin(lp.getY(i) * 2) * 0.08);
  leafGeo.computeVertexNormals();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f6a2e, roughness: 0.4, side: THREE.DoubleSide });
  const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.position.set(0.05, 1.5, 0); leaf.rotation.set(-0.5, 0.4, -0.9); g.add(leaf);
  const leaf2 = leaf.clone(); leaf2.rotation.set(-0.3, -2.2, 0.8); leaf2.scale.setScalar(0.8); g.add(leaf2);
  g.scale.setScalar(0.78);
  let open = false;
  return {
    group: g,
    click() {
      open = !open;
      halves.forEach(({ hinge, s }) => gsap.to(hinge.rotation, { y: open ? -s * 1.25 : 0, duration: 1.4, ease: 'expo.inOut' }));
      gsap.to(seed.scale, { x: open ? 1.08 : 1, y: open ? 1.08 : 1, z: open ? 1.08 : 1, duration: 1.4, ease: 'expo.inOut' });
      sound.note(open ? 4 : 1, 0.2);
      if (open) emit('toast', { text: 'Seed and mace. In 1621, the VOC took Banda for this.', kind: 'whisper' });
    },
  };
}

// ---------- carrack ----------
function sailTex(cross = true, color = '#f2e6cb') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,90,50,.25)'; g.lineWidth = 2;
    for (let x = 16; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    if (cross) {
      g.fillStyle = '#b3241c'; const c = w / 2;
      g.beginPath(); g.moveTo(c - 18, 40); g.lineTo(c + 18, 40); g.lineTo(c + 10, 108); g.lineTo(c + 78, 100); g.lineTo(c + 78, 156); g.lineTo(c + 10, 148); g.lineTo(c + 18, 216); g.lineTo(c - 18, 216); g.lineTo(c - 10, 148); g.lineTo(c - 78, 156); g.lineTo(c - 78, 100); g.lineTo(c - 10, 108); g.closePath(); g.fill();
      g.fillStyle = '#f2e6cb'; g.fillRect(c - 3, 70, 6, 120); g.fillRect(c - 50, 125, 100, 6);
    }
  });
}
function hullGeo(L = 3, W = 0.9, H = 0.9) {
  const geo = new THREE.BoxGeometry(L, H, W, 24, 6, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = x / (L / 2); // -1 stern .. 1 bow
    const yt = (y + H / 2) / H; // 0 keel .. 1 deck
    const narrow = (1 - Math.pow(Math.abs(t), t > 0 ? 2.2 : 3.5)) * (0.25 + 0.75 * Math.pow(yt, 0.6));
    z *= Math.max(0.04, narrow);
    y += Math.pow(Math.abs(t), 2.2) * (t > 0 ? 0.35 : 0.5) * yt + (yt < 0.5 ? (1 - Math.abs(t)) * -0.05 : 0);
    if (yt < 0.02) z *= 0.3;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals(); return geo;
}
function carrack({ dutch = false } = {}) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: dutch ? 0x4a2f1a : 0x5a3820, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23160c, roughness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: dutch ? 0xc9a24a : 0xb08a4a, roughness: 0.5, metalness: 0.3 });
  const hull = new THREE.Mesh(hullGeo(3.2, 1, 0.9), wood); g.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 1.02), trim); stripe.position.y = 0.2; stripe.scale.z = 0.92; g.add(stripe);
  const aft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.78), wood); aft.position.set(-1.15, 0.72, 0); g.add(aft);
  const aft2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.66), wood); aft2.position.set(-1.25, 1.12, 0); g.add(aft2);
  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), wood); fore.position.set(1.15, 0.72, 0); g.add(fore);
  for (let i = 0; i < 6; i++) { const port = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.02), dark); port.position.set(-0.8 + i * 0.32, 0.05, 0); port.scale.z = 0.8; g.add(port); }
  const sail = sailTex(!dutch); const sailMat = new THREE.MeshStandardMaterial({ map: sail, side: THREE.DoubleSide, roughness: 0.9 });
  const masts = [[-0.7, 2.2, 0.8], [0.15, 2.8, 1.0], [0.95, 2.1, 0.75]];
  const sails = [];
  for (const [x, h, s] of masts) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 8), wood); m.position.set(x, 0.45 + h / 2, 0); g.add(m);
    for (const [yy, sc] of [[0.42, 1], [0.78, 0.7]]) {
      const geo = new THREE.PlaneGeometry(0.9 * s * sc, 0.62 * s * sc, 10, 6);
      const sp = geo.attributes.position; for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / (0.45 * s * sc); sp.setZ(i, (1 - u * u) * 0.12 * sc); }
      geo.computeVertexNormals();
      const sm = new THREE.Mesh(geo, sailMat); sm.rotation.y = Math.PI / 2; sm.position.set(x + 0.05, 0.45 + h * yy, 0); g.add(sm); sails.push(sm);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0 * s * sc, 6), wood); yard.rotation.x = Math.PI / 2; yard.position.set(x + 0.04, 0.45 + h * yy + 0.31 * s * sc, 0); g.add(yard);
    }
  }
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), wood); bowsprit.rotation.z = -1.1; bowsprit.position.set(1.8, 0.95, 0); g.add(bowsprit);
  const flagTex = canvasTex(64, 40, (c, w, h) => {
    if (dutch) { c.fillStyle = '#e07a2f'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#fff'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#1f4aa0'; c.fillRect(0, (2 * h) / 3, w, h / 3); c.fillStyle = '#111'; c.font = 'bold 12px serif'; c.fillText('VOC', 20, 25); }
    else { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3241c'; c.fillRect(26, 4, 12, 32); c.fillRect(8, 14, 48, 12); }
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3, 8, 2), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }));
  flag.position.set(0.4, 3.45, 0); g.add(flag);
  g.position.y = -0.6; g.rotation.y = 0.5;
  const wrap = new THREE.Group(); wrap.add(g); wrap.scale.setScalar(0.62);
  return {
    group: wrap,
    update(t) {
      g.rotation.z = Math.sin(t * 0.9) * 0.04; g.rotation.x = Math.sin(t * 0.7) * 0.03;
      const fp = flag.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(t * 5 + x * 10) * 0.03 * (x + 0.25)); }
      fp.needsUpdate = true;
    },
    click() { gsap.fromTo(g.rotation, { z: 0.2 }, { z: 0, duration: 2, ease: 'elastic.out(1, 0.3)' }); sound.note(2, 0.18); },
  };
}

// ---------- duit ----------
function duit() {
  const copper = '#a8603a';
  const face = (front) => canvasTex(512, 512, (g, w, h) => {
    const c = w / 2;
    const gr = g.createRadialGradient(c * 0.8, c * 0.7, 20, c, c, c);
    gr.addColorStop(0, '#d89464'); gr.addColorStop(0.7, copper); gr.addColorStop(1, '#6e3a20');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // patina
    const r = mulberry(front ? 3 : 9);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${60 + r() * 40},${120 + r() * 40},${100 + r() * 30},${r() * 0.18})`; g.beginPath(); g.arc(r() * w, r() * h, r() * 26, 0, 7); g.fill(); }
    g.strokeStyle = '#5a2c14'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c - 22, 0, 7); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(c, c, c - 46, 0, 7); g.stroke();
    g.fillStyle = '#4a220e'; g.strokeStyle = '#e8b088'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const emboss = (fn) => { g.save(); g.translate(-3, -3); g.fillStyle = 'rgba(255,210,170,.45)'; fn(); g.restore(); g.fillStyle = '#4a220e'; fn(); };
    if (front) {
      emboss(() => { g.font = 'bold 300px "Fredoka Variable", sans-serif'; g.fillText('V', c, c + 10); });
      emboss(() => { g.font = 'bold 120px "Fredoka Variable", sans-serif'; g.fillText('O', c - 112, c - 70); g.fillText('C', c + 112, c - 70); });
      emboss(() => { g.font = '600 52px "Fredoka Variable", sans-serif'; g.fillText('1735', c, c + 168); });
    } else {
      emboss(() => {
        g.beginPath(); g.moveTo(c - 110, c - 120); g.lineTo(c + 110, c - 120); g.lineTo(c + 110, c + 30); g.quadraticCurveTo(c + 110, c + 140, c, c + 170); g.quadraticCurveTo(c - 110, c + 140, c - 110, c + 30); g.closePath(); g.fill();
      });
      g.fillStyle = '#c47a4c';
      g.beginPath(); g.moveTo(c - 90, c - 100); g.lineTo(c + 90, c - 100); g.lineTo(c + 90, c + 30); g.quadraticCurveTo(c + 90, c + 120, c, c + 146); g.quadraticCurveTo(c - 90, c + 120, c - 90, c + 30); g.closePath(); g.fill();
      g.fillStyle = '#4a220e';
      // a simple rampant lion, stylized
      g.beginPath(); g.ellipse(c, c + 10, 34, 56, -0.3, 0, 7); g.fill();
      g.beginPath(); g.arc(c + 18, c - 52, 24, 0, 7); g.fill();
      g.fillRect(c - 40, c + 50, 14, 50); g.fillRect(c + 6, c + 50, 14, 50); g.fillRect(c + 30, c - 30, 44, 12); g.fillRect(c - 70, c - 10, 40, 12);
      g.lineWidth = 9; g.strokeStyle = '#4a220e'; g.beginPath(); g.moveTo(c - 30, c + 40); g.quadraticCurveTo(c - 90, c + 10, c - 60, c - 60); g.stroke();
      g.font = '600 46px "Fredoka Variable", sans-serif';
      const txt = 'HOLLANDIA'; for (let i = 0; i < txt.length; i++) { const a = -Math.PI * 0.85 + (i / (txt.length - 1)) * Math.PI * 0.7; g.save(); g.translate(c + Math.cos(a) * 205, c + Math.sin(a) * 205); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); }
      // crown
      g.beginPath(); g.moveTo(c - 60, c - 128); g.lineTo(c - 60, c - 160); g.lineTo(c - 30, c - 140); g.lineTo(c, c - 172); g.lineTo(c + 30, c - 140); g.lineTo(c + 60, c - 160); g.lineTo(c + 60, c - 128); g.closePath(); g.fill();
    }
  });
  const edge = new THREE.MeshStandardMaterial({ color: 0x9a5530, metalness: 0.85, roughness: 0.42 });
  const mf = new THREE.MeshStandardMaterial({ map: face(true), metalness: 0.75, roughness: 0.38 });
  const mb = new THREE.MeshStandardMaterial({ map: face(false), metalness: 0.75, roughness: 0.38 });
  const geo = new THREE.CylinderGeometry(1.15, 1.15, 0.14, 72, 1);
  const coin = new THREE.Mesh(geo, [edge, mf, mb]);
  coin.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(coin);
  let flips = 0;
  return {
    group: g,
    click() {
      flips++;
      gsap.timeline().to(g.position, { y: 0.9, duration: 0.45, ease: 'power2.out' }).to(g.position, { y: 0, duration: 0.55, ease: 'bounce.out' });
      gsap.to(coin.rotation, { x: Math.PI / 2 + flips * Math.PI * 3, duration: 1, ease: 'power2.out' });
      sound.bell();
      if (flips === 1) emit('toast', { text: 'Heads: the Company. Tails: the province of Holland.', kind: 'whisper' });
    },
  };
}

// ---------- stupa ----------
function stupa() {
  const g = new THREE.Group();
  const stoneTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#8e8c84'; c.fillRect(0, 0, w, h);
    const r = mulberry(5);
    for (let i = 0; i < 4000; i++) { const v = 100 + r() * 70; c.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.25})`; c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    c.strokeStyle = 'rgba(40,38,34,.35)'; c.lineWidth = 2;
    for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 32) % 2 ? 0 : 24; x < w; x += 48) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(60,80,50,${r() * 0.25})`; c.beginPath(); c.arc(r() * w, h * 0.6 + r() * h * 0.4, r() * 30, 0, 7); c.fill(); }
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(3, 1);
  const holes = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000';
    for (let row = 0; row < 4; row++) {
      const y = 30 + row * 52; const n = 16;
      for (let i = 0; i < n; i++) {
        const x = (i + (row % 2) * 0.5) * (w / n);
        c.beginPath();
        if (row < 2) { c.moveTo(x, y - 18); c.lineTo(x + 12, y); c.lineTo(x, y + 18); c.lineTo(x - 12, y); }
        else { c.rect(x - 9, y - 14, 18, 28); }
        c.fill();
      }
    }
  });
  holes.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, color: 0xcfcac0 });
  const bellMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, color: 0xcfcac0, alphaMap: holes, alphaTest: 0.5, side: THREE.DoubleSide });
  const prof = [[0, -1.2], [1.35, -1.2], [1.35, -1.05], [1.25, -1.0], [1.25, -0.85], [1.18, -0.8]];
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 8), mat); g.add(base);
  const bellPts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const a = t * Math.PI * 0.5; bellPts.push(new THREE.Vector2(Math.cos(a) * 1.1 * (1 - t * 0.08), -0.8 + Math.sin(a) * 1.25)); }
  const bellGeo = new THREE.LatheGeometry(bellPts, 64);
  const uv = bellGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const bell = new THREE.Mesh(bellGeo, bellMat); g.add(bell);
  const inner = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x55524a, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), darkMat); body.scale.set(1, 0.9, 0.8); body.position.y = -0.45; inner.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), darkMat); head.position.y = 0.05; inner.add(head);
  const lap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), darkMat); lap.scale.set(1.1, 0.4, 0.8); lap.position.y = -0.7; inner.add(lap);
  g.add(inner);
  const sq = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.42), mat); sq.position.y = 0.55; g.add(sq);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.17, 0.75, 8), mat); spire.position.y = 1.05; g.add(spire);
  g.scale.setScalar(0.95); g.position.y = 0.05;
  return { group: g, click() { gsap.fromTo(inner.scale, { x: 1, y: 1, z: 1 }, { x: 1.05, y: 1.05, z: 1.05, yoyo: true, repeat: 1, duration: 0.6 }); if (sound.can()) sound.gong(98, sound.ctx.currentTime, 0.3, 4); emit('toast', { text: 'Inside each bell sits a Buddha. There are 72 of them on the upper terraces.', kind: 'whisper' }); } };
}

// ---------- coffee ----------
function coffee() {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 0.8 });
  const pts = [new THREE.Vector3(-1.5, -0.9, 0), new THREE.Vector3(-0.6, -0.3, 0.1), new THREE.Vector3(0.4, 0.05, -0.05), new THREE.Vector3(1.4, 0.5, 0.05)];
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.045, 8), stemMat));
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(0.32, 0.25, 0.3, 0.95, 0, 1.4); leafShape.bezierCurveTo(-0.3, 0.95, -0.32, 0.25, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 18);
  const lp = leafGeo.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, Math.abs(x) * 0.5 - Math.sin(y * 2.2) * 0.12 + Math.sin(x * 20 + y * 6) * 0.01); }
  leafGeo.computeVertexNormals();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide });
  const cherry = new THREE.SphereGeometry(0.13, 18, 12); cherry.scale(1, 1.15, 1);
  const red = new THREE.MeshStandardMaterial({ color: 0xb3201a, roughness: 0.25, metalness: 0.05 });
  const green = new THREE.MeshStandardMaterial({ color: 0x7a9a3a, roughness: 0.35 });
  const leaves = [];
  const rnd = mulberry(8);
  for (let k = 0; k < 5; k++) {
    const t = 0.12 + k * 0.19; const p = curve.getPointAt(t);
    for (const s of [1, -1]) {
      const l = new THREE.Mesh(leafGeo, leafMat); l.position.copy(p);
      l.rotation.set(s * 1.1, 0.3 * s, -0.6 + s * 0.3 + t * 0.3); l.scale.setScalar(0.75 + rnd() * 0.3);
      g.add(l); leaves.push({ l, base: l.rotation.x, ph: rnd() * 6 });
    }
    for (let i = 0; i < 6 + k; i++) {
      const c = new THREE.Mesh(cherry, rnd() < 0.72 ? red : green);
      const a = rnd() * Math.PI * 2; c.position.set(p.x + Math.cos(a) * 0.14, p.y - 0.06 + Math.sin(a) * 0.1, p.z + Math.sin(a) * 0.15);
      c.rotation.z = rnd(); g.add(c);
    }
  }
  g.rotation.z = 0.15; g.scale.setScalar(0.95);
  return { group: g, update(t) { for (const { l, base, ph } of leaves) l.rotation.x = base + Math.sin(t * 1.4 + ph) * 0.06; }, click() { sound.note(3, 0.16); emit('toast', { text: 'From 1830, villages had to grow it. Most never drank it.', kind: 'whisper' }); } };
}

// ---------- keris ----------
function keris() {
  const g = new THREE.Group();
  const pamor = canvasTex(128, 512, (c, w, h) => {
    c.fillStyle = '#2b2d30'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(210,214,220,${0.15 + Math.random() * 0.4})`; c.lineWidth = 1 + Math.random() * 1.5;
      c.beginPath(); let x = Math.random() * w;
      for (let y = 0; y <= h; y += 8) { x += Math.sin(y * 0.05 + i) * 3 + (Math.random() - 0.5) * 2; y === 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
  });
  const steel = new THREE.MeshStandardMaterial({ map: pamor, metalness: 0.85, roughness: 0.35, color: 0xbfc4ca });
  // wavy blade with 7 luk
  const L = 3, N = 60; const shape = new THREE.Shape();
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; const y = t * L;
    const c = Math.sin(t * Math.PI * 7) * 0.09 * (1 - t * 0.6);
    const w = 0.24 * (1 - Math.pow(t, 1.6)) + 0.02 + (t < 0.08 ? (0.08 - t) * 2.2 : 0);
    left.push([c - w, y]); right.push([c + w, y]);
  }
  shape.moveTo(...left[0]); left.forEach((p) => shape.lineTo(...p)); shape.lineTo(0, L + 0.05); right.reverse().forEach((p) => shape.lineTo(...p)); shape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4 });
  bladeGeo.translate(0, 0, -0.02);
  const bb = bladeGeo.attributes.uv; const bp = bladeGeo.attributes.position;
  for (let i = 0; i < bb.count; i++) bb.setXY(i, bp.getX(i) * 0.6 + 0.5, bp.getY(i) / L);
  const blade = new THREE.Mesh(bladeGeo, steel); g.add(blade);
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.95, roughness: 0.3 });
  const gShape = new THREE.Shape(); gShape.moveTo(-0.5, 0); gShape.quadraticCurveTo(-0.55, 0.12, -0.35, 0.16); gShape.lineTo(0.42, 0.13); gShape.quadraticCurveTo(0.55, 0.08, 0.5, -0.02); gShape.closePath();
  const ganja = new THREE.Mesh(new THREE.ExtrudeGeometry(gShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), steel);
  ganja.position.set(0, -0.12, -0.05); g.add(ganja);
  const selut = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 10, 24), gold); selut.rotation.x = Math.PI / 2; selut.position.y = -0.2; g.add(selut);
  const woodTex = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3a1e0e'); gr.addColorStop(0.5, '#7a4523'); gr.addColorStop(1, '#3a1e0e'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(30,12,4,.3)'; c.beginPath(); c.moveTo(Math.random() * w, 0); c.bezierCurveTo(Math.random() * w, h / 3, Math.random() * w, h / 2, Math.random() * w, h); c.stroke(); } });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.4 });
  const hpts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; hpts.push(new THREE.Vector3(Math.sin(t * 2.2) * 0.22, -0.22 - t * 0.85, 0)); }
  const hilt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hpts), 30, 0.1, 12), woodMat); g.add(hilt);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), woodMat); pommel.position.set(Math.sin(2.2) * 0.22, -1.08, 0); pommel.scale.set(1.3, 0.9, 1); g.add(pommel);
  g.position.y = -0.8; g.rotation.z = -0.35; g.scale.setScalar(0.78);
  const w = new THREE.Group(); w.add(g);
  return { group: w, click() { gsap.fromTo(g.rotation, { y: 0 }, { y: Math.PI * 2, duration: 1.6, ease: 'expo.inOut' }); sound.note(5, 0.16); } };
}

// ---------- pelita ----------
function pelita() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8893e, metalness: 0.9, roughness: 0.32 });
  const clay = new THREE.MeshStandardMaterial({ color: 0x7a4426, roughness: 0.8 });
  const prof = [[0, -1.1], [0.75, -1.1], [0.8, -1.02], [0.42, -0.9], [0.3, -0.5], [0.34, -0.36], [0.62, -0.25], [0.82, -0.05], [0.7, 0.12], [0.2, 0.14], [0.08, 0.2], [0, 0.2]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48), brass); g.add(body);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 12, 1, true), brass); spout.rotation.z = -Math.PI / 2 + 0.25; spout.position.set(0.95, 0.08, 0); g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 24, Math.PI * 1.3), brass); handle.position.set(-0.85, 0, 0); handle.rotation.z = 0.9; g.add(handle);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); wick.position.set(1.28, 0.2, 0); g.add(wick);
  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uOn: { value: 0 } },
    vertexShader: /* glsl */`uniform float uT; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.x += sin(uT * 9.0 + p.y * 6.0) * 0.03 * (p.y + 0.2); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uOn; varying vec2 vUv; void main(){ vec2 c = vUv - vec2(0.5, 0.25); c.y *= 0.55; float d = length(c); float core = smoothstep(0.22, 0.0, d); float glow = smoothstep(0.5, 0.0, d);
      vec3 col = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.95, 0.75), core); gl_FragColor = vec4(col, (glow * 0.6 + core) * uOn); }`,
  });
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9, 1, 8), flameMat); flame.position.set(1.28, 0.6, 0); g.add(flame);
  const light = new THREE.PointLight(0xffa04a, 0, 6, 1.6); light.position.set(1.28, 0.7, 0.2); g.add(light);
  g.position.set(-0.25, 0, 0); g.scale.setScalar(0.95);
  let lit = false;
  return {
    group: g, faceCamera: flame,
    update(t, cam) { flameMat.uniforms.uT.value = t; if (cam) flame.quaternion.copy(cam.quaternion); light.intensity = flameMat.uniforms.uOn.value * (6 + Math.sin(t * 13) * 0.8 + Math.sin(t * 7.3) * 0.6); },
    click() {
      lit = !lit; gsap.to(flameMat.uniforms.uOn, { value: lit ? 1 : 0, duration: lit ? 1.2 : 0.5 });
      sound.chime();
      if (lit) emit('toast', { text: 'Habis gelap terbitlah terang. After darkness, light.', kind: 'whisper' });
      emit('pelita', lit);
    },
  };
}

const MAKERS = { nutmeg, carrack, duit, stupa, coffee, keris, pelita };

// turn standard materials into cel shading with an inked outline shell
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 0.022;'); };
export function toonify(root, outline = true) {
  const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const conv = list.map((m) => {
      if (!m.isMeshStandardMaterial) return m;
      const t = new THREE.MeshToonMaterial({ color: m.color, map: m.map, gradientMap: RAMP4, side: m.side, transparent: m.transparent, alphaMap: m.alphaMap, alphaTest: m.alphaTest, emissive: m.emissive, emissiveIntensity: m.emissiveIntensity });
      t.userData.src = m; return t;
    });
    o.material = Array.isArray(o.material) ? conv : conv[0];
    if (outline && !o.material.isShaderMaterial && !o.userData.noOutline && !/Plane|Shape/.test(o.geometry.type)) {
      const sh = new THREE.Mesh(o.geometry, outlineMat); sh.renderOrder = -1; o.add(sh);
    }
  }
}

export class Relics {
  constructor(renderer) {
    const pm = new THREE.PMREMGenerator(renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.items = [];
    this.time = 0;
    document.querySelectorAll('.vitrine').forEach((fig) => this.add(fig));
  }

  add(fig) {
    const kind = fig.dataset.relic; const maker = MAKERS[kind]; if (!maker) return;
    const el = fig.querySelector('.vitrine-stage');
    const scene = new THREE.Scene(); scene.environment = this.env;
    const key = new THREE.DirectionalLight(0xfff6e8, 2.8); key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 1.4); rim.position.set(-4, 2, -3);
    scene.add(key, rim, new THREE.HemisphereLight(0xfff8ee, 0x8a7aa0, 1.4));
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0.25, 7.2); camera.lookAt(0, 0, 0);
    const relic = maker(); toonify(relic.group);
    const holder = new THREE.Group(); holder.add(relic.group); scene.add(holder);
    const item = { fig, el, scene, camera, relic, holder, rotY: 0, rotX: 0.1, vel: 0.25, visible: false, hover: 0, hoverT: 0, enter: 0 };
    this.items.push(item);
    // visibility
    const io = new IntersectionObserver((ents) => { for (const e of ents) item.visible = e.isIntersecting; }, { rootMargin: '10% 0px' });
    io.observe(el);
    // drag and click
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; item.vel = 0; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved += Math.abs(dx) + Math.abs(dy);
      item.rotY += dx * 0.012; item.rotX = Math.max(-0.6, Math.min(0.7, item.rotX + dy * 0.006)); item.vel = dx * 0.6;
      down.x = e.clientX; down.y = e.clientY;
    });
    const up = () => { if (!down) return; const click = down.moved < 8 && performance.now() - down.t < 500; down = null; if (click && relic.click) { relic.click(); emit('relic', kind); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); relic.click?.(); } if (e.key === 'ArrowLeft') item.rotY -= 0.3; if (e.key === 'ArrowRight') item.rotY += 0.3; });
    el.addEventListener('pointerenter', () => { item.hoverT = 1; });
    el.addEventListener('pointerleave', () => { item.hoverT = 0; });
  }

  addCharacter(el, type) {
    const scene = new THREE.Scene();
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2, 4, 5);
    scene.add(key, new THREE.HemisphereLight(0xeaf4ff, 0xb08a6a, 1.6));
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50); camera.position.set(0, 0.72, 2.95); camera.lookAt(0, 0.62, 0);
    const ch = makeCharacter(type); const holder = new THREE.Group(); holder.add(ch.group); scene.add(holder);
    // portraits live inside their cards, so they get their own 2D canvas fed by a shared offscreen renderer
    const cv = document.createElement('canvas'); cv.className = 'person-canvas'; el.appendChild(cv);
    const item = { fig: el, el, scene, camera, holder, relic: { update: () => {} }, rotY: 0, baseRot: -0.25, rotX: 0, vel: 0, visible: false, hover: 0, hoverT: 0, enter: 0, char: ch, wave: 0, cv, ctx: cv.getContext('2d') };
    const person = el.closest('.person');
    const io = new IntersectionObserver((ents) => { for (const e of ents) item.visible = e.isIntersecting; }, { rootMargin: '10% 0px' }); io.observe(el);
    (person || el).addEventListener('pointerenter', () => { item.hoverT = 1; });
    (person || el).addEventListener('pointerleave', () => { item.hoverT = 0; });
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX }; });
    el.addEventListener('pointermove', (e) => { if (!down) return; item.baseRot += (e.clientX - down.x) * 0.015; down.x = e.clientX; });
    window.addEventListener('pointerup', () => { down = null; });
    this.items.push(item);
    return item;
  }

  charRenderer() {
    if (!this._cr) {
      this._cr = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      this._cr.outputColorSpace = THREE.SRGBColorSpace; this._cr.toneMapping = THREE.ACESFilmicToneMapping; this._cr.toneMappingExposure = 1.05;
      this._cr.setClearColor(0x000000, 0);
    }
    return this._cr;
  }

  frame(dt, r, W, H) {
    this.time += dt;
    let first = true;
    for (const it of this.items) {
      if (!it.visible) { it.enter = 0; continue; }
      const rect = it.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > H || rect.right < 0 || rect.left > W || rect.width < 10) continue;
      it.enter = Math.min(1, it.enter + dt * 0.9);
      const e = 1 - Math.pow(1 - it.enter, 3);
      it.hover += (it.hoverT - it.hover) * Math.min(1, dt * 6);
      if (!state.reduced) it.rotY += (it.vel * 0.01 + 0.18) * dt * (1 - it.hover * 0.7);
      it.vel *= Math.pow(0.04, dt);
      it.holder.rotation.set(it.rotX, it.rotY, 0);
      it.holder.position.y = Math.sin(this.time * 1.1) * 0.08 + (1 - e) * -0.6;
      it.holder.scale.setScalar((0.85 + 0.15 * e) * (1 + it.hover * 0.06));
      it.relic.update?.(this.time, it.camera);
      if (it.char) {
        const near = it.fig.closest('.person')?.classList.contains('is-near');
        it.wave += ((it.hoverT || near ? 1 : 0) - it.wave) * Math.min(1, dt * 5);
        it.char.pose(this.time + it.rotX, { walk: 0, wave: it.wave });
        it.holder.rotation.set(0, it.baseRot + Math.sin(this.time * 0.6 + it.baseRot * 3) * 0.25 * (1 - it.wave) + it.wave * 0.25, 0);
        it.holder.position.y = Math.abs(Math.sin(this.time * 3)) * 0.04 * it.wave;
        it.holder.scale.setScalar(1);
        it.camera.aspect = rect.width / rect.height; it.camera.updateProjectionMatrix();
        const cr = this.charRenderer(); const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        const cw = Math.round(rect.width * pr), chh = Math.round(rect.height * pr);
        if (cr.domElement.width !== cw || cr.domElement.height !== chh) cr.setSize(cw, chh, false);
        if (it.cv.width !== cw || it.cv.height !== chh) { it.cv.width = cw; it.cv.height = chh; }
        cr.render(it.scene, it.camera);
        it.ctx.clearRect(0, 0, cw, chh); it.ctx.drawImage(cr.domElement, 0, 0);
        continue;
      }
      it.camera.aspect = rect.width / rect.height;
      it.camera.fov = rect.width / rect.height < 0.8 ? 38 : 30;
      it.camera.position.z = rect.width / rect.height < 0.8 ? 8.4 : 7.2;
      it.camera.updateProjectionMatrix();
      const x = rect.left, y = H - rect.bottom;
      r.setScissorTest(true);
      r.setScissor(x, y, rect.width, rect.height); r.setViewport(x, y, rect.width, rect.height);
      if (first) { r.clearDepth(); first = false; } else r.clearDepth();
      r.render(it.scene, it.camera);
    }
    r.setScissorTest(false);
  }
}
