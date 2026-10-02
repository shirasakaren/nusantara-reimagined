// Ride simulation. Gravity, chain lift, boosters, brakes and a station that dispatches
// the train. Measures speed, G forces and airtime, and fires the shouts that fill the
// valley with WAAWs.
import * as THREE from 'three';
import { bus } from '../core/bus.js';
import { CAR_SPACING } from './train.js';

const G = 14;              // cartoon gravity, a little stronger than real for snappy drops
const CHAIN_SPEED = 4.2;
const MIN_SPEED = 2.4;
const PARK = 9.4;          // head position when parked in the 12 unit station

const SHOUTS = {
  drop: ['WAAW!', 'Waaaaw!', 'WAAAW!'],
  inversion: ['WAAAAW!', 'Upside down!', 'WAAW!'],
  airtime: ['Wheee!', 'Floating!', 'WAAW!'],
  speed: ['Woohoo!', 'WAAW!', 'So fast!'],
  splash: ['Splash!', 'Brrr!'],
  boost: ['Zoom!', 'WAAW!'],
  tunnel: ['Ooooh!', 'Who turned off the sun?'],
  launch: ['Here we go!', 'Bye station!'],
  helix: ['Dizzy!', 'Round we go!'],
};

export class Ride {
  constructor(track, train) {
    this.track = track;
    this.train = train;
    this.s = PARK;
    this.v = 0;
    this.dir = 1;
    this.playing = false;
    this.phase = 'parked';     // parked | running | arriving | waiting
    this.wait = 0;
    this.speedMul = 1;
    this.time = 0;
    this.excite = 0;
    this.cool = {};
    this.lastShout = 0;
    this.prevVel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    this.gVert = 1; this.gLat = 0;
    this.lap = this._newLap();
    this.laps = 0;
    this.lastLapStats = null;
    this.frame = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3(), piece: 0, local: 0, s: 0 };
    this._f2 = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    this._f3 = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    this.lastPieceFlags = {};
    this.passed = new Set();
    this.place();
  }

  _newLap() { return { maxSpeed: 0, maxG: 1, minG: 1, maxLat: 0, airtime: 0, inversions: 0, time: 0, dist: 0, shouts: 0, maxY: 0 }; }

  get headPos() { return this.train.cars[0].root.position; }

  reset() {
    this.s = PARK; this.v = 0; this.phase = 'parked'; this.wait = 0; this.excite = 0;
    this.lap = this._newLap(); this.passed.clear();
    this.place();
    bus.emit('ride:phase', this.phase);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    if (this.phase === 'parked') this._dispatch();
    bus.emit('ride:play', true);
  }

  pause() {
    this.playing = false;
    bus.emit('ride:play', false);
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  backToStation() {
    this.playing = false;
    this.reset();
    bus.emit('ride:play', false);
  }

  _dispatch() {
    this.phase = 'running';
    this.v = 3.2;
    this.dir = 1;
    this.lap = this._newLap();
    this.passed.clear();
    bus.emit('ride:dispatch');
    bus.emit('ride:phase', this.phase);
    this._shout('launch', 0.5);
  }

  _shout(kind, chance = 1, big = false) {
    if (Math.random() > chance) return;
    const now = this.time;
    if ((this.cool[kind] || 0) > now || now - this.lastShout < 0.9) return;
    this.cool[kind] = now + 2.6;
    this.lastShout = now;
    const list = SHOUTS[kind] || SHOUTS.drop;
    const text = list[Math.floor(Math.random() * list.length)];
    this.lap.shouts++;
    const car = this.train.cars[Math.floor(Math.random() * this.train.cars.length)];
    const isBig = big || /WAAA/.test(text);
    const riders = this.train.cars.length * 2;
    const amount = Math.max(1, Math.round(riders * (isBig ? 1 : 0.5)));
    bus.emit('ride:shout', { text, kind, big: isBig, amount, pos: car.root.position.clone().add(new THREE.Vector3(0, 1.8, 0)), counts: kind !== 'launch' && kind !== 'tunnel' });
  }

  update(dtIn) {
    const dt = Math.min(dtIn, 0.05) * this.speedMul;
    this.time += dt;
    const P = this.track.path;
    if (!P || P.length < 1) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this._step(h);
    this.place();
    this._measure(dt);
  }

  _step(dt) {
    if (!this.playing) return;
    const tr = this.track;
    const L = tr.path.length;
    const closed = tr.closed;
    const center = this.s - this.train.length / 2;
    const f = tr.frameAt(center, this.frame);
    const headPiece = tr.pieceAt(this.s);
    const centerPiece = tr.pieces[f.piece] || headPiece;
    const flags = centerPiece.def.flags;
    const hflags = headPiece.def.flags;

    if (this.phase === 'waiting') {
      this.wait -= dt;
      this.v = 0;
      if (this.wait <= 0) this._dispatch();
      return;
    }

    let a = -G * f.tan.y;
    a -= 0.010 * this.v * Math.abs(this.v) + 0.05 * Math.sign(this.v);

    // chain lift pulls at a steady pace
    const onChain = flags.chain || hflags.chain;
    if (onChain && this.v < CHAIN_SPEED && this.v > -1) {
      this.v += (CHAIN_SPEED - this.v) * Math.min(1, dt * 6);
      a = Math.max(a, 0);
    }
    if (hflags.boost && this.v > 0 && this.v < 26) a += 22;
    if (hflags.brake && !hflags.station && Math.abs(this.v) > 6.5) {
      a -= Math.sign(this.v) * 16;
      if (Math.random() < dt * 30) bus.emit('ride:sparks', this.train.cars[0].root.position.clone());
    }

    // station logic
    const inStationHead = headPiece.def.flags.station;
    const sMod = closed ? ((this.s % L) + L) % L : this.s;
    if (this.phase === 'running' && this.v > 0 && closed && inStationHead && sMod < PARK && this.lap.dist > 20) {
      this.phase = 'arriving';
      bus.emit('ride:phase', this.phase);
    }
    if (this.phase === 'running' && !closed && this.v < 0 && this.s < 14 && this.lap.dist > 6) {
      this.phase = 'arriving';
      bus.emit('ride:phase', this.phase);
    }
    if (this.phase === 'arriving') {
      // stop exactly at the park mark
      const target = closed ? (this.s - sMod + PARK) : PARK;
      const dist = (target - this.s) * Math.sign(this.v || 1);
      if (dist <= 0.03 || Math.abs(this.v) < 0.25) {
        this.s = target; this.v = 0;
        this.phase = 'waiting'; this.wait = 2.6;
        this._finishLap();
        bus.emit('ride:phase', this.phase);
        bus.emit('ride:arrive');
        return;
      }
      const need = (this.v * this.v) / (2 * Math.max(dist, 0.05));
      a = -Math.sign(this.v) * Math.min(need, 30);
      if (Math.abs(this.v) < 1.2) a = 0;
      this.v += a * dt;
      if (Math.abs(this.v) < 1.1) this.v = Math.sign(this.v) * 1.1;
      this.s += this.v * dt;
      return;
    }

    this.v += a * dt;
    // cartoon assist: the train never stalls, and it always makes the loop
    const minV = flags.loop ? 8.5 : MIN_SPEED;
    if (this.dir > 0 && this.v < minV && !onChain) this.v = minV;
    if (this.dir < 0 && this.v > -MIN_SPEED) this.v = -MIN_SPEED;
    this.v = Math.max(-18, Math.min(32, this.v));
    this.s += this.v * dt;
    this.lap.dist += Math.abs(this.v * dt);

    if (!closed) {
      if (this.s >= L - 0.25 && this.dir > 0) {
        this.s = L - 0.25;
        this.v = -Math.max(2.5, this.v * 0.3);
        this.dir = -1;
        bus.emit('ride:bump', this.headPos.clone());
      }
      if (this.s - this.train.length < 0 && this.dir < 0) { this.s = this.train.length; this.v = 0; }
    } else {
      this.dir = 1;
    }
  }

  _finishLap() {
    this.laps++;
    this.lastLapStats = { ...this.lap };
    bus.emit('ride:lap', this.lastLapStats);
  }

  place() {
    const tr = this.track;
    const n = this.train.cars.length;
    for (let i = 0; i < n; i++) {
      const sc = this.s - (i + 0.5) * CAR_SPACING;
      const front = tr.frameAt(sc + 0.62, this._f2);
      const fp = front.pos.clone();
      const back = tr.frameAt(sc - 0.62, this._f3);
      const mid = tr.frameAt(sc, this.frame);
      this.train.placeCar(i, fp, back.pos, mid.up);
    }
  }

  _measure(dt) {
    if (dt <= 0) return;
    const tr = this.track;
    const f = tr.frameAt(this.s - this.train.length / 2, this.frame);
    const vel = f.tan.clone().multiplyScalar(this.v);
    const accRaw = vel.clone().sub(this.prevVel).divideScalar(dt);
    this.prevVel.copy(vel);
    this.acc.lerp(accRaw, 1 - Math.exp(-dt * 10));
    const felt = this.acc.clone().add(new THREE.Vector3(0, G, 0));
    this.gVert = felt.dot(f.up) / G;
    this.gLat = felt.dot(f.right) / G;
    const sp = Math.abs(this.v);
    const running = this.playing && (this.phase === 'running');
    if (running) {
      const L = this.lap;
      L.time += dt;
      L.maxSpeed = Math.max(L.maxSpeed, sp);
      L.maxG = Math.max(L.maxG, this.gVert);
      L.minG = Math.min(L.minG, this.gVert);
      L.maxLat = Math.max(L.maxLat, Math.abs(this.gLat));
      L.maxY = Math.max(L.maxY, f.pos.y);
      if (this.gVert < 0.35) L.airtime += dt;
      const piece = tr.pieces[f.piece];
      if (piece) {
        const fl = piece.def.flags;
        const key = piece.uid;
        if (fl.inversion && f.up.y < -0.2 && !this.passed.has(key + 'inv')) { this.passed.add(key + 'inv'); L.inversions++; this._shout('inversion', 1, true); }
        if (fl.splash && !this.passed.has(key + 'sp')) { this.passed.add(key + 'sp'); this._shout('splash'); bus.emit('ride:splash', f.pos.clone()); }
        if (fl.photo && f.local > 0.4 && !this.passed.has(key + 'ph')) { this.passed.add(key + 'ph'); bus.emit('ride:photo', { piece, pos: f.pos.clone() }); }
        if (fl.tunnel && !this.passed.has(key + 'tn')) { this.passed.add(key + 'tn'); this._shout('tunnel', 0.6); }
        if (fl.boost && !this.passed.has(key + 'bs')) { this.passed.add(key + 'bs'); this._shout('boost', 0.8); bus.emit('ride:boost', f.pos.clone()); }
        if (fl.chain && !this.passed.has(key + 'ch')) { this.passed.add(key + 'ch'); bus.emit('ride:chain'); }
        if (piece.type.startsWith('helix') && !this.passed.has(key + 'hx')) { this.passed.add(key + 'hx'); this._shout('helix', 0.35); }
      }
      if (f.tan.y < -0.42 && sp > 7) this._shout('drop', 1);
      if (this.gVert < 0.25 && sp > 4) this._shout('airtime', 1);
      if (sp > 18) this._shout('speed', 0.6);
    }
    // how excited are the riders
    let ex = 0;
    if (running) {
      ex = Math.min(1, Math.max(0, (sp - 5) / 12));
      if (f.tan.y < -0.3) ex = Math.max(ex, 0.9);
      if (this.gVert < 0.4 || f.up.y < 0.2) ex = 1;
      const piece = tr.pieces[f.piece];
      if (piece?.def.flags.chain) ex = 0.15;
    }
    this.excite += (ex - this.excite) * (1 - Math.exp(-dt * 4));
    this.train.animate(dt, this.excite, this.time);
  }

  get speedKmh() { return Math.abs(this.v) * 3.6; }

  get onChain() {
    const p = this.track.pieceAt(this.s - this.train.length / 2);
    return !!(p && p.def.flags.chain) && this.playing && this.phase === 'running';
  }
}

/** Rate a coaster from its layout and the last lap. Returns 0..10 scores with words. */
export function rateCoaster(trackStats, lap) {
  const sp = lap ? lap.maxSpeed * 3.6 : 0;
  const inv = trackStats.inversions;
  const air = lap ? lap.airtime : 0;
  const len = trackStats.length;
  const height = trackStats.maxY;
  const variety = Object.keys(trackStats.specials).length;
  let excitement = 1.2 + Math.min(2.5, sp / 30) + Math.min(2, inv * 0.55) + Math.min(1.5, air * 0.6) + Math.min(1.4, len / 160) + Math.min(1.2, height / 12) + Math.min(1.5, variety * 0.18);
  if (!trackStats.closed) excitement *= 0.75;
  const maxG = lap ? lap.maxG : 1;
  const lat = lap ? lap.maxLat : 0;
  let intensity = 0.8 + Math.min(3, sp / 28) + Math.min(2.5, Math.max(0, maxG - 1) * 0.9) + Math.min(2, inv * 0.5) + Math.min(1.5, lat * 1.2) + Math.min(1, height / 15);
  let nausea = 0.4 + Math.min(3, lat * 2) + Math.min(3, inv * 0.6) + Math.min(2, (trackStats.specials.twist || 0) * 0.8) + Math.min(1.6, trackStats.curves * 0.05);
  const c = (v) => Math.max(0, Math.min(10, v));
  excitement = c(excitement); intensity = c(intensity); nausea = c(nausea);
  const word = (v, words) => words[Math.min(words.length - 1, Math.floor(v / (10 / words.length)))];
  return {
    excitement, intensity, nausea,
    excitementWord: word(excitement, ['Sleepy', 'Pleasant', 'Fun', 'Thrilling', 'Legendary']),
    intensityWord: word(intensity, ['Gentle', 'Mild', 'Spicy', 'Wild', 'Extreme']),
    nauseaWord: word(nausea, ['Smooth', 'Wobbly', 'Queasy', 'Dizzy', 'Bring a bag']),
  };
}
