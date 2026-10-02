// Wawa, the station keeper. A round little bean in a yellow hard hat who found the old
// station and has been waiting for a builder ever since.
import * as THREE from 'three';
import gsap from 'gsap';
import { GeoBuilder, P, M, toonMat } from '../core/toon.js';
import { PAL, INK } from '../core/palette.js';
import { addInteractive } from './interact.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';

const CREAM = 0xfff0d6;

export const WAWA_LINES = {
  click: [
    'Hi! I am Wawa. I keep the station tidy.',
    'Every great ride starts with one straight piece.',
    'Psst. Loops make the riders scream the loudest.',
    'I polished the bell this morning. Twice.',
    'Try the photo spot piece. Riders love a souvenir.',
    'Hold the right mouse button to slide the view around.',
    'If you get stuck, the magic wand can finish the loop.',
    'Night rides glow. Try clicking the sun.',
    'Tickle a cloud. I dare you.',
  ],
  station: ['Welcome to WAAWer Station!', 'All aboard! Well, almost.', 'Ding ding! That is the bell.'],
  sleepy: ['Zzz...', 'Five more minutes...', 'Mmm. Coaster dreams.'],
};

export class Mascot {
  constructor(scene, pos) {
    this.scene = scene;
    const root = new THREE.Group();
    root.position.copy(pos);
    this.root = root;
    this.home = pos.clone();
    this.time = 0;
    this.blinkT = 2;
    this.state = 'idle';
    this.look = 0;
    this.cheer = 0;

    const body = new GeoBuilder();
    body.add(P('sphere', 0.7, 20, 16), CREAM, M(0, 0.86, 0, 0, 0, 0, 1, 1.18, 0.95), 0.06);
    body.add(P('sphere', 0.5, 16, 12), 0xffffff, M(0, 0.7, 0.32, 0, 0, 0, 1, 1.05, 0.6), 0);
    for (const x of [-0.3, 0.3]) {
      body.add(P('sphere', 0.22, 12, 8), PAL.tangerine, M(x, 0.1, 0.12, 0, 0, 0, 1, 0.5, 1.4), 0.04);
      body.add(P('sphere', 0.11, 10, 8), PAL.pink, M(x * 1.5, 1.0, 0.56, 0, 0, 0, 1, 0.7, 0.4), 0);
      body.add(P('cone', 0.16, 0.3, 10), CREAM, M(x * 1.25, 1.75, -0.05, 0, 0, x > 0 ? -0.5 : 0.5), 0.04);
    }
    body.add(P('torus', 0.09, 0.025, 6, 12, Math.PI), INK, M(0, 0.95, 0.66, 0.2, 0, Math.PI), 0);
    body.add(P('sphere', 0.14, 10, 8), CREAM, M(0, 0.5, -0.66), 0.04);
    // tool belt
    body.add(P('torus', 0.66, 0.06, 6, 24), PAL.woodDark, M(0, 0.45, 0, Math.PI / 2, 0, 0, 1, 1, 0.85), 0.03);
    body.add(P('box', 0.22, 0.18, 0.1), PAL.sun, M(0, 0.45, 0.6), 0.03);
    const bodyMesh = new THREE.Mesh(body.build(), toonMat());
    bodyMesh.castShadow = true;

    const eyes = new GeoBuilder();
    for (const x of [-0.2, 0.2]) {
      eyes.add(P('sphere', 0.14, 14, 10), 0xffffff, M(x, 0, 0, 0, 0, 0, 0.9, 1.2, 0.5), 0.025);
      eyes.add(P('sphere', 0.085, 12, 8), INK, M(x * 0.95, -0.01, 0.05, 0, 0, 0, 0.9, 1.15, 0.5), 0);
      eyes.add(P('sphere', 0.03, 6, 4), 0xffffff, M(x * 0.95 + 0.03, 0.04, 0.1), 0);
    }
    const eyeMesh = new THREE.Mesh(eyes.build(), toonMat());
    eyeMesh.position.set(0, 1.18, 0.6);

    const hat = new GeoBuilder();
    hat.add(P('sphere', 0.5, 18, 10), PAL.sun, M(0, 0, 0, 0, 0, 0, 1, 0.75, 1), 0.05);
    hat.add(P('cyl', 0.62, 0.64, 0.08, 20), PAL.sun, M(0, -0.03, 0.08), 0.04);
    hat.add(P('box', 0.1, 0.4, 0.95), 0xffe08a, M(0, 0.18, 0), 0);
    hat.add(P('cyl', 0.1, 0.12, 0.12, 10), 0xffffff, M(0, 0.12, 0.47, Math.PI / 2), 0.03);
    const hatMesh = new THREE.Mesh(hat.build(), toonMat());
    hatMesh.position.set(0, 1.72, 0);
    hatMesh.castShadow = true;

    const arm = () => {
      const g = new GeoBuilder();
      g.add(P('capsule', 0.11, 0.3, 4, 8), CREAM, M(0, -0.22, 0), 0.04);
      return new THREE.Mesh(g.build(), toonMat());
    };
    const armL = arm(), armR = arm();
    armL.position.set(-0.68, 0.98, 0.05); armR.position.set(0.68, 0.98, 0.05);
    armL.rotation.z = -0.35; armR.rotation.z = 0.35;
    // wrench in the right hand
    const wr = new GeoBuilder();
    wr.add(P('box', 0.07, 0.42, 0.05), 0xb8b2c4, M(0, -0.5, 0.08), 0.02);
    wr.add(P('torus', 0.08, 0.035, 6, 10), 0xb8b2c4, M(0, -0.74, 0.08), 0.02);
    const wrench = new THREE.Mesh(wr.build(), toonMat());
    armR.add(wrench);

    const inner = new THREE.Group();
    inner.add(bodyMesh, eyeMesh, hatMesh, armL, armR);
    root.add(inner);
    scene.add(root);
    Object.assign(this, { inner, bodyMesh, eyeMesh, hatMesh, armL, armR });

    addInteractive({
      obj: root, radius: 1.4, offset: new THREE.Vector3(0, 1, 0), name: 'Wawa', hint: 'Station keeper. Says hi a lot.',
      onClick: () => this.poke(),
    });
    bus.on('ride:dispatch', () => this.wave());
    bus.on('mascot:celebrate', () => this.celebrate());
  }

  say(text, ms = 3200) {
    bus.emit('fx:say', { pos: this.root.position.clone().add(new THREE.Vector3(0, 2.8, 0)), text, ms, who: 'wawa' });
    audio.play('chirp', { n: 2 });
  }

  poke() {
    audio.play('boing');
    const r = Math.random();
    if (r < 0.35) this.jump(); else if (r < 0.7) this.wave(); else this.spin();
    const lines = WAWA_LINES.click;
    this.lineIdx = ((this.lineIdx ?? -1) + 1) % lines.length;
    this.say(lines[this.lineIdx]);
    bus.emit('stat:wawa');
  }

  jump() {
    const tl = gsap.timeline();
    tl.to(this.inner.scale, { y: 0.75, x: 1.15, z: 1.15, duration: 0.12 })
      .to(this.inner.position, { y: 1.3, duration: 0.3, ease: 'power2.out' }, '>')
      .to(this.inner.scale, { y: 1.1, x: 0.92, z: 0.92, duration: 0.2 }, '<')
      .to(this.inner.position, { y: 0, duration: 0.3, ease: 'power2.in' })
      .to(this.inner.scale, { y: 0.8, x: 1.15, z: 1.15, duration: 0.08 })
      .to(this.inner.scale, { y: 1, x: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
    gsap.timeline().to(this.hatMesh.position, { y: 2.3, duration: 0.35, delay: 0.25, ease: 'power2.out' }).to(this.hatMesh.position, { y: 1.72, duration: 0.4, ease: 'bounce.out' });
  }

  wave() {
    gsap.timeline()
      .to(this.armR.rotation, { z: 2.6, duration: 0.25, ease: 'back.out' })
      .to(this.armR.rotation, { x: 0.4, duration: 0.15, yoyo: true, repeat: 5 })
      .to(this.armR.rotation, { z: 0.35, x: 0, duration: 0.4, ease: 'power2.inOut' });
  }

  spin() {
    gsap.to(this.inner.rotation, { y: this.inner.rotation.y + Math.PI * 2, duration: 0.8, ease: 'back.inOut(1.6)' });
    this.jump();
  }

  celebrate() {
    this.spin();
    gsap.timeline()
      .to([this.armL.rotation, this.armR.rotation], { z: (i) => (i ? 2.7 : -2.7), duration: 0.3, ease: 'back.out' })
      .to([this.armL.rotation, this.armR.rotation], { x: 0.5, duration: 0.12, yoyo: true, repeat: 7 })
      .to(this.armL.rotation, { z: -0.35, x: 0, duration: 0.4 }, '>')
      .to(this.armR.rotation, { z: 0.35, x: 0, duration: 0.4 }, '<');
    bus.emit('fx:burst', { pos: this.root.position.clone().add(new THREE.Vector3(0, 2.4, 0)), kind: 'confetti', n: 50 });
  }

  update(dt, camera, night, trainPos) {
    this.time += dt;
    const t = this.time;
    // breathing
    const br = 1 + Math.sin(t * 2.2) * 0.025;
    this.bodyMesh.scale.set(1 / Math.sqrt(br), br, 1 / Math.sqrt(br));
    this.hatMesh.rotation.z = Math.sin(t * 1.3) * 0.05;
    // blink, sleepy at night
    this.blinkT -= dt;
    let eyeY = night > 0.6 ? 0.45 + Math.sin(t * 0.7) * 0.2 : 1;
    if (this.blinkT < 0) { eyeY = 0.1; if (this.blinkT < -0.12) this.blinkT = 1.8 + Math.random() * 3.5; }
    this.eyeMesh.scale.y += (eyeY - this.eyeMesh.scale.y) * Math.min(1, dt * 30);
    // look at the train when it is near, else at the camera
    const target = trainPos && trainPos.distanceTo(this.root.position) < 25 ? trainPos : camera.position;
    const dx = target.x - this.root.position.x, dz = target.z - this.root.position.z;
    const want = Math.atan2(dx, dz);
    let d = want - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, dt * 3);
    // idle arm sway
    if (!gsap.isTweening(this.armL.rotation)) this.armL.rotation.z = -0.35 - Math.sin(t * 2.2) * 0.05;
    // little sleepy z's at night
    if (night > 0.7) {
      this._z = (this._z ?? 0) - dt;
      if (this._z < 0) { this._z = 4 + Math.random() * 4; bus.emit('fx:say', { pos: this.root.position.clone().add(new THREE.Vector3(0.3, 2.5, 0)), text: 'Zzz', ms: 1800, small: true }); }
    }
  }
}
