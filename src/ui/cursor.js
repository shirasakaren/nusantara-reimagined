// A soft cursor that grows over anything touchable, shows a verb, and plays a note on hover.
import gsap from 'gsap';
import { state } from '../core/state.js';
import { sound } from '../core/audio.js';

const INTERACTIVE = 'a, button, input, label, select, textarea, [data-cursor], [tabindex]:not([tabindex="-1"]), .ww, .stone, .person, .tcard';
const PAPER = '.myth, .legacy, .play, .ix, .pass-book, .modal-card';

export function initCursor() {
  const el = document.getElementById('cursor');
  if (state.touch) { el.remove(); return { setProgress() {}, set() {} }; }
  document.body.classList.add('has-cursor');
  const dot = el.querySelector('.cur-dot'), ring = el.querySelector('.cur-ring'), label = el.querySelector('.cur-label'), prog = el.querySelector('.cur-prog');
  const xd = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' }), yd = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const xr = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), yr = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  const xl = gsap.quickTo(label, 'x', { duration: 0.45, ease: 'power3' }), yl = gsap.quickTo(label, 'y', { duration: 0.45, ease: 'power3' });
  let current = null; let idleTimer = 0;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY); xl(e.clientX); yl(e.clientY);
    el.classList.remove('is-idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => el.classList.add('is-idle'), 6000);
  }, { passive: true });
  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => { el.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { el.style.opacity = ''; });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.(INTERACTIVE);
    el.classList.toggle('is-paper', !!e.target.closest?.(PAPER));
    if (t === current) return;
    current = t;
    if (t && !t.disabled) {
      const verb = t.dataset.cursor || (t.matches('input[type=text], textarea') ? '' : t.matches('a') ? 'Go' : 'Open');
      label.textContent = verb;
      el.classList.toggle('is-hover', !!verb);
      sound.hover();
    } else { el.classList.remove('is-hover'); }
  });
  // magnetic pull for round controls
  document.querySelectorAll('.btn-hold, .hud-btn, .menu-close').forEach((b) => {
    const qx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' }), qy = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.25); qy((e.clientY - r.top - r.height / 2) * 0.25); });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
  return {
    setProgress(p) { prog.style.strokeDashoffset = String(170 * (1 - p)); },
    set(text) { label.textContent = text; },
  };
}
