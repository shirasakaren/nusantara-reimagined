// The old station where the story begins. A striped canopy, a ticket booth, a bell that
// rings on every dispatch, a zig zag queue and a hand painted sign.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat, gradient3 } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { T, cellCenter } from '../coaster/pieces.js';
import { addInteractive, squash, wobble } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';

function signTexture(text, sub) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 300;
  const g = cv.getContext('2d');
  const r = 70;
  g.fillStyle = '#2a1f3d';
  g.beginPath(); g.roundRect(6, 6, 1012, 288, r); g.fill();
  g.fillStyle = '#fff3df';
  g.beginPath(); g.roundRect(22, 22, 980, 256, r - 14); g.fill();
  // little bulbs around the edge
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 50 + t * 924;
    g.fillStyle = i % 2 ? '#ffc94a' : '#ff6b6b';
    g.beginPath(); g.arc(x, 40, 9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x, 260, 9, 0, Math.PI * 2); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 128px Fredoka, "Nunito", sans-serif';
  g.lineWidth = 16; g.strokeStyle = '#2a1f3d'; g.lineJoin = 'round';
  g.strokeText(text, 512, 138);
  const grad = g.createLinearGradient(0, 80, 0, 200);
  grad.addColorStop(0, '#ff7b7b'); grad.addColorStop(1, '#e84a5f');
  g.fillStyle = grad;
  g.fillText(text, 512, 138);
  g.font = '700 40px Fredoka, "Nunito", sans-serif';
  g.fillStyle = '#2a1f3d';
  g.fillText(sub, 512, 222);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class Station {
  constructor(scene, start) {
    this.scene = scene;
    // station runs east along x, 3 cells from start.ci, platform on the south side
    const x0 = cellCenter(start.ci) - T / 2, x1 = x0 + T * 3;
    const zc = cellCenter(start.cj);
    this.x0 = x0; this.x1 = x1; this.zc = zc;
    const b = new GeoBuilder();
    const pz = zc + T * 0.95; // platform center
    // platform deck
    b.add(P('box', T * 3 + 3, 0.6, T * 1.1), PAL.wood, M((x0 + x1) / 2, 0.3, pz), 0.06);
    for (let k = 0; k < 14; k++) b.add(P('box', 0.06, 0.02, T * 1.1), PAL.woodDark, M(x0 - 1.2 + k * 1.05, 0.61, pz), 0);
    b.add(P('box', T * 3 + 3, 0.04, 0.3), PAL.sun, M((x0 + x1) / 2, 0.62, zc + T * 0.45), 0);
    // stairs down to the plaza
    for (let k = 0; k < 3; k++) b.add(P('box', 3, 0.2, 0.6), PAL.wood, M((x0 + x1) / 2, 0.1 + k * 0.18, pz + T * 0.55 + 0.9 - k * 0.5), 0.03);
    // pillars
    const pillarX = [x0 - 0.8, (x0 + x1) / 2, x1 + 0.8];
    const pillarZ = [zc - T * 0.5 + 0.2, pz + T * 0.5 - 0.3];
    for (const px of pillarX) for (const zz of pillarZ) {
      b.add(P('cyl', 0.22, 0.26, 4.6, 10), 0xfff3df, M(px, 2.3, zz), 0.05);
      for (let k = 0; k < 4; k++) b.add(P('torus', 0.25, 0.05, 4, 10), PAL.cherry, M(px, 0.8 + k * 1.1, zz, Math.PI / 2), 0);
    }
    // striped canopy roof (two slopes)
    const roofW = T * 3 + 4.4, depth = T * 2.3;
    const stripes = 12;
    for (let k = 0; k < stripes; k++) {
      const x = x0 - 2.2 + (k + 0.5) * (roofW / stripes);
      const col = k % 2 ? 0xfff3df : PAL.coral;
      b.add(P('box', roofW / stripes, 0.16, depth * 0.56), col, M(x, 5.25, zc + T * 0.25 - depth * 0.24, 0.28), 0.04);
      b.add(P('box', roofW / stripes, 0.16, depth * 0.56), col, M(x, 5.25, zc + T * 0.25 + depth * 0.24, -0.28), 0.04);
      // scalloped edge
      b.add(P('sphere', roofW / stripes / 2, 10, 6, 0, Math.PI * 2), col, M(x, 4.55, zc + T * 0.25 - depth * 0.49, 0, 0, 0, 1, 0.6, 0.3), 0.03);
      b.add(P('sphere', roofW / stripes / 2, 10, 6, 0, Math.PI * 2), col, M(x, 4.55, zc + T * 0.25 + depth * 0.49, 0, 0, 0, 1, 0.6, 0.3), 0.03);
    }
    b.add(P('cyl', 0.2, 0.2, roofW, 8), PAL.sun, M((x0 + x1) / 2, 5.95, zc + T * 0.25, 0, 0, Math.PI / 2), 0.04);
    // ticket booth on the platform's east end
    const bx = x1 + 3.8, bz = pz + 1.5;
    b.add(P('box', 2.4, 2.6, 2.2), PAL.mint, M(bx, 1.3, bz), 0.05);
    b.add(P('box', 1.6, 0.9, 0.1), 0xdff6ff, M(bx, 1.7, bz - 1.11), 0.03);
    b.add(P('cone', 2.0, 1.4, 4), PAL.sun, M(bx, 3.3, bz, 0, Math.PI / 4), 0.05);
    b.add(P('sphere', 0.22, 8, 6), PAL.cherry, M(bx, 4.1, bz), 0.03);
    b.add(P('box', 2.6, 0.12, 0.6), PAL.wood, M(bx, 1.2, bz - 1.35), 0.03);
    // queue fences in a zig zag on the plaza
    const qz0 = pz + T * 0.55 + 1.6;
    for (let row = 0; row < 3; row++) {
      const z = qz0 + row * 1.8;
      for (let k = 0; k <= 6; k++) {
        const x = x0 + 1 + k * 1.6;
        b.add(P('cyl', 0.08, 0.1, 1.1, 6), PAL.sun, M(x, 0.55, z), 0.02);
        b.add(P('sphere', 0.12, 6, 4), PAL.cherry, M(x, 1.15, z), 0.02);
      }
      b.add(P('cyl', 0.04, 0.04, 9.6, 4), PAL.cherry, M(x0 + 1 + 4.8, 0.95, z, 0, 0, Math.PI / 2), 0);
    }
    // track side railings
    for (let k = 0; k < 7; k++) b.add(P('cyl', 0.06, 0.06, 1.0, 6), 0xfff3df, M(x0 + 0.5 + k * 1.85, 1.1, zc + T * 0.45 + 0.1), 0.02);
    b.add(P('cyl', 0.05, 0.05, T * 3, 4), 0xfff3df, M((x0 + x1) / 2, 1.55, zc + T * 0.45 + 0.1, 0, 0, Math.PI / 2), 0);

    const mesh = new THREE.Mesh(b.build(), toonMat());
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    this.mesh = mesh;

    // sign on top
    const tex = signTexture('WAAWer', 'COASTER  ·  EST. TODAY');
    const signMat = new THREE.MeshToonMaterial({ map: tex, gradientMap: gradient3, transparent: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.64), signMat);
    sign.position.set((x0 + x1) / 2, 7.4, zc + T * 0.25 + depth * 0.2);
    sign.rotation.x = -0.12;
    const signBack = sign.clone(); signBack.rotation.y = Math.PI; signBack.position.z -= 0.05;
    const signGroup = new THREE.Group();
    signGroup.add(sign, signBack);
    for (const sx of [-3.2, 3.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), toonMat());
      post.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(post.geometry.attributes.position.count * 3).fill(0.16), 3));
      post.position.set((x0 + x1) / 2 + sx, 6.2, zc + T * 0.25 + depth * 0.2);
      signGroup.add(post);
    }
    scene.add(signGroup);
    this.sign = sign;
    this.signTex = tex;
    // redraw once the font is ready so the sign uses Fredoka
    document.fonts?.ready?.then(() => {
      const t2 = signTexture('WAAWer', 'COASTER  ·  EST. TODAY');
      signMat.map = t2; signMat.needsUpdate = true; tex.dispose();
    });

    // bell on a post at the west end
    const bellPost = new GeoBuilder();
    bellPost.add(P('cyl', 0.1, 0.12, 3.2, 6), INK, M(0, 1.6, 0), 0.03);
    bellPost.add(P('box', 1, 0.12, 0.12), INK, M(0.4, 3.2, 0), 0.02);
    const post = new THREE.Mesh(bellPost.build(), toonMat());
    post.position.set(x0 - 1.8, 0.6, pz - 1);
    scene.add(post);
    const bb = new GeoBuilder();
    bb.add(P('cone', 0.42, 0.6, 12), PAL.sun, M(0, -0.3, 0), 0.04);
    bb.add(P('sphere', 0.12, 8, 6), PAL.tangerine, M(0, -0.65, 0), 0.02);
    const bell = new THREE.Mesh(bb.build(), toonMat());
    bell.position.set(0.8, 3.15, 0);
    post.add(bell);
    this.bell = bell;
    addInteractive({ obj: post, radius: 1.6, offset: new THREE.Vector3(0.6, 2.8, 0), name: 'Station bell', hint: 'Ding ding.', onClick: () => this.ring() });

    // waving flags on the roof
    this.flags = [];
    const flagCols = [PAL.sun, PAL.mint, PAL.sky];
    [x0 - 2, (x0 + x1) / 2, x1 + 2].forEach((fx, i) => {
      const fg = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), new THREE.MeshToonMaterial({ color: INK, gradientMap: gradient3 }));
      pole.position.y = 1.1;
      const geo = new THREE.PlaneGeometry(1.3, 0.8, 8, 1);
      geo.translate(0.65, 0, 0);
      const flag = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: flagCols[i], gradientMap: gradient3, side: THREE.DoubleSide }));
      flag.position.y = 1.8;
      fg.add(pole, flag);
      fg.position.set(fx, 6.0, zc + T * 0.25);
      scene.add(fg);
      this.flags.push({ flag, geo, base: geo.attributes.position.array.slice(), ph: i });
    });

    addInteractive({
      obj: mesh, radius: 6, center: () => new THREE.Vector3((x0 + x1) / 2, 4, zc + T * 0.6), name: 'WAAWer Station', hint: 'Where every ride begins.',
      onClick: () => { squash(signGroup, 0.4); this.ring(); bus.emit('mascot:talk', 'station'); },
    });
    this.time = 0;
    bus.on('ride:dispatch', () => this.ring());
  }

  ring() {
    audio.play('bell');
    wobble(this.bell, 0.6);
    gsap.fromTo(this.bell.rotation, { z: 0.6 }, { z: 0, duration: 1.4, ease: 'elastic.out(1.2, 0.2)' });
  }

  update(dt, wind) {
    this.time += dt;
    for (const f of this.flags) {
      const p = f.geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = f.base[i * 3], by = f.base[i * 3 + 1];
        p.setZ(i, Math.sin(this.time * 6 + bx * 3 + f.ph) * 0.15 * (bx / 1.3) * (0.6 + wind * 0.6));
        p.setY(i, by + Math.sin(this.time * 4 + bx * 2) * 0.04 * bx);
      }
      p.needsUpdate = true;
    }
  }
}
