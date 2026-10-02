// The conductor. Builds the valley, wires input to tools, runs the ride, tracks the story
// and keeps everything saved.
import * as THREE from 'three';
import gsap from 'gsap';
import { initRenderer, gfx, governor, applyTier, TIERS } from './core/renderer.js';
import { CameraRig } from './core/controls.js';
import { audio } from './core/audio.js';
import { bus } from './core/bus.js';
import { state, setState } from './core/state.js';
import { uTime, uWind, uNight } from './core/toon.js';
import { lsGet, lsSet, encodeShare, decodeShare, readHashCode, albumAdd } from './core/store.js';
import { SWATCHES, TRAIN_THEMES, hexToCss } from './core/palette.js';
import { Sky } from './world/sky.js';
import { buildWater } from './world/water.js';
import { buildTerrain, heightAt, PAD } from './world/terrain.js';
import { Nature } from './world/nature.js';
import { Village } from './world/village.js';
import { Station } from './world/station.js';
import { Mascot } from './world/mascot.js';
import { Animals } from './world/animals.js';
import { SkyLife } from './world/skylife.js';
import { Visitors } from './world/visitors.js';
import { Particles } from './world/particles.js';
import { pickInteractive, interactives } from './world/interact.js';
import { SpaceMap, Track } from './coaster/track.js';
import { TrackView } from './coaster/trackView.js';
import { Train, CAR_SPACING } from './coaster/train.js';
import { Ride, rateCoaster } from './coaster/ride.js';
import { Decor, DECOR } from './coaster/decor.js';
import { PIECES, T, H, BASE, GRID, cellCenter } from './coaster/pieces.js';
import { CHAPTERS, BADGES } from './ui/story.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.hover = null;
    this.time = 0;
    this.combo = 0; this.lastPlace = 0;
    this.counts = { pieces: 0, closed: false, laps: 0, maxLevel: 0, inversions: 0, waaws: 0, painted: false, decor: 0, photos: 0, animals: 0, colors: [], clicked: [], visitors: 0 };
    this.storyDone = [];
    this.badges = [];
    this.unlockedThemes = ['classic'];
    this.pendingRidePhoto = null;
    this.previewType = null;
    this.decorRot = 0;
    this.lastLap = null;
    this.paused = false;
  }

  async init(progress) {
    const P = async (p, label, fn) => { progress(p, label); await nextFrame(); fn(); };
    await P(0.04, 'Unfolding the sky', () => {
      initRenderer(this.canvas);
      this.gfx = gfx;
      this.rig = new CameraRig(gfx.camera, this.canvas);
      this.sky = new Sky(gfx);
    });
    await P(0.12, 'Filling the sea', () => { this.water = buildWater(gfx.scene); });
    await P(0.2, 'Raising the island', () => { this.terrain = buildTerrain(gfx.scene); });
    await P(0.32, 'Planting trees and flowers', () => { this.nature = new Nature(gfx.scene, gfx.tier); });
    await P(0.44, 'Painting the village', () => { this.village = new Village(gfx.scene); });
    await P(0.52, 'Polishing the station bell', () => {
      this.space = new SpaceMap();
      this.track = new Track(this.space);
      this.station = new Station(gfx.scene, this.track.start);
      this.mascot = new Mascot(gfx.scene, new THREE.Vector3(this.station.x0 + 1.4, 0.6, cellCenter(this.track.start.cj) + T * 0.95 - 0.6));
    });
    await P(0.6, 'Waking up the animals', () => { this.animals = new Animals(gfx.scene, this.village); });
    await P(0.68, 'Teaching birds to fly', () => { this.skylife = new SkyLife(gfx.scene); });
    await P(0.74, 'Inviting a few visitors', () => { this.visitors = new Visitors(gfx.scene); });
    await P(0.8, 'Sprinkling pollen', () => { this.particles = new Particles(gfx.scene, gfx.tier, gfx.camera); this._particleScale(); });
    await P(0.86, 'Laying the station track', () => {
      this.view = new TrackView(gfx.scene, this.track, this.space);
      this.train = new Train(gfx.scene, state.trainTheme, state.trainCars);
      this.ride = new Ride(this.track, this.train);
      this.decor = new Decor(gfx.scene, this.space);
      this.view.rebuildAll();
    });
    await P(0.92, 'Remembering your park', () => { this._restore(); });
    await P(0.97, 'Warming up the shaders', () => {
      this.rig.update(0.016);
      this.view.update(0.016, 0);
      gfx.renderer.compile(gfx.scene, gfx.camera);
      gfx.renderer.render(gfx.scene, gfx.camera);
    });
    this._bind();
    progress(1, 'Ready');
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _particleScale() { this.particles.setScale(window.innerHeight, gfx.renderer.getPixelRatio()); }

  // ------------------------------------------------------------------ bindings
  _bind() {
    bus.on('resize', () => this._particleScale());
    bus.on('tier', () => this._particleScale());
    bus.on('tap', (t) => this._tap(t));
    bus.on('ride:shout', (s) => this._onShout(s));
    bus.on('ride:lap', (l) => this._onLap(l));
    bus.on('ride:photo', (p) => { this.pendingRidePhoto = p; });
    bus.on('ride:bump', () => { audio.play('clunk'); this.rig.addShake(0.4); });
    bus.on('ride:dispatch', () => { this.visitors.cheerAll(); });
    bus.on('state:timeOfDay', () => {});
    for (const k of ['cloud', 'tree', 'windmill', 'wish', 'whale', 'plane', 'bird', 'visitor', 'wawa']) bus.on('stat:' + k, () => this._stat(k));
    bus.on('stat:animal', () => { this.counts.animals++; this._stat('animal'); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this._last = performance.now(); });
  }

  _stat(kind) {
    if (kind === 'cloud') this.badge('rain');
    if (kind === 'whale') this.badge('whale');
    if (kind === 'plane') this.badge('air');
    if (kind === 'wish') this.badge('wish');
    if (kind === 'animal' && this.counts.animals >= 10) this.badge('friend');
    this._autosave();
  }

  // ------------------------------------------------------------------ restore and save
  _restore() {
    const settings = lsGet('settings');
    if (settings) setState({ sound: settings.sound ?? true, music: settings.music ?? true, quality: settings.quality || 'auto', trainCars: settings.cars || 3 });
    if (state.quality !== 'auto' && TIERS[state.quality]) applyTier(state.quality);
    const save = lsGet('auto');
    this.hasSave = !!(save && save.track && save.track.p && save.track.p.length);
    this.savedData = save;
    const code = readHashCode();
    this.sharedCode = code && decodeShare(code) ? code : null;
  }

  /** Load progress and park from the autosave. */
  continueSave() {
    const s = this.savedData;
    if (!s) return;
    this.loadPark(s);
    this.counts = Object.assign(this.counts, s.counts || {});
    this.storyDone = s.story || [];
    this.badges = s.badges || [];
    this.unlockedThemes = s.themes || ['classic'];
    setState({ story: s.storyMode ?? true, timeOfDay: s.time ?? state.timeOfDay, waaws: this.counts.waaws });
    if (s.theme && this.unlockedThemes.includes(s.theme)) this.setTheme(s.theme, false);
    this._refreshCounts();
    this._updateJoy(true);
    bus.emit('story:update');
  }

  newPark(storyMode) {
    this.track.reset();
    this.decor.clear();
    this.view.rebuildAll();
    this.ride.backToStation();
    this.counts = { pieces: 0, closed: false, laps: 0, maxLevel: 0, inversions: 0, waaws: 0, painted: false, decor: 0, photos: 0, animals: 0, colors: [], clicked: [], visitors: 0 };
    this.storyDone = [];
    this.badges = this.savedData?.badges || [];
    this.unlockedThemes = storyMode ? ['classic'] : Object.keys(TRAIN_THEMES);
    setState({ story: storyMode, waaws: 0 });
    this.setTheme('classic', false);
    this._updateJoy(true);
    this._autosave(true);
    bus.emit('story:update');
  }

  loadPark(data) {
    this.track.load(data.track);
    this.decor.load(data.decor || []);
    this.view.rebuildAll();
    this.ride.backToStation();
    this._refreshCounts();
    bus.emit('track:changed', { load: true });
  }

  loadShared(code) {
    const d = decodeShare(code);
    if (!d) return false;
    this.loadPark({ track: d.track, decor: d.decor });
    this._autosave(true);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return true;
  }

  snapshot() {
    return {
      v: 1, track: this.track.serialize(), decor: this.decor.serialize(), counts: this.counts, story: this.storyDone, storyMode: state.story,
      badges: this.badges, themes: this.unlockedThemes, theme: state.trainTheme, time: state.timeOfDay, date: Date.now(),
    };
  }

  _autosave(now = false) {
    clearTimeout(this._saveT);
    const go = () => { lsSet('auto', this.snapshot()); lsSet('settings', { sound: state.sound, music: state.music, quality: state.quality, cars: state.trainCars }); bus.emit('saved'); };
    if (now) go(); else this._saveT = setTimeout(go, 700);
  }

  saveSlot(i, name) {
    const thumb = this.capture({ w: 320, h: 200, frame: false, quality: 0.7 });
    lsSet('slot' + i, { name: name || `Park ${i + 1}`, date: Date.now(), thumb, data: this.snapshot() });
    audio.play('achieve');
  }

  loadSlot(i) {
    const s = lsGet('slot' + i);
    if (!s) return false;
    this.loadPark(s.data);
    this._autosave(true);
    return true;
  }

  shareCode() { return encodeShare(this.track.serialize(), this.decor.serialize()); }

  // ------------------------------------------------------------------ building
  preview(type) {
    this.previewType = type;
    if (!type) { this.view.setGhost(null); bus.emit('build:preview', null); return; }
    const ev = this.track.evaluate(type);
    this.view.setGhost(ev, type);
    bus.emit('build:preview', ev);
  }

  place(type, opts = {}) {
    const res = this.track.add(type, { ...this.track.defaultColors });
    if (!res.ok) {
      audio.play('error');
      bus.emit('build:error', res.reason);
      return res;
    }
    const now = performance.now();
    this.combo = now - this.lastPlace < 1300 ? Math.min(this.combo + 1, 12) : 0;
    this.lastPlace = now;
    audio.play('place', { pitch: 1 + this.combo * 0.05 });
    this.view.onAdd(res.piece, true);
    const sm = res.piece.samples, mid = Math.floor(sm.n / 2);
    const p = new THREE.Vector3(sm.pos[mid * 3], sm.pos[mid * 3 + 1], sm.pos[mid * 3 + 2]);
    setTimeout(() => this.particles.burst(new THREE.Vector3(p.x, Math.max(0.3, p.y - 0.6), p.z), p.y < 2 ? 'dust' : 'sparkle', 10), 420);
    if (!opts.silent) this._keepInView(this.track.end);
    this._refreshCounts();
    this._badgesForPiece(type);
    if (res.closes) this._onClosed(opts.auto);
    bus.emit('track:changed', { added: res.piece });
    if (this.previewType && !opts.auto) this.preview(this.previewType);
    this._autosave();
    return res;
  }

  undo() {
    const p = this.track.undo();
    if (!p) { audio.play('error'); bus.emit('build:error', 'Only the station is left. It stays.'); return; }
    audio.play('undo');
    this.view.onRemove([p], true);
    this._refreshCounts();
    bus.emit('track:changed', { removed: [p] });
    if (this.previewType) this.preview(this.previewType);
    this._autosave();
  }

  eraseFrom(idx) {
    if (idx < 1) return;
    const removed = this.track.truncate(idx);
    if (!removed.length) return;
    audio.play('erase');
    this.view.onRemove(removed, true);
    this._refreshCounts();
    bus.emit('track:changed', { removed });
    bus.emit('build:erased', { removed: removed.map((p) => ({ type: p.type, colors: { ...p.colors } })) });
    this._autosave();
  }

  restore(list) {
    for (const r of list) {
      const res = this.track.add(r.type, r.colors);
      if (!res.ok) break;
      this.view.onAdd(res.piece, false);
    }
    audio.play('place', { pitch: 1.2 });
    this._refreshCounts();
    bus.emit('track:changed', {});
    this._autosave();
  }

  clearTrack() {
    const removed = this.track.truncate(1);
    this.view.onRemove(removed, true);
    this.ride.backToStation();
    audio.play('erase');
    this._refreshCounts();
    bus.emit('track:changed', { removed });
    this._autosave();
  }

  async autoFinish() {
    if (this.track.closed) { bus.emit('build:error', 'Your circuit is already complete.'); return false; }
    const path = this.track.autoFinish();
    if (!path) { audio.play('error'); bus.emit('build:error', 'The wand could not find a clean way home. Try undoing a few pieces.'); return false; }
    this.autoBuilding = true;
    audio.play('sparkle');
    bus.emit('build:auto', path.length);
    for (const t of path) {
      const r = this.place(t, { auto: true, silent: true });
      if (!r.ok) break;
      await new Promise((res) => setTimeout(res, 110));
    }
    this.autoBuilding = false;
    if (this.track.closed) this.badge('helper');
    return this.track.closed;
  }

  paintPiece(idx) {
    const p = this.track.pieces[idx];
    if (!p) return;
    const c = state.paintColor;
    const target = state.paintTarget;
    const patch = target === 'all' ? { rail: c, spine: c, support: c } : { [target]: c };
    Object.assign(p.colors, patch);
    this.track.version++;
    this.view.onRecolor(p);
    audio.play('paint');
    this._painted(c);
    bus.emit('track:changed', { painted: idx });
  }

  paintAll() {
    const c = state.paintColor, target = state.paintTarget;
    const patch = target === 'all' ? { rail: c, spine: c, support: c } : { [target]: c };
    this.track.pieces.forEach((p, i) => {
      setTimeout(() => { Object.assign(p.colors, patch); this.view.onRecolor(p); if (i % 3 === 0) audio.play('pop'); }, i * 18);
    });
    Object.assign(this.track.defaultColors, patch);
    this._painted(c);
    audio.play('paint');
    setTimeout(() => this._autosave(), this.track.pieces.length * 18 + 50);
  }

  /** New pieces use the chosen color too. */
  setDefaultPaint() {
    const c = state.paintColor, target = state.paintTarget;
    if (target === 'all') Object.assign(this.track.defaultColors, { rail: c, spine: c, support: c });
    else this.track.defaultColors[target] = c;
  }

  _painted(c) {
    this.counts.painted = true;
    if (!this.counts.colors.includes(c)) this.counts.colors.push(c);
    if (this.counts.colors.length >= 6) this.badge('rainbow');
    this._checkStory();
    this._autosave();
  }

  placeDecor(type, i, j) {
    const ex = this.decor.at(i, j);
    if (ex) {
      ex.rot = (ex.rot + 1) % 4;
      gsap.to(ex.root.rotation, { y: ex.rot * Math.PI / 2, duration: 0.5, ease: 'back.out(2)' });
      audio.play('pop');
      this._autosave();
      return;
    }
    const r = this.decor.place(type, i, j, this.decorRot);
    if (!r.ok) { audio.play('error'); bus.emit('build:error', r.reason); return; }
    audio.play('place', { pitch: 1.3 });
    this.particles.burst(new THREE.Vector3(cellCenter(i), 0.5, cellCenter(j)), 'leaves', 10);
    this.counts.decor = this.decor.items.length;
    if (this.counts.decor >= 15) this.badge('decor');
    this._checkStory();
    this._autosave();
    bus.emit('decor:changed');
  }

  removeDecor(item) {
    this.decor.remove(item);
    audio.play('erase');
    this.counts.decor = this.decor.items.length;
    this._autosave();
    bus.emit('decor:changed');
  }

  _keepInView(st) {
    const x = cellCenter(st.ci), z = cellCenter(st.cj), y = BASE + st.level * H;
    const v = new THREE.Vector3(x, y, z).project(gfx.camera);
    if (Math.abs(v.x) > 0.62 || Math.abs(v.y) > 0.55 || v.z > 1) {
      const g = this.rig.goalTarget;
      this.rig.flyTo({ target: new THREE.Vector3(g.x + (x - g.x) * 0.7, Math.min(y * 0.5, 8), g.z + (z - g.z) * 0.7) }, 0.9, 'power2.out');
    }
  }

  _badgesForPiece(type) {
    if (this.counts.pieces >= 1) this.badge('first');
    if (type === 'lift') this.badge('lift');
    if (type === 'loop') this.badge('loop');
    if (type === 'twist') this.badge('twist');
    if (type === 'tunnel') this.badge('tunnel');
    if (this.counts.maxLevel >= 12) this.badge('sky');
    if (this.counts.pieces >= 80) this.badge('long');
  }

  _onClosed(auto) {
    audio.play('fanfare');
    setTimeout(() => audio.play('confetti'), 200);
    bus.emit('build:closed');
    bus.emit('mascot:celebrate');
    this.visitors.cheerAll();
    // swoop the camera out to admire the whole circuit
    const box = new THREE.Box3();
    for (const p of this.track.pieces) { const sm = p.samples; for (let k = 0; k <= sm.n; k += 4) box.expandByPoint(new THREE.Vector3(sm.pos[k * 3], sm.pos[k * 3 + 1], sm.pos[k * 3 + 2])); }
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const dist = clamp(Math.max(size.x, size.z) * 1.4 + 20, 40, 140);
    this.rig.flyTo({ target: new THREE.Vector3(c.x, 0, c.z), dist, pitch: 0.75, yaw: this.rig.goalYaw + 0.6 }, 2.2);
    for (let k = 0; k < 5; k++) setTimeout(() => this.particles.burst(new THREE.Vector3(c.x + (Math.random() - 0.5) * size.x, 4 + Math.random() * 6, c.z + (Math.random() - 0.5) * size.z), 'confetti', 40), k * 160);
  }

  // ------------------------------------------------------------------ counts, story, badges
  _refreshCounts() {
    const st = this.track.stats();
    this.counts.pieces = st.pieces;
    this.counts.closed = st.closed;
    this.counts.maxLevel = Math.round(st.maxY / H);
    this.counts.inversions = st.inversions;
    this.counts.decor = this.decor.items.length;
    this.trackStats = st;
    this._checkStory();
    bus.emit('counts', this.counts);
  }

  get currentChapter() {
    return CHAPTERS.find((c) => !this.storyDone.includes(c.id)) || null;
  }

  _checkStory() {
    if (!state.story) return;
    const ch = this.currentChapter;
    if (!ch) return;
    bus.emit('story:update');
    if (ch.progress(this) >= 1) {
      this.storyDone.push(ch.id);
      const unlock = { ch2: 'bee', ch4: 'rocket', ch5: 'melon', ch7: 'midnight' }[ch.id];
      if (unlock && !this.unlockedThemes.includes(unlock)) this.unlockedThemes.push(unlock);
      this._updateJoy();
      bus.emit('story:complete', { chapter: ch, unlock, next: this.currentChapter });
      bus.emit('mascot:celebrate');
      if (!this.currentChapter) setTimeout(() => this.finale(), 2600);
      this._autosave();
      // a finished chapter can immediately satisfy the next one
      setTimeout(() => this._checkStory(), 2500);
    }
  }

  finale() {
    bus.emit('story:finale');
    bus.emit('plane:banner', 'The valley says WAAW!');
    this.particles.show(10, new THREE.Vector3(0, 0, 0));
    if (state.timeOfDay < 0.8 && state.timeOfDay > 0.2) this.sky.setPreset('night');
    setTimeout(() => this.particles.show(10, new THREE.Vector3(0, 0, 0)), 4200);
  }

  _updateJoy(instant) {
    const joy = state.story ? this.storyDone.length / CHAPTERS.length : 1;
    if (instant) setState({ joy }); else gsap.to({ j: state.joy }, { j: joy, duration: 3, onUpdate() { setState({ joy: this.targets()[0].j }); } });
  }

  badge(id) {
    if (this.badges.includes(id)) return;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    this.badges.push(id);
    audio.play('achieve');
    bus.emit('badge:unlock', b);
    this._autosave();
  }

  _onShout(s) {
    bus.emit('shout', s);
    if (s.counts) {
      this.counts.waaws += s.amount || 1;
      setState({ waaws: this.counts.waaws });
      audio.play(s.kind === 'airtime' ? 'whee' : 'waaw', { n: s.big ? 3 : 2 });
      if (this.counts.waaws >= 300) this.badge('loud');
      this._checkStory();
    }
  }

  _onLap(lap) {
    this.counts.laps++;
    const rating = rateCoaster(this.track.stats(), lap);
    this.lastLap = { lap, rating };
    bus.emit('ride:rating', this.lastLap);
    if (lap.maxSpeed * 3.6 >= 70) this.badge('speed');
    if (lap.airtime >= 1.5) this.badge('float');
    if (rating.excitement >= 8) this.badge('legend');
    if (this.sky.night > 0.6) {
      this.badge('night');
      this.particles.show(3, this.ride.headPos.clone());
    }
    this._checkStory();
    this._autosave();
  }

  // ------------------------------------------------------------------ taps and hover
  _ray(ndc) {
    this.raycaster.setFromCamera(ndc, gfx.camera);
    return this.raycaster.ray;
  }

  _groundCell(ray) {
    if (Math.abs(ray.direction.y) < 1e-4) return null;
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) return null;
    const p = ray.origin.clone().addScaledVector(ray.direction, t);
    return { p, i: Math.floor(p.x / T), j: Math.floor(p.z / T), onBoard: Math.abs(p.x) < PAD && Math.abs(p.z) < PAD };
  }

  _terrainHit(ray) {
    let prev = 0;
    for (let t = 1; t < 500; t += t < 60 ? 0.8 : 2.5) {
      const p = ray.origin.clone().addScaledVector(ray.direction, t);
      const h = Math.max(heightAt(p.x, p.z), -0.6);
      if (p.y <= h) return { p: p.setY(h), water: h <= -0.59 };
      prev = t;
    }
    return null;
  }

  _tap(t) {
    if (!state.started || state.mode === 'photo') return;
    const ray = this._ray(t.ndc);
    if (state.mode === 'ride' && state.rideCam === 'first') return;
    if (state.mode === 'build') {
      if (state.tool === 'erase') {
        const hit = this.track.pick(ray);
        const dhit = pickInteractive(ray);
        if (dhit && dhit.it.decorItem && (!hit || dhit.t < hit.along)) { this.removeDecor(dhit.it.decorItem); return; }
        if (hit && hit.index >= 1) { this.eraseFrom(hit.index); return; }
      }
      if (state.tool === 'paint') {
        const hit = this.track.pick(ray);
        if (hit) { this.paintPiece(hit.index); return; }
      }
      if (state.tool === 'decor') {
        const g = this._groundCell(ray);
        if (g && g.onBoard) { this.placeDecor(state.decorType, g.i, g.j); return; }
      }
    }
    const hit = pickInteractive(ray);
    if (hit) {
      hit.it.onClick?.(hit);
      bus.emit('world:click', hit.it);
      if (!this.counts.clicked.includes(hit.it.name)) {
        this.counts.clicked.push(hit.it.name);
        if (this.counts.clicked.length >= 20) this.badge('tour');
      }
      return;
    }
    const g = this._terrainHit(ray);
    if (g) {
      if (g.water) { this.particles.burst(g.p.clone().setY(-0.5), 'splash', 12); this.particles.burst(g.p.clone().setY(-0.5), 'ripple', 1); audio.play('plop'); }
      else { this.particles.burst(g.p.clone().setY(g.p.y + 0.2), Math.random() < 0.5 ? 'petals' : 'leaves', 9); audio.play('pop'); }
    }
  }

  _hoverTick() {
    const rig = this.rig;
    let hover = null;
    if (rig.hasPointer && !rig.drag && state.started && state.mode !== 'photo') {
      const ray = this._ray(rig.ndc);
      if (state.mode === 'build' && (state.tool === 'erase' || state.tool === 'paint')) {
        const hit = this.track.pick(ray);
        const dhit = state.tool === 'erase' ? pickInteractive(ray) : null;
        if (dhit && dhit.it.decorItem && (!hit || dhit.t < hit.along)) hover = { kind: 'decor', item: dhit.it.decorItem, name: 'Remove ' + dhit.it.name.toLowerCase() };
        else if (hit && (state.tool === 'paint' || hit.index >= 1)) hover = { kind: 'piece', index: hit.index, name: state.tool === 'erase' ? (this.track.pieces.length - hit.index > 1 ? `Remove ${this.track.pieces.length - hit.index} pieces` : 'Remove this piece') : 'Paint ' + this.track.pieces[hit.index].def.name.toLowerCase() };
      } else if (state.mode === 'build' && state.tool === 'decor') {
        const g = this._groundCell(ray);
        if (g && g.onBoard) {
          const ex = this.decor.at(g.i, g.j);
          const ok = ex ? { ok: true } : this.decor.canPlace(state.decorType, g.i, g.j);
          hover = { kind: 'cell', i: g.i, j: g.j, ok: ok.ok, name: ex ? 'Rotate ' + DECOR[ex.type].name.toLowerCase() : ok.ok ? 'Place ' + DECOR[state.decorType].name.toLowerCase() : ok.reason, existing: !!ex };
        }
      }
      if (!hover && !(state.mode === 'ride' && state.rideCam === 'first')) {
        const hit = pickInteractive(ray);
        if (hit) hover = { kind: 'thing', it: hit.it, name: hit.it.name, hint: hit.it.hint };
      }
    }
    // apply visuals
    const key = hover ? `${hover.kind}:${hover.index ?? ''}:${hover.i ?? ''},${hover.j ?? ''}:${hover.it?.id ?? ''}:${hover.item?.id ?? ''}:${hover.ok}` : '';
    if (key !== this._hoverKey) {
      this._hoverKey = key;
      if (hover?.kind === 'piece') {
        const idxs = state.tool === 'erase' ? Array.from({ length: this.track.pieces.length - hover.index }, (_, k) => hover.index + k) : [hover.index];
        this.view.setHighlight(idxs, state.tool === 'erase' ? 0xff5d73 : SWATCHES[state.paintColor].hex);
      } else this.view.setHighlight(null);
      if (hover?.kind === 'thing' || hover?.kind === 'decor') audio.play('hover');
      bus.emit('hover', hover);
    }
    if (state.mode === 'build' && state.tool === 'decor' && hover?.kind === 'cell') this.decor.setGhost(hover.existing ? null : state.decorType, hover.i, hover.j, this.decorRot, hover.ok);
    else this.decor.setGhost(null);
    this.hover = hover;
  }

  // ------------------------------------------------------------------ modes and cameras
  setMode(mode) {
    const prev = state.mode;
    if (prev === mode) return;
    setState({ mode });
    this.view.showCursor(mode === 'build');
    this.preview(null);
    this.view.setHighlight(null);
    this.rig.autoOrbit = 0;
    gsap.to(this.terrain.board.grid.material, { opacity: mode === 'build' ? 0.28 : 0, duration: 0.6 });
    if (mode === 'ride') {
      this.ride.play();
      this.setRideCam(state.rideCam === 'orbit' ? 'follow' : state.rideCam);
    } else {
      this.setRideCam('orbit');
      gfx.camera.up.set(0, 1, 0);
      gsap.to(gfx.camera, { fov: 38, duration: 0.8, onUpdate: () => gfx.camera.updateProjectionMatrix() });
    }
    if (mode === 'view') { this.rig.autoOrbit = 0.04; this.ride.play(); }
  }

  setRideCam(kind) {
    setState({ rideCam: kind });
    const cam = gfx.camera;
    if (kind === 'orbit') { this.rig.custom = null; cam.up.set(0, 1, 0); return; }
    const f = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    const f2 = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    const smUp = new THREE.Vector3(0, 1, 0);
    const smLook = new THREE.Vector3();
    const look = { yaw: 0, pitch: 0 };
    let init = false;
    const startPos = cam.position.clone();
    let blend = 0;
    if (kind === 'first') {
      this.rig.custom = {
        onDrag: (dx, dy) => { look.yaw = clamp(look.yaw - dx * 0.006, -1.6, 1.6); look.pitch = clamp(look.pitch - dy * 0.005, -0.8, 0.6); },
        onWheel: () => {},
        update: (c, dt) => {
          const s = this.ride.s - CAR_SPACING * 0.5 + 0.3;
          this.track.frameAt(s, f);
          this.track.frameAt(s + 3.2, f2);
          smUp.lerp(f.up, 1 - Math.exp(-dt * 8)).normalize();
          const eye = f.pos.clone().addScaledVector(f.up, 1.45);
          const tgt = f2.pos.clone().addScaledVector(f2.up, 1.2);
          if (!init) { smLook.copy(tgt); init = true; }
          smLook.lerp(tgt, 1 - Math.exp(-dt * 10));
          blend = Math.min(1, blend + dt * 1.5);
          const e = blend < 1 ? 1 - Math.pow(1 - blend, 3) : 1;
          c.position.lerpVectors(startPos, eye, e);
          c.up.copy(smUp);
          c.lookAt(smLook);
          c.rotateY(look.yaw);
          c.rotateX(look.pitch);
          if (!this.rig.drag) { look.yaw *= Math.exp(-dt * 0.8); look.pitch *= Math.exp(-dt * 0.8); }
          const fov = 64 + Math.min(26, Math.abs(this.ride.v) * 1.0);
          c.fov += (fov - c.fov) * (1 - Math.exp(-dt * 3));
          c.updateProjectionMatrix();
          if (this.ride.playing && Math.abs(this.ride.v) > 12 && !state.reducedMotion) {
            const k = (Math.abs(this.ride.v) - 12) * 0.0025;
            c.position.x += (Math.random() - 0.5) * k; c.position.y += (Math.random() - 0.5) * k;
          }
          this.rig.target.copy(f.pos); this.rig.goalTarget.copy(f.pos);
        },
      };
    } else if (kind === 'follow') {
      let orbit = 0, zoom = 1;
      const smPos = cam.position.clone();
      const smTan = new THREE.Vector3(1, 0, 0);
      this.rig.custom = {
        onDrag: (dx) => { orbit -= dx * 0.008; },
        onWheel: (d) => { zoom = clamp(zoom * Math.exp(d * 0.001), 0.5, 2.5); },
        update: (c, dt) => {
          const mid = Math.floor(this.train.count / 2);
          const center = this.train.cars[mid].root.position;
          this.track.frameAt(this.ride.s - this.train.length / 2, f);
          const flat = new THREE.Vector3(f.tan.x, 0, f.tan.z);
          if (flat.lengthSq() > 0.01) smTan.lerp(flat.normalize(), 1 - Math.exp(-dt * 1.6)).normalize();
          const dir = smTan.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
          const desired = center.clone().addScaledVector(dir, -13 * zoom).add(new THREE.Vector3(0, 8.5 * zoom, 0));
          desired.y = Math.max(desired.y, heightAt(desired.x, desired.z) + 1.5);
          smPos.lerp(desired, 1 - Math.exp(-dt * 3.2));
          c.position.copy(smPos);
          c.up.set(0, 1, 0);
          c.lookAt(center.clone().addScaledVector(smTan, 3).add(new THREE.Vector3(0, 0.4, 0)));
          c.fov += (46 - c.fov) * (1 - Math.exp(-dt * 3));
          c.updateProjectionMatrix();
          this.rig.target.copy(center); this.rig.goalTarget.copy(center);
        },
      };
    }
  }

  focusStation() {
    this.setMode('build');
    this.rig.flyTo({ target: new THREE.Vector3(-2, 0, 30), dist: 46 * (innerWidth / innerHeight < 1 ? 1.6 : 1), pitch: 0.6, yaw: 0.35 }, 1.4);
  }

  setTheme(name, sound = true) {
    if (!this.unlockedThemes.includes(name)) return false;
    setState({ trainTheme: name });
    this.train.build(name, state.trainCars);
    this.ride.place();
    if (sound) { audio.play('sparkle'); this.particles.burst(this.train.cars[0].root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 'sparkle', 24); }
    this._autosave();
    return true;
  }

  setCars(n) {
    setState({ trainCars: clamp(n, 1, 5) });
    this.train.build(state.trainTheme, state.trainCars);
    this.ride.backToStation();
    this._autosave();
  }

  // ------------------------------------------------------------------ photos
  _hideHelpers(fn) {
    const objs = [this.view.ghost, this.view.cursor, this.terrain.board.grid, this.view.hl, this.decor.ghost].filter(Boolean);
    const vis = objs.map((o) => o.visible);
    objs.forEach((o) => (o.visible = false));
    try { return fn(); } finally { objs.forEach((o, i) => (o.visible = vis[i])); }
  }

  /** Render the current view to an image. */
  capture({ w, h, frame = true, filter = 'none', caption = '', camera = null, quality = 0.92 } = {}) {
    const r = gfx.renderer;
    const cam = camera || gfx.camera;
    const src = this._hideHelpers(() => { r.render(gfx.scene, cam); return r.domElement; });
    const sw = src.width, sh = src.height;
    const W = w || sw, Hh = h || sh;
    const pad = frame ? Math.round(Math.min(W, Hh) * 0.045) : 0;
    const bottom = frame ? Math.round(Math.min(W, Hh) * 0.16) : 0;
    const cv = document.createElement('canvas');
    cv.width = W + pad * 2; cv.height = Hh + pad + bottom + (frame ? pad : 0);
    const g = cv.getContext('2d');
    if (frame) { g.fillStyle = '#fff8ec'; g.fillRect(0, 0, cv.width, cv.height); }
    const filters = { none: 'none', warm: 'sepia(0.25) saturate(1.3) brightness(1.05)', dream: 'saturate(1.4) brightness(1.08) contrast(0.92) hue-rotate(-8deg)', retro: 'sepia(0.55) contrast(1.1) saturate(0.9)', mono: 'grayscale(1) contrast(1.15)', pop: 'saturate(1.8) contrast(1.1)', night: 'hue-rotate(200deg) saturate(1.2) brightness(0.9)' };
    g.filter = filters[filter] || 'none';
    // cover crop the source into the target
    const sr = sw / sh, tr = W / Hh;
    let cx = 0, cy = 0, cw = sw, ch = sh;
    if (sr > tr) { cw = sh * tr; cx = (sw - cw) / 2; } else { ch = sw / tr; cy = (sh - ch) / 2; }
    g.drawImage(src, cx, cy, cw, ch, pad, pad, W, Hh);
    g.filter = 'none';
    if (frame) {
      g.strokeStyle = 'rgba(42,31,61,0.9)'; g.lineWidth = Math.max(2, W * 0.003);
      g.strokeRect(pad, pad, W, Hh);
      const fs = Math.round(bottom * 0.34);
      g.fillStyle = '#2a1f3d';
      g.font = `700 ${fs}px Fredoka, Nunito, sans-serif`;
      g.textBaseline = 'middle';
      g.fillText(caption || 'WAAWer Coaster', pad, Hh + pad + bottom * 0.5);
      g.font = `600 ${Math.round(fs * 0.6)}px Nunito, sans-serif`;
      g.fillStyle = '#7a6b8f';
      const d = new Date();
      const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      g.textAlign = 'right';
      g.fillText(`${date}  ·  ${this.counts.waaws} WAAWs`, pad + W, Hh + pad + bottom * 0.5);
      // stamp
      g.save();
      g.translate(pad + W - fs * 1.4, pad + fs * 1.6);
      g.rotate(-0.25);
      g.strokeStyle = 'rgba(232,74,95,0.85)'; g.lineWidth = fs * 0.12;
      g.beginPath(); g.arc(0, 0, fs * 1.05, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(232,74,95,0.85)'; g.textAlign = 'center';
      g.font = `700 ${Math.round(fs * 0.5)}px Fredoka, sans-serif`;
      g.fillText('WAAW', 0, 1);
      g.restore();
    }
    return cv.toDataURL('image/jpeg', quality);
  }

  async snapPhoto(filter, caption) {
    const w = Math.min(1600, gfx.renderer.domElement.width);
    const h = Math.round(w * (gfx.renderer.domElement.height / gfx.renderer.domElement.width));
    const url = this.capture({ w, h, frame: true, filter, caption });
    const photo = { id: Date.now(), url, caption: caption || 'WAAWer Coaster', kind: 'snap' };
    await albumAdd(photo);
    this.counts.photos++;
    this._checkStory();
    this._autosave();
    return photo;
  }

  _ridePhoto() {
    const p = this.pendingRidePhoto;
    this.pendingRidePhoto = null;
    const sm = p.piece.samples, mid = Math.floor(sm.n / 2);
    const right = new THREE.Vector3(sm.right[mid * 3], 0, sm.right[mid * 3 + 2]).normalize();
    const base = new THREE.Vector3(sm.pos[mid * 3], sm.pos[mid * 3 + 1], sm.pos[mid * 3 + 2]);
    const cam = new THREE.PerspectiveCamera(48, 1.5, 0.3, 600);
    cam.position.copy(base).addScaledVector(right, 2.6).add(new THREE.Vector3(0, 1.9, 0));
    const target = this.train.cars[0].root.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    const url = this.capture({ w: 900, h: 600, frame: true, caption: 'On-ride photo', camera: cam, quality: 0.85 });
    const photo = { id: Date.now(), url, caption: 'On-ride photo', kind: 'ride' };
    albumAdd(photo);
    audio.play('shutter');
    this.particles.burst(cam.position.clone(), 'sparkle', 16);
    bus.emit('photo:ride', photo);
    this.badge('cheese');
    this.counts.photos++;
    this._checkStory();
  }

  // ------------------------------------------------------------------ loop
  _loop() {
    requestAnimationFrame(this._loop);
    if (this.paused) return;
    const nowT = performance.now();
    const dt = Math.min((nowT - this._last) / 1000, 0.1);
    this._last = nowT;
    this.time += dt;
    uTime.value = this.time;
    const night = this.sky.night;
    // wind with the occasional gust that rustles the whole valley
    this._gustT = (this._gustT ?? 25) - dt;
    if (this._gustT <= 0 && state.started) {
      this._gustT = 28 + Math.random() * 35;
      this.gust = 1;
      audio.play('wind');
      this.particles.gust(this.rig.target);
    }
    this.gust = Math.max(0, (this.gust || 0) - dt / 4);
    const wind = 0.8 + Math.sin(this.time * 0.13) * 0.3 + Math.sin(this.time * 0.41) * 0.15 + Math.sin(this.gust * Math.PI) * 1.3;
    uWind.value = wind;
    governor(dt);
    // simulation
    this.ride.update(dt);
    const head = this.ride.headPos;
    const active = this.ride.playing && this.ride.phase === 'running';
    const camDist = gfx.camera.position.distanceTo(head);
    audio.setRide(Math.abs(this.ride.v), this.ride.onChain, active, state.rideCam === 'first' && state.mode === 'ride' ? 1.2 : clamp(1.4 - camDist / 90, 0.15, 1));
    audio.tick(dt);
    audio.ambienceTick(dt, night);
    // camera and world
    this.rig.update(dt);
    this.sky.update(dt, gfx.camera, this.rig.target);
    this.view.update(dt, night);
    this.nature.update(dt);
    this.village.update(dt, night, wind);
    this.station.update(dt, wind);
    this.mascot.update(dt, gfx.camera, night, active ? head : null);
    this.animals.update(dt, night);
    this.skylife.update(dt, night, wind);
    this.visitors.update(dt, head, active, gfx.camera);
    this.decor.update(dt, wind);
    this.particles.update(dt, this.rig.target, night, wind);
    // more visitors as joy grows
    const want = Math.round(7 + state.joy * 20 + Math.min(6, this.counts.decor / 3));
    if (this.visitors.count < want && Math.random() < dt * 0.5) {
      this.visitors.spawn(true);
      if (this.visitors.count >= 25) this.badge('crowd');
    }
    if (active && night > 0.6) this.badge('night');
    // hover at ~30 Hz
    this._hoverAcc = (this._hoverAcc || 0) + dt;
    if (this._hoverAcc > 0.033) { this._hoverAcc = 0; this._hoverTick(); }
    if (this.pendingRidePhoto) this._ridePhoto();
    gfx.renderer.render(gfx.scene, gfx.camera);
    bus.emit('frame', dt);
  }
}
