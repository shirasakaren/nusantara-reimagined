// Little rewards: toasts, wax stamps, confetti of jasmine petals, a batik cloud wipe and the modal.
import gsap from 'gsap';
import { animate, stagger } from 'animejs';
import { state, emit, on, visitorName } from '../core/state.js';
import { sound } from '../core/audio.js';
import { megaMendungSVG } from '../core/patterns.js';

export const STAMPS = [
  { id: 'spice', label: 'Before the Ships', icon: 'M50 30c-10 0-17 9-17 20s7 20 17 20 17-9 17-20-7-20-17-20zm0 6c3 6 3 22 0 28M38 44c8 3 16 3 24 0' },
  { id: 'clove', label: 'The Cross and the Clove', icon: 'M50 28v44M36 50h28M42 34l16 32M58 34L42 66' },
  { id: 'voc', label: 'The Company', icon: 'M34 32l16 40 16-40M30 44a8 8 0 1016 0 8 8 0 10-16 0M58 40a6 6 0 108 8' },
  { id: 'batavia', label: 'Batavia Reimagined', icon: 'M30 70V46l10-10 10 10 10-10 10 10v24zM46 70V56h8v14' },
  { id: 'people', label: 'People of the Old City', icon: 'M50 30a6 6 0 110 12 6 6 0 010-12zM40 72l4-24h12l4 24M36 52l8-4M64 52l-8-4' },
  { id: 'road', label: 'Iron Road', icon: 'M28 66c10-4 12-24 22-24s14 18 22 14M30 60l4 4M44 46l3 5M58 52l2 5' },
  { id: 'coffee', label: 'The Sweet and the Bitter', icon: 'M50 30c-9 6-9 34 0 40 9-6 9-34 0-40zM50 32c-4 12-4 24 0 36' },
  { id: 'keris', label: 'The Last Conquests', icon: 'M50 26c4 6-4 10 0 16s-4 10 0 16-3 8 0 10M42 66h16M48 66l-2 8' },
  { id: 'pledge', label: 'Awakening', icon: 'M36 40h28M36 50h28M36 60h20M64 64l4 6' },
  { id: 'rain', label: 'The Rising Sun', icon: 'M36 30l-4 10M50 28l-4 12M64 30l-4 10M40 52l-4 10M56 50l-4 12' },
  { id: 'merdeka', label: 'Merdeka', icon: 'M40 26v48M40 30h26v10H40M40 40h26v10H40' },
  { id: 'yamato', label: 'Four More Years', icon: 'M36 30h30v8H36zM36 38h30v8H36zM34 54l8 4 10-6 10 6' },
  { id: 'myth', label: 'Not 350 Years', icon: 'M30 66h40M34 60V44M46 60V36M58 60V50M70 60V30' },
  { id: 'legacy', label: 'What Stayed', icon: 'M34 66l6-30h20l6 30M40 52h20' },
  { id: 'play', label: 'The Playground', icon: 'M30 50a20 10 0 1040 0 20 10 0 10-40 0M38 50h0M46 50h0M54 50h0M62 50h0' },
  { id: 'today', label: 'The Quiet Colonization', icon: 'M30 50h40M50 30v40M36 36l28 28M64 36L36 64' },
  { id: 'lantern', label: 'Remember Forward', icon: 'M42 34h16l4 30H38zM46 64v6h8v-6M50 26v8' },
  { id: 'congklak', label: 'Beat Nenek at congklak', icon: 'M28 50a22 10 0 1044 0 22 10 0 10-44 0M40 50a3 3 0 106 0 3 3 0 10-6 0M54 50a3 3 0 106 0 3 3 0 10-6 0' },
  { id: 'gasing', label: 'Spin a top for 10 seconds', icon: 'M50 30l14 18-14 22-14-22zM50 26v6' },
  { id: 'kata', label: 'Match every inherited word', icon: 'M34 34h14v20H34zM52 46h14v20H52z' },
  { id: 'batik', label: 'Dye your own batik', icon: 'M36 36h28v28H36zM42 42l16 16M58 42L42 58' },
];

const COLORS = ['#ff5b4d', '#8f7cff', '#3cc8b4', '#5ab4ff', '#ffc93c', '#ff8fb1'];

export function stampSVG(s, i = 0, size = 100) {
  const c = COLORS[i % COLORS.length];
  const text = s.label.toUpperCase();
  const r = 37.5; const circ = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><path id="sp${i}" d="M50 50 m-${r} 0 a${r} ${r} 0 1 1 ${r * 2} 0 a${r} ${r} 0 1 1 -${r * 2} 0"/></defs>
    <circle cx="52.5" cy="52.5" r="46" fill="#241b3a"/>
    <circle cx="50" cy="50" r="46" fill="${c}" stroke="#241b3a" stroke-width="3.5"/>
    <circle cx="50" cy="50" r="29" fill="#ffffff" stroke="#241b3a" stroke-width="3"/>
    <text font-size="7.4" font-family="Fredoka Variable, sans-serif" letter-spacing="1.2" fill="#241b3a" font-weight="700"><textPath href="#sp${i}" textLength="${(circ * 0.92).toFixed(1)}">${text} • </textPath></text>
    <path d="${s.icon}" fill="none" stroke="#241b3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(50 50) scale(.55) translate(-50 -50)"/>
  </svg>`;
}

// ---------- toasts ----------
const toastsEl = () => document.getElementById('toasts');
export function toast(text, kind = '') {
  const t = document.createElement('div'); t.className = `toast ${kind}`; t.innerHTML = `<i></i><span>${text}</span>`;
  toastsEl().appendChild(t);
  gsap.fromTo(t, { y: 20, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
  gsap.to(t, { y: -10, opacity: 0, duration: 0.5, delay: kind === 'whisper' ? 4.6 : 3.4, onComplete: () => t.remove() });
  while (toastsEl().children.length > 3) toastsEl().firstChild.remove();
}
on('toast', ({ text, kind }) => toast(text, kind));

// ---------- stamps ----------
export function award(id) {
  if (state.stamps.has(id)) return false;
  const idx = STAMPS.findIndex((s) => s.id === id); if (idx < 0) return false;
  state.stamps.add(id); state.save();
  const s = STAMPS[idx];
  const fx = document.getElementById('stamp-fx');
  fx.innerHTML = stampSVG(s, idx, 240);
  const svg = fx.firstElementChild;
  sound.stamp();
  if (!state.reduced) {
    gsap.timeline()
      .fromTo(svg, { scale: 2.6, rotate: -28, opacity: 0 }, { scale: 1, rotate: -8, opacity: 1, duration: 0.42, ease: 'power4.in' })
      .to(svg, { scale: 1.06, duration: 0.08, yoyo: true, repeat: 1 })
      .to(svg, { y: -40, opacity: 0, scale: 0.6, duration: 0.7, delay: 0.9, ease: 'power2.in' });
  }
  toast(`Stamp collected. <b>${s.label}</b>`);
  emit('stamp', id);
  return true;
}

// ---------- confetti: jasmine petals and red and white paper ----------
let cv, ctx, parts = [], raf = 0;
export function confetti({ x = window.innerWidth / 2, y = window.innerHeight / 2, n = 120, colors = ['#ff3b3b', '#ffffff', '#ffc93c', '#3cc8b4', '#8f7cff', '#5ab4ff'] } = {}) {
  if (state.reduced) return;
  cv = cv || document.getElementById('confetti'); ctx = ctx || cv.getContext('2d');
  cv.width = window.innerWidth * (window.devicePixelRatio || 1); cv.height = window.innerHeight * (window.devicePixelRatio || 1);
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length], petal: Math.random() < 0.4, life: 1 });
  }
  if (!raf) loop();
}
function loop() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin(p.rot) * 0.6; p.y += p.vy; p.rot += p.vr; p.life -= 0.006;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c;
    if (p.petal) { for (let k = 0; k < 5; k++) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.ellipse(0, p.r * 0.8, p.r * 0.45, p.r, 0, 0, 7); ctx.fill(); } }
    else { ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8); }
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
  if (!raf) ctx.clearRect(0, 0, cv.width, cv.height);
}

// ---------- mega mendung wipe ----------
export function wipe(onMid) {
  const el = document.getElementById('wipe');
  if (state.reduced) { onMid?.(); return; }
  const w = 1000, h = 1000;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h * 2.2}" preserveAspectRatio="none"><g class="wg" stroke="#241b3a" stroke-width="5">${megaMendungSVG(w, h * 0.7, { colors: ['#241b3a', '#8f7cff', '#5ab4ff', '#3cc8b4', '#ffc93c', '#fff6e6'], clouds: [
    { x: w * 0.2, y: h * 0.32, w: w * 0.9, h: h * 0.34, l: 5, s: 3 }, { x: w * 0.75, y: h * 0.36, w: w * 0.9, h: h * 0.3, l: 4, s: 9 }, { x: w * 0.5, y: h * 0.5, w: w * 1.3, h: h * 0.3, l: 6, s: 5 },
  ] })}<rect x="-50" y="${h * 0.48}" width="${w + 100}" height="${h * 1.8}" fill="#fff6e6" stroke="none"/></g></svg>`;
  const g = el.querySelector('.wg');
  sound.whoosh();
  gsap.timeline()
    .fromTo(g, { y: h * 2.2 }, { y: -h * 0.2, duration: 0.85, ease: 'power3.in', onComplete: () => onMid?.() })
    .to(g, { y: -h * 2.4, duration: 0.95, ease: 'power3.out', onComplete: () => { el.innerHTML = ''; } });
}

// ---------- modal ----------
const ART = {
  ship: '<path d="M20 120 h160 l-20 30 H40z M100 30 v90 M60 50 v70 M140 55 v65 M70 60 q30 -10 60 0 v30 q-30 -10 -60 0z M45 70 q15 -6 30 0 v25 q-15 -6 -30 0z M125 72 q14 -6 28 0 v24 q-14 -6 -28 0z"/>',
  castle: '<path d="M30 150 V80 h20 v-15 h20 v15 h60 v-15 h20 v15 h20 v70z M90 150 v-30 a10 10 0 0 1 20 0 v30 M100 80 v-40 h25 v12 h-25"/>',
  stall: '<path d="M30 150 V95 M170 150 V95 M20 95 l20 -30 h120 l20 30z M45 120 h110 v30 H45z M60 120 q10 -12 20 0 M100 120 q10 -12 20 0"/>',
  gables: '<path d="M20 150 V80 h10 v-10 h10 v-10 h10 v10 h10 v10 h10 v70z M80 150 V70 q20 -40 40 0 v80z M130 150 V75 l25 -25 25 25 v75z M35 100 h20 M35 120 h20 M90 95 h20 M90 120 h20 M145 95 h20 M145 120 h20"/>',
  house: '<path d="M25 150 V70 h150 v80z M20 70 l80 -40 80 40 M45 90 h20 v20 h-20z M90 90 h20 v20 h-20z M135 90 h20 v20 h-20z M90 125 h20 v25 h-20z"/>',
  wave: '<path d="M20 90 q20 -20 40 0 t40 0 t40 0 t40 0 M20 115 q20 -20 40 0 t40 0 t40 0 t40 0 M20 140 q20 -20 40 0 t40 0 t40 0 t40 0 M100 40 l-6 14 h12z"/>',
  bridge: '<path d="M10 140 h180 M40 140 V60 M160 140 V60 M30 60 h20 M150 60 h20 M40 70 L100 110 M160 70 L100 110 M60 120 h80"/>',
  hall: '<path d="M20 150 V85 h160 v65z M15 85 l20 -18 h130 l20 18 M85 67 V50 h30 v17 M90 50 q10 -25 20 0 M100 25 v-10 M35 100 h12 v18 h-12z M60 100 h12 v18 h-12z M128 100 h12 v18 h-12z M153 100 h12 v18 h-12z M90 120 h20 v30 h-20z"/>',
  fountain: '<path d="M40 150 h120 M50 150 v-25 h100 v25 M95 125 V70 h10 v55 M80 70 q20 -30 40 0z M100 40 v10 M85 55 q-10 10 -15 25 M115 55 q10 10 15 25"/>',
  bars: '<path d="M50 50 h100 v100 H50z M70 50 v100 M90 50 v100 M110 50 v100 M130 50 v100 M50 100 h100"/>',
  roof: '<path d="M30 150 V95 h140 v55z M10 95 q90 -10 180 0 q-20 -8 -40 -30 h-100 q-20 22 -40 30z M80 120 h40 v30 H80z M60 60 h80"/>',
  church: '<path d="M40 150 V80 h120 v70z M30 80 l70 -45 70 45 M60 100 v25 M85 100 v25 M115 100 v25 M140 100 v25 M90 150 v-20 q10 -12 20 0 v20"/>',
  cane: '<path d="M60 150 V40 M60 70 l-20 -20 M60 100 l22 -24 M100 150 V30 M100 60 l20 -22 M100 95 l-22 -20 M140 150 V45 M140 80 l20 -18 M140 110 l-18 -20 M50 60 h20 M90 50 h20 M130 65 h20"/>',
  bike: '<path d="M60 130 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0 M140 130 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0 M60 130 l30 -45 h35 l15 45 M90 85 l-8 -15 h-14 M125 85 v-15 h12"/>',
};
export function openModal({ kicker = '', title = '', html = '', art = 'house' }) {
  const m = document.getElementById('modal');
  m.querySelector('#modal-kicker').textContent = kicker;
  m.querySelector('#modal-title').textContent = title;
  m.querySelector('#modal-text').innerHTML = html;
  m.querySelector('.modal-art').innerHTML = `<svg viewBox="0 0 200 180" fill="none" stroke="#241b3a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${ART[art] || ART.house}</svg>`;
  delete m.dataset.closing; gsap.killTweensOf([m.querySelector('.modal-bg'), m.querySelector('.modal-card')]);
  m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false');
  gsap.to(m.querySelector('.modal-bg'), { opacity: 1, duration: 0.4 });
  gsap.fromTo(m.querySelector('.modal-card'), { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' });
  const paths = m.querySelectorAll('.modal-art path');
  paths.forEach((p) => { const L = p.getTotalLength?.() || 600; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  animate(paths, { strokeDashoffset: 0, duration: 1600, ease: 'inOutQuad', delay: stagger(80) });
  sound.click();
  m.querySelector('.menu-close').focus({ preventScroll: true });
  emit('modal', true);
}
export function closeModal() {
  const m = document.getElementById('modal'); if (!m.classList.contains('is-open') || m.dataset.closing) return;
  m.dataset.closing = '1';
  gsap.to(m.querySelector('.modal-bg'), { opacity: 0, duration: 0.3 });
  gsap.to(m.querySelector('.modal-card'), { opacity: 0, y: 20, duration: 0.35, onComplete: () => { if (!m.dataset.closing) return; delete m.dataset.closing; m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); } });
  emit('modal', false);
}
export function initModal() {
  const m = document.getElementById('modal');
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

export function greet(text) { return text.replace(/\{name\}/g, visitorName()); }
