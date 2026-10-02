// Camera rig. Orbit, pan, zoom with inertia. Desktop: left drag orbits, right drag or
// ctrl/shift + left drag pans, wheel zooms. Touch: one finger pans, two fingers rotate,
// tilt and pinch. Taps are separated from drags and published on the bus.
import * as THREE from 'three';
import gsap from 'gsap';
import { bus } from './bus.js';
import { state } from './state.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 4);
    this.goalTarget = this.target.clone();
    this.yaw = 0.7; this.goalYaw = 0.7;
    this.pitch = 0.62; this.goalPitch = 0.62;
    this.dist = 70; this.goalDist = 70;
    this.minDist = 9; this.maxDist = 170;
    this.minPitch = 0.12; this.maxPitch = 1.42;
    this.bounds = 95;
    this.enabled = true;
    this.inputEnabled = true;
    this.autoOrbit = 0;
    this.follow = null;          // Object3D or function returning Vector3
    this.followOffsetY = 0;
    this.custom = null;          // function(camera, dt) that takes over entirely
    this.vel = { yaw: 0, pitch: 0, px: 0, pz: 0 };
    this.pointers = new Map();
    this.drag = null;
    this.ndc = new THREE.Vector2(-9, -9);
    this.screen = { x: -1, y: -1 };
    this.hasPointer = false;
    this.shake = 0;
    this.keys = new Set();
    this.lookOffset = { yaw: 0, pitch: 0 };   // used by first person ride cam
    this._tween = null;
    this._bind();
  }

  _bind() {
    const d = this.dom;
    d.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e), { passive: true });
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', (e) => this._up(e, true));
    d.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    d.addEventListener('contextmenu', (e) => e.preventDefault());
    d.addEventListener('pointerleave', () => { this.hasPointer = false; this.ndc.set(-9, -9); });
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.code);
      if (!this.inputEnabled) return;
      if (e.code === 'KeyQ') this.snapRotate(-1);
      if (e.code === 'KeyE') this.snapRotate(1);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _setNdc(e) {
    const r = this.dom.getBoundingClientRect();
    this.screen.x = e.clientX; this.screen.y = e.clientY;
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.hasPointer = true;
  }

  _down(e) {
    if (e.target !== this.dom) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this._setNdc(e);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), type: e.pointerType });
    this._killTween();
    const n = this.pointers.size;
    if (n === 1) {
      const isTouch = e.pointerType === 'touch';
      let mode = 'rotate';
      if (isTouch) mode = 'pan';
      if (e.button === 2 || e.button === 1 || e.ctrlKey || e.shiftKey || e.metaKey) mode = 'pan';
      this.drag = { mode, moved: 0, button: e.button, id: e.pointerId, t: performance.now() };
    } else if (n === 2) {
      const [a, b] = [...this.pointers.values()];
      this.drag = { mode: 'multi', moved: 99, dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
    bus.emit('pointer:down', e);
  }

  _move(e) {
    this.overCanvas = e.target === this.dom;
    if (!this.overCanvas && !this.pointers.size) { this.hasPointer = false; return; }
    if (e.pointerType !== 'touch' || this.pointers.has(e.pointerId)) this._setNdc(e);
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!this.drag || !this.inputEnabled) return;
    const h = this.dom.clientHeight || window.innerHeight;
    if (this.drag.mode === 'multi') {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.drag.dist > 0) this.zoomBy(this.drag.dist / Math.max(dist, 1));
      let da = ang - this.drag.ang;
      if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
      this.goalYaw -= da;
      this.goalYaw -= ((mid.x - this.drag.mid.x) / h) * 2.2;
      this.goalPitch = clamp(this.goalPitch + ((mid.y - this.drag.mid.y) / h) * 1.6, this.minPitch, this.maxPitch);
      Object.assign(this.drag, { dist, ang, mid });
      return;
    }
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    if (this.drag.moved < 5) return;
    if (this.custom && this.custom.onDrag) { this.custom.onDrag(dx, dy); return; }
    if (this.drag.mode === 'rotate') {
      const ky = (dx / h) * 3.2, kp = (dy / h) * 2.4;
      this.goalYaw -= ky;
      this.goalPitch = clamp(this.goalPitch + kp, this.minPitch, this.maxPitch);
      this.vel.yaw = -ky * 0.6; this.vel.pitch = kp * 0.6;
    } else {
      this._panPixels(dx, dy, h);
    }
  }

  _panPixels(dx, dy, h) {
    const scale = (2 * this.dist * Math.tan((this.camera.fov * Math.PI) / 360)) / h;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // right vector on ground = (cos yaw, 0, -sin yaw); forward on ground = (-sin yaw, 0, -cos yaw)
    const k = scale * (1 + (1 - Math.sin(this.pitch)) * 0.8);
    const mx = -dx * scale * cy + -dy * k * sy;
    const mz = dx * scale * sy + -dy * k * cy;
    this.goalTarget.x += mx; this.goalTarget.z += mz;
    this.vel.px = mx * 0.5; this.vel.pz = mz * 0.5;
    this.follow = null;
    this._clampTarget();
  }

  _up(e, cancelled) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!p) return;
    const dt = performance.now() - p.t;
    const moved = Math.abs(e.clientX - p.sx) + Math.abs(e.clientY - p.sy);
    const wasMulti = this.drag?.mode === 'multi';
    if (!cancelled && !wasMulti && moved < 8 && dt < 600 && this.pointers.size === 0) {
      this._setNdc(e);
      bus.emit('tap', { x: e.clientX, y: e.clientY, ndc: this.ndc.clone(), button: e.button, pointerType: e.pointerType, long: dt > 420 });
    }
    if (this.pointers.size === 0) this.drag = null;
    else if (this.pointers.size === 1) {
      const [id, q] = [...this.pointers.entries()][0];
      this.drag = { mode: q.type === 'touch' ? 'pan' : 'rotate', moved: 99, id };
    }
    if (e.pointerType === 'touch') { this.hasPointer = false; this.ndc.set(-9, -9); }
  }

  _wheel(e) {
    e.preventDefault();
    if (!this.inputEnabled) return;
    this._killTween();
    if (this.custom && this.custom.onWheel) { this.custom.onWheel(e.deltaY); return; }
    const k = Math.exp(clamp(e.deltaY, -120, 120) * 0.0015 * (e.ctrlKey ? 3 : 1));
    this.zoomBy(k);
  }

  zoomBy(k) {
    this.goalDist = clamp(this.goalDist * k, this.minDist, this.maxDist);
  }

  snapRotate(dir) {
    const step = Math.PI / 4;
    const base = Math.round(this.goalYaw / step) * step;
    this.goalYaw = base + dir * step;
    bus.emit('camera:snap', dir);
  }

  _clampTarget() {
    const r = Math.hypot(this.goalTarget.x, this.goalTarget.z);
    if (r > this.bounds) { this.goalTarget.x *= this.bounds / r; this.goalTarget.z *= this.bounds / r; }
  }

  _killTween() { if (this._tween) { this._tween.kill(); this._tween = null; } }

  /** Smooth cinematic move. Any field may be omitted. */
  flyTo({ target, yaw, pitch, dist }, duration = 1.6, ease = 'power3.inOut') {
    this._killTween();
    const o = { t: 0 };
    const from = { tx: this.goalTarget.x, ty: this.goalTarget.y, tz: this.goalTarget.z, yaw: this.goalYaw, pitch: this.goalPitch, dist: this.goalDist };
    let toYaw = yaw ?? from.yaw;
    // shortest arc
    while (toYaw - from.yaw > Math.PI) toYaw -= TAU;
    while (toYaw - from.yaw < -Math.PI) toYaw += TAU;
    const to = { tx: target?.x ?? from.tx, ty: target?.y ?? from.ty, tz: target?.z ?? from.tz, yaw: toYaw, pitch: pitch ?? from.pitch, dist: dist ?? from.dist };
    this.follow = null;
    return new Promise((res) => {
      this._tween = gsap.to(o, {
        t: 1, duration, ease,
        onUpdate: () => {
          const t = o.t;
          this.goalTarget.set(from.tx + (to.tx - from.tx) * t, from.ty + (to.ty - from.ty) * t, from.tz + (to.tz - from.tz) * t);
          this.goalYaw = from.yaw + (to.yaw - from.yaw) * t;
          this.goalPitch = from.pitch + (to.pitch - from.pitch) * t;
          // a little hop in distance makes long moves feel like a swoop
          const hop = Math.sin(t * Math.PI) * Math.min(30, Math.hypot(to.tx - from.tx, to.tz - from.tz) * 0.25);
          this.goalDist = from.dist + (to.dist - from.dist) * t + hop;
        },
        onComplete: () => { this._tween = null; res(); },
      });
    });
  }

  setFollow(fn, offsetY = 0) { this.follow = fn; this.followOffsetY = offsetY; }

  addShake(a) { this.shake = Math.min(1.2, this.shake + a); }

  update(dt) {
    const cam = this.camera;
    if (this.custom) {
      this.custom.update(cam, dt);
      return;
    }
    // keyboard
    if (this.inputEnabled) {
      const h = window.innerHeight;
      const kp = 520 * dt;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this._panPixels(0, kp, h);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this._panPixels(0, -kp, h);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this._panPixels(kp, 0, h);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this._panPixels(-kp, 0, h);
      if (this.keys.has('Equal') || this.keys.has('NumpadAdd')) this.zoomBy(1 - dt * 1.4);
      if (this.keys.has('Minus') || this.keys.has('NumpadSubtract')) this.zoomBy(1 + dt * 1.4);
    }
    // inertia when released
    if (!this.drag) {
      const decay = Math.exp(-dt * 5);
      this.goalYaw += this.vel.yaw; this.goalPitch = clamp(this.goalPitch + this.vel.pitch, this.minPitch, this.maxPitch);
      this.goalTarget.x += this.vel.px; this.goalTarget.z += this.vel.pz;
      this.vel.yaw *= decay; this.vel.pitch *= decay; this.vel.px *= decay; this.vel.pz *= decay;
      this._clampTarget();
    } else if (this.drag.mode !== 'multi') {
      const decay = Math.exp(-dt * 18);
      this.vel.yaw *= decay; this.vel.pitch *= decay; this.vel.px *= decay; this.vel.pz *= decay;
    }
    if (this.autoOrbit) this.goalYaw += this.autoOrbit * dt;
    if (this.follow) {
      const p = typeof this.follow === 'function' ? this.follow() : this.follow.position;
      if (p) {
        const k = 1 - Math.exp(-dt * 3);
        this.goalTarget.x += (p.x - this.goalTarget.x) * k;
        this.goalTarget.y += (p.y + this.followOffsetY - this.goalTarget.y) * k;
        this.goalTarget.z += (p.z - this.goalTarget.z) * k;
      }
    }
    const k = 1 - Math.exp(-dt * 9);
    this.yaw += (this.goalYaw - this.yaw) * k;
    this.pitch += (this.goalPitch - this.pitch) * k;
    this.dist += (this.goalDist - this.dist) * k;
    this.target.lerp(this.goalTarget, k);

    const cp = Math.cos(this.pitch);
    cam.position.set(
      this.target.x + this.dist * cp * Math.sin(this.yaw),
      this.target.y + this.dist * Math.sin(this.pitch),
      this.target.z + this.dist * cp * Math.cos(this.yaw),
    );
    if (cam.position.y < 1.2) cam.position.y = 1.2;
    cam.lookAt(this.target);
    if (this.shake > 0.001 && !state.reducedMotion) {
      const s = this.shake * 0.12;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      this.shake *= Math.exp(-dt * 6);
    }
  }

  /** Normalized yaw for the compass (radians). */
  get heading() { return this.yaw; }
}
