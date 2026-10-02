// Track model: a chain of pieces that grows from the station. Handles frames along the
// rail, space occupancy, placement rules, loop closure, auto finish and save codes.
import * as THREE from 'three';
import { PIECES, PIECE_CODES, DIRS, T, H, BASE, MAX_LEVEL, levelY, cellCenter, inGrid } from './pieces.js';

const Y = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();

export const CLEAR_BELOW = 1.35;
export const CLEAR_ABOVE = 1.6;

/** Space map shared by track, station and decorations. */
export class SpaceMap {
  constructor() { this.map = new Map(); }
  key(i, j) { return i + ',' + j; }
  add(i, j, yMin, yMax, owner) {
    const k = this.key(i, j);
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push({ yMin, yMax, owner });
  }
  removeOwner(pred) {
    for (const [k, a] of this.map) {
      const b = a.filter((e) => !pred(e.owner));
      if (b.length) this.map.set(k, b); else this.map.delete(k);
    }
  }
  conflicts(i, j, yMin, yMax, ignore) {
    const a = this.map.get(this.key(i, j));
    if (!a) return null;
    for (const e of a) {
      if (ignore && ignore(e.owner)) continue;
      if (yMin < e.yMax - 0.05 && e.yMin < yMax - 0.05) return e.owner;
    }
    return null;
  }
  /** highest top below y in a cell (for supports), ignoring an owner */
  floorBelow(i, j, y, ignore) {
    const a = this.map.get(this.key(i, j));
    let best = 0;
    if (!a) return best;
    for (const e of a) {
      if (ignore && ignore(e.owner)) continue;
      if (e.owner.kind !== 'track' && e.owner.kind !== 'station') continue;
      const top = e.owner.kind === 'track' ? e.yMin + CLEAR_BELOW - 0.35 : e.yMax;
      if (top < y - 0.2 && top > best) best = top;
    }
    return best;
  }
}

/** Compute world frames for a piece placed at a state. */
export function computeSamples(def, ci, cj, dir, level) {
  const F = DIRS[dir], R = DIRS[(dir + 1) % 4];
  const ex = cellCenter(ci) - F.x * T / 2;
  const ez = cellCenter(cj) - F.z * T / 2;
  const ey = levelY(level);
  const toWorld = (t, out) => {
    const p = def.path(t);
    out.set(ex + F.x * p.f + R.x * p.r, ey + p.y, ez + F.z * p.f + R.z * p.r);
    return out;
  };
  // estimate length
  let len = 0; const prev = new THREE.Vector3(); toWorld(0, prev);
  const cur = new THREE.Vector3();
  for (let k = 1; k <= 64; k++) { toWorld(k / 64, cur); len += cur.distanceTo(prev); prev.copy(cur); }
  const n = def.samples || Math.max(10, Math.ceil(len / 0.32));
  const pos = new Float32Array((n + 1) * 3), tan = new Float32Array((n + 1) * 3), up = new Float32Array((n + 1) * 3), right = new Float32Array((n + 1) * 3), s = new Float32Array(n + 1);
  const side = new THREE.Vector3(R.x, 0, R.z);
  let acc = 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    toWorld(t, cur);
    const e = 0.0025;
    toWorld(Math.min(1, t + e), _a); toWorld(Math.max(0, t - e), _b);
    _t.subVectors(_a, _b).normalize();
    if (def.sideFixed) _r.copy(side);
    else { _r.crossVectors(_t, Y); if (_r.lengthSq() < 1e-6) _r.copy(side); }
    _r.normalize();
    _u.crossVectors(_r, _t).normalize();
    _r.crossVectors(_t, _u).normalize();
    const roll = def.roll(t);
    if (roll) {
      const c = Math.cos(roll), sn = Math.sin(roll);
      const ux = _u.x * c + _r.x * sn, uy = _u.y * c + _r.y * sn, uz = _u.z * c + _r.z * sn;
      const rx = _r.x * c - _u.x * sn, ry = _r.y * c - _u.y * sn, rz = _r.z * c - _u.z * sn;
      _u.set(ux, uy, uz); _r.set(rx, ry, rz);
    }
    if (k > 0) acc += cur.distanceTo(prev);
    prev.copy(cur);
    pos.set([cur.x, cur.y, cur.z], k * 3);
    tan.set([_t.x, _t.y, _t.z], k * 3);
    up.set([_u.x, _u.y, _u.z], k * 3);
    right.set([_r.x, _r.y, _r.z], k * 3);
    s[k] = acc;
  }
  return { pos, tan, up, right, s, n, length: acc };
}

/** Cells a placed piece occupies with vertical ranges. */
export function computeCells(def, samples) {
  const cells = new Map();
  const { pos, n } = samples;
  const extra = def.height || 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    if (t < 0.02 || t > 0.98) continue;
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
    const i = Math.floor(x / T), j = Math.floor(z / T);
    const key = i + ',' + j;
    const yMin = y - CLEAR_BELOW, yMax = y + Math.max(CLEAR_ABOVE, extra);
    const c = cells.get(key);
    if (!c) cells.set(key, { i, j, yMin, yMax });
    else { c.yMin = Math.min(c.yMin, yMin); c.yMax = Math.max(c.yMax, yMax); }
  }
  // loops are tall: fill the whole column of the loop in each cell they touch
  return [...cells.values()];
}

export function nextState(def, st) {
  const F = DIRS[st.dir], R = DIRS[(st.dir + 1) % 4];
  return {
    ci: st.ci + F.x * def.exit.f + R.x * def.exit.r,
    cj: st.cj + F.z * def.exit.f + R.z * def.exit.r,
    dir: (st.dir + def.turn + 4) % 4,
    level: st.level + def.dh,
  };
}

const sameState = (a, b) => a.ci === b.ci && a.cj === b.cj && a.dir === b.dir && a.level === b.level;

// relative occupancy cache for path finding
const relCache = new Map();
function relCells(type, dir) {
  const k = type + dir;
  if (relCache.has(k)) return relCache.get(k);
  const def = PIECES[type];
  const smp = computeSamples(def, 0, 0, dir, 0);
  const cells = computeCells(def, smp).map((c) => ({ di: c.i, dj: c.j, yMin: c.yMin, yMax: c.yMax }));
  let minY = Infinity;
  for (let q = 0; q <= smp.n; q++) minY = Math.min(minY, smp.pos[q * 3 + 1]);
  const v = { cells, minY: minY - BASE };
  relCache.set(k, v);
  return v;
}

export class Track {
  constructor(space) {
    this.space = space;
    this.start = { ci: -2, cj: 8, dir: 1, level: 0 };
    this.pieces = [];
    this.closed = false;
    this.version = 0;
    this.defaultColors = { rail: 0, spine: 1, support: 2 };
    this.reset();
  }

  reset() {
    this.space.removeOwner((o) => o.kind === 'track');
    this.pieces = [];
    this.closed = false;
    this._push('station', this.start, { rail: 0, spine: 1, support: 2 });
    this._rebuildPath();
  }

  get end() {
    const p = this.pieces[this.pieces.length - 1];
    return p.endState;
  }

  /** Evaluate placing a piece at the end without changing anything. */
  evaluate(type, stOverride) {
    const def = PIECES[type];
    if (!def) return { ok: false, reason: 'Unknown piece' };
    const st = stOverride || this.end;
    const res = { ok: true, reason: '', closes: false, def, state: st };
    if (this.closed && !stOverride) { res.ok = false; res.reason = 'The circuit is closed. Undo a piece to keep building.'; }
    const samples = computeSamples(def, st.ci, st.cj, st.dir, st.level);
    res.samples = samples;
    const endSt = nextState(def, st);
    res.endState = endSt;
    if (!res.ok) return res;
    if (def.groundOnly && st.level !== 0) return Object.assign(res, { ok: false, reason: `${def.name} only works at ground level.` });
    if (endSt.level < 0) return Object.assign(res, { ok: false, reason: 'That would dig into the ground.' });
    if (endSt.level > MAX_LEVEL) return Object.assign(res, { ok: false, reason: 'Too high. Even birds need a ceiling.' });
    let minY = Infinity, maxY = -Infinity;
    for (let k = 0; k <= samples.n; k++) { const y = samples.pos[k * 3 + 1]; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (minY < BASE - 0.05) return Object.assign(res, { ok: false, reason: 'Not enough room below. Climb a little first.' });
    const cells = computeCells(def, samples);
    res.cells = cells;
    for (const c of cells) {
      if (!inGrid(c.i, c.j)) return Object.assign(res, { ok: false, reason: 'That runs off the edge of the park.' });
      const hit = this.space.conflicts(c.i, c.j, c.yMin, c.yMax);
      if (hit) {
        const why = hit.kind === 'decor' ? 'A decoration is in the way.' : hit.kind === 'station' ? 'The station is in the way.' : 'That bumps into another track. Go over or around.';
        return Object.assign(res, { ok: false, reason: why, hit });
      }
    }
    res.closes = sameState(endSt, this.start);
    res.maxY = maxY;
    return res;
  }

  _push(type, st, colors, evalRes) {
    const def = PIECES[type];
    const samples = evalRes?.samples || computeSamples(def, st.ci, st.cj, st.dir, st.level);
    const cells = evalRes?.cells || computeCells(def, samples);
    const piece = {
      type, def, ci: st.ci, cj: st.cj, dir: st.dir, level: st.level,
      colors: { ...colors }, samples, cells, endState: nextState(def, st), index: this.pieces.length,
      uid: Math.random().toString(36).slice(2, 9),
    };
    const owner = { kind: type === 'station' ? 'station' : 'track', idx: piece.index };
    for (const c of cells) this.space.add(c.i, c.j, c.yMin, type === 'station' ? Math.max(c.yMax, 5.2) : c.yMax, owner);
    if (type === 'station') {
      // platform and building on the right hand side
      const R = DIRS[(st.dir + 1) % 4], F = DIRS[st.dir];
      for (let k = -1; k < 4; k++) {
        this.space.add(st.ci + F.x * k + R.x, st.cj + F.z * k + R.z, -1, 6.5, owner);
      }
    }
    this.pieces.push(piece);
    return piece;
  }

  add(type, colors = this.defaultColors) {
    const ev = this.evaluate(type);
    if (!ev.ok) return { ok: false, reason: ev.reason };
    const piece = this._push(type, ev.state, colors, ev);
    if (ev.closes) this.closed = true;
    this.version++;
    this._rebuildPath();
    return { ok: true, piece, closes: ev.closes };
  }

  undo() {
    if (this.pieces.length <= 1) return null;
    return this.truncate(this.pieces.length - 1)[0];
  }

  truncate(idx) {
    if (idx < 1) idx = 1;
    const removed = this.pieces.splice(idx);
    this.space.removeOwner((o) => o.kind === 'track' && o.idx >= idx);
    if (removed.length) this.closed = false;
    this.version++;
    this._rebuildPath();
    return removed;
  }

  setColors(idx, colors) {
    const p = this.pieces[idx];
    if (!p) return;
    Object.assign(p.colors, colors);
    this.version++;
  }

  /** Build the concatenated path the train rides on. */
  _rebuildPath() {
    let total = 0;
    for (const p of this.pieces) total += p.samples.n + 1;
    const pos = new Float32Array(total * 3), tan = new Float32Array(total * 3), up = new Float32Array(total * 3), right = new Float32Array(total * 3);
    const s = new Float32Array(total), piece = new Int16Array(total), local = new Float32Array(total);
    let o = 0, base = 0;
    for (const p of this.pieces) {
      const sm = p.samples;
      p.sStart = base;
      for (let k = 0; k <= sm.n; k++) {
        pos.set(sm.pos.subarray(k * 3, k * 3 + 3), o * 3);
        tan.set(sm.tan.subarray(k * 3, k * 3 + 3), o * 3);
        up.set(sm.up.subarray(k * 3, k * 3 + 3), o * 3);
        right.set(sm.right.subarray(k * 3, k * 3 + 3), o * 3);
        s[o] = base + sm.s[k];
        piece[o] = p.index;
        local[o] = k / sm.n;
        o++;
      }
      base += sm.length;
      p.sEnd = base;
    }
    this.path = { pos, tan, up, right, s, piece, local, count: total, length: base };
  }

  /** Interpolated frame at arc length s. Wraps when the circuit is closed. */
  frameAt(sIn, out) {
    const P = this.path;
    let s = sIn;
    if (this.closed) { s = ((s % P.length) + P.length) % P.length; }
    else s = Math.max(0, Math.min(P.length, s));
    let lo = 0, hi = P.count - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.s[m] <= s) lo = m; else hi = m; }
    const s0 = P.s[lo], s1 = P.s[hi];
    const f = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
    const lerp3 = (arr, v) => v.set(
      arr[lo * 3] + (arr[hi * 3] - arr[lo * 3]) * f,
      arr[lo * 3 + 1] + (arr[hi * 3 + 1] - arr[lo * 3 + 1]) * f,
      arr[lo * 3 + 2] + (arr[hi * 3 + 2] - arr[lo * 3 + 2]) * f,
    );
    lerp3(P.pos, out.pos); lerp3(P.tan, out.tan).normalize(); lerp3(P.up, out.up).normalize(); lerp3(P.right, out.right).normalize();
    out.piece = f < 0.5 ? P.piece[lo] : P.piece[hi];
    out.local = P.local[lo] + (P.local[hi] - P.local[lo]) * f;
    out.s = s;
    return out;
  }

  pieceAt(s) {
    const P = this.path;
    if (this.closed) s = ((s % P.length) + P.length) % P.length;
    for (const p of this.pieces) if (s >= p.sStart && s <= p.sEnd) return p;
    return this.pieces[this.pieces.length - 1];
  }

  stats() {
    let maxY = 0, length = this.path.length, inversions = 0, drops = 0, maxDrop = 0, curves = 0, specials = {};
    for (const p of this.pieces) {
      const sm = p.samples;
      for (let k = 0; k <= sm.n; k++) maxY = Math.max(maxY, sm.pos[k * 3 + 1]);
      if (p.def.flags.inversion) inversions++;
      if (p.def.dh < 0) { drops++; maxDrop = Math.max(maxDrop, -p.def.dh * H); }
      if (p.def.flags.curve) curves++;
      specials[p.type] = (specials[p.type] || 0) + 1;
    }
    return { pieces: this.pieces.length - 1, length, maxY: maxY - BASE, inversions, drops, maxDrop, curves, specials, closed: this.closed };
  }

  serialize() {
    return {
      v: 1,
      p: this.pieces.slice(1).map((p) => [PIECE_CODES.indexOf(p.type), p.colors.rail, p.colors.spine, p.colors.support]),
      s: [this.pieces[0].colors.rail, this.pieces[0].colors.spine, this.pieces[0].colors.support],
    };
  }

  load(data) {
    this.reset();
    if (!data || !Array.isArray(data.p)) return false;
    if (Array.isArray(data.s)) Object.assign(this.pieces[0].colors, { rail: data.s[0], spine: data.s[1], support: data.s[2] });
    for (const row of data.p) {
      const type = PIECE_CODES[row[0]];
      if (!type || type === 'station') continue;
      const r = this.add(type, { rail: row[1] ?? 0, spine: row[2] ?? 1, support: row[3] ?? 2 });
      if (!r.ok) break;
    }
    this.version++;
    return true;
  }

  /** A* back to the station using simple pieces. Returns piece types or null. */
  autoFinish(maxNodes = 60000) {
    if (this.closed) return [];
    const goal = this.start;
    const moves = ['straight', 'left', 'right', 'down', 'up', 'wideLeft', 'wideRight'];
    const cost = { straight: 1, left: 1.15, right: 1.15, up: 1.6, down: 1.2, wideLeft: 2.1, wideRight: 2.1 };
    const key = (s) => `${s.ci},${s.cj},${s.dir},${s.level}`;
    const h = (s) => Math.abs(s.ci - goal.ci) + Math.abs(s.cj - goal.cj) + Math.abs(s.level - goal.level) * 1.2;
    const startSt = this.end;
    const open = [{ st: startSt, g: 0, f: h(startSt), path: null }];
    const best = new Map([[key(startSt), 0]]);
    let nodes = 0;
    const fits = (type, st) => {
      const def = PIECES[type];
      const ns = nextState(def, st);
      if (ns.level < 0 || ns.level > MAX_LEVEL) return null;
      const rel = relCells(type, st.dir);
      const dy = st.level * H;
      if (rel.minY + dy < -0.05) return null;
      for (const c of rel.cells) {
        const i = c.di + st.ci, j = c.dj + st.cj;
        if (!inGrid(i, j)) return null;
        if (this.space.conflicts(i, j, c.yMin + dy, c.yMax + dy)) return null;
      }
      return ns;
    };
    // binary heap
    const push = (n) => { open.push(n); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p].f <= open[i].f) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const pop = () => { const top = open[0]; const last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < open.length && open[l].f < open[m].f) m = l; if (r < open.length && open[r].f < open[m].f) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
    open.length = 0; push({ st: startSt, g: 0, f: h(startSt), path: null });
    while (open.length && nodes < maxNodes) {
      const cur = pop(); nodes++;
      if (sameState(cur.st, goal) && cur.path) {
        const out = []; let n = cur.path;
        while (n) { out.push(n.type); n = n.prev; }
        return out.reverse();
      }
      for (const m of moves) {
        const ns = fits(m, cur.st);
        if (!ns) continue;
        const g = cur.g + cost[m];
        const k = key(ns);
        if (best.has(k) && best.get(k) <= g) continue;
        best.set(k, g);
        push({ st: ns, g, f: g + h(ns) * 1.05, path: { type: m, prev: cur.path } });
      }
    }
    return null;
  }

  /** Nearest piece to a ray. Returns { index, dist, point } or null. */
  pick(ray, maxDist = 1.4) {
    let best = null;
    const p = new THREE.Vector3();
    for (const pc of this.pieces) {
      const sm = pc.samples;
      for (let k = 0; k <= sm.n; k += 2) {
        p.set(sm.pos[k * 3], sm.pos[k * 3 + 1], sm.pos[k * 3 + 2]);
        const d = ray.distanceSqToPoint(p);
        if (d < maxDist * maxDist) {
          const along = ray.origin.distanceTo(p);
          if (!best || along < best.along - 0.5 || (Math.abs(along - best.along) < 0.5 && d < best.d)) best = { index: pc.index, d, along, point: p.clone() };
        }
      }
    }
    return best;
  }
}
