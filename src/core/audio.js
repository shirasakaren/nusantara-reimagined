// A small generative gamelan and sound design, made entirely with WebAudio.
import { state, emit } from './state.js';

const SLENDRO = [0, 240, 480, 720, 960];
const PELOG = [0, 120, 270, 540, 670, 785, 950];
const cents = (c) => Math.pow(2, c / 1200);

const MOODS = {
  dawn:    { scale: 'slendro', beat: 0.78, bonang: 0.35, sea: 0.5, rain: 0, music: 0.9, cutoff: 7000, root: 277 },
  trade:   { scale: 'slendro', beat: 0.62, bonang: 0.6, sea: 0.45, rain: 0, music: 1, cutoff: 9000, root: 293 },
  company: { scale: 'pelog', beat: 0.7, bonang: 0.45, sea: 0.35, rain: 0, music: 0.9, cutoff: 6500, root: 262 },
  iron:    { scale: 'pelog', beat: 0.8, bonang: 0.25, sea: 0.25, rain: 0, music: 0.8, cutoff: 4200, root: 247 },
  sugar:   { scale: 'pelog', beat: 0.92, bonang: 0.18, sea: 0.2, rain: 0, music: 0.75, cutoff: 3600, root: 233 },
  awake:   { scale: 'slendro', beat: 0.66, bonang: 0.5, sea: 0.25, rain: 0, music: 0.95, cutoff: 8000, root: 293 },
  dark:    { scale: 'pelog', beat: 1.25, bonang: 0, sea: 0.05, rain: 0.55, music: 0.45, cutoff: 1800, root: 220 },
  joy:     { scale: 'slendro', beat: 0.5, bonang: 0.75, sea: 0.2, rain: 0, music: 1.05, cutoff: 10000, root: 311 },
  fight:   { scale: 'pelog', beat: 0.56, bonang: 0.55, sea: 0.15, rain: 0, music: 0.9, cutoff: 6000, root: 262 },
  paper:   { scale: 'slendro', beat: 0.8, bonang: 0.3, sea: 0.0, rain: 0, music: 0.55, cutoff: 5000, root: 277 },
  play:    { scale: 'slendro', beat: 0.58, bonang: 0.6, sea: 0.0, rain: 0, music: 0.6, cutoff: 8000, root: 311 },
  modern:  { scale: 'pelog', beat: 0.72, bonang: 0.35, sea: 0.2, rain: 0, music: 0.7, cutoff: 3000, root: 247 },
  night:   { scale: 'slendro', beat: 1.05, bonang: 0.2, sea: 0.35, rain: 0, music: 0.7, cutoff: 5500, root: 262 },
};

class Sound {
  constructor() {
    this.ctx = null; this.ready = false; this.on = false;
    this.mood = MOODS.dawn; this.moodName = 'dawn';
    this.step = 0; this.next = 0; this.degree = 2; this.hoverIdx = 0;
    this.spinNodes = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.9;
    this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 7000;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.fxBus = ctx.createGain(); this.fxBus.gain.value = 0.9; this.fxBus.connect(this.master);
    // reverb
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.6, 2.2);
    this.verbSend = ctx.createGain(); this.verbSend.gain.value = 0.42;
    this.verbSend.connect(this.verb).connect(this.master);
    this.musicFilter.connect(this.verbSend);
    this.fxBus.connect(this.verbSend);
    // noise sources
    this.noise = this.noiseBuffer(3);
    this.sea = this.loopNoise('lowpass', 520, 0.0);
    this.rain = this.loopNoise('highpass', 2600, 0.0);
    this.seaLfo = ctx.createOscillator(); this.seaLfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 300;
    this.seaLfo.connect(lfoGain).connect(this.sea.filter.frequency); this.seaLfo.start();
    this.ready = true;
    this.scheduler = setInterval(() => this.schedule(), 90);
    this.applyMood(0.1);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume();
    });
  }

  impulse(sec, decay) {
    const ctx = this.ctx; const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  noiseBuffer(sec) {
    const ctx = this.ctx; const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }
  loopNoise(type, freq, gain) {
    const ctx = this.ctx; const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master); src.start();
    return { src, filter, gain: g };
  }

  setEnabled(on) {
    if (on) this.init();
    if (!this.ctx) return;
    this.on = on; state.sound = on;
    if (on && this.ctx.state !== 'running') this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.85 : 0, t, on ? 0.6 : 0.2);
    if (on) this.next = Math.max(this.next, t + 0.2);
    emit('sound', on);
  }

  setMood(name) {
    if (!MOODS[name] || name === this.moodName) return;
    this.moodName = name; this.mood = MOODS[name];
    if (this.ready) this.applyMood(1.6);
  }
  applyMood(time) {
    const t = this.ctx.currentTime; const m = this.mood;
    this.sea.gain.gain.setTargetAtTime(m.sea * 0.5, t, time);
    this.rain.gain.gain.setTargetAtTime(m.rain * 0.55, t, time);
    this.musicBus.gain.setTargetAtTime(m.music * 0.55, t, time);
    this.musicFilter.frequency.setTargetAtTime(m.cutoff, t, time);
  }

  freq(deg, oct = 0) {
    const m = this.mood; const sc = m.scale === 'pelog' ? PELOG : SLENDRO; const n = sc.length;
    const o = Math.floor(deg / n); const d = ((deg % n) + n) % n;
    return m.root * cents(sc[d]) * Math.pow(2, o + oct);
  }

  // instruments
  bar(f, when, vel = 0.5, dur = 1.6, bus = this.musicBus) {
    const ctx = this.ctx; const out = ctx.createGain(); out.gain.value = vel; out.connect(bus);
    const partials = [[1, 1, 1], [2.76, 0.28, 0.42], [5.4, 0.1, 0.2]];
    for (const [r, a, dk] of partials) {
      for (const det of [0, 5.5]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r + (r === 1 ? det : 0);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(a * (det ? 0.5 : 0.6), when + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur * dk + 0.05);
        o.connect(g).connect(out); o.start(when); o.stop(when + dur * dk + 0.1);
        if (r !== 1) break;
      }
    }
  }
  gong(f, when, vel = 0.6, dur = 7) {
    const ctx = this.ctx; const out = ctx.createGain(); out.gain.value = vel; out.connect(this.musicBus);
    for (const [r, a, det] of [[1, 1, 0], [1, 0.8, 0.9], [2.02, 0.25, 0], [2.98, 0.1, 0]]) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * r + det + 2, when); o.frequency.exponentialRampToValueAtTime(f * r + det, when + 0.4);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(a * 0.5, when + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * (r > 1.5 ? 0.4 : 1));
      o.connect(g).connect(out); o.start(when); o.stop(when + dur + 0.1);
    }
  }
  noiseHit(when, { type = 'bandpass', freq = 2000, q = 1, dur = 0.05, vel = 0.3, bus = this.fxBus } = {}) {
    const ctx = this.ctx; const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vel, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(bus); src.start(when, Math.random() * 2); src.stop(when + dur + 0.02);
  }
  tone(f, when, { type = 'sine', vel = 0.2, dur = 0.3, to = null, bus = this.fxBus } = {}) {
    const ctx = this.ctx; const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, when);
    if (to) o.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(bus); o.start(when); o.stop(when + dur + 0.05);
  }

  schedule() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx; const m = this.mood;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.4) {
      const t = this.next; const s = this.step % 16; const n = (m.scale === 'pelog' ? PELOG : SLENDRO).length;
      if (m.bonang > 0 || s % 4 === 3) {
        // balungan random walk, landing on the gong tone
        if (s === 15) this.degree = 0;
        else this.degree += [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
        this.degree = Math.max(-2, Math.min(n + 2, this.degree));
        if (m.bonang > 0 || Math.random() < 0.5) this.bar(this.freq(this.degree), t, 0.32, 1.8);
      }
      if (m.bonang > 0 && Math.random() < m.bonang) {
        this.bar(this.freq(this.degree + (Math.random() < 0.5 ? 1 : 2), 1), t + m.beat / 2, 0.12, 0.9);
      }
      if (s % 4 === 3) this.bar(this.freq(this.degree, -1), t, 0.22, 3.2);
      if ((s === 5 || s === 9 || s === 13) && Math.random() < 0.6) this.gong(this.freq(0, -1) , t, 0.22, 2.5);
      if (s === 15) this.gong(this.freq(0, -2), t, 0.55, 8);
      this.step++; this.next += m.beat;
    }
  }

  // ---------- UI sounds ----------
  can() { return this.on && this.ctx && this.ctx.state === 'running'; }
  hover() {
    if (!this.can()) return;
    this.hoverIdx += Math.random() < 0.7 ? 1 : -1;
    if (this.hoverIdx > 9) this.hoverIdx = 4; if (this.hoverIdx < 0) this.hoverIdx = 3;
    this.bar(this.freq(this.hoverIdx, 1), this.ctx.currentTime + 0.005, 0.07, 0.8, this.fxBus);
  }
  click() {
    if (!this.can()) return; const t = this.ctx.currentTime;
    this.bar(this.freq(this.hoverIdx), t, 0.18, 1.2, this.fxBus);
    this.noiseHit(t, { freq: 3500, dur: 0.03, vel: 0.12 });
  }
  success() {
    if (!this.can()) return; const t = this.ctx.currentTime;
    [0, 1, 2, 3, 5].forEach((d, i) => this.bar(this.freq(d + 2, 1), t + i * 0.09, 0.2, 1.4, this.fxBus));
    this.gong(this.freq(0, -1), t + 0.45, 0.25, 4);
  }
  stamp() {
    if (!this.can()) return; const t = this.ctx.currentTime;
    this.tone(140, t, { vel: 0.5, dur: 0.25, to: 50 });
    this.noiseHit(t, { type: 'lowpass', freq: 900, dur: 0.12, vel: 0.45 });
    this.bar(this.freq(4, 1), t + 0.08, 0.14, 1.6, this.fxBus);
  }
  type() {
    if (!this.can()) return; const t = this.ctx.currentTime;
    this.noiseHit(t, { freq: 2600 + Math.random() * 1500, q: 2, dur: 0.035, vel: 0.35 });
    this.tone(180, t, { vel: 0.12, dur: 0.05, to: 90 });
  }
  bell() { if (!this.can()) return; const t = this.ctx.currentTime; this.tone(2200, t, { vel: 0.12, dur: 0.9 }); this.tone(3300, t, { vel: 0.05, dur: 0.6 }); }
  seed(i = 0) {
    if (!this.can()) return; const t = this.ctx.currentTime;
    this.noiseHit(t, { freq: 2400 + (i % 5) * 180, q: 6, dur: 0.04, vel: 0.4 });
    this.tone(900 + (i % 7) * 40, t, { vel: 0.05, dur: 0.05 });
  }
  tear() {
    if (!this.can()) return; const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) this.noiseHit(t + i * 0.03, { freq: 1200 + i * 500, q: 0.8, dur: 0.08, vel: 0.35 });
  }
  whoosh() {
    if (!this.can()) return; const ctx = this.ctx; const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.5); f.frequency.exponentialRampToValueAtTime(400, t + 1.1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.35); g.gain.linearRampToValueAtTime(0, t + 1.2);
    src.connect(f).connect(g).connect(this.fxBus); src.start(t); src.stop(t + 1.3);
  }
  note(deg, vel = 0.15) { if (!this.can()) return; this.bar(this.freq(deg, 1), this.ctx.currentTime, vel, 1.4, this.fxBus); }
  chime() { if (!this.can()) return; const t = this.ctx.currentTime; [0, 2, 4].forEach((d, i) => this.bar(this.freq(d, 2), t + i * 0.12, 0.08, 1.8, this.fxBus)); }
  spin(rate) {
    if (!this.can()) { this.stopSpin(); return; }
    const ctx = this.ctx;
    if (!this.spinNodes) {
      const o = ctx.createOscillator(); o.type = 'triangle'; const o2 = ctx.createOscillator(); o2.type = 'sine';
      const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      o.connect(f); o2.connect(f); f.connect(g).connect(this.fxBus); o.start(); o2.start();
      this.spinNodes = { o, o2, g };
    }
    const t = ctx.currentTime; const { o, o2, g } = this.spinNodes;
    o.frequency.setTargetAtTime(90 + rate * 260, t, 0.05); o2.frequency.setTargetAtTime(180 + rate * 523, t, 0.05);
    g.gain.setTargetAtTime(Math.min(0.12, rate * 0.14), t, 0.08);
  }
  stopSpin() {
    if (!this.spinNodes || !this.ctx) return; const { o, o2, g } = this.spinNodes; const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.1); o.stop(t + 0.6); o2.stop(t + 0.6); this.spinNodes = null;
  }
}

export const sound = new Sound();
