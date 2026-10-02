// DOM effects: confetti canvas, camera flash, 3D anchored speech bubbles, toasts, tooltip
// and the custom cursor. Small, fast, and all running on one rAF each.
import gsap from 'gsap';
import * as THREE from 'three';
import { animate as mAnimate } from 'motion';
import { icon } from './icons.js';

const COLORS = ['#ff6b6b', '#ffc94a', '#5ed6b4', '#7cc6fe', '#b79cf2', '#ff9ec7', '#ff9f43'];

// ---------------------------------------------------------------- confetti
export class Confetti {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.p = [];
    this.running = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.cv.width = window.innerWidth * dpr; this.cv.height = window.innerHeight * dpr;
  }
  burst(x, y, n = 80, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4 * spread;
      const s = 6 + Math.random() * 10;
      this.p.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, c: COLORS[i % COLORS.length], life: 1, shape: Math.random() < 0.3 ? 1 : 0 });
    }
    this._go();
  }
  rain(n = 120) {
    for (let i = 0; i < n; i++) {
      this.p.push({ x: Math.random() * window.innerWidth, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 7 + Math.random() * 8, h: 4 + Math.random() * 6, c: COLORS[i % COLORS.length], life: 1, shape: Math.random() < 0.3 ? 1 : 0 });
    }
    this._go();
  }
  _go() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      const g = this.g, d = this.dpr;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const H = window.innerHeight;
      this.p = this.p.filter((q) => {
        q.vy += 0.32; q.vx *= 0.985; q.vy *= 0.985;
        q.x += q.vx + Math.sin(q.r * 2) * 0.6; q.y += q.vy; q.r += q.vr;
        if (q.y > H + 30) return false;
        g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.scale(1, Math.cos(q.r * 1.7));
        g.fillStyle = q.c; g.strokeStyle = '#2a1f3d'; g.lineWidth = 1.6;
        if (q.shape) { g.beginPath(); g.arc(0, 0, q.w * 0.45, 0, Math.PI * 2); g.fill(); g.stroke(); }
        else { g.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); g.strokeRect(-q.w / 2, -q.h / 2, q.w, q.h); }
        g.restore();
        return true;
      });
      if (this.p.length) requestAnimationFrame(tick); else { this.running = false; g.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    };
    requestAnimationFrame(tick);
  }
}

export function flash(el, strength = 0.9) {
  gsap.fromTo(el, { opacity: strength }, { opacity: 0, duration: 0.7, ease: 'power2.out' });
}

// ---------------------------------------------------------------- bubbles
export class Bubbles {
  constructor(root, camera) {
    this.root = root; this.camera = camera;
    this.list = [];
    this.v = new THREE.Vector3();
  }
  add({ pos, text, ms = 1600, cls = '', rise = 1.6 }) {
    if (this.list.length > 16) { const old = this.list.shift(); old.el.remove(); }
    const el = document.createElement('div');
    el.className = 'bubble ' + cls;
    el.textContent = text;
    if (text.length > 26) el.classList.add('wrap');
    this.root.appendChild(el);
    const b = { el, pos: pos.clone(), t: 0, ms: ms / 1000, rise, born: performance.now() };
    this.list.push(b);
    el.style.opacity = '0';
    mAnimate(el, { scale: [0.3, 1], opacity: [0, 1] }, { type: 'spring', stiffness: 500, damping: 18 });
    return b;
  }
  update(dt) {
    const cam = this.camera;
    const W = window.innerWidth, H = window.innerHeight;
    this.list = this.list.filter((b) => {
      b.t += dt;
      const k = b.t / b.ms;
      if (k >= 1) { b.el.remove(); return false; }
      this.v.copy(b.pos); this.v.y += b.rise * Math.min(1, k * 1.5);
      this.v.project(cam);
      if (this.v.z > 1) { b.el.style.display = 'none'; return true; }
      b.el.style.display = '';
      const x = (this.v.x * 0.5 + 0.5) * W, y = (-this.v.y * 0.5 + 0.5) * H;
      b.el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      if (k > 0.8) b.el.style.opacity = String(1 - (k - 0.8) / 0.2);
      return true;
    });
  }
}

// ---------------------------------------------------------------- toasts
export class Toasts {
  constructor(root) { this.root = root; this.last = new Map(); }
  show({ title, text = '', ic = 'star', kind = '', img = null, ms = 3200, action = null, key = null }) {
    if (key) {
      const t = this.last.get(key);
      if (t && performance.now() - t < 1400) return null;
      this.last.set(key, performance.now());
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `${img ? `<img src="${img}" alt="">` : `<span class="t-ic">${icon(ic)}</span>`}<div class="t-body"><b></b><span></span></div>`;
    el.querySelector('b').textContent = title;
    el.querySelector('.t-body span').textContent = text;
    if (action) {
      const b = document.createElement('button');
      b.className = 'btn small t-act';
      b.textContent = action.label;
      b.addEventListener('click', () => { action.fn(); close(); });
      el.appendChild(b);
    }
    this.root.appendChild(el);
    while (this.root.children.length > 3) this.root.firstChild.remove();
    gsap.fromTo(el, { x: 80, opacity: 0, scale: 0.9 }, { x: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.8)' });
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      gsap.to(el, { x: 60, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => el.remove() });
    };
    setTimeout(close, ms);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    return { el, close };
  }
}

// ---------------------------------------------------------------- tooltip + cursor
export class Pointer {
  constructor(cursorEl, tipEl) {
    this.c = cursorEl; this.tip = tipEl;
    this.label = cursorEl.querySelector('.c-label');
    this.x = innerWidth / 2; this.y = innerHeight / 2;
    this.qx = gsap.quickTo(cursorEl, 'x', { duration: 0.18, ease: 'power3' });
    this.qy = gsap.quickTo(cursorEl, 'y', { duration: 0.18, ease: 'power3' });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.x = e.clientX; this.y = e.clientY;
      cursorEl.classList.remove('hidden-c');
      this.qx(e.clientX); this.qy(e.clientY);
      const overUI = e.target.id !== 'scene';
      cursorEl.classList.toggle('ui', overUI);
      this._placeTip();
    }, { passive: true });
    window.addEventListener('pointerdown', () => cursorEl.classList.add('down'));
    window.addEventListener('pointerup', () => cursorEl.classList.remove('down'));
  }
  _placeTip() {
    const t = this.tip;
    if (!t.classList.contains('on')) return;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = this.x + 22, y = this.y + 22;
    if (x + w > innerWidth - 8) x = this.x - w - 16;
    if (y + h > innerHeight - 8) y = this.y - h - 16;
    t.style.transform = `translate(${x}px, ${y}px)`;
  }
  setHover(h, toolLabel) {
    const c = this.c;
    c.classList.toggle('hover', !!h);
    const lab = toolLabel || '';
    c.classList.toggle('labeled', !!lab);
    if (lab) this.label.textContent = lab;
  }
  showTip(name, hint) {
    if (!name) { this.tip.classList.remove('on'); return; }
    this.tip.querySelector('strong').textContent = name;
    this.tip.querySelector('span').textContent = hint || '';
    this.tip.classList.add('on');
    this._placeTip();
  }
  setTool(tool) {
    this.c.classList.remove('tool-erase', 'tool-paint', 'tool-decor');
    if (tool && tool !== 'build') this.c.classList.add('tool-' + tool);
  }
}
