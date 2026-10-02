// Life above and around the island: bird flocks and gulls, butterflies, a toy plane with
// a banner, a hot air balloon, sailboats, a shy whale and fish that leap for joy.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { addInteractive, squash } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { coastR, SITES, heightAt } from './terrain.js';
import { mulberry32 } from './noise.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

// ---------------------------------------------------------------- birds
class Birds {
  constructor(scene) {
    const rnd = mulberry32(12);
    this.rnd = rnd;
    const body = new GeoBuilder();
    body.add(P('sphere', 0.3, 10, 8), 0xffffff, M(0, 0, 0, 0, 0, 0, 0.8, 0.75, 1.5), 0.04);
    body.add(P('sphere', 0.2, 8, 6), 0xffffff, M(0, 0.12, -0.42), 0.03);
    body.add(P('cone', 0.06, 0.2, 4), PAL.sun, M(0, 0.1, -0.66, -Math.PI / 2), 0.015);
    body.add(P('sphere', 0.035, 6, 4), INK, M(0.1, 0.18, -0.52), 0);
    body.add(P('sphere', 0.035, 6, 4), INK, M(-0.1, 0.18, -0.52), 0);
    body.add(P('cone', 0.16, 0.3, 4), 0xe9e4ff, M(0, 0.02, 0.5, Math.PI / 2, Math.PI / 4), 0.02);
    const wing = new GeoBuilder();
    wing.add(P('box', 0.9, 0.05, 0.42), 0xffffff, M(0.45, 0, 0), 0.03);
    wing.add(P('box', 0.3, 0.05, 0.3), 0x7cc6fe, M(0.85, 0, 0.02), 0);
    const N = 34;
    this.N = N;
    const mat = toonMat();
    this.body = new THREE.InstancedMesh(body.build(), mat, N);
    this.wl = new THREE.InstancedMesh(wing.build(), mat, N);
    this.wr = new THREE.InstancedMesh(this.wl.geometry, mat, N);
    for (const im of [this.body, this.wl, this.wr]) { im.castShadow = true; im.frustumCulled = false; scene.add(im); }
    const tints = [0xffffff, 0xffe6ea, 0xe3f4ff, 0xfff1c2];
    const c = new THREE.Color();
    this.birds = [];
    this.flocks = [
      { cx: -30, cz: -20, r: 70, y: 30, speed: 0.12, ph: 0 },
      { cx: 40, cz: 30, r: 90, y: 38, speed: -0.09, ph: 2 },
      { cx: 0, cz: 0, r: 130, y: 26, speed: 0.07, ph: 4 },
    ];
    for (let i = 0; i < N; i++) {
      let kind = 'flock', f = i % 3;
      if (i >= 24 && i < 28) kind = 'gull';
      if (i >= 28) kind = 'free';
      const b = { i, kind, f, off: new THREE.Vector3((rnd() - 0.5) * 9, (rnd() - 0.5) * 3, (rnd() - 0.5) * 9), ph: rnd() * 10, flap: 9 + rnd() * 4, pos: new THREE.Vector3(), prev: new THREE.Vector3(), roll: 0, trick: 0, life: 0, vel: new THREE.Vector3() };
      if (kind === 'free') b.pos.set(0, -100, 0);
      this.birds.push(b);
      this.body.setColorAt(i, c.set(tints[i % tints.length]));
      addInteractive({
        center: () => b.pos, radius: 1.6, name: kind === 'gull' ? 'Seagull' : 'Songbird', hint: kind === 'gull' ? 'Eyeing your snacks.' : 'Click for a trick.',
        enabled: () => b.kind !== 'free' || b.life > 0,
        onClick: () => { b.trick = 1; audio.play(b.kind === 'gull' ? 'gull' : 'chirp', { n: 4 }); bus.emit('fx:burst', { pos: b.pos.clone(), kind: 'feathers', n: 8 }); bus.emit('stat:bird'); },
      });
    }
    this.time = 0;
    bus.on('fx:birdflee', (pos) => this.flee(pos));
  }

  flee(pos) {
    const b = this.birds.find((x) => x.kind === 'free' && x.life <= 0);
    if (!b) return;
    b.life = 5;
    b.pos.copy(pos);
    const a = Math.random() * Math.PI * 2;
    b.vel.set(Math.cos(a) * 6, 7, Math.sin(a) * 6);
    audio.play('chirp', { n: 3 });
  }

  update(dt, night) {
    this.time += dt;
    const t = this.time;
    for (const b of this.birds) {
      b.prev.copy(b.pos);
      if (b.kind === 'flock') {
        const F = this.flocks[b.f];
        const ang = t * F.speed + F.ph;
        const cx = F.cx + Math.cos(ang) * F.r, cz = F.cz + Math.sin(ang) * F.r * 0.8;
        b.pos.set(cx + b.off.x + Math.sin(t * 0.7 + b.ph) * 1.5, F.y + b.off.y + Math.sin(t * 1.3 + b.ph) * 0.8, cz + b.off.z + Math.cos(t * 0.6 + b.ph) * 1.5);
      } else if (b.kind === 'gull') {
        const k = b.i - 24;
        const cx = k < 2 ? SITES.lighthouse.x : SITES.dock.x + 8, cz = k < 2 ? SITES.lighthouse.z : SITES.dock.z;
        const ang = t * (0.25 + k * 0.05) * (k % 2 ? -1 : 1) + k * 1.7;
        b.pos.set(cx + Math.cos(ang) * (12 + k * 3), 18 + Math.sin(t * 0.5 + k) * 3, cz + Math.sin(ang) * (12 + k * 3));
      } else {
        if (b.life > 0) {
          b.life -= dt;
          b.vel.y -= dt * 1.2;
          b.pos.addScaledVector(b.vel, dt);
          if (b.life <= 0) b.pos.set(0, -100, 0);
        }
      }
      // orientation from velocity
      const dir = _p.subVectors(b.pos, b.prev);
      const hidden = (b.kind === 'free' && b.life <= 0);
      let yaw = Math.atan2(-dir.x, -dir.z);
      if (dir.lengthSq() < 1e-8) yaw = b.yaw ?? 0;
      b.yaw = yaw;
      if (b.trick > 0) { b.trick = Math.max(0, b.trick - dt * 0.9); }
      const roll = b.trick > 0 ? (1 - b.trick) * Math.PI * 2 : Math.sin(t * 0.8 + b.ph) * 0.2;
      _e.set(dir.y * 3, yaw, roll, 'YXZ');
      _q.setFromEuler(_e);
      _s.setScalar(hidden ? 0.0001 : (b.kind === 'gull' ? 1.4 : 1));
      _m.compose(b.pos, _q, _s);
      this.body.setMatrixAt(b.i, _m);
      const glide = b.kind === 'gull' ? 0.25 : 1;
      const flap = Math.sin(t * b.flap + b.ph) * 0.8 * glide + (b.kind === 'gull' ? 0.1 : 0);
      const wl = new THREE.Matrix4().makeRotationZ(flap);
      this.wl.setMatrixAt(b.i, _m.clone().multiply(new THREE.Matrix4().makeTranslation(0.18, 0.05, 0)).multiply(wl));
      this.wr.setMatrixAt(b.i, _m.clone().multiply(new THREE.Matrix4().makeTranslation(-0.18, 0.05, 0)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-flap)));
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.wl.instanceMatrix.needsUpdate = true;
    this.wr.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- butterflies
class Butterflies {
  constructor(scene) {
    const rnd = mulberry32(44);
    const wing = new GeoBuilder();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.bezierCurveTo(0.2, 0.35, 0.55, 0.35, 0.5, 0.05); shape.bezierCurveTo(0.55, -0.2, 0.2, -0.3, 0, 0);
    const wg = new THREE.ShapeGeometry(shape, 6);
    wg.rotateX(-Math.PI / 2);
    wg.deleteAttribute('uv');
    wing.add(wg, 0xffffff, M(), 0);
    const N = 18;
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.wl = new THREE.InstancedMesh(wing.build(), mat, N);
    this.wr = new THREE.InstancedMesh(this.wl.geometry, mat, N);
    this.wl.frustumCulled = this.wr.frustumCulled = false;
    const cols = [0xff9ec7, 0xffc94a, 0x7cc6fe, 0xb79cf2, 0xff9f43, 0xffffff];
    const c = new THREE.Color();
    this.list = [];
    for (let i = 0; i < N; i++) {
      const side = Math.floor(rnd() * 4), t = (rnd() * 2 - 1) * 42;
      const e = 44 + rnd() * 8;
      const [x, z] = side === 0 ? [t, -e] : side === 1 ? [e, t] : side === 2 ? [t, e] : [-e, t];
      this.list.push({ home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 1.2, z), ph: rnd() * 20, sp: 0.6 + rnd() * 0.6 });
      this.wl.setColorAt(i, c.set(cols[i % cols.length]));
      this.wr.setColorAt(i, c.set(cols[i % cols.length]));
      const bf = this.list[i];
      addInteractive({ center: () => bf.pos, radius: 0.9, name: 'Butterfly', hint: 'Flutter flutter.', enabled: () => this.visible, onClick: () => { bf.ph += 3; audio.play('sparkle'); bus.emit('fx:burst', { pos: bf.pos.clone(), kind: 'sparkle', n: 10 }); } });
    }
    scene.add(this.wl, this.wr);
    this.time = 0;
    this.visible = true;
  }

  update(dt, night) {
    this.time += dt;
    const show = night < 0.5;
    this.visible = show;
    const t = this.time;
    this.list.forEach((b, i) => {
      const k = t * b.sp + b.ph;
      b.pos.set(b.home.x + Math.sin(k * 0.7) * 4 + Math.sin(k * 1.9) * 1.2, heightAt(b.home.x, b.home.z) + 1.0 + Math.abs(Math.sin(k * 2.3)) * 1.4, b.home.z + Math.cos(k * 0.5) * 4);
      const yaw = Math.atan2(Math.cos(k * 0.7), -Math.sin(k * 0.5));
      const flap = Math.sin(t * 22 + i) * 1.1;
      const base = new THREE.Matrix4().compose(b.pos, _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), _s.setScalar(show ? 0.7 : 0.0001));
      this.wl.setMatrixAt(i, base.clone().multiply(new THREE.Matrix4().makeRotationZ(flap)));
      this.wr.setMatrixAt(i, base.clone().multiply(new THREE.Matrix4().makeScale(-1, 1, 1)).multiply(new THREE.Matrix4().makeRotationZ(flap)));
    });
    this.wl.instanceMatrix.needsUpdate = true;
    this.wr.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- plane
function bannerTexture(text) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff3df'; g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#ff6b6b'; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 146, 1024, 14);
  g.font = '700 84px Fredoka, Nunito, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#2a1f3d';
  g.fillText(text, 512, 84);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Plane {
  constructor(scene) {
    const b = new GeoBuilder();
    b.add(P('capsule', 0.7, 2.6, 6, 12), PAL.cherry, M(0, 0, 0, Math.PI / 2), 0.08);
    b.add(P('box', 6.4, 0.18, 1.2), PAL.cream, M(0, 0.1, -0.4), 0.06);
    b.add(P('box', 2.4, 0.14, 0.7), PAL.cream, M(0, 0.25, 2.0), 0.05);
    b.add(P('box', 0.14, 1.0, 0.8), PAL.cherry, M(0, 0.7, 2.0), 0.05);
    b.add(P('sphere', 0.5, 12, 8), 0xdff6ff, M(0, 0.62, -0.4, 0, 0, 0, 0.8, 0.8, 1.2), 0.04);
    b.add(P('sphere', 0.28, 10, 8), 0xffd9b8, M(0, 0.85, -0.2), 0.03);
    b.add(P('box', 0.42, 0.12, 0.1), INK, M(0, 0.9, -0.42), 0);
    b.add(P('cyl', 0.38, 0.38, 0.3, 12), PAL.sun, M(0, 0, -2.0, Math.PI / 2), 0.04);
    for (const s of [-1, 1]) b.add(P('sphere', 0.3, 8, 6), INK, M(s * 0.9, -0.85, -0.6), 0.03);
    b.add(P('box', 1.8, 0.08, 0.08), INK, M(0, -0.6, -0.6), 0);
    const mesh = new THREE.Mesh(b.build(), toonMat());
    mesh.castShadow = true;
    const prop = new THREE.Mesh(new GeoBuilder().add(P('box', 2.4, 0.22, 0.06), PAL.wood, M(), 0.03).build(), toonMat());
    prop.position.set(0, 0, -2.2);
    mesh.add(prop);
    // banner
    const bg = new THREE.PlaneGeometry(14, 2.2, 24, 1);
    bg.translate(-7, 0, 0);
    bg.rotateY(Math.PI / 2);
    this.bannerBase = bg.attributes.position.array.slice();
    this.bannerMat = new THREE.MeshBasicMaterial({ map: bannerTexture('WAAWer Coaster is open!'), side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bg, this.bannerMat);
    banner.position.set(0, -0.2, 5.2);
    mesh.add(banner);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4), new THREE.MeshBasicMaterial({ color: INK }));
    rope.rotation.x = Math.PI / 2; rope.position.set(0, -0.1, 3.4);
    mesh.add(rope);
    this.group = new THREE.Group();
    this.group.add(mesh);
    scene.add(this.group);
    Object.assign(this, { mesh, prop, banner, bg });
    this.t = 0.3; this.loop = 0;
    addInteractive({ obj: mesh, radius: 4, name: 'Pilot Rosa', hint: 'Click for a loop the loop.', onClick: () => { if (this.loop <= 0) { this.loop = 1; audio.play('whoosh', { dur: 1.2, gain: 0.12 }); bus.emit('stat:plane'); } } });
    bus.on('plane:banner', (text) => { this.bannerMat.map?.dispose(); this.bannerMat.map = bannerTexture(text); this.bannerMat.needsUpdate = true; });
    document.fonts?.ready?.then(() => { this.bannerMat.map = bannerTexture('WAAWer Coaster is open!'); this.bannerMat.needsUpdate = true; });
  }

  update(dt) {
    this.t += dt / 70;
    const a = this.t * Math.PI * 2;
    const R = 160, y = 56 + Math.sin(a * 3) * 4;
    const pos = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R * 0.75);
    const next = new THREE.Vector3(Math.cos(a + 0.01) * R, y, Math.sin(a + 0.01) * R * 0.75);
    this.group.position.copy(pos);
    this.group.lookAt(next);
    this.group.rotateY(Math.PI);
    let pitch = 0;
    if (this.loop > 0) {
      this.loop = Math.max(0, this.loop - dt / 2.6);
      pitch = (1 - this.loop) * Math.PI * 2;
      if (Math.random() < 0.4) bus.emit('fx:burst', { pos: this.mesh.getWorldPosition(new THREE.Vector3()), kind: 'hearts', n: 1 });
    }
    this.mesh.rotation.x = -pitch;
    this.mesh.position.y = Math.sin(pitch) * 10 * (this.loop > 0 ? 1 : 0);
    this.mesh.position.z = (1 - Math.cos(pitch)) * -6 * (this.loop > 0 ? 1 : 0);
    this.mesh.rotation.z = 0.25;
    this.prop.rotation.z += dt * 40;
    const p = this.bg.attributes.position;
    const time = performance.now() / 1000;
    for (let i = 0; i < p.count; i++) {
      const z = this.bannerBase[i * 3 + 2];
      p.setX(i, this.bannerBase[i * 3] + Math.sin(time * 8 + z * 0.8) * 0.25 * (z / 14));
    }
    p.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- balloon
class Balloon {
  constructor(scene) {
    const geo = new THREE.SphereGeometry(5, 16, 14);
    geo.deleteAttribute('uv');
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const A = new THREE.Color(PAL.coral), B = new THREE.Color(PAL.butter), C = new THREE.Color(PAL.sky);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const ang = Math.atan2(z, x);
      const band = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 12) % 3;
      const c = band === 0 ? A : band === 1 ? B : C;
      // teardrop: pinch the bottom
      if (y < 0) { const k = 1 + y / 5 * 0.45; pos.setX(i, x * k); pos.setZ(i, z * k); pos.setY(i, y * 1.15); }
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const b = new GeoBuilder();
    b.add(geo, 0xffffff, M(0, 0, 0), 0.12);
    b.add(P('box', 1.8, 1.3, 1.8), PAL.wood, M(0, -8.6, 0), 0.06);
    b.add(P('box', 1.95, 0.25, 1.95), PAL.woodDark, M(0, -8.0, 0), 0.04);
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.8, 0.8]) b.add(P('cyl', 0.04, 0.04, 3.2, 4), INK, M(sx, -6.4, sz), 0);
    b.add(P('sphere', 0.3, 8, 6), 0xffd9b8, M(0.4, -7.5, 0.2), 0.03);
    b.add(P('sphere', 0.3, 8, 6), 0xb87a4b, M(-0.4, -7.5, -0.2), 0.03);
    // vertex colors from the sphere are overwritten by builder color, so restore them
    const mesh = new THREE.Mesh(b.build(), toonMat());
    const mc = mesh.geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) mc.setXYZ(i, cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]);
    mc.needsUpdate = true;
    mesh.castShadow = true;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.0, toneMapped: false }));
    flame.position.set(0, -6.2, 0);
    mesh.add(flame);
    scene.add(mesh);
    Object.assign(this, { mesh, flame });
    this.t = 0; this.burn = 0; this.lift = 0;
    addInteractive({ obj: mesh, radius: 6, name: 'The Hendersons\' balloon', hint: 'Click to fire the burner.', onClick: () => { this.burn = 1.4; this.lift = 6; audio.play('whoosh', { dur: 1, gain: 0.15 }); squash(mesh, 0.2); } });
  }

  update(dt, night) {
    this.t += dt;
    const a = this.t * 0.02 + 2.5;
    this.lift = Math.max(0, this.lift - dt * 0.6);
    this.mesh.position.set(Math.cos(a) * 95, 44 + Math.sin(this.t * 0.3) * 3 + this.lift, Math.sin(a) * 70 - 20);
    this.mesh.rotation.y = this.t * 0.05;
    this.burn = Math.max(0, this.burn - dt);
    const flick = this.burn > 0 ? 0.9 : (night > 0.5 ? 0.25 + Math.random() * 0.15 : 0);
    this.flame.material.opacity = flick;
    this.flame.scale.setScalar(this.burn > 0 ? 1.4 + Math.random() * 0.4 : 1);
  }
}

// ---------------------------------------------------------------- boats
class Boats {
  constructor(scene) {
    this.list = [];
    const cols = [[PAL.cherry, 0xffffff], [PAL.sky, PAL.sun]];
    cols.forEach(([hull, sail], i) => {
      const b = new GeoBuilder();
      b.add(P('sphere', 1, 14, 8), hull, M(0, 0.2, 0, 0, 0, 0, 1.4, 0.7, 3.4), 0.08);
      b.add(P('box', 2.4, 0.2, 5.4), PAL.wood, M(0, 0.7, 0), 0.04);
      b.add(P('cyl', 0.12, 0.12, 7, 6), PAL.woodDark, M(0, 4.2, -0.2), 0.04);
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, 6); s.lineTo(3.2, 0.2); s.closePath();
      const sg = new THREE.ShapeGeometry(s); sg.deleteAttribute('uv');
      b.add(sg, sail, M(0.05, 1.2, -0.2, 0, -Math.PI / 2), 0.05);
      const sg2 = sg.clone(); const idx = sg2.index.array; for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
      b.add(sg2, sail, M(-0.05, 1.2, -0.2, 0, -Math.PI / 2), 0);
      b.add(P('box', 0.9, 0.5, 0.05), PAL.coral, M(0, 7.4, -0.2), 0.02);
      const mesh = new THREE.Mesh(b.build(), toonMat());
      mesh.castShadow = true;
      scene.add(mesh);
      const boat = { mesh, r: 128 + i * 16, sp: (i ? -1 : 1) * 0.018, a: i * 2.6 };
      this.list.push(boat);
      addInteractive({ obj: mesh, radius: 4, offset: new THREE.Vector3(0, 2, 0), name: i ? 'The Blue Biscuit' : 'Lady Cherry', hint: 'Sailing round and round, like a coaster.', onClick: () => { audio.play('honk'); squash(mesh, 0.3); bus.emit('fx:burst', { pos: mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), kind: 'splash', n: 18 }); } });
    });
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    for (const b of this.list) {
      b.a += b.sp * dt;
      const x = Math.cos(b.a) * b.r, z = Math.sin(b.a) * b.r;
      b.mesh.position.set(x, -0.5 + Math.sin(this.t * 1.3 + b.a * 10) * 0.2, z);
      b.mesh.rotation.y = -b.a + (b.sp > 0 ? Math.PI : 0);
      b.mesh.rotation.z = Math.sin(this.t * 1.1 + b.a) * 0.06;
      b.mesh.rotation.x = Math.sin(this.t * 0.9) * 0.03;
      if (Math.random() < dt * 2) bus.emit('fx:wake', b.mesh.position.clone());
    }
  }
}

// ---------------------------------------------------------------- whale
class Whale {
  constructor(scene) {
    const b = new GeoBuilder();
    b.add(P('sphere', 1, 18, 12), 0x5b7fc4, M(0, 0, 0, 0, 0, 0, 3, 2.2, 6), 0.1);
    b.add(P('sphere', 1, 18, 12), 0xdfe8ff, M(0, -0.9, 0.6, 0, 0, 0, 2.4, 1.3, 4.6), 0);
    for (const s of [-1, 1]) {
      b.add(P('sphere', 0.32, 10, 8), 0xffffff, M(s * 2.2, 0.5, 3.9), 0.03);
      b.add(P('sphere', 0.18, 8, 6), INK, M(s * 2.3, 0.5, 4.1), 0);
      b.add(P('box', 2.4, 0.25, 1.2), 0x5b7fc4, M(s * 3.2, -0.8, 1.5, 0, 0, s * -0.4), 0.05);
      b.add(P('sphere', 0.3, 8, 6), PAL.pink, M(s * 2.2, -0.1, 4.6, 0, 0, 0, 1, 0.6, 0.4), 0);
    }
    b.add(P('torus', 0.6, 0.12, 6, 12, Math.PI), INK, M(0, -0.2, 5.75, 0, 0, Math.PI), 0);
    const tail = new GeoBuilder();
    tail.add(P('cone', 1.2, 4, 10), 0x5b7fc4, M(0, 0, -2, -Math.PI / 2), 0.07);
    tail.add(P('box', 5, 0.3, 1.6), 0x5b7fc4, M(0, 0, -4.2), 0.06);
    const mesh = new THREE.Mesh(b.build(), toonMat());
    const tailMesh = new THREE.Mesh(tail.build(), toonMat());
    tailMesh.position.z = -5;
    mesh.add(tailMesh);
    mesh.visible = false;
    scene.add(mesh);
    Object.assign(this, { mesh, tailMesh });
    this.phase = 'hidden'; this.timer = 14; this.t = 0;
    addInteractive({ obj: mesh, radius: 7, name: 'Bluebell the whale', hint: 'The oldest resident of the bay.', onClick: () => this.spout(true) });
  }

  spout(clicked) {
    audio.play('splash');
    bus.emit('fx:burst', { pos: this.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)), kind: 'spout', n: 40 });
    if (clicked) { bus.emit('fx:say', { pos: this.mesh.position.clone().add(new THREE.Vector3(0, 8, 0)), text: 'Hellooooo!', ms: 2000 }); bus.emit('stat:whale'); }
  }

  update(dt) {
    this.t += dt;
    this.timer -= dt;
    const m = this.mesh;
    if (this.phase === 'hidden' && this.timer <= 0) {
      const a = Math.random() * Math.PI * 2, r = 165 + Math.random() * 60;
      m.position.set(Math.cos(a) * r, -5, Math.sin(a) * r);
      m.rotation.y = a + Math.PI / 2;
      m.visible = true;
      this.phase = 'surface'; this.timer = 9;
      gsap.to(m.position, { y: -0.6, duration: 2.5, ease: 'power2.out', onComplete: () => this.spout(false) });
    }
    if (this.phase === 'surface') {
      m.translateZ(dt * 2.5);
      this.tailMesh.rotation.x = Math.sin(this.t * 1.6) * 0.25;
      if (this.timer <= 0) {
        this.phase = 'dive'; this.timer = 4;
        gsap.to(m.rotation, { x: 0.5, duration: 1.5 });
        gsap.to(m.position, { y: -9, duration: 3.5, ease: 'power2.in', onComplete: () => { m.visible = false; m.rotation.x = 0; this.phase = 'hidden'; this.timer = 25 + Math.random() * 30; } });
        gsap.to(this.tailMesh.rotation, { x: -1.1, duration: 1.2, yoyo: true, repeat: 1 });
      }
    }
  }
}

// ---------------------------------------------------------------- fish
class Fish {
  constructor(scene) {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.4, 10, 8), PAL.tangerine, M(0, 0, 0, 0, 0, 0, 0.6, 0.8, 1.3), 0.04);
    b.add(P('cone', 0.35, 0.5, 4), PAL.sun, M(0, 0, -0.65, -Math.PI / 2), 0.03);
    b.add(P('sphere', 0.07, 6, 4), INK, M(0.18, 0.1, 0.32), 0);
    b.add(P('sphere', 0.07, 6, 4), INK, M(-0.18, 0.1, 0.32), 0);
    this.geo = b.build();
    this.pool = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(this.geo, toonMat());
      m.visible = false;
      scene.add(m);
      this.pool.push({ m, t: -1 });
    }
    this.timer = 3;
  }

  jump() {
    const f = this.pool.find((x) => x.t < 0);
    if (!f) return;
    const a = Math.random() * Math.PI * 2;
    const r = coastR(a) + 6 + Math.random() * 18;
    f.from = new THREE.Vector3(Math.cos(a) * r, -0.6, Math.sin(a) * r);
    const b = a + (Math.random() - 0.5) * 0.06;
    f.to = new THREE.Vector3(Math.cos(b) * (r + 3), -0.6, Math.sin(b) * (r + 3));
    f.t = 0; f.m.visible = true;
    bus.emit('fx:burst', { pos: f.from.clone(), kind: 'splash', n: 10 });
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 2 + Math.random() * 5; this.jump(); }
    for (const f of this.pool) {
      if (f.t < 0) continue;
      f.t += dt / 1.1;
      const t = Math.min(1, f.t);
      f.m.position.lerpVectors(f.from, f.to, t);
      f.m.position.y = -0.6 + Math.sin(t * Math.PI) * 2.6;
      const dx = f.to.x - f.from.x, dz = f.to.z - f.from.z;
      f.m.rotation.set(0, Math.atan2(dx, dz), 0);
      f.m.rotateX(-Math.cos(t * Math.PI) * 1.1);
      if (t >= 1) { f.t = -1; f.m.visible = false; bus.emit('fx:burst', { pos: f.to.clone(), kind: 'splash', n: 10 }); }
    }
  }
}


// ---------------------------------------------------------------- bees
class Bees {
  constructor(scene) {
    const b = new GeoBuilder();
    b.add(P('sphere', 0.16, 10, 8), PAL.sun, M(0, 0, 0, 0, 0, 0, 1, 0.9, 1.3), 0.025);
    b.add(P('box', 0.33, 0.3, 0.06), INK, M(0, 0, 0.02), 0);
    b.add(P('box', 0.33, 0.3, 0.06), INK, M(0, 0, -0.1), 0);
    b.add(P('sphere', 0.1, 8, 6), 0xffffff, M(0.12, 0.14, 0, 0, 0, -0.5, 1, 0.4, 0.7), 0.015);
    b.add(P('sphere', 0.1, 8, 6), 0xffffff, M(-0.12, 0.14, 0, 0, 0, 0.5, 1, 0.4, 0.7), 0.015);
    const N = 12;
    this.inst = new THREE.InstancedMesh(b.build(), toonMat(), N);
    this.inst.frustumCulled = false;
    scene.add(this.inst);
    const homes = [[-44, 0, 30], [44, 0, -20], [-20, 0, -45], [30, 0, 45], [SITES.village.x, 0, SITES.village.z], [SITES.village.x - 8, 0, SITES.village.z + 6]];
    this.list = [];
    for (let i = 0; i < N; i++) {
      const h = homes[i % homes.length];
      const bee = { home: new THREE.Vector3(h[0] + (Math.random() - 0.5) * 4, 0, h[2] + (Math.random() - 0.5) * 4), pos: new THREE.Vector3(), ph: Math.random() * 30, sp: 0.8 + Math.random(), zoom: 0 };
      this.list.push(bee);
      addInteractive({ center: () => bee.pos, radius: 0.8, name: 'Busy bee', hint: 'Bzz. Very important pollen business.', enabled: () => this.visible, onClick: () => { bee.zoom = 1.5; audio.play('buzz'); bus.emit('fx:burst', { pos: bee.pos.clone(), kind: 'spores', n: 8 }); } });
    }
    this.t = 0; this.visible = true;
  }

  update(dt, night) {
    this.t += dt;
    this.visible = night < 0.5;
    this.list.forEach((b, i) => {
      b.zoom = Math.max(0, b.zoom - dt);
      const k = this.t * b.sp * (1 + b.zoom * 3) + b.ph;
      const r = 1.6 + Math.sin(k * 0.7) * 0.8 + b.zoom * 4;
      b.pos.set(b.home.x + Math.cos(k * 1.3) * r + Math.sin(k * 5.1) * 0.2, heightAt(b.home.x, b.home.z) + 1.2 + Math.sin(k * 2.2) * 0.5 + b.zoom * 2, b.home.z + Math.sin(k * 1.1) * r);
      const yaw = Math.atan2(-Math.sin(k * 1.3), Math.cos(k * 1.1)) ;
      _m.compose(b.pos, _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), _s.setScalar(this.visible ? 1 : 0.0001));
      this.inst.setMatrixAt(i, _m);
    });
    this.inst.instanceMatrix.needsUpdate = true;
    if (this.visible && Math.random() < dt * 0.15) audio.play('buzz');
  }
}

// ---------------------------------------------------------------- kite
class Kite {
  constructor(scene) {
    this.anchor = new THREE.Vector3(-14, 0, 54);
    const peg = new GeoBuilder();
    peg.add(P('cyl', 0.08, 0.1, 1.1, 6), PAL.wood, M(0, 0.55, 0), 0.03);
    peg.add(P('torus', 0.14, 0.05, 6, 10), PAL.cherry, M(0, 1.0, 0, Math.PI / 2), 0);
    const pm = new THREE.Mesh(peg.build(), toonMat());
    pm.position.copy(this.anchor).setY(heightAt(this.anchor.x, this.anchor.z));
    scene.add(pm);
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.4); shape.lineTo(1, 0); shape.lineTo(0, -2); shape.lineTo(-1, 0); shape.closePath();
    const kg = new THREE.ShapeGeometry(shape); kg.deleteAttribute('uv');
    const kb = new GeoBuilder();
    kb.add(kg, PAL.coral, M(), 0);
    const kg2 = kg.clone(); const idx = kg2.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    kb.add(kg2, PAL.sun, M(0, 0, -0.01), 0);
    kb.add(P('box', 0.08, 3.4, 0.05), INK, M(0, -0.3, 0.02), 0);
    kb.add(P('box', 2.0, 0.08, 0.05), INK, M(0, 0, 0.02), 0);
    for (let i = 0; i < 4; i++) kb.add(P('box', 0.4, 0.22, 0.04), [PAL.mint, PAL.sky, PAL.pink, PAL.lilac][i], M(Math.sin(i) * 0.3, -2.4 - i * 0.7, 0, 0, 0, 0.6), 0.02);
    const kite = new THREE.Mesh(kb.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    scene.add(kite);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.6 }));
    line.frustumCulled = false;
    scene.add(line);
    Object.assign(this, { kite, line, lg });
    this.t = 0; this.loop = 0;
    addInteractive({ obj: kite, radius: 2.4, name: 'Runaway kite', hint: 'Someone tied it to a peg and went for ice cream.', onClick: () => { this.loop = 1; audio.play('whoosh', { dur: 0.8 }); } });
  }

  update(dt, wind) {
    this.t += dt;
    const a = this.anchor;
    const gy = heightAt(a.x, a.z);
    this.loop = Math.max(0, this.loop - dt / 1.6);
    const sway = Math.sin(this.t * 0.6) * 4 * wind;
    const p = new THREE.Vector3(a.x + 10 + sway, gy + 16 + Math.sin(this.t * 0.9) * 1.5 * wind, a.z + 6 + Math.cos(this.t * 0.4) * 3);
    this.kite.position.copy(p);
    this.kite.lookAt(a.x, gy, a.z);
    this.kite.rotateZ(Math.sin(this.t * 1.7) * 0.3 + (1 - this.loop) * Math.PI * 2 * (this.loop > 0 ? 1 : 0));
    const pos = this.lg.attributes.position;
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const sag = Math.sin(t * Math.PI) * 1.6;
      pos.setXYZ(i, a.x + (p.x - a.x) * t, gy + 1 + (p.y - gy - 1) * t - sag, a.z + (p.z - a.z) * t);
    }
    pos.needsUpdate = true;
  }
}

export class SkyLife {
  constructor(scene) {
    this.birds = new Birds(scene);
    this.butterflies = new Butterflies(scene);
    this.plane = new Plane(scene);
    this.balloon = new Balloon(scene);
    this.boats = new Boats(scene);
    this.whale = new Whale(scene);
    this.fish = new Fish(scene);
    this.bees = new Bees(scene);
    this.kite = new Kite(scene);
  }

  update(dt, night, wind = 1) {
    this.birds.update(dt, night);
    this.bees.update(dt, night);
    this.kite.update(dt, wind);
    this.butterflies.update(dt, night);
    this.plane.update(dt);
    this.balloon.update(dt, night);
    this.boats.update(dt);
    this.whale.update(dt);
    this.fish.update(dt);
  }
}
