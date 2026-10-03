// The header, the timeline rail, the chapter menu and the travel pass.
import gsap from 'gsap';
import { animate, stagger } from 'animejs';
import { state, on, emit, visitorName } from '../core/state.js';
import { sound } from '../core/audio.js';
import { STAMPS, stampSVG } from './fx.js';

const PREVIEW = {
  prologue: 'Before 1511. Spices that grew nowhere else on earth.',
  ch1: 'Portugal takes Malacca. A sultan answers with a five year siege.',
  ch2: 'A company with an army. Batavia rises on the ashes of Jayakarta.',
  batavia: 'Walk the canals of the Queen of the East, then switch to today.',
  people: 'Clerks, Mardijkers, the enslaved, the nyai. Shadows with stories.',
  ch3: 'A thousand kilometre road and a temple under the trees.',
  ch4: 'Diponegoro, forced crops and a novel that shamed a nation.',
  ch5: 'Aceh, the puputan of Badung and a debt of honour.',
  ch6: 'Kartini, Budi Utomo and three promises made in 1928.',
  ch7: 'Japan arrives. Romusha, rice and rain.',
  ch8: 'Seventeen August. Type the text. Raise the flag.',
  ch9: 'Tear the blue. Four more years until the Dutch let go.',
  myth: 'Were we really colonized for 350 years? Not quite.',
  legacy: 'Kantor, handuk, kulkas. The words and stones that stayed.',
  play: 'Congklak, gasing, inherited words and batik. Play.',
  today: 'Nickel, palm oil, data and debt. The old questions in new clothes.',
  epilogue: 'Light a lantern. Remember forward.',
};

export function initHud({ lenis, onPreview }) {
  // sound
  const sb = document.getElementById('btn-sound');
  sb.addEventListener('click', () => { sound.setEnabled(!sound.on); });
  on('sound', (v) => sb.setAttribute('aria-pressed', String(v)));

  // menu
  const menu = document.getElementById('menu'); const list = document.getElementById('menu-list'); const prev = document.getElementById('menu-preview');
  const sections = [...document.querySelectorAll('main > section[data-chapter]')];
  list.innerHTML = sections.map((s) => `<li><a href="#${s.id}" data-id="${s.id}" data-cursor="Go"><span class="ml-num">${s.dataset.chapter}</span><span class="ml-title">${s.dataset.title}</span><span class="ml-year">${s.dataset.year}</span></a></li>`).join('');
  const btn = document.getElementById('btn-menu');
  let open = false;
  const setOpen = (v) => {
    open = v; btn.setAttribute('aria-expanded', String(v)); menu.setAttribute('aria-hidden', String(!v));
    if (v) {
      menu.classList.add('is-open'); lenis?.stop();
      gsap.to(menu.querySelector('.menu-bg'), { opacity: 1, duration: 0.6 });
      gsap.fromTo([menu.querySelector('.menu-kicker'), menu.querySelector('.menu-side')], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'expo.out' });
      animate(list.querySelectorAll('a'), { translateY: ['110%', '0%'], opacity: [0, 1], duration: 900, delay: stagger(40, { start: 120 }), ease: 'outExpo' });
      list.querySelectorAll('a').forEach((a) => a.classList.toggle('is-current', a.dataset.id === state.section));
      sound.whoosh();
      setTimeout(() => list.querySelector('a.is-current, a')?.focus({ preventScroll: true }), 300);
    } else {
      gsap.to(menu.querySelector('.menu-bg'), { opacity: 0, duration: 0.4 });
      animate(list.querySelectorAll('a'), { translateY: '-60%', opacity: 0, duration: 400, delay: stagger(15), ease: 'inQuad', onComplete: () => { menu.classList.remove('is-open'); } });
      gsap.to(menu.querySelector('.menu-side'), { opacity: 0, duration: 0.3 });
      lenis?.start(); onPreview?.(null);
    }
  };
  btn.addEventListener('click', () => setOpen(!open));
  document.getElementById('menu-close').addEventListener('click', () => setOpen(false));
  list.addEventListener('pointerover', (e) => { const a = e.target.closest('a'); if (!a) return; prev.textContent = PREVIEW[a.dataset.id] || ''; onPreview?.(a.dataset.id); });
  list.addEventListener('focusin', (e) => { const a = e.target.closest('a'); if (!a) return; prev.textContent = PREVIEW[a.dataset.id] || ''; });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return; e.preventDefault();
    setOpen(false);
    const target = document.getElementById(a.dataset.id);
    setTimeout(() => { lenis ? lenis.scrollTo(target, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) }) : target.scrollIntoView(); }, 350);
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); if (e.key === 'Escape' && passOpen) setPass(false); });
  const lite = document.getElementById('opt-lite'); lite.checked = state.lite;
  lite.addEventListener('change', () => { state.lite = lite.checked; state.save(); emit('lite', state.lite); });

  // pass
  const pass = document.getElementById('pass'); const grid = document.getElementById('pass-grid');
  let passOpen = false;
  const renderPass = () => {
    grid.innerHTML = STAMPS.map((s, i) => `<li class="${state.stamps.has(s.id) ? 'is-got' : ''}" title="${s.label}">${state.stamps.has(s.id) ? stampSVG(s, i, 110) : ''}<span>${s.label}</span></li>`).join('');
    document.querySelectorAll('.vname').forEach((n) => { n.textContent = visitorName(n.closest('.pass') ? 'a friend' : 'friend'); });
  };
  const setPass = (v) => {
    passOpen = v; pass.setAttribute('aria-hidden', String(!v));
    if (v) {
      renderPass(); pass.classList.add('is-open'); lenis?.stop();
      gsap.to(pass.querySelector('.pass-bg'), { opacity: 1, duration: 0.4 });
      gsap.fromTo(pass.querySelector('.pass-book'), { opacity: 0, y: 60, rotate: -3 }, { opacity: 1, y: 0, rotate: 0, duration: 0.9, ease: 'expo.out' });
      animate(grid.querySelectorAll('li.is-got svg'), { scale: [1.6, 1], opacity: [0, 1], rotate: () => [`${-20 + Math.random() * 10}deg`, `${-8 + Math.random() * 16}deg`], delay: stagger(60, { start: 300 }), duration: 500, ease: 'outBack' });
      sound.click();
      setTimeout(() => document.getElementById('pass-close').focus({ preventScroll: true }), 200);
    } else {
      gsap.to(pass.querySelector('.pass-bg'), { opacity: 0, duration: 0.3 });
      gsap.to(pass.querySelector('.pass-book'), { opacity: 0, y: 40, duration: 0.4, onComplete: () => pass.classList.remove('is-open') });
      lenis?.start();
    }
  };
  document.getElementById('btn-pass').addEventListener('click', () => setPass(true));
  document.getElementById('ep-open-pass')?.addEventListener('click', () => setPass(true));
  document.getElementById('pass-close').addEventListener('click', () => setPass(false));
  pass.querySelector('.pass-bg').addEventListener('click', () => setPass(false));
  const count = document.getElementById('pass-count');
  const upd = () => {
    count.textContent = state.stamps.size;
    const ep = document.getElementById('ep-stamps'); if (ep) ep.textContent = state.stamps.size;
    const et = document.getElementById('ep-total'); if (et) et.textContent = STAMPS.length;
  };
  upd();
  on('stamp', () => { upd(); count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump'); });

  // chapter indicator
  const hn = document.getElementById('hc-num'), ht = document.getElementById('hc-title');
  let last = '';
  on('section', (s) => {
    if (!s || s.id === last) return; last = s.id;
    gsap.to([hn, ht], { opacity: 0, y: -6, duration: 0.25, onComplete: () => { hn.textContent = s.dataset.chapter; ht.textContent = s.dataset.title; gsap.fromTo([hn, ht], { y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.05 }); } });
  });

  // timeline ticks
  const ticks = document.getElementById('tl-ticks'); const fill = document.querySelector('.tl-fill'); const yr = document.getElementById('tl-year');
  const layout = () => {
    const H = document.documentElement.scrollHeight - window.innerHeight;
    ticks.innerHTML = sections.map((s) => { const p = Math.min(1, s.offsetTop / H); return `<a class="tl-tick" href="#${s.id}" data-id="${s.id}" style="left:${(p * 100).toFixed(2)}%" data-cursor="Go" aria-label="${s.dataset.title}"><span>${s.dataset.year} ${s.dataset.title}</span></a>`; }).join('');
  };
  ticks.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); const t = document.getElementById(a.dataset.id); lenis ? lenis.scrollTo(t, { duration: 2 }) : t.scrollIntoView(); });
  setTimeout(layout, 300); window.addEventListener('resize', () => setTimeout(layout, 200));
  return {
    layout,
    progress(p) {
      fill.style.transform = `scaleX(${p})`;
      ticks.querySelectorAll('.tl-tick').forEach((t) => t.classList.toggle('is-past', parseFloat(t.style.left) / 100 <= p + 0.001));
    },
    year(y) { yr.textContent = y; },
    renderPass,
  };
}
