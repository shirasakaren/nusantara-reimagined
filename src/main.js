import './styles/base.css';
import './styles/ui.css';
import './styles/sections.css';
import './styles/games.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { state, on } from './core/state.js';
import { installPatternVars } from './core/patterns.js';
import { sound } from './core/audio.js';
import { initLoader, initGate } from './ui/intro.js';
import { initCursor } from './ui/cursor.js';
import { initHud } from './ui/hud.js';
import { initModal } from './ui/fx.js';
import { initIdle } from './ui/idle.js';
import { initStory } from './story/story.js';
import { initSections } from './story/sections.js';
import { initPeople } from './story/people.js';
import { initBataviaUI } from './story/batavia-ui.js';
import { initPlay } from './games/play.js';
import { initAtlas } from './story/atlas.js';

gsap.registerPlugin(ScrollTrigger);
const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)));
const noop = new Proxy({}, { get: (t, k) => (k === 'camera' ? null : k === 'hotspots' ? {} : k === 'roadKm' ? 0 : () => false) });

async function boot() {
  installPatternVars();
  const loader = initLoader();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))]);
  loader.set(0.12); await tick();

  let stage = null, map = noop, batavia = noop;
  try {
    const [{ Stage }, { MapScene }, { BataviaScene }, { Relics }] = await Promise.all([import('./gl/stage.js'), import('./gl/map.js'), import('./gl/batavia.js'), import('./gl/relics.js')]);
    loader.set(0.22); await tick();
    stage = new Stage(document.getElementById('gl'));
    const lite = state.lite || state.mobile;
    map = new MapScene(stage.renderer, { lite }); stage.add('map', map);
    loader.set(0.55); await tick();
    batavia = new BataviaScene(stage.renderer, { lite }); stage.add('batavia', batavia);
    loader.set(0.8); await tick();
    stage.relics = new Relics(stage.renderer);
    loader.set(0.9); await tick();
    try { await stage.renderer.compileAsync(map.scene, map.camera); await stage.renderer.compileAsync(batavia.scene, batavia.camera); } catch { /* compile on first frame instead */ }
    map.resize(stage.w, stage.h); batavia.resize(stage.w, stage.h);
    gsap.ticker.add((t, dms) => stage.frame(Math.min(0.06, dms / 1000)));
    on('lite', () => stage.setPixelRatio());
  } catch (err) {
    console.warn('3D is unavailable, continuing without it.', err);
    document.body.classList.add('no-webgl');
  }

  // smooth scrolling, tied to GSAP's clock
  const lenis = state.reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1); const t = document.getElementById(id); if (!t || a.closest('#menu-list, #tl-ticks')) return;
    e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 2 }) : t.scrollIntoView();
  }));

  initCursor();
  initModal();
  const hud = initHud({ lenis, onPreview: (id) => story?.preview(id) });
  initPeople({ relics: stage?.relics });
  initSections({ lenis });
  initBataviaUI({ batavia, lenis });
  initPlay();
  const story = initStory({ stage: stage || { show() {}, skip: false }, map, batavia, hud });
  initIdle();
  const atlas = initAtlas({ stage, map, lenis, story });
  const openAtlas = () => { document.getElementById('menu-close').click(); setTimeout(() => { document.body.classList.add('in-atlas'); atlas.open(); }, 450); };
  document.getElementById('menu-atlas').addEventListener('click', openAtlas);
  document.getElementById('ep-atlas')?.addEventListener('click', () => { document.body.classList.add('in-atlas'); atlas.open(); });
  document.addEventListener('click', (e) => { if (e.target.closest('#atlas .menu-close')) document.body.classList.remove('in-atlas'); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTimeout(() => { if (!document.getElementById('atlas')?.classList.contains('is-open')) document.body.classList.remove('in-atlas'); }, 50); });
  await tick();
  ScrollTrigger.refresh(); hud.layout();

  await loader.done();
  initGate({
    onEnter() {
      window.scrollTo(0, 0);
      lenis?.start();
      map.setFocus('overview');
      ScrollTrigger.refresh(); hud.layout();
    },
  });
  window.addEventListener('load', () => { ScrollTrigger.refresh(); hud.layout(); });
  // keep the sound in step with the page when the sound button is used before entering
  on('sound', (v) => document.body.classList.toggle('has-sound', v));
  window.__nr = { stage, map, batavia, sound, state, lenis, ScrollTrigger, THREE: await import("three") };
}

boot();
