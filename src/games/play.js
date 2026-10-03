// The playground tabs: each game wakes up only when you open it.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { initCongklak } from './congklak.js';
import { initGasing } from './gasing.js';
import { initKata } from './kata.js';
import { initBatik } from './batik.js';
import { sound } from '../core/audio.js';
import { award } from '../ui/fx.js';

export function initPlay() {
  const games = { congklak: initCongklak(), gasing: initGasing(), kata: initKata(), batik: initBatik() };
  const tabs = [...document.querySelectorAll('.play-tabs [role=tab]')];
  let current = 'congklak'; let visible = false; let played = new Set();
  const show = (name) => {
    current = name;
    tabs.forEach((t) => { const on = t.id === `tab-${name}`; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('.game').forEach((g) => { g.hidden = g.id !== `game-${name}`; });
    const panel = document.getElementById(`game-${name}`);
    gsap.fromTo(panel, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    Object.entries(games).forEach(([k, g]) => { if (k !== name) g?.stop?.(); });
    if (visible) games[name]?.start?.();
    played.add(name); if (played.size >= 2) award('play');
    ScrollTrigger.refresh();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { show(t.id.replace('tab-', '')); sound.click(); });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click(); }
    });
  });
  ScrollTrigger.create({ trigger: '#play', start: 'top 80%', end: 'bottom top', onToggle: (s) => {
    visible = s.isActive;
    if (visible) games[current]?.start?.(); else games.gasing?.stop?.();
  } });
}
