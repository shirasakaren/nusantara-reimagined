// Every sound in WAAWer Coaster is synthesized live. No audio files, no loading,
// and the valley can sing in tune with itself.
import { state } from './state.js';
import { bus } from './bus.js';

const A4 = 440;
const mtof = (m) => A4 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.ride = { speed: 0, chain: false, active: false };
    this._chainT = 0;
    this._lastHover = 0;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.night = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3.5;
    this.master.connect(comp); comp.connect(ctx.destination);

    this.sfx = ctx.createGain(); this.sfx.gain.value = state.sound ? 0.8 : 0;
    this.music = ctx.createGain(); this.music.gain.value = state.music ? 0.32 : 0;
    this.amb = ctx.createGain(); this.amb.gain.value = state.sound ? 0.5 : 0;
    this.sfx.connect(this.master); this.music.connect(this.master); this.amb.connect(this.master);

    // soft room reverb from generated impulse
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4, 2.2);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0.35;
    this.revSend.connect(this.reverb); this.reverb.connect(this.master);

    // music box echo
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay);
    this.delaySend = ctx.createGain(); this.delaySend.gain.value = 0.3;
    this.delaySend.connect(this.delay); dl.connect(this.music);

    this.noiseBuf = this._noise(2);
    this._setupRideLayer();
    this._setupAmbience();
    this.ready = true;
    this.nextNoteTime = ctx.currentTime + 0.2;
    this._schedTimer = setInterval(() => this._schedule(), 90);
    bus.on('state:sound', (v) => { this._fade(this.sfx.gain, v ? 0.8 : 0); this._fade(this.amb.gain, v ? 0.5 : 0); });
    bus.on('state:music', (v) => this._fade(this.music.gain, v ? 0.32 : 0));
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  _fade(param, v, t = 0.4) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(v, now + t);
  }

  _impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noise(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- primitives ---------------------------------------------------------
  tone({ f = 440, f2 = null, dur = 0.2, type = 'sine', gain = 0.3, a = 0.005, r = null, when = 0, dest = null, rev = 0.15, detune = 0, curve = 'exp' } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f, t);
    if (f2) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
      else o.frequency.linearRampToValueAtTime(f2, t + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (r ?? dur));
    o.connect(g); g.connect(dest || this.sfx);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.revSend); }
    o.start(t); o.stop(t + (r ?? dur) + 0.05);
    return o;
  }

  noise({ dur = 0.2, type = 'bandpass', f = 1200, f2 = null, q = 1, gain = 0.3, a = 0.005, when = 0, dest = null, rev = 0.1 } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfx);
    if (rev) { const sd = ctx.createGain(); sd.gain.value = rev; g.connect(sd); sd.connect(this.revSend); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // A tiny formant voice. Vowels morph through the list over the duration.
  voice({ f = 300, glide = [1, 1.3, 0.85], vowels = ['u', 'a', 'u'], dur = 0.6, gain = 0.18, when = 0, vib = 6, type = 'sawtooth' } = {}) {
    if (!this.ready) return;
    const F = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [330, 800] };
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f * glide[0], t);
    for (let i = 1; i < glide.length; i++) o.frequency.linearRampToValueAtTime(f * glide[i], t + (dur * i) / (glide.length - 1));
    const lfo = ctx.createOscillator(); lfo.frequency.value = vib;
    const lg = ctx.createGain(); lg.gain.value = f * 0.025;
    lfo.connect(lg); lg.connect(o.frequency);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + 0.04);
    out.gain.setValueAtTime(gain, t + dur * 0.75);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [0, 1].forEach((k) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = k ? 9 : 6;
      vowels.forEach((v, i) => {
        const at = t + (dur * i) / Math.max(1, vowels.length - 1);
        if (i === 0) bp.frequency.setValueAtTime(F[v][k], at); else bp.frequency.linearRampToValueAtTime(F[v][k], at);
      });
      const g = ctx.createGain(); g.gain.value = k ? 0.6 : 1;
      o.connect(bp); bp.connect(g); g.connect(out);
    });
    out.connect(this.sfx);
    const s = ctx.createGain(); s.gain.value = 0.2; out.connect(s); s.connect(this.revSend);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  // ---- named sounds -------------------------------------------------------
  play(name, opt = {}) {
    if (!this.ready || !state.sound) return;
    const R = (a, b) => a + Math.random() * (b - a);
    switch (name) {
      case 'hover': {
        const now = performance.now();
        if (now - this._lastHover < 45) return;
        this._lastHover = now;
        this.tone({ f: R(1500, 1800), f2: R(1900, 2200), dur: 0.05, gain: 0.035, type: 'sine', rev: 0 });
        break;
      }
      case 'click':
        this.tone({ f: 520, f2: 880, dur: 0.09, gain: 0.12, type: 'triangle' });
        this.tone({ f: 1320, dur: 0.05, gain: 0.04, when: 0.03 });
        break;
      case 'toggle':
        this.tone({ f: opt.on ? 660 : 880, f2: opt.on ? 990 : 550, dur: 0.12, gain: 0.1, type: 'triangle' });
        break;
      case 'open':
        this.tone({ f: 400, f2: 800, dur: 0.18, gain: 0.08, type: 'sine' });
        this.noise({ dur: 0.18, f: 900, f2: 3000, gain: 0.03, q: 0.7 });
        break;
      case 'close':
        this.tone({ f: 800, f2: 380, dur: 0.16, gain: 0.07, type: 'sine' });
        break;
      case 'place': {
        const p = opt.pitch || 1;
        this.tone({ f: 190 * p, f2: 120 * p, dur: 0.16, gain: 0.32, type: 'sine', rev: 0.2 });
        this.noise({ dur: 0.05, type: 'highpass', f: 2500, gain: 0.12 });
        this.tone({ f: 880 * p, f2: 1320 * p, dur: 0.08, gain: 0.06, when: 0.04, type: 'triangle' });
        break;
      }
      case 'undo':
        this.noise({ dur: 0.22, f: 3000, f2: 500, gain: 0.08, q: 2 });
        this.tone({ f: 700, f2: 300, dur: 0.18, gain: 0.08, type: 'triangle' });
        break;
      case 'error':
        this.tone({ f: 180, dur: 0.09, gain: 0.12, type: 'square', rev: 0 });
        this.tone({ f: 150, dur: 0.12, gain: 0.12, type: 'square', when: 0.11, rev: 0 });
        break;
      case 'paint':
        this.noise({ dur: 0.25, f: 1800, f2: 4000, gain: 0.07, q: 3 });
        this.tone({ f: 660, f2: 990, dur: 0.12, gain: 0.07, type: 'sine', when: 0.05 });
        break;
      case 'erase':
        this.noise({ dur: 0.3, type: 'lowpass', f: 4000, f2: 300, gain: 0.14 });
        this.tone({ f: 300, f2: 90, dur: 0.25, gain: 0.15, type: 'sine' });
        break;
      case 'pop':
        this.tone({ f: R(500, 700), f2: R(1100, 1500), dur: 0.08, gain: 0.12, type: 'sine' });
        break;
      case 'boing':
        this.tone({ f: 180, f2: 520, dur: 0.25, gain: 0.12, type: 'sine', curve: 'lin' });
        this.tone({ f: 520, f2: 260, dur: 0.2, gain: 0.08, type: 'sine', when: 0.2 });
        break;
      case 'bell':
        [1, 2.76, 5.4].forEach((m, i) => this.tone({ f: 784 * m, dur: 1.4 - i * 0.3, gain: 0.12 / (i + 1), type: 'sine', rev: 0.4 }));
        this.tone({ f: 988, dur: 1.2, gain: 0.08, when: 0.25, rev: 0.4 });
        break;
      case 'shutter':
        this.noise({ dur: 0.04, type: 'highpass', f: 3000, gain: 0.3, rev: 0 });
        this.noise({ dur: 0.06, type: 'bandpass', f: 1800, gain: 0.25, when: 0.08, rev: 0 });
        this.tone({ f: 2400, dur: 0.05, gain: 0.05, when: 0.02, rev: 0 });
        break;
      case 'confetti':
        for (let i = 0; i < 6; i++) this.tone({ f: R(700, 1800), f2: R(1800, 2600), dur: 0.08, gain: 0.07, when: i * 0.04, type: 'sine' });
        this.noise({ dur: 0.4, f: 4000, gain: 0.05, q: 0.5 });
        break;
      case 'fanfare': {
        const notes = [72, 76, 79, 84];
        notes.forEach((n, i) => {
          this.tone({ f: mtof(n), dur: 0.5, gain: 0.12, type: 'triangle', when: i * 0.11, rev: 0.4 });
          this.tone({ f: mtof(n + 12), dur: 0.35, gain: 0.04, type: 'sine', when: i * 0.11 });
        });
        this.tone({ f: mtof(84), dur: 1.2, gain: 0.1, type: 'triangle', when: 0.45, rev: 0.5 });
        break;
      }
      case 'achieve':
        [79, 83, 86, 91].forEach((n, i) => this.tone({ f: mtof(n), dur: 0.6, gain: 0.09, type: 'sine', when: i * 0.07, rev: 0.5 }));
        break;
      case 'waaw': {
        const n = opt.n || 2;
        for (let i = 0; i < n; i++) {
          const f = R(230, 420);
          this.voice({ f, dur: R(0.55, 0.85), gain: 0.11, when: i * R(0.02, 0.09), glide: [1, 1.35, 1.1, 0.8], vowels: ['u', 'a', 'a', 'u'] });
        }
        break;
      }
      case 'whee':
        this.voice({ f: R(380, 520), dur: 0.7, gain: 0.1, glide: [0.9, 1.5, 1.2], vowels: ['u', 'i', 'i'] });
        break;
      case 'moo':
        this.voice({ f: R(95, 120), dur: 1.1, gain: 0.22, glide: [1, 1.08, 0.85], vowels: ['u', 'o', 'u'], vib: 3 });
        break;
      case 'baa':
        this.voice({ f: R(330, 420), dur: 0.7, gain: 0.14, glide: [1, 1.02, 0.95], vowels: ['e', 'a', 'a'], vib: 11 });
        break;
      case 'quack':
        for (let i = 0; i < 2; i++) this.voice({ f: R(500, 600), dur: 0.14, gain: 0.12, glide: [1.1, 0.9], vowels: ['a', 'e'], when: i * 0.17, type: 'square', vib: 0.1 });
        break;
      case 'cluck':
        for (let i = 0; i < 3; i++) this.voice({ f: R(600, 800), dur: 0.08, gain: 0.08, glide: [1, 1.4], vowels: ['o', 'a'], when: i * 0.12, type: 'square', vib: 0.1 });
        break;
      case 'oink':
        this.voice({ f: R(160, 210), dur: 0.25, gain: 0.16, glide: [1, 1.2, 0.9], vowels: ['o', 'i', 'u'], vib: 25 });
        break;
      case 'bark':
        for (let i = 0; i < 2; i++) this.voice({ f: R(280, 340), dur: 0.12, gain: 0.16, glide: [1.2, 0.8], vowels: ['a', 'o'], when: i * 0.2 });
        break;
      case 'meow':
        this.voice({ f: R(520, 640), dur: 0.6, gain: 0.1, glide: [0.9, 1.25, 0.9], vowels: ['i', 'a', 'u'], vib: 5 });
        break;
      case 'chirp':
        for (let i = 0; i < (opt.n || 3); i++) this.tone({ f: R(2600, 3400), f2: R(3800, 5200), dur: 0.06, gain: 0.05, when: i * R(0.08, 0.13), rev: 0.25 });
        break;
      case 'gull':
        this.voice({ f: R(900, 1100), dur: 0.5, gain: 0.05, glide: [1, 1.3, 0.8], vowels: ['e', 'a', 'u'], vib: 9 });
        break;
      case 'honk':
        this.tone({ f: 220, dur: 0.6, gain: 0.16, type: 'sawtooth', rev: 0.5 });
        this.tone({ f: 277, dur: 0.6, gain: 0.1, type: 'sawtooth', rev: 0.5 });
        break;
      case 'splash':
        this.noise({ dur: 0.7, type: 'lowpass', f: 5000, f2: 400, gain: 0.25, rev: 0.3 });
        for (let i = 0; i < 4; i++) this.tone({ f: R(600, 1200), f2: R(1500, 2500), dur: 0.05, gain: 0.04, when: 0.05 + i * 0.07 });
        break;
      case 'plop':
        this.tone({ f: 900, f2: 200, dur: 0.12, gain: 0.12, type: 'sine' });
        break;
      case 'whoosh':
        this.noise({ dur: opt.dur || 0.6, f: 400, f2: 2200, gain: opt.gain || 0.08, q: 1.5 });
        break;
      case 'boom':
        this.noise({ dur: 1.4, type: 'lowpass', f: 900, f2: 60, gain: 0.35, rev: 0.6 });
        this.tone({ f: 80, f2: 40, dur: 0.8, gain: 0.25, type: 'sine' });
        for (let i = 0; i < 10; i++) this.noise({ dur: 0.04, type: 'highpass', f: 4000, gain: 0.05, when: 0.25 + Math.random() * 0.9, rev: 0.4 });
        break;
      case 'launch':
        this.noise({ dur: 0.9, f: 300, f2: 3000, gain: 0.18, q: 1.2 });
        this.tone({ f: 120, f2: 520, dur: 0.8, gain: 0.12, type: 'sawtooth' });
        break;
      case 'brake':
        this.noise({ dur: 0.6, type: 'bandpass', f: 3200, f2: 2000, gain: 0.08, q: 6 });
        break;
      case 'clunk':
        this.tone({ f: 140, f2: 70, dur: 0.18, gain: 0.25, type: 'triangle' });
        this.noise({ dur: 0.08, type: 'highpass', f: 1500, gain: 0.1 });
        break;
      case 'wind':
        this.noise({ dur: 2.2, f: 500, f2: 1400, gain: 0.05, q: 0.8, a: 0.8, dest: this.amb });
        break;
      case 'rain':
        this.noise({ dur: 2.6, type: 'highpass', f: 2500, gain: 0.08, a: 0.5, dest: this.amb });
        break;
      case 'sparkle':
        for (let i = 0; i < 5; i++) this.tone({ f: mtof(84 + [0, 4, 7, 11, 14][i]), dur: 0.4, gain: 0.04, when: i * 0.05, rev: 0.6 });
        break;
      case 'creak':
        this.tone({ f: 90, f2: 140, dur: 0.4, gain: 0.05, type: 'sawtooth', curve: 'lin' });
        break;
      case 'chain':
        this.tone({ f: 1800 + Math.random() * 200, dur: 0.02, gain: 0.04, type: 'square', rev: 0 });
        break;
      case 'type':
        this.tone({ f: R(1100, 1400), dur: 0.025, gain: 0.025, type: 'triangle', rev: 0 });
        break;
      case 'buzz':
        this.tone({ f: R(180, 220), f2: R(230, 260), dur: 0.4, gain: 0.03, type: 'sawtooth', curve: 'lin', rev: 0 });
        break;
      default: break;
    }
  }

  // ---- continuous ride layer ---------------------------------------------
  _setupRideLayer() {
    const ctx = this.ctx;
    const mk = (type, f, q) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(fl); fl.connect(g); g.connect(this.sfx); s.start();
      return { s, fl, g };
    };
    this.rumble = mk('lowpass', 180, 0.8);
    this.windL = mk('bandpass', 800, 0.6);
  }

  setRide(speed, chain, active, near = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const sp = Math.min(speed / 24, 1);
    const on = active && state.sound ? 1 : 0;
    this.rumble.g.gain.setTargetAtTime(on * (0.05 + sp * 0.32) * near, now, 0.12);
    this.rumble.fl.frequency.setTargetAtTime(120 + sp * 260, now, 0.2);
    this.windL.g.gain.setTargetAtTime(on * sp * sp * 0.22 * near, now, 0.15);
    this.windL.fl.frequency.setTargetAtTime(500 + sp * 1600, now, 0.2);
    this.ride.chain = chain && active;
  }

  tick(dt) {
    if (!this.ready) return;
    if (this.ride.chain) {
      this._chainT -= dt;
      if (this._chainT <= 0) { this._chainT = 0.11; this.play('chain'); }
    }
  }

  // ---- ambience -----------------------------------------------------------
  _setupAmbience() {
    const ctx = this.ctx;
    // sea: slow swelling filtered noise
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 0.04;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(fl); fl.connect(g); g.connect(this.amb);
    s.start(); lfo.start();
    this.sea = g;
    this._ambT = 2;
  }

  ambienceTick(dt, night) {
    if (!this.ready || !state.sound) return;
    this.night = night;
    this._ambT -= dt;
    if (this._ambT <= 0) {
      if (night > 0.5) {
        // crickets
        this._ambT = 0.6 + Math.random() * 1.6;
        for (let i = 0; i < 4; i++) this.tone({ f: 4200 + Math.random() * 300, dur: 0.03, gain: 0.012, when: i * 0.06, dest: this.amb, rev: 0.2 });
      } else {
        this._ambT = 2.5 + Math.random() * 5;
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone({ f: 2400 + Math.random() * 1600, f2: 3200 + Math.random() * 2000, dur: 0.07, gain: 0.018, when: i * 0.11, dest: this.amb, rev: 0.3 });
      }
    }
  }

  // ---- generative music ---------------------------------------------------
  _schedule() {
    if (!this.ready || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const tempo = this.night > 0.5 ? 70 : 88;
    const step = 60 / tempo / 2; // eighth notes
    while (this.nextNoteTime < ctx.currentTime + 0.25) {
      this._musicStep(this.musicStep, this.nextNoteTime - ctx.currentTime, step);
      this.musicStep++;
      this.nextNoteTime += step;
    }
  }

  _musicStep(i, when, step) {
    if (!state.music) return;
    // F major pentatonic lullaby. I vi IV V with a gentle turnaround.
    const chords = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]];
    const bar = Math.floor(i / 8) % 4;
    const beat = i % 8;
    const ch = chords[bar];
    const m = this.music;
    const night = this.night > 0.5;
    if (beat === 0) {
      // pad
      ch.forEach((n) => this.tone({ f: mtof(n + 12), dur: step * 8, a: 0.4, r: step * 8, gain: night ? 0.035 : 0.045, type: 'triangle', when, dest: m, rev: 0.6 }));
      this.tone({ f: mtof(ch[0] - 12), dur: step * 3, a: 0.02, gain: 0.12, type: 'sine', when, dest: m, rev: 0 });
    }
    if (beat === 4) this.tone({ f: mtof(ch[0] - 12 + 7), dur: step * 2, a: 0.02, gain: 0.08, type: 'sine', when, dest: m, rev: 0 });
    // music box arpeggio
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    if (!night || beat % 2 === 0) {
      const n = ch[arp[beat]] + 24;
      const o = this.tone({ f: mtof(n), dur: step * 1.6, a: 0.003, gain: 0.05, type: 'sine', when, dest: m, rev: 0.3 });
      if (o && this.delaySend) {
        // feed the echo with a quieter copy
        this.tone({ f: mtof(n), dur: step * 1.2, a: 0.003, gain: 0.02, type: 'sine', when, dest: this.delaySend, rev: 0 });
      }
    }
    // melody, sparse random walk on pentatonic
    const pent = [65, 67, 69, 72, 74, 77, 79];
    if (this._mel === undefined) this._mel = 3;
    if ((beat === 0 || beat === 3 || beat === 6) && Math.random() < (night ? 0.35 : 0.6)) {
      this._mel = Math.max(0, Math.min(pent.length - 1, this._mel + Math.round((Math.random() - 0.5) * 3)));
      const f = mtof(pent[this._mel]);
      this.tone({ f, dur: step * 2.6, a: 0.01, gain: night ? 0.035 : 0.05, type: 'triangle', when, dest: m, rev: 0.5 });
      this.tone({ f: f * 2, dur: step * 1.4, a: 0.004, gain: 0.012, type: 'sine', when, dest: m, rev: 0.4 });
    }
  }
}

export const audio = new AudioEngine();
