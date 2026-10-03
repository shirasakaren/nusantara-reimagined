// The guided walk through Batavia: stops, hotspots, look-around, the bridge and Then / Now.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { state, emit } from '../core/state.js';
import { sound } from '../core/audio.js';
import { openModal, toast, confetti } from '../ui/fx.js';

const WHO_THEN = [
  'A Company clerk, late for the counting house.', 'A Mardijker on his way to the Portuguese church.', 'A porter carrying pepper from the boats.',
  'A Chinese trader with news from the sugar mills.', 'A soldier from the castle, off duty and sunburnt.', 'A woman selling fried bananas by the canal.',
  'An enslaved boy sent to fetch water from the fountain.', 'A Bugis sailor looking for a ship home.', 'A Javanese boatman resting in the shade.',
];
const WHO_NOW = [
  'A student taking photos for her history class.', 'A tourist renting a pink onthel bicycle.', 'A busker dressed as a colonial soldier, for a few coins.',
  'A grandmother who remembers when the canals smelled worse.', 'A guide from the museum, on her lunch break.', 'A kid chasing pigeons across the square.',
];

export function initBataviaUI({ batavia, lenis }) {
  const sec = document.getElementById('batavia');
  const stops = [...sec.querySelectorAll('.stop')];
  const nav = sec.querySelector('.bt-stops'); const hsLayer = sec.querySelector('.bt-hotspots');
  stops.forEach((s) => { const inner = document.createElement('div'); inner.className = 'stop-inner'; while (s.firstChild) inner.appendChild(s.firstChild); s.appendChild(inner); });
  nav.innerHTML = stops.map((s, i) => `<button role="tab" aria-selected="false" data-i="${i}" data-cursor="Go" aria-label="Stop ${i + 1}: ${s.querySelector('h3').textContent}">${String(i + 1).padStart(2, '0')}</button>`).join('');
  let current = 'intro';
  const setStop = (name) => {
    if (current === name) return; current = name;
    batavia.setStop(name);
    nav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', String(stops[i].dataset.stop === name)));
    renderHotspots();
    if (name === 'outside') sound.setMood('dark'); else if (name !== 'intro') sound.setMood('company');
  };
  ScrollTrigger.create({ trigger: sec.querySelector('.bt-intro'), start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) setStop('intro'); } });
  stops.forEach((s) => {
    gsap.from(s.querySelector('.stop-inner'), { opacity: 0, x: -40, filter: 'blur(6px)', duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 70%', toggleActions: 'play none none reverse' } });
    ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => { if (st.isActive) setStop(s.dataset.stop); } });
  });
  ScrollTrigger.create({ trigger: sec.querySelector('.bt-cards'), start: 'top 60%', end: 'bottom 40%', onToggle: (s) => sec.classList.toggle('is-touring', s.isActive) });
  nav.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const s = stops[+b.dataset.i]; lenis ? lenis.scrollTo(s, { offset: window.innerHeight * 0.1, duration: 1.6 }) : s.scrollIntoView(); });

  // then and now
  const tg = document.getElementById('bt-then-now'); let seenNow = false;
  tg.addEventListener('click', () => {
    const on = tg.getAttribute('aria-pressed') !== 'true'; tg.setAttribute('aria-pressed', String(on));
    batavia.setNow(on); sound.whoosh(); renderHotspots();
    toast(on ? 'Today. The walls and the castle are gone. The Stadhuis, Toko Merah and the bridge remain.' : 'Back to the 1730s.', 'whisper');
    if (on && !seenNow) { seenNow = true; emit('then-now'); }
  });

  // hotspots
  let spots = [];
  function renderHotspots() {
    const key = batavia.now ? 'today' : current; const list = batavia.hotspots[key] || [];
    hsLayer.innerHTML = '';
    spots = list.map((h) => {
      const b = document.createElement('button'); b.className = 'hotspot'; b.setAttribute('aria-label', h.title); b.dataset.cursor = h.id === 'bridgeraise' ? 'Raise' : 'Look';
      b.innerHTML = `<span>${h.title}</span>`;
      b.addEventListener('click', () => {
        if (h.id === 'bridgeraise' || h.id === 'kotaintan') { const up = batavia.toggleBridge(); sound.whoosh(); toast(up ? 'The bridge creaks up. A boat slips underneath.' : 'Down it comes.', 'whisper'); if (up) emit('bridge'); if (h.id === 'kotaintan') openModal({ kicker: h.kicker, title: h.title, html: h.html, art: h.art }); return; }
        openModal({ kicker: h.kicker, title: h.title, html: h.html, art: h.art });
      });
      hsLayer.appendChild(b);
      setTimeout(() => b.classList.add('is-on'), 400 + Math.random() * 400);
      return { h, b };
    });
  }
  renderHotspots();
  const v = new THREE.Vector3();
  gsap.ticker.add(() => {
    if (!sec.classList.contains('is-touring') && current !== 'intro') { if (spots.length) spots.forEach((s) => (s.b.style.visibility = 'hidden')); return; }
    const cam = batavia.camera; const W = window.innerWidth, H = window.innerHeight;
    for (const s of spots) {
      v.copy(s.h.p).project(cam);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && current !== 'intro';
      s.b.style.visibility = vis ? 'visible' : 'hidden';
      s.b.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
    }
  });

  // drag to look around, click to meet people
  let down = null;
  const interactive = (t) => t.closest('button, a, input, .stop-inner, .hotspot, .bt-ui');
  sec.addEventListener('pointerdown', (e) => { if (interactive(e.target)) return; down = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; });
  window.addEventListener('pointermove', (e) => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved += Math.abs(dx) + Math.abs(dy);
    if (e.pointerType !== 'touch' || Math.abs(dx) > Math.abs(dy)) batavia.drag(dx, e.pointerType === 'touch' ? 0 : dy);
    down.x = e.clientX; down.y = e.clientY;
  });
  window.addEventListener('pointerup', (e) => {
    if (!down) return; const click = down.moved < 6 && performance.now() - down.t < 400; down = null;
    if (!click || state.section !== 'batavia') return;
    const hit = batavia.pick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (!hit) return;
    if (hit.type === 'bridge') { const up = batavia.toggleBridge(); sound.whoosh(); toast(up ? 'The bridge creaks up.' : 'Down it comes.', 'whisper'); return; }
    const pool = batavia.now ? WHO_NOW : WHO_THEN; toast(pool[Math.floor(Math.random() * pool.length)], 'whisper'); sound.note(Math.floor(Math.random() * 6), 0.12);
  });

  // incense for 1740
  const inc = sec.querySelector('.incense');
  if (inc) {
    const smoke = inc.querySelector('.incense-smoke'); const label = inc.querySelector('.incense-label');
    let tw = null; const st = { p: 0 }; let lit = false;
    smoke.innerHTML = '<svg viewBox="0 0 20 60" width="20" height="60"><path d="M10 60 C 2 48, 18 40, 10 28 S 4 10, 12 0" fill="none" stroke="rgba(236,224,196,.6)" stroke-width="1.5"/></svg>';
    const start = (e) => { if (lit) return; e.preventDefault(); tw?.kill(); tw = gsap.to(st, { p: 1, duration: 1.6, ease: 'none', onUpdate: () => { label.textContent = `Hold${'.'.repeat(1 + Math.floor(st.p * 3))}`; }, onComplete: done }); };
    const stop = () => { if (lit) return; tw?.kill(); st.p = 0; label.textContent = 'Hold to light incense'; };
    const done = () => {
      lit = true; inc.classList.add('is-lit'); label.textContent = 'Remembered';
      gsap.to(smoke, { opacity: 1, duration: 1 }); gsap.to(smoke, { y: -10, repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' });
      batavia.lightLanterns(1.6); sound.chime(); toast('Thank you. Their names were rarely written down. Your attention is a kind of record.', 'whisper');
      emit('incense');
    };
    inc.addEventListener('pointerdown', start); inc.addEventListener('pointerup', stop); inc.addEventListener('pointerleave', stop);
    inc.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); }); inc.addEventListener('keyup', stop);
  }
  return { setStop };
}
