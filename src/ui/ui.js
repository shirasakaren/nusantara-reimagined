// The interface. Loader, title, storybook, HUD, dock, ride stats, photo mode, Wawa's
// dialog and every micro animation that makes the valley feel alive.
import gsap from 'gsap';
import { animate as animeAnimate, stagger, createTimeline } from 'animejs';
import { animate as mAnimate, hover as mHover, press as mPress } from 'motion';
import * as THREE from 'three';
import { bus } from '../core/bus.js';
import { state, setState } from '../core/state.js';
import { audio } from '../core/audio.js';
import { gfx } from '../core/renderer.js';
import { icon } from './icons.js';
import { PIECES, PIECE_ORDER, H, BASE } from '../coaster/pieces.js';
import { DECOR, DECOR_ORDER } from '../coaster/decor.js';
import { SWATCHES, hexToCss } from '../core/palette.js';
import { PROLOGUE, CHAPTERS, TIPS, IDLE_NUDGES } from './story.js';
import { WAWA_SVG, STORY_ART, STORY_CSS } from './art.js';
import { WAWA_LINES } from '../world/mascot.js';
import { Confetti, Bubbles, Toasts, Pointer, flash } from './fx.js';
import { fillIcons, openModal, closeTopModal, anyModal, confirmModal, settingsModal, albumModal, viewPhoto, badgesModal, shareModal, saveModal, helpModal, themeModal, chapterModal, finaleModal, menuModal } from './modals.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const FILTERS = [
  ['none', 'Natural'], ['warm', 'Warm'], ['dream', 'Dreamy'], ['pop', 'Pop'], ['retro', 'Retro'], ['mono', 'Mono'], ['night', 'Moonlit'],
];
const CSS_FILTERS = { none: '', warm: 'sepia(0.25) saturate(1.3) brightness(1.05)', dream: 'saturate(1.4) brightness(1.08) contrast(0.92) hue-rotate(-8deg)', retro: 'sepia(0.55) contrast(1.1) saturate(0.9)', mono: 'grayscale(1) contrast(1.15)', pop: 'saturate(1.8) contrast(1.1)', night: 'hue-rotate(200deg) saturate(1.2) brightness(0.9)' };

export class UI {
  constructor(game) {
    this.game = game;
    this.cat = 'basic';
    this.photoFilter = 'none';
    this.lastInput = performance.now();
    this.speedIdx = 0;
    this.dialogQueue = [];
    this.tipIdx = 0;
    document.head.insertAdjacentHTML('beforeend', `<style>${STORY_CSS}</style>`);
    fillIcons(document.body);
    this.confetti = new Confetti($('#confetti'));
    this.toasts = new Toasts($('#toasts'));
    this.pointer = new Pointer($('#cursor'), $('#tooltip'));
    this._loaderTips();
  }

  // ================================================================ loader
  _loaderTips() {
    const el = $('#loader-tip');
    const show = () => { el.textContent = TIPS[this.tipIdx++ % TIPS.length]; gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }); };
    show();
    this._tipT = setInterval(show, 2600);
    this.loaderPath = $('#loader-path');
    this.loaderLen = this.loaderPath.getTotalLength();
    this._lp = 0;
    this._setLoader(0);
  }

  _setLoader(p) {
    const L = this.loaderLen;
    const pt = this.loaderPath.getPointAtLength(L * p);
    const pt2 = this.loaderPath.getPointAtLength(Math.min(L, L * p + 2));
    const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    $('#loader-car').setAttribute('transform', `translate(${pt.x} ${pt.y - 4}) rotate(${ang})`);
    $('#loader-fill').setAttribute('stroke-dasharray', `${L * p} 1000`);
    $('#loader-pct').textContent = Math.round(p * 100);
  }

  progress(p, label) {
    $('#loader-text').textContent = label;
    gsap.to(this, { _lp: p, duration: 0.35, ease: 'power2.out', onUpdate: () => this._setLoader(this._lp) });
  }

  async hideLoader() {
    clearInterval(this._tipT);
    this._setLoader(1);
    await new Promise((r) => setTimeout(r, 350));
    const tl = gsap.timeline();
    tl.to('#loader-car', { y: -30, duration: 0.3, ease: 'power2.out' })
      .to('.loader-card', { scale: 1.06, duration: 0.18, ease: 'power2.out' }, '<')
      .to('.loader-card', { scale: 0.2, rotate: 8, opacity: 0, duration: 0.45, ease: 'back.in(2)' })
      .to('#loader', { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.15')
      .set('#loader', { display: 'none' });
    await tl.then();
  }

  // ================================================================ title
  showTitle() {
    const g = this.game;
    const title = $('#title');
    title.hidden = false;
    g.rig.goalTarget.set(0, 4, 8); g.rig.target.set(0, 4, 8);
    g.rig.goalDist = g.rig.dist = 132; g.rig.goalPitch = g.rig.pitch = 0.42; g.rig.goalYaw = g.rig.yaw = -0.6;
    g.rig.autoOrbit = 0.035;
    g.rig.inputEnabled = false;
    g.view.showCursor(false);
    g.terrain.board.grid.material.opacity = 0;
    if (g.hasSave) $('#btn-continue').hidden = false;
    if (g.sharedCode) $('#shared-banner').hidden = false;
    // letters
    const chars = $$('.title-word .ch');
    animeAnimate(chars, { translateY: ['120%', '0%'], rotate: [() => (Math.random() - 0.5) * 50, 0], scale: [0.4, 1], opacity: [0, 1], delay: stagger(55, { start: 200 }), duration: 1100, ease: 'outElastic(1, .55)' });
    this._titleIdle = animeAnimate(chars, { translateY: [0, -10, 0], delay: stagger(110), duration: 2400, loop: true, ease: 'inOutSine' });
    gsap.from('.eyebrow', { y: -30, opacity: 0, duration: 0.7, delay: 0.1, ease: 'back.out(2)' });
    gsap.from('.tagline', { y: 20, opacity: 0, duration: 0.7, delay: 0.9, ease: 'power3.out' });
    gsap.from('.title-actions .btn:not([hidden])', { y: 40, opacity: 0, scale: 0.8, stagger: 0.09, duration: 0.8, delay: 1.05, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
    gsap.from('.title-links', { opacity: 0, y: 10, duration: 0.6, delay: 1.4 });
    gsap.from('.title-foot, .shared-banner', { opacity: 0, duration: 0.8, delay: 1.6 });
    chars.forEach((c, i) => {
      c.addEventListener('pointerenter', () => { mAnimate(c, { y: [-0, -26, 0], rotate: [0, (i % 2 ? 12 : -12), 0] }, { duration: 0.55 }); if (audio.ready) audio.tone({ f: 440 * Math.pow(2, (i % 7) / 7 * 1.1), dur: 0.12, gain: 0.05, type: 'triangle' }); });
      c.addEventListener('click', () => { audio.init(); audio.play('boing'); mAnimate(c, { scaleY: [1, 0.6, 1.2, 1], scaleX: [1, 1.3, 0.9, 1] }, { duration: 0.6 }); });
    });
    const go = (fn) => () => { audio.init(); audio.play('click'); fn(); };
    $('#btn-story').onclick = go(() => this._leaveTitle(() => this.storybook(() => this.startGame({ story: true, fresh: true }))));
    $('#btn-free').onclick = go(() => this._leaveTitle(() => this.startGame({ story: false, fresh: !g.hasSave })));
    $('#btn-continue').onclick = go(() => { g.continueSave(); this._leaveTitle(() => this.startGame({ story: state.story, fresh: false, cont: true })); });
    $('#btn-load-shared').onclick = go(() => { if (g.hasSave) g.continueSave(); g.loadShared(g.sharedCode); this._leaveTitle(() => this.startGame({ story: state.story && g.hasSave, fresh: false, cont: true, shared: true })); });
    $('#btn-title-help').onclick = go(() => helpModal());
    $('#btn-title-album').onclick = go(() => albumModal());
    const sb = $('#btn-title-sound');
    const syncSound = () => { sb.querySelector('[data-icon]').innerHTML = icon(state.sound ? 'sound' : 'mute'); sb.querySelector('.lbl').textContent = state.sound ? 'Sound on' : 'Sound off'; };
    syncSound();
    sb.onclick = () => { audio.init(); setState({ sound: !state.sound, music: !state.sound ? state.music : state.music }); syncSound(); audio.play('toggle', { on: state.sound }); };
    this._springify(title);
  }

  _leaveTitle(then) {
    this._titleIdle?.pause?.();
    const tl = gsap.timeline({ onComplete: () => { $('#title').hidden = true; then(); } });
    tl.to('.title-actions .btn, .title-links, .tagline, .eyebrow, .title-foot, .shared-banner', { y: 30, opacity: 0, stagger: 0.03, duration: 0.3, ease: 'power2.in' })
      .to('.title-word .ch', { y: -140, rotate: () => (Math.random() - 0.5) * 60, opacity: 0, stagger: 0.025, duration: 0.45, ease: 'back.in(2)' }, '<0.05');
  }

  // ================================================================ storybook
  storybook(done) {
    const sb = $('#storybook');
    sb.hidden = false;
    let i = 0;
    const dots = $('#book-dots');
    dots.innerHTML = PROLOGUE.map(() => '<i></i>').join('');
    const art = $('#book-art');
    const render = (dir = 1) => {
      const p = PROLOGUE[i];
      $('#book-num').textContent = `${i + 1} / ${PROLOGUE.length}`;
      $('#book-title').textContent = p.title;
      const body = $('#book-body');
      body.innerHTML = p.text.split(' ').map((w) => `<span style="display:inline-block;opacity:0">${w}&nbsp;</span>`).join('');
      art.innerHTML = STORY_ART[p.art];
      $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === i));
      $('#book-next span').textContent = i === PROLOGUE.length - 1 ? 'Let us build' : 'Next';
      gsap.fromTo(art.firstElementChild, { x: 60 * dir, opacity: 0, scale: 1.06 }, { x: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' });
      gsap.fromTo('#book-title', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
      animeAnimate(body.querySelectorAll('span'), { opacity: [0, 1], translateY: [8, 0], delay: stagger(28, { start: 200 }), duration: 380, ease: 'outQuad' });
      audio.play('whoosh', { dur: 0.4, gain: 0.05 });
    };
    const finish = () => {
      window.removeEventListener('keydown', key);
      gsap.to('.book', { y: 40, scale: 0.9, opacity: 0, duration: 0.4, ease: 'back.in(1.6)' });
      gsap.to(sb, { opacity: 0, duration: 0.45, delay: 0.1, onComplete: () => { sb.hidden = true; gsap.set([sb, '.book'], { clearProps: 'all' }); done(); } });
    };
    const next = () => { audio.play('click'); if (i < PROLOGUE.length - 1) { i++; render(1); } else finish(); };
    const prev = () => { if (i > 0) { i--; render(-1); } };
    const key = (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') prev(); if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', key);
    $('#book-next').onclick = next;
    $('#book-skip').onclick = () => { audio.play('click'); finish(); };
    gsap.fromTo(sb, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo('.book', { y: 60, scale: 0.85, rotate: -3 }, { y: 0, scale: 1, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.7)' });
    render(1);
    this._springify(sb);
  }

  // ================================================================ start
  startGame({ story, fresh, cont, shared }) {
    const g = this.game;
    if (fresh) g.newPark(story);
    else if (!cont) { setState({ story }); g._updateJoy(true); }
    setState({ started: true });
    document.body.classList.add('started');
    g.rig.autoOrbit = 0;
    g.rig.inputEnabled = true;
    g.setMode('build');
    g.view.showCursor(true);
    gsap.to(g.terrain.board.grid.material, { opacity: 0.28, duration: 1 });
    const aspectK = innerWidth / innerHeight < 1 ? 1.7 : 1;
    g.rig.flyTo({ target: new THREE.Vector3(0, 0, 22), dist: 62 * aspectK, pitch: 0.68, yaw: 0.42 }, 2.4, 'power3.inOut');
    this._buildHUD();
    const hud = $('#hud');
    hud.hidden = false;
    const tl = gsap.timeline({ delay: 0.4 });
    const CP = 'transform,opacity';
    tl.from('.brand-chip, .chapter-card, .waaw-meter, .more-btn, .top-actions > *', { y: -90, opacity: 0, stagger: 0.06, duration: 0.8, ease: 'back.out(1.6)', clearProps: CP })
      .from('.dock', { yPercent: 160, opacity: 0, duration: 0.9, ease: 'back.out(1.3)', clearProps: CP }, '<0.2')
      .from('.mode-switch, .ride-controls > *', { y: 120, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'back.out(1.8)', clearProps: CP }, '<0.1')
      .from('.cam-tools > *', { x: 90, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'back.out(2)', clearProps: CP }, '<0.1');
    tl.add(() => { animeAnimate($$('#pieces .piece'), { translateY: [30, 0], opacity: [0, 1], scale: [0.6, 1], delay: stagger(40), duration: 600, ease: 'outBack(2)' }); }, '-=0.6');
    this._updateChapter();
    this._syncWaaw(true);
    setTimeout(() => {
      if (state.story) {
        const ch = g.currentChapter;
        if (ch) this.wawa(ch.intro, [{ label: 'Show me', fn: () => this.wawa(ch.hint, [], 8000) }, { label: 'Got it', fn: () => this.closeWawa() }], 0);
      } else if (shared) this.wawa('A friend built this one. Press play and see how it rides!', [], 6000);
      else this.wawa(fresh ? 'Free build! Every piece and every train is yours. Have fun out there.' : 'Welcome back, builder. The valley missed you.', [], 6000);
    }, 2300);
  }

  afterNewPark() {
    this._updateChapter();
    this._syncWaaw(true);
    this._refreshPieces();
    const ch = this.game.currentChapter;
    if (state.story && ch) this.wawa(ch.intro, [], 7000);
  }

  // ================================================================ HUD
  _buildHUD() {
    if (this._hudBuilt) return;
    this._hudBuilt = true;
    const g = this.game;
    this._renderPieces();
    this._renderSwatches();
    this._renderDecor();
    $('#wd-avatar').innerHTML = WAWA_SVG;

    // mode switch
    $$('.mode-switch button').forEach((b) => b.addEventListener('click', () => { audio.play('click'); this.setMode(b.dataset.mode); }));
    this._moveBlob();
    window.addEventListener('resize', () => this._moveBlob());

    // tools
    $$('.tool-tabs button').forEach((b) => b.addEventListener('click', () => this.setTool(b.dataset.tool)));
    $$('.cat-tabs button').forEach((b) => b.addEventListener('click', () => {
      audio.play('click');
      $$('.cat-tabs button').forEach((x) => x.classList.toggle('active', x === b));
      this.cat = b.dataset.cat;
      this._renderPieces(true);
    }));
    $$('.paint-targets button').forEach((b) => b.addEventListener('click', () => {
      audio.play('click');
      $$('.paint-targets button').forEach((x) => x.classList.toggle('active', x === b));
      setState({ paintTarget: b.dataset.target });
      g.setDefaultPaint();
    }));
    $('#btn-undo').onclick = () => { g.undo(); this._bump($('#btn-undo')); };
    $('#btn-wand').onclick = async () => { this._bump($('#btn-wand')); await g.autoFinish(); };
    const clear = async () => {
      const ok = await confirmModal({ title: 'Clear all track?', text: 'Every piece except the station will be removed. Decorations stay.', yes: 'Yes, clear it', danger: true });
      if (ok) g.clearTrack();
    };
    $('#btn-clear').onclick = clear; $('#btn-clear2').onclick = clear;
    $('#btn-paint-all').onclick = () => { g.paintAll(); this._bump($('#btn-paint-all')); };
    $('#btn-rotate').onclick = () => { g.decorRot = (g.decorRot + 1) % 4; audio.play('pop'); gsap.fromTo('#btn-rotate [data-icon]', { rotate: 0 }, { rotate: 360, duration: 0.5, ease: 'back.out' }); };

    // ride controls
    $('#btn-play').onclick = () => { g.ride.toggle(); audio.play('click'); };
    $('#btn-station').onclick = () => { g.ride.backToStation(); audio.play('bell'); };
    $('#btn-speed').onclick = () => {
      const opts = [1, 2, 0.5];
      this.speedIdx = (this.speedIdx + 1) % opts.length;
      g.ride.speedMul = opts[this.speedIdx];
      $('#btn-speed .lbl').textContent = opts[this.speedIdx] + 'x';
      audio.play('click');
    };
    $('#btn-cam').onclick = () => this.cycleCam();
    $('#btn-theme').onclick = () => themeModal(g);

    // camera tools
    $('#btn-compass').onclick = () => { g.rig.snapRotate(1); audio.play('click'); };
    $('#btn-zin').onclick = () => { g.rig.zoomBy(0.75); audio.play('click'); };
    $('#btn-zout').onclick = () => { g.rig.zoomBy(1.33); audio.play('click'); };
    $('#btn-home').onclick = () => { g.focusStation(); audio.play('click'); this._syncMode(); };
    $('#btn-daynight').onclick = () => {
      const order = ['day', 'sunset', 'night', 'morning'];
      const i = order.indexOf(state.dayPreset);
      g.sky.setPreset(order[(i + 1) % order.length]);
      audio.play('sparkle');
    };

    // top actions
    $('#btn-photo').onclick = () => this.enterPhoto();
    $('#btn-album').onclick = () => albumModal();
    $('#btn-badges').onclick = () => { $('#badge-dot').hidden = true; badgesModal(g); };
    $('#btn-share').onclick = () => shareModal(g, this);
    $('#btn-save').onclick = () => saveModal(g, this);
    $('#btn-settings').onclick = () => settingsModal(g, this);
    $('#btn-more').onclick = () => { $('.top-actions').classList.toggle('open'); audio.play('click'); };
    $$('.top-actions .icon-btn').forEach((b) => b.addEventListener('click', () => $('.top-actions').classList.remove('open')));
    $('#brand').onclick = () => menuModal(g, this);
    $('#ch-toggle').onclick = () => { $('#chapter').classList.toggle('collapsed'); audio.play('click'); };
    $('#chapter').addEventListener('click', (e) => { if (e.target.closest('#ch-toggle')) return; const ch = g.currentChapter; if (ch) this.wawa(ch.hint, [], 7000); });

    // Wawa dialog
    $('#wd-close').onclick = () => this.closeWawa();
    $('#wd-avatar').onclick = () => {
      audio.play('boing');
      mAnimate($('#wd-avatar'), { scaleY: [1, 0.8, 1.1, 1], scaleX: [1, 1.15, 0.95, 1] }, { duration: 0.6 });
      const lines = WAWA_LINES.click;
      this._wl = ((this._wl ?? -1) + 1) % lines.length;
      this.wawa(lines[this._wl], [], 5000);
    };

    // photo mode
    $('#pm-filters').innerHTML = FILTERS.map(([k, l]) => `<button data-f="${k}" class="${k === 'none' ? 'on' : ''}">${l}</button>`).join('');
    $$('#pm-filters button').forEach((b) => b.onclick = () => {
      $$('#pm-filters button').forEach((x) => x.classList.toggle('on', x === b));
      this.photoFilter = b.dataset.f; this._applyCanvasFilter(); audio.play('click');
    });
    $$('.pm-times button').forEach((b) => { b.innerHTML = icon(b.dataset.icon); b.onclick = () => { g.sky.setPreset(b.dataset.time); $$('.pm-times button').forEach((x) => x.classList.toggle('on', x === b)); audio.play('sparkle'); }; });
    $('#pm-close').onclick = () => this.exitPhoto();
    $('#pm-grid').onclick = () => { $('.vf-grid').classList.toggle('on'); audio.play('click'); };
    $('#pm-snap').onclick = () => this.snap();
    $('#pm-album').onclick = () => albumModal();

    // tooltips on HUD buttons
    $$('[data-tip]').forEach((b) => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { this.pointer.showTip(b.dataset.tip, ''); audio.play('hover'); } });
      b.addEventListener('pointerleave', () => this.pointer.showTip(null));
    });

    this._springify(document.getElementById('hud'));
    this._springify(document.getElementById('photo-mode'));
    this._bindBus();
    this._bindKeys();
    this._idleLoop();
  }

  _moveBlob() {
    const act = $('.mode-switch button.active');
    if (!act) return;
    const blob = $('#ms-blob');
    blob.style.left = act.offsetLeft + 'px';
    blob.style.width = act.offsetWidth + 'px';
  }

  setMode(mode) {
    const g = this.game;
    g.setMode(mode);
    this._syncMode();
    if (mode === 'ride') this.toasts.show({ title: 'Front row seat', text: 'Drag to look around. F switches camera.', ic: 'seat', key: 'ride' });
    if (mode === 'view') this.toasts.show({ title: 'View mode', text: 'Sit back. Click things in the world to see what they do.', ic: 'eye', key: 'view' });
  }

  _syncMode() {
    const mode = state.mode;
    $$('.mode-switch button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    this._moveBlob();
    const dock = $('#dock');
    const hide = mode !== 'build';
    if (dock.classList.contains('hide') !== hide) {
      dock.classList.toggle('hide', hide);
      gsap.killTweensOf(dock);
      if (hide) gsap.to(dock, { yPercent: 160, opacity: 0, duration: 0.45, ease: 'back.in(1.4)' });
      else gsap.to(dock, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)', clearProps: 'transform,opacity' });
    }
    $('#piece-tip').hidden = true;
    this._syncCamBtn();
    if (mode !== 'build') this.pointer.setTool(null); else this.pointer.setTool(state.tool);
  }

  cycleCam() {
    const g = this.game;
    audio.play('click');
    if (state.mode !== 'ride') { setState({ rideCam: 'first' }); this.setMode('ride'); g.setRideCam('first'); this._syncCamBtn(); return; }
    const order = ['first', 'follow'];
    const next = order[(order.indexOf(state.rideCam) + 1) % order.length];
    g.setRideCam(next);
    this._syncCamBtn();
  }

  _syncCamBtn() {
    const b = $('#btn-cam [data-icon]');
    const ic = state.mode === 'ride' ? (state.rideCam === 'first' ? 'follow' : 'seat') : 'seat';
    b.innerHTML = icon(ic);
    $('#btn-cam').dataset.tip = state.mode === 'ride' ? (state.rideCam === 'first' ? 'Chase camera (F)' : 'Front seat camera (F)') : 'Ride camera (F)';
  }

  setTool(tool) {
    audio.play('click');
    setState({ tool });
    $$('.tool-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    $$('.dock-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tool));
    const panel = $(`.dock-panel[data-panel="${tool}"]`);
    animeAnimate(panel.querySelectorAll('.piece, .swatch, .paint-targets button, .cat-tabs button, .erase-box, .dock-actions > *'), { translateY: [16, 0], opacity: [0, 1], delay: stagger(22), duration: 420, ease: 'outBack(1.8)' });
    this.pointer.setTool(tool);
    this.game.preview(null);
    this.game.view.setHighlight(null);
    if (tool === 'decor' && !this._decorHinted) { this._decorHinted = true; this.wawa('Pick something cozy, then click a free square on the lawn.', [], 5000); }
  }

  // ================================================================ dock content
  _renderPieces(animate) {
    const wrap = $('#pieces');
    const list = PIECE_ORDER.filter((k) => PIECES[k].cat === this.cat);
    wrap.innerHTML = list.map((k) => {
      const p = PIECES[k];
      return `<button class="piece" data-piece="${k}" aria-label="${p.name}">${p.key && /\d/.test(p.key) ? `<span class="pk">${p.key}</span>` : ''}<span class="pi">${icon(p.icon)}</span><span class="pn">${p.name}</span></button>`;
    }).join('');
    $$('.piece', wrap).forEach((b) => {
      const type = b.dataset.piece;
      let touchPreview = false;
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; this.game.preview(type); this._pieceTip(type); audio.play('hover'); });
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; this.game.preview(null); $('#piece-tip').hidden = true; });
      b.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { touchPreview = true; this.game.preview(type); this._pieceTip(type); } });
      b.addEventListener('click', () => {
        const r = this.game.place(type);
        if (r.ok) { this._pop(b); } else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
        if (touchPreview) { touchPreview = false; setTimeout(() => { this.game.preview(null); $('#piece-tip').hidden = true; }, 900); }
        else this._pieceTip(type);
      });
    });
    this._springify(wrap);
    this._refreshPieces();
    if (animate) animeAnimate(wrap.querySelectorAll('.piece'), { translateY: [20, 0], opacity: [0, 1], scale: [0.7, 1], delay: stagger(30), duration: 480, ease: 'outBack(2)' });
  }

  _refreshPieces() {
    const tr = this.game.track;
    $$('#pieces .piece').forEach((b) => {
      const ev = tr.evaluate(b.dataset.piece);
      b.classList.toggle('blocked', !ev.ok);
      b.classList.toggle('closes', !!(ev.ok && ev.closes));
      b.dataset.reason = ev.ok ? '' : ev.reason;
    });
    $('#btn-wand').classList.toggle('nudge', !tr.closed && tr.pieces.length > 14 && state.story && this.game.currentChapter?.id === 'ch2');
    $('#btn-play').classList.toggle('nudge', tr.closed && this.game.counts.laps === 0 && !this.game.ride.playing);
  }

  _pieceTip(type) {
    const p = PIECES[type];
    const ev = this.game.track.evaluate(type);
    $('#pt-name').textContent = p.name;
    $('#pt-desc').textContent = p.desc;
    const st = $('#pt-status');
    st.className = '';
    if (!ev.ok) { st.textContent = ev.reason; st.classList.add('bad'); }
    else if (ev.closes) { st.textContent = 'This one closes the loop!'; st.classList.add('gold'); }
    else st.textContent = p.key && /\d/.test(p.key) ? `Click to place. Shortcut ${p.key}` : 'Click to place';
    const tip = $('#piece-tip');
    if (tip.hidden) { tip.hidden = false; gsap.fromTo(tip, { y: 10, opacity: 0, xPercent: -50, x: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'back.out(2)' }); }
  }

  _renderSwatches() {
    const wrap = $('#swatches');
    wrap.innerHTML = SWATCHES.map((s, i) => `<button class="swatch ${i === state.paintColor ? 'active' : ''}" data-i="${i}" style="background:${hexToCss(s.hex)}" aria-label="${s.name}" data-tip="${s.name}"></button>`).join('');
    $$('.swatch', wrap).forEach((b) => {
      b.onclick = () => {
        setState({ paintColor: Number(b.dataset.i) });
        $$('.swatch', wrap).forEach((x) => x.classList.toggle('active', x === b));
        this.game.setDefaultPaint();
        audio.play('pop');
      };
      b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.pointer.showTip(b.dataset.tip, ''); });
      b.addEventListener('pointerleave', () => this.pointer.showTip(null));
    });
  }

  _renderDecor() {
    const wrap = $('#decor-list');
    wrap.innerHTML = DECOR_ORDER.map((k) => `<button class="piece decor ${k === state.decorType ? 'selected' : ''}" data-decor="${k}"><span class="pi">${icon(DECOR[k].icon)}</span><span class="pn">${DECOR[k].name}</span></button>`).join('');
    $$('.piece', wrap).forEach((b) => b.onclick = () => {
      setState({ decorType: b.dataset.decor });
      $$('.piece', wrap).forEach((x) => x.classList.toggle('selected', x === b));
      audio.play('pop');
      this._pop(b);
    });
  }

  // ================================================================ bus
  _bindBus() {
    const g = this.game;
    bus.on('track:changed', () => this._refreshPieces());
    bus.on('counts', () => this._refreshPieces());
    bus.on('build:error', (msg) => this.toasts.show({ title: 'Not quite', text: msg, kind: 'error', ic: 'info', key: msg }));
    bus.on('build:closed', () => this._bigWord('Full circle!'));
    bus.on('build:auto', (n) => this.toasts.show({ title: 'Magic wand', text: `Laying ${n} pieces back to the station.`, ic: 'wand' }));
    bus.on('build:erased', ({ removed }) => this.toasts.show({ title: `Removed ${removed.length} piece${removed.length > 1 ? 's' : ''}`, text: 'Changed your mind?', ic: 'erase', ms: 5000, action: { label: 'Undo', fn: () => g.restore(removed) } }));
    bus.on('hover', (h) => {
      if (!h) { this.pointer.setHover(false); this.pointer.showTip(null); return; }
      if (h.kind === 'thing') { this.pointer.setHover(true); this.pointer.showTip(h.name, h.hint); }
      else { this.pointer.setHover(true, h.name); this.pointer.showTip(null); }
    });
    bus.on('fx:say', ({ pos, text, ms = 2600, small, who }) => this.bubbles.add({ pos, text, ms, cls: (small ? 'small ' : '') + (who === 'wawa' ? 'wawa' : ''), rise: 0.8 }));
    bus.on('shout', (s) => this.bubbles.add({ pos: s.pos, text: s.text, ms: 1500, cls: 'shout' + (s.big ? ' big' : ''), rise: 2.2 }));
    bus.on('state:waaws', () => this._syncWaaw());
    bus.on('state:joy', () => { $('#joy-bar').style.width = Math.round(state.joy * 100) + '%'; this._applyCanvasFilter(); });
    bus.on('story:update', () => this._updateChapter());
    bus.on('story:complete', (d) => this._chapterDone(d));
    bus.on('story:finale', () => this._celebrate((done) => { this.confetti.rain(200); finaleModal(g, () => { done(); this.wawa('The park is yours now. I will be at the station if you need me.', [], 6000); }); }, 1800));
    bus.on('badge:unlock', (b) => { this.toasts.show({ title: `Badge: ${b.name}`, text: b.desc, ic: b.icon, kind: 'badge', ms: 3800 }); $('#badge-dot').hidden = false; });
    bus.on('ride:play', (on) => { $('#btn-play [data-icon]').innerHTML = icon(on ? 'pause' : 'play'); $('#btn-play').classList.toggle('playing', on); this._refreshPieces(); this._statsVisible(); });
    bus.on('ride:phase', () => this._statsVisible());
    bus.on('ride:rating', (r) => this._rating(r));
    bus.on('photo:ride', (p) => this.toasts.show({ title: 'On-ride photo', text: 'Saved to your album.', img: p.url, ms: 4200, action: { label: 'View', fn: () => viewPhoto(p) } }));
    bus.on('state:mode', () => this._statsVisible());
    bus.on('ui:modal', (el) => this._springify(el));
    bus.on('frame', (dt) => this._frame(dt));
    this.bubbles = new Bubbles($('#bubbles'), gfx.camera);
    ['pointerdown', 'keydown', 'wheel'].forEach((e) => window.addEventListener(e, () => { this.lastInput = performance.now(); }, { passive: true }));
  }

  _bindKeys() {
    const g = this.game;
    window.addEventListener('keydown', (e) => {
      if (!state.started) return;
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        if (closeTopModal()) return;
        if (state.mode === 'photo') { this.exitPhoto(); return; }
        if (state.mode !== 'build') { this.setMode('build'); return; }
        if (state.tool !== 'build') { this.setTool('build'); return; }
        this.closeWawa();
        return;
      }
      if (anyModal()) return;
      if (state.mode === 'photo') { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); this.snap(); } return; }
      const basics = ['straight', 'left', 'right', 'up', 'down', 'wideLeft', 'wideRight'];
      if (/^[1-7]$/.test(e.key) && state.mode === 'build' && state.tool === 'build') {
        const t = basics[Number(e.key) - 1];
        const r = g.place(t);
        const b = $(`.piece[data-piece="${t}"]`);
        if (b) r.ok ? this._pop(b) : (b.classList.remove('shake'), void b.offsetWidth, b.classList.add('shake'));
        return;
      }
      if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); if (state.mode === 'build') g.undo(); return; }
      if (e.code === 'Space') { e.preventDefault(); g.ride.toggle(); return; }
      const k = e.key.toLowerCase();
      if (k === 'p') this.enterPhoto();
      if (k === 'f') this.cycleCam();
      if (k === 'h') helpModal();
      if (k === 't') $('#btn-daynight').click();
      if (k === 'r' && state.tool === 'decor') $('#btn-rotate').click();
      if (k === 'b') this.setMode('build');
      if (k === 'v') this.setMode('view');
    });
  }

  // ================================================================ per frame
  _frame(dt) {
    const g = this.game;
    this.bubbles.update(dt);
    const deg = -g.rig.yaw * 180 / Math.PI;
    const needle = $('#btn-compass .needle');
    if (needle) needle.style.transform = `rotate(${deg}deg)`;
    const night = g.sky.night > 0.5;
    if (night !== this._night) { this._night = night; document.body.classList.toggle('is-night', night); $('#btn-daynight [data-icon]').innerHTML = icon(night ? 'moon' : 'sun'); }
    const sl = $('#speedlines');
    const fast = state.mode === 'ride' && state.rideCam === 'first' && g.ride.playing ? Math.min(0.75, Math.max(0, (Math.abs(g.ride.v) - 8) / 14)) : 0;
    this._sl = (this._sl || 0) + (fast - (this._sl || 0)) * Math.min(1, dt * 4);
    sl.style.opacity = this._sl.toFixed(3);
    this._statT = (this._statT || 0) + dt;
    if (this._statT > 0.1 && !$('#stats').hidden) {
      this._statT = 0;
      const r = g.ride;
      const kmh = r.speedKmh;
      $('#st-speed').textContent = Math.round(kmh);
      const arc = $('#gauge-arc');
      const len = 157;
      arc.setAttribute('stroke-dasharray', `${Math.min(1, kmh / 100) * len} 999`);
      const f = g.track.frameAt(r.s - g.train.length / 2, { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() });
      $('#st-height').textContent = Math.max(0, f.pos.y - BASE).toFixed(1) + ' m';
      $('#st-g').textContent = r.gVert.toFixed(1);
      $('#st-lap').textContent = r.lap.time.toFixed(1) + ' s';
      const piece = g.track.pieces[f.piece];
      let phase = 'Cruising';
      if (r.phase === 'waiting' || !r.playing) phase = r.playing ? 'Boarding' : 'Paused';
      else if (r.phase === 'arriving') phase = 'Welcome back';
      else if (piece?.def.flags.chain) phase = 'Click clack...';
      else if (f.up.y < 0) phase = 'Upside down!';
      else if (r.gVert < 0.4) phase = 'Airtime!';
      else if (f.tan.y < -0.3) phase = 'Here we go!';
      else if (kmh > 60) phase = 'Zooming';
      $('#st-phase').textContent = phase;
    }
  }

  _statsVisible() {
    const show = (state.mode === 'ride' || state.mode === 'view' || this.game.ride.playing) && state.mode !== 'photo';
    const el = $('#stats');
    if (show && el.hidden) { el.hidden = false; gsap.fromTo(el, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)', clearProps: 'transform' }); }
    if (!show && !el.hidden) gsap.to(el, { x: 60, opacity: 0, duration: 0.3, onComplete: () => { el.hidden = true; gsap.set(el, { clearProps: 'all' }); } });
  }

  _rating({ rating, lap }) {
    const el = $('#rating');
    el.hidden = false;
    $('#rt-exw').textContent = rating.excitementWord;
    $('#rt-inw').textContent = rating.intensityWord;
    $('#rt-naw').textContent = rating.nauseaWord;
    $('#rt-foot').textContent = `Top speed ${Math.round(lap.maxSpeed * 3.6)} km/h · Max ${lap.maxG.toFixed(1)} G · ${lap.shouts} shouts`;
    gsap.killTweensOf(el);
    gsap.fromTo(el, { y: -40, opacity: 0, scale: 0.9, xPercent: -50, x: 0 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' });
    [['#rt-ex', rating.excitement], ['#rt-in', rating.intensity], ['#rt-na', rating.nausea]].forEach(([s, v], i) => gsap.fromTo(s, { width: '0%' }, { width: v * 10 + '%', duration: 1, delay: 0.3 + i * 0.15, ease: 'power3.out' }));
    clearTimeout(this._rtT);
    this._rtT = setTimeout(() => gsap.to(el, { y: -30, opacity: 0, duration: 0.4, onComplete: () => { el.hidden = true; } }), 6500);
    if (rating.excitement >= 7) this.confetti.burst(innerWidth / 2, 160, 60);
  }

  _syncWaaw(instant) {
    const n = state.waaws;
    const el = $('#waaw-num');
    if (!el) return;
    const prev = Number(el.textContent) || 0;
    el.textContent = n;
    if (!instant && n > prev) {
      animeAnimate(el, { scale: [1.6, 1], rotate: [(Math.random() - 0.5) * 30, 0], duration: 600, ease: 'outElastic(1, .5)' });
      const plus = document.createElement('span');
      plus.className = 'wm-plus';
      plus.textContent = '+' + (n - prev);
      const r = $('#waaw').getBoundingClientRect();
      plus.style.left = r.left + 26 + 'px'; plus.style.top = r.bottom + 'px'; plus.style.position = 'fixed'; plus.style.zIndex = 50;
      document.body.appendChild(plus);
      gsap.fromTo(plus, { y: 0, opacity: 1, scale: 0.6 }, { y: 30, opacity: 0, scale: 1.2, duration: 1, ease: 'power2.out', onComplete: () => plus.remove() });
    }
    $('#joy-bar').style.width = Math.round(state.joy * 100) + '%';
  }

  _updateChapter() {
    const card = $('#chapter');
    if (!card) return;
    const g = this.game;
    if (!state.story) { card.hidden = true; return; }
    card.hidden = false;
    const ch = g.currentChapter;
    if (!ch) {
      $('#ch-num').textContent = 'Story complete';
      $('#ch-title').textContent = 'The valley sings again';
      $('#ch-goal').textContent = 'Keep building. The park is yours.';
      $('#ch-bar').style.width = '100%';
      $('#ch-label').textContent = `${CHAPTERS.length} / ${CHAPTERS.length} chapters`;
      card.classList.add('done');
      return;
    }
    const i = CHAPTERS.indexOf(ch);
    $('#ch-num').textContent = `Chapter ${i + 1} of ${CHAPTERS.length}`;
    if ($('#ch-title').textContent !== ch.title) {
      $('#ch-title').textContent = ch.title;
      card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    }
    $('#ch-goal').textContent = ch.goal;
    $('#ch-bar').style.width = Math.round(ch.progress(g) * 100) + '%';
    $('#ch-label').textContent = ch.label(g);
  }

  _chapterDone(d) {
    audio.play('fanfare');
    this.confetti.burst(innerWidth / 2, innerHeight * 0.6, 120, 1.2);
    setTimeout(() => this.confetti.rain(80), 300);
    this._updateChapter();
    if (d.unlock) this.toasts.show({ title: 'New train unlocked', text: d.chapter.reward, ic: 'coaster', kind: 'badge' });
    this._celebrate((done) => chapterModal(d, () => {
      this._updateChapter();
      done();
      if (d.next && !this._celebrations.length) setTimeout(() => this.wawa(d.next.intro, [{ label: 'Any tips?', fn: () => this.wawa(d.next.hint, [], 8000) }], 0), 500);
    }), 900);
  }

  /** Celebrations queue up so two chapters never stack their windows. */
  _celebrate(open, delay = 0) {
    this._celebrations = this._celebrations || [];
    this._celebrations.push(open);
    if (this._celebrating) return;
    const next = () => {
      const fn = this._celebrations.shift();
      if (!fn) { this._celebrating = false; return; }
      this._celebrating = true;
      setTimeout(() => fn(() => setTimeout(next, 400)), delay);
    };
    next();
  }

  _bigWord(text) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;top:40%;z-index:60;pointer-events:none;font:700 clamp(48px,10vw,120px)/1 Fredoka, sans-serif;color:#ffc94a;-webkit-text-stroke:6px #2a1f3d;paint-order:stroke fill;text-shadow:0 8px 0 #2a1f3d;white-space:nowrap;transform:translate(-50%,-50%)';
    el.innerHTML = [...text].map((c) => `<span style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    document.body.appendChild(el);
    const spans = el.querySelectorAll('span');
    const tl = createTimeline({ onComplete: () => el.remove() });
    tl.add(spans, { translateY: [80, 0], rotate: [() => (Math.random() - 0.5) * 60, 0], scale: [0.2, 1], opacity: [0, 1], delay: stagger(40), duration: 800, ease: 'outElastic(1, .6)' })
      .add(spans, { translateY: [0, -60], opacity: [1, 0], delay: stagger(25), duration: 400, ease: 'inBack(2)' }, '+=900');
    this.confetti.burst(innerWidth / 2, innerHeight * 0.45, 140, 1.4);
  }

  // ================================================================ Wawa dialog
  wawa(text, actions = [], ms = 6000) {
    const d = $('#wawa-dialog');
    const t = $('#wd-text');
    clearTimeout(this._wdT); clearInterval(this._typeT);
    const wasHidden = d.hidden;
    d.hidden = false;
    if (wasHidden) {
      gsap.fromTo('#wd-avatar', { y: 120, rotate: -20 }, { y: 0, rotate: 0, duration: 0.8, ease: 'elastic.out(1, 0.6)' });
      gsap.fromTo('.wd-bubble', { scale: 0.4, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: 0.5, delay: 0.2, ease: 'back.out(2)' });
    } else mAnimate('.wd-bubble', { scale: [0.94, 1] }, { type: 'spring', stiffness: 400, damping: 12 });
    const acts = $('#wd-actions');
    acts.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = 'btn small' + (a === actions[0] ? ' primary' : '');
      b.textContent = a.label;
      b.onclick = () => { audio.play('click'); a.fn(); };
      acts.appendChild(b);
    }
    this._springify(acts);
    // typewriter
    t.textContent = '';
    let i = 0;
    this._typeT = setInterval(() => {
      i += 1;
      t.textContent = text.slice(0, i);
      if (i % 3 === 0) audio.play('type');
      if (i >= text.length) clearInterval(this._typeT);
    }, 18);
    gsap.fromTo('#wd-avatar', { y: 0 }, { y: -10, duration: 0.15, yoyo: true, repeat: 3, ease: 'power1.inOut' });
    if (ms) this._wdT = setTimeout(() => this.closeWawa(), ms + text.length * 18);
  }

  closeWawa() {
    const d = $('#wawa-dialog');
    if (d.hidden) return;
    clearTimeout(this._wdT); clearInterval(this._typeT);
    gsap.to('.wd-bubble', { scale: 0.6, opacity: 0, duration: 0.25, ease: 'back.in(2)' });
    gsap.to('#wd-avatar', { y: 140, duration: 0.45, delay: 0.1, ease: 'back.in(1.6)', onComplete: () => { d.hidden = true; gsap.set(['.wd-bubble', '#wd-avatar'], { clearProps: 'all' }); } });
  }

  _idleLoop() {
    setInterval(() => {
      if (!state.started || anyModal() || state.mode === 'photo') return;
      const idle = performance.now() - this.lastInput;
      if (idle > 28000 && $('#wawa-dialog').hidden) {
        this.lastInput = performance.now();
        const g = this.game;
        let line = IDLE_NUDGES[Math.floor(Math.random() * IDLE_NUDGES.length)];
        if (g.track.closed && !g.ride.playing) line = 'The riders are getting restless. Press play!';
        else if (state.story && g.currentChapter) line = g.currentChapter.hint;
        this.wawa(line, [], 7000);
        if (state.mode === 'view') g.rig.autoOrbit = 0.04;
      }
    }, 4000);
  }

  // ================================================================ photo mode
  enterPhoto() {
    if (state.mode === 'photo') return;
    const g = this.game;
    this._prevMode = state.mode;
    if (state.mode === 'ride' && state.rideCam === 'first') { /* keep the POV camera */ }
    setState({ mode: 'photo' });
    g.view.showCursor(false);
    g.preview(null);
    audio.play('open');
    gsap.to('#hud', { opacity: 0, duration: 0.3, onComplete: () => { $('#hud').style.visibility = 'hidden'; } });
    const pm = $('#photo-mode');
    pm.hidden = false;
    gsap.fromTo('.vf i', { scale: 1.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(2)' });
    gsap.fromTo('.pm-bottom > *, .pm-top > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.8)' });
    $$('.pm-times button').forEach((b) => b.classList.toggle('on', b.dataset.time === state.dayPreset));
    this._applyCanvasFilter();
    if (!this._photoHinted) { this._photoHinted = true; this.toasts.show({ title: 'Photo mode', text: 'Frame your shot, pick a filter, then press the big red button.', ic: 'camera' }); }
  }

  exitPhoto() {
    if (state.mode !== 'photo') return;
    const g = this.game;
    const prev = this._prevMode || 'build';
    setState({ mode: prev });
    g.view.showCursor(prev === 'build');
    this.photoFilter = 'none';
    $$('#pm-filters button').forEach((x) => x.classList.toggle('on', x.dataset.f === 'none'));
    this._applyCanvasFilter();
    gsap.to('.pm-bottom, .pm-top', { y: 20, opacity: 0, duration: 0.25, onComplete: () => { $('#photo-mode').hidden = true; gsap.set('.pm-bottom, .pm-top', { clearProps: 'all' }); } });
    $('#hud').style.visibility = '';
    gsap.to('#hud', { opacity: 1, duration: 0.4 });
    audio.play('close');
    this._syncMode();
  }

  async snap() {
    const g = this.game;
    audio.play('shutter');
    flash($('#flash'));
    gsap.fromTo('.shutter i', { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const caption = $('#pm-caption').value.trim();
    const photo = await g.snapPhoto(this.photoFilter, caption);
    const card = document.createElement('div');
    card.className = 'polaroid';
    card.innerHTML = `<img src="${photo.url}" alt="Your photo"><div class="row"><button class="btn small primary" data-a="dl"><span data-icon="download"></span>Download</button><button class="btn small" data-a="more"><span data-icon="camera"></span>Keep shooting</button><button class="btn small" data-a="album"><span data-icon="album"></span>Album</button></div>`;
    fillIcons(card);
    document.body.appendChild(card);
    this._springify(card);
    gsap.fromTo(card, { scale: 0.3, rotate: -14, opacity: 0, xPercent: -50, yPercent: -50 }, { scale: 1, rotate: -3, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.6)' });
    const close = () => gsap.to(card, { y: 200, rotate: 10, opacity: 0, duration: 0.4, ease: 'back.in(1.5)', onComplete: () => card.remove() });
    card.querySelector('[data-a="dl"]').onclick = () => { const a = document.createElement('a'); a.href = photo.url; a.download = `waawer-${photo.id}.jpg`; a.click(); };
    card.querySelector('[data-a="more"]').onclick = close;
    card.querySelector('[data-a="album"]').onclick = () => { close(); albumModal(); };
    this.confetti.burst(innerWidth / 2, innerHeight / 2, 40);
  }

  _applyCanvasFilter() {
    const sat = 0.74 + state.joy * 0.32;
    const extra = state.mode === 'photo' ? (CSS_FILTERS[this.photoFilter] || '') : '';
    $('#scene').style.filter = `saturate(${sat.toFixed(2)}) ${extra}`.trim();
  }

  // ================================================================ micro interactions
  _springify(root) {
    if (!root) return;
    root.querySelectorAll('.btn, .icon-btn, .piece, .swatch, .tool-tabs button, .theme-card, .mode-switch button, .cat-tabs button, .link-btn').forEach((el) => {
      if (el.dataset.sp) return;
      el.dataset.sp = '1';
      mHover(el, () => {
        const rot = (Math.random() - 0.5) * 6;
        mAnimate(el, { scale: 1.07, rotate: rot }, { type: 'spring', stiffness: 520, damping: 14 });
        if (!el.matches('.piece')) audio.play('hover');
        return () => mAnimate(el, { scale: 1, rotate: 0 }, { type: 'spring', stiffness: 380, damping: 16 });
      });
      mPress(el, () => {
        mAnimate(el, { scale: 0.9, y: 3 }, { type: 'spring', stiffness: 700, damping: 20 });
        return () => { mAnimate(el, { scale: 1, y: 0 }, { type: 'spring', stiffness: 520, damping: 12 }); if (!el.matches('.piece')) audio.play('click'); };
      });
    });
  }

  _pop(el) {
    mAnimate(el, { scale: [1.18, 1], rotate: [(Math.random() - 0.5) * 16, 0] }, { type: 'spring', stiffness: 420, damping: 10 });
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('i');
      s.style.cssText = `position:fixed;z-index:55;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:9px;height:9px;border-radius:50%;background:${['#ff6b6b', '#ffc94a', '#5ed6b4', '#7cc6fe', '#b79cf2', '#ff9ec7'][i]};border:2px solid #2a1f3d;pointer-events:none`;
      document.body.appendChild(s);
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      gsap.to(s, { x: Math.cos(a) * 46, y: Math.sin(a) * 46 - 10, scale: 0.2, opacity: 0, duration: 0.6, ease: 'power3.out', onComplete: () => s.remove() });
    }
  }

  _bump(el) { mAnimate(el, { scale: [1.2, 1], rotate: [-10, 0] }, { type: 'spring', stiffness: 400, damping: 10 }); }
}
