// The stage owns the renderer and decides what gets drawn each frame.
import * as THREE from 'three';
import { state } from '../core/state.js';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const lite = state.lite || state.mobile;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = false;
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor(0x0d1426, 1);
    this.scenes = {};
    this.active = 'map';
    this.dim = 0;
    this.relics = null;
    this.paused = false;
    this.skip = false;
    this.fpsAvg = 60; this.frames = 0; this.adaptT = 0;
    this.setPixelRatio();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; });
  }

  setPixelRatio() {
    const lite = state.lite || state.mobile;
    this.dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75);
    this.renderer.setPixelRatio(this.dpr);
  }

  add(name, scene) { this.scenes[name] = scene; scene.resize?.(this.w, this.h); }

  resize() {
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h, false);
    this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    for (const s of Object.values(this.scenes)) s.resize?.(this.w, this.h);
  }

  show(name) { this.active = name; document.getElementById('labels')?.classList.toggle('is-hidden', name !== 'map'); }

  frame(dt) {
    if (this.paused) return;
    // adaptive quality: drop pixel ratio when frames are slow
    this.frames++; this.adaptT += dt;
    if (this.adaptT > 2) {
      const fps = this.frames / this.adaptT; this.fpsAvg = fps; this.frames = 0; this.adaptT = 0;
      if (fps < 38 && this.dpr > 0.9) { this.dpr = Math.max(0.85, this.dpr - 0.25); this.renderer.setPixelRatio(this.dpr); this.resize(); }
    }
    const r = this.renderer;
    const scene = this.scenes[this.active];
    r.setScissorTest(false);
    r.setViewport(0, 0, this.w, this.h);
    r.clear(true, true, true);
    if (scene && !this.skip) { scene.update(dt); scene.render(r); }
    document.getElementById('labels').style.visibility = this.skip || this.active !== 'map' ? 'hidden' : '';
    if (this.relics) this.relics.frame(dt, r, this.w, this.h);
  }
}
