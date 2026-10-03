// Scroll choreography: which world is on stage, where the camera looks, what the music feels like.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { state, emit, on } from '../core/state.js';
import { sound } from '../core/audio.js';
import { award, wipe } from '../ui/fx.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const YEAR_RE = /\b(1[2-9]\d{2}|20[0-2]\d)\b/;

export function initStory({ stage, map, batavia, hud }) {
  const sections = [...document.querySelectorAll('main > section[data-chapter]')];
  let currentScene = 'map'; let activeSection = null; let yearShown = 1293; const yr = { v: 1293 };

  const setYear = (y) => {
    if (!y || y === yearShown) return; yearShown = y;
    gsap.to(yr, { v: y, duration: 1.2, ease: 'power2.out', onUpdate: () => hud.year(Math.round(yr.v)) });
  };

  const applyScene = (name) => {
    const base = name.replace('-dim', '');
    const target = base === 'none' ? currentScene : base;
    const doSwitch = () => {
      stage.show(target);
      currentScene = target;
      map.setDim(name === 'map-dim' ? 1 : 0);
      if (batavia) batavia.dim = name === 'batavia-dim';
    };
    if (target !== currentScene && state.entered) wipe(doSwitch); else doSwitch();
  };

  const activate = (s) => {
    if (activeSection === s) return; activeSection = s; state.section = s.id;
    applyScene(s.dataset.scene);
    const mood = s.dataset.mood;
    if (s.dataset.scene.startsWith('map') || s.dataset.scene === 'none') { if (mood !== 'paper' && mood !== 'play') map.applyMood(mood); }
    sound.setMood(mood);
    document.body.classList.toggle('on-paper', s.dataset.scene === 'none');
    map.setRain(mood === 'dark' ? 1 : 0);
    if (s.id === 'today') { map.setRoutes(['modern', 'modern2', 'modern3']); map.setMarks(['morowali', 'weda', 'riau', 'grasberg', 'jakarta', 'natuna']); map.setFocus('modern'); }
    if (s.id === 'epilogue') { map.setRoutes([]); map.setMarks([]); map.setFocus('night'); }
    if (s.id === 'myth' || s.id === 'legacy') { map.setFocus('myth'); }
    setYear(parseInt(s.dataset.year, 10));
    emit('section', s);
    syncBeat(s);
  };
  // apply the beat that sits in the middle of the screen, used after jumps and after the atlas
  function syncBeat(s) {
    if (!s || s.id === 'today' || s.id === 'epilogue' || !s.dataset.scene.startsWith('map')) return;
    const mid = window.innerHeight / 2;
    const b = [...s.querySelectorAll('.beat')].find((x) => { const r = x.getBoundingClientRect(); return r.top < mid * 1.3 && r.bottom > mid * 0.7; });
    if (!b) { map.setMarks([]); map.setRoutes([]); return; }
    if (b.dataset.focus) map.setFocus(b.dataset.focus);
    map.setMarks((b.dataset.marks || '').split(',').filter(Boolean));
    const routes = b.dataset.route ? [b.dataset.route] : []; if (s.id === 'ch2') routes.push('voc');
    map.setRoutes(routes);
  }

  sections.forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) activate(s); } });
    // award a stamp once the visitor has spent real time inside the chapter
    ScrollTrigger.create({ trigger: s, start: 'top top', end: 'bottom bottom', onUpdate: (self) => { if (self.isActive && self.progress > 0.55 && s.dataset.stamp && !['merdeka', 'yamato', 'lantern', 'play', 'myth'].includes(s.dataset.stamp)) award(s.dataset.stamp); } });
    // paper sections fully cover the screen: stop drawing 3D behind them
    if (s.dataset.scene === 'none') ScrollTrigger.create({ trigger: s, start: 'top top', end: 'bottom bottom', onToggle: (self) => { stage.skip = self.isActive; } });
  });

  // headings: letters rise like ink lifting off paper
  document.querySelectorAll('.ch-title[data-split]').forEach((h) => {
    const split = new SplitText(h, { type: 'words,chars', charsClass: 'char', wordsClass: 'word' });
    gsap.from(split.chars, {
      yPercent: 120, rotate: 6, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: { each: 0.025, from: 'start' },
      scrollTrigger: { trigger: h, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    // letters lift toward the pointer, like type pressed into paper and released
    if (!state.touch && !state.reduced) {
      h.addEventListener('pointermove', (e) => {
        for (const c of split.chars) {
          const r = c.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2); const d = Math.abs(dx) + Math.abs(e.clientY - (r.top + r.height / 2)) * 0.5;
          const f = Math.max(0, 1 - d / 180); gsap.to(c, { y: -f * 14, rotate: (dx / 180) * f * -6, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        }
      });
      h.addEventListener('pointerleave', () => gsap.to(split.chars, { y: 0, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }));
    }
    const head = h.closest('.ch-head, .bt-intro, .people-head, .myth-inner, .legacy-head, .play-head, .today-head, .ep-inner');
    if (head) {
      const extras = head.querySelectorAll('.ch-num, .ch-years, .bt-lead, .people-lead, .today-lead, .today-fair, .ep-lead, .myth-lead');
      gsap.from(extras, { opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: head, start: 'top 80%', toggleActions: 'play none none reverse' } });
    }
    // the chapter head drifts slowly as you leave it
    const ch = h.closest('.ch-head');
    if (ch && !state.reduced) gsap.to(h, { yPercent: -30, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: ch, start: 'center center', end: 'bottom top', scrub: true } });
  });

  // beats: each card glides in and points the camera somewhere
  document.querySelectorAll('.beat').forEach((b) => {
    const card = document.createElement('div'); card.className = 'beat-card';
    while (b.firstChild) card.appendChild(b.firstChild); b.appendChild(card);
    gsap.from(card, { opacity: 0, y: 60, filter: 'blur(8px)', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: b, start: 'top 75%', toggleActions: 'play none none reverse' } });
    const ps = card.querySelectorAll('p');
    gsap.from(ps, { opacity: 0, y: 18, duration: 1, ease: 'expo.out', stagger: 0.12, delay: 0.15, scrollTrigger: { trigger: b, start: 'top 75%', toggleActions: 'play none none reverse' } });
    ScrollTrigger.create({
      trigger: b, start: 'top 60%', end: 'bottom 40%',
      onToggle: (self) => {
        if (!self.isActive) return;
        if (activeSection && !activeSection.contains(b)) return;
        if (b.dataset.focus) map.setFocus(b.dataset.focus);
        map.setMarks((b.dataset.marks || '').split(',').filter(Boolean));
        const routes = b.dataset.route ? [b.dataset.route] : [];
        if (b.closest('#ch2')) routes.push('voc');
        map.setRoutes(b.dataset.route || b.closest('#ch2') ? routes : []);
        if (b.dataset.road) map.setRoad(1);
        if (b.dataset.erupt) { map.triggerEruption(); if (sound.can()) sound.gong(55, sound.ctx.currentTime, 0.8, 6); }
        const m = card.textContent.match(YEAR_RE); if (m) setYear(parseInt(m[1], 10));
        sound.note(Math.floor(Math.random() * 5), 0.05);
      },
    });
  });
  // the road is forgotten once you leave chapter III
  ScrollTrigger.create({ trigger: '#ch3', start: 'top bottom', end: 'bottom top', onToggle: (self) => { if (!self.isActive) map.setRoad(0); } });
  // road counter mirrors the 3D road
  const km = document.getElementById('road-km');
  gsap.ticker.add(() => { if (km && activeSection?.id === 'ch3') km.textContent = (map.roadKm || 0).toLocaleString('en-US'); });

  // overall progress for the timeline rail
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => hud.progress(self.progress) });

  // menu previews move the map behind the blurred menu
  return {
    preview(id) {
      if (!id) { const b = document.querySelector(`#${state.section} .beat`); if (b?.dataset.focus) map.setFocus(b.dataset.focus); return; }
      const s = document.getElementById(id); const b = s?.querySelector('.beat[data-focus]');
      if (b && currentScene === 'map') { map.setFocus(b.dataset.focus); map.setMarks((b.dataset.marks || '').split(',').filter(Boolean)); }
      if (s?.dataset.mood && currentScene === 'map' && s.dataset.scene !== 'none') map.applyMood(s.dataset.mood, 1.2);
    },
    refresh() { ScrollTrigger.refresh(); hud.layout(); },
    reactivate() { const s = activeSection; activeSection = null; if (s) activate(s); },
  };
}
