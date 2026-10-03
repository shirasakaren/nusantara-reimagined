// Loader and the gate: the first two breaths of the experience.
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { animate, createDrawable, stagger } from 'animejs';
import { state, emit } from '../core/state.js';
import { sound } from '../core/audio.js';
import { toast } from './fx.js';

gsap.registerPlugin(SplitText);

export function initLoader() {
  const svg = document.querySelector('.loader-kawung');
  const petals = [[60, 60, 45], [140, 60, -45], [60, 140, -45], [140, 140, 45]];
  svg.innerHTML = petals.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="52" ry="23" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="24" ry="6" transform="rotate(${r} ${x} ${y})"/>`).join('') + '<circle cx="100" cy="100" r="7"/><circle cx="100" cy="100" r="96"/>';
  const shapes = svg.querySelectorAll('ellipse, circle');
  shapes.forEach((s) => s.setAttribute('pathLength', '1'));
  let drawables = [];
  try { drawables = createDrawable(shapes); } catch { /* older browsers */ }
  if (drawables.length) animate(drawables, { draw: ['0 0', '0 1'], duration: 2400, delay: stagger(120), ease: 'inOutQuad', loop: true, alternate: true });
  const yearEl = document.getElementById('loader-year'); const bar = document.querySelector('.loader-bar span');
  const st = { p: 0 };
  return {
    set(p) {
      gsap.to(st, { p, duration: 0.6, ease: 'power2.out', onUpdate: () => { yearEl.textContent = Math.round(1511 + (1949 - 1511) * st.p); bar.style.transform = `scaleX(${st.p})`; } });
    },
    done() {
      return new Promise((res) => {
        gsap.to(st, { p: 1, duration: 0.5, onUpdate: () => { yearEl.textContent = Math.round(1511 + 438 * st.p); bar.style.transform = `scaleX(${st.p})`; } });
        gsap.to('#loader', { opacity: 0, duration: 1, delay: 0.7, ease: 'power2.inOut', onComplete: () => { document.getElementById('loader').remove(); res(); } });
      });
    },
  };
}

export function initGate({ onEnter }) {
  const gate = document.getElementById('gate');
  gate.classList.add('is-open'); document.body.classList.remove('is-loading'); document.body.classList.add('is-gated');
  const input = document.getElementById('visitor-name'); input.value = state.name || '';
  const comp = gate.querySelector('.gate-compass');
  const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const r = i % 4 === 0 ? 40 : i % 2 ? 16 : 26; return [43 + Math.sin(a) * r, 43 - Math.cos(a) * r, a]; });
  comp.innerHTML = `<svg viewBox="0 0 86 86" fill="none" stroke="#241b3a" stroke-width="2"><circle cx="43" cy="43" r="40" fill="#ffffff"/><circle cx="43" cy="43" r="34" stroke-dasharray="1 3"/><g class="needle">${pts.map(([x, y, a]) => { const l = [43 + Math.sin(a + 0.2) * 6, 43 - Math.cos(a + 0.2) * 6]; const r = [43 + Math.sin(a - 0.2) * 6, 43 - Math.cos(a - 0.2) * 6]; return `<path d="M${l[0].toFixed(1)} ${l[1].toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${r[0].toFixed(1)} ${r[1].toFixed(1)}"/>`; }).join('')}<path d="M43 3 L47 43 L43 83 L39 43 Z" fill="#ff5b4d" stroke="#241b3a" stroke-width="1.6" stroke-linejoin="round"/></g><text x="43" y="11" text-anchor="middle" font-size="8" font-weight="700" fill="#241b3a" stroke="none" font-family="Fredoka Variable, sans-serif">U</text></svg>`;
  const needle = comp.querySelector('.needle');
  const rotTo = gsap.quickTo(needle, 'rotation', { duration: 1.2, ease: 'elastic.out(1, 0.4)' });
  gsap.set(needle, { transformOrigin: '43px 43px', svgOrigin: '43 43' });
  window.addEventListener('pointermove', (e) => { if (!document.body.contains(comp)) return; const r = comp.getBoundingClientRect(); rotTo((Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI); });
  const lines = gate.querySelectorAll('.gt-line');
  const split = new SplitText(lines, { type: 'chars', charsClass: 'char' });
  const tl = gsap.timeline({ delay: 0.2 });
  tl.from('.gate-eyebrow', { opacity: 0, y: 12, duration: 1, ease: 'expo.out' })
    .from(split.chars, { yPercent: 110, rotate: 8, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.035 }, '-=0.6')
    .from('.gate-lead', { opacity: 0, y: 16, duration: 1.2, ease: 'expo.out' }, '-=0.9')
    .from(['.gate-name', '.gate-actions', '.gate-note'], { opacity: 0, y: 16, duration: 1, ease: 'expo.out', stagger: 0.12 }, '-=0.8')
    .from('.gate-frame .corner', { opacity: 0, scale: 0.5, duration: 1, stagger: 0.08, ease: 'expo.out' }, '-=1.4');
  // letters lean away from the pointer
  const chars = split.chars;
  gate.addEventListener('pointermove', (e) => {
    if (state.touch) return;
    for (const c of chars) {
      const r = c.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy); const f = Math.max(0, 1 - d / 260);
      gsap.to(c, { y: -f * 18, rotate: (dx / 260) * f * -8, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    }
  });
  const hold = document.getElementById('enter-sound'); const prog = hold.querySelector('.hold-prog');
  const st = { p: 0 }; let tw = null; let done = false;
  const draw = () => { prog.style.strokeDashoffset = String(352 * (1 - st.p)); };
  const start = (e) => {
    if (done) return; e.preventDefault(); hold.classList.add('is-holding');
    sound.init(); sound.setEnabled(true);
    tw?.kill(); tw = gsap.to(st, { p: 1, duration: 1.3 * (1 - st.p), ease: 'none', onUpdate: () => { draw(); if (Math.random() < 0.12) sound.note(Math.floor(st.p * 7), 0.08); }, onComplete: finish });
  };
  const stop = () => { if (done) return; hold.classList.remove('is-holding'); tw?.kill(); tw = gsap.to(st, { p: 0, duration: 0.5, ease: 'power2.out', onUpdate: draw }); if (st.p < 0.98 && st.p > 0.02) toast('Keep holding. Good things take a moment.', 'whisper'); };
  const finish = () => { done = true; enter(true); };
  hold.addEventListener('pointerdown', start); hold.addEventListener('pointerup', stop); hold.addEventListener('pointerleave', stop); hold.addEventListener('pointercancel', stop);
  hold.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
  hold.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('enter-quiet').addEventListener('click', () => { if (!done) { done = true; enter(false); } });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hold.focus(); } });

  function enter(withSound) {
    const name = input.value.trim().replace(/[<>]/g, '').slice(0, 24);
    state.name = name; state.save(); state.entered = true;
    document.querySelectorAll('.vname').forEach((n) => { n.textContent = name || (n.closest('.pass') ? 'a friend' : 'friend'); });
    if (withSound) { sound.success(); } else { sound.setEnabled(false); }
    gsap.timeline()
      .to(split.chars, { yPercent: -120, opacity: 0, duration: 0.9, ease: 'expo.in', stagger: 0.015 })
      .to(['.gate-eyebrow', '.gate-lead', '.gate-name', '.gate-actions', '.gate-note', '.gate-frame'], { opacity: 0, y: -20, duration: 0.6, ease: 'power2.in' }, 0)
      .add(() => {
        gate.remove(); document.body.classList.remove('is-gated'); document.body.classList.add('is-in');
        onEnter?.(withSound);
        emit('enter');
        setTimeout(() => toast(name ? `Welcome, ${name}. Scroll slowly. I will guide you.` : 'Welcome. Scroll slowly. I will guide you.', 'whisper'), 900);
      });
  }
}
