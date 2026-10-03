// Congklak against Nenek: 7 holes a side, 7 shells each, relay sowing, counter-clockwise.
import { animate, utils } from 'animejs';
import gsap from 'gsap';
import { sound } from '../core/audio.js';
import { award, confetti, toast } from '../ui/fx.js';
import { visitorName } from '../core/state.js';

const P_STORE = 7, A_STORE = 15;
const isPlayerHole = (i) => i >= 0 && i <= 6;
const isAiHole = (i) => i >= 8 && i <= 14;
const opposite = (i) => 14 - i;

function next(pos, player) {
  let p = (pos + 1) % 16;
  if (player === 0 && p === A_STORE) p = 0;
  if (player === 1 && p === P_STORE) p = 8;
  return p;
}

export function simulate(board, player, hole, record = false) {
  const b = board.slice(); const ev = [];
  let seeds = b[hole]; b[hole] = 0; let pos = hole; let guard = 0;
  if (record) ev.push({ t: 'pick', h: hole, n: seeds });
  let extra = false;
  while (guard++ < 400) {
    while (seeds > 0) { pos = next(pos, player); b[pos]++; seeds--; if (record) ev.push({ t: 'drop', h: pos }); }
    const store = player === 0 ? P_STORE : A_STORE;
    if (pos === store) { extra = true; break; }
    if (b[pos] > 1) { seeds = b[pos]; b[pos] = 0; if (record) ev.push({ t: 'pick', h: pos, n: seeds }); continue; }
    const mine = player === 0 ? isPlayerHole(pos) : isAiHole(pos);
    if (mine && b[opposite(pos)] > 0) {
      const o = opposite(pos); const got = b[o] + b[pos];
      if (record) ev.push({ t: 'capture', from: [o, pos], to: store, n: got });
      b[store] += got; b[o] = 0; b[pos] = 0;
    }
    break;
  }
  return { b, extra, ev };
}

const sideEmpty = (b, player) => (player === 0 ? b.slice(0, 7) : b.slice(8, 15)).every((x) => x === 0);
const moves = (b, player) => (player === 0 ? [0, 1, 2, 3, 4, 5, 6] : [8, 9, 10, 11, 12, 13, 14]).filter((i) => b[i] > 0);

function evaluate(b, depth, player) {
  // positive is good for Nenek
  if (depth === 0 || sideEmpty(b, 0) || sideEmpty(b, 1)) return b[A_STORE] - b[P_STORE] + (b.slice(8, 15).reduce((a, c) => a + c, 0) - b.slice(0, 7).reduce((a, c) => a + c, 0)) * 0.25;
  const ms = moves(b, player); if (!ms.length) return evaluate(b, 0, player);
  let best = player === 1 ? -1e9 : 1e9;
  for (const m of ms) {
    const r = simulate(b, player, m);
    const v = r.extra ? evaluate(r.b, depth - 1, player) + (player === 1 ? 2 : -2) : evaluate(r.b, depth - 1, 1 - player);
    best = player === 1 ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

export function initCongklak() {
  const board = document.getElementById('cg-board'); if (!board) return;
  const status = document.getElementById('cg-status'); const youEl = document.getElementById('cg-you'), aiEl = document.getElementById('cg-ai');
  let B, seeds, busy = false, over = false, turn = 0;
  const holes = [];
  for (let i = 0; i < 16; i++) {
    const h = document.createElement(i === P_STORE || i === A_STORE ? 'div' : 'button');
    h.className = 'cg-hole' + (i === P_STORE || i === A_STORE ? ' is-store' : '') + (isPlayerHole(i) ? ' is-mine' : '') + (isAiHole(i) ? ' is-top' : '');
    h.innerHTML = '<span class="cg-count">0</span>';
    if (isPlayerHole(i)) { h.dataset.cursor = 'Sow'; h.setAttribute('aria-label', `Your hole ${i + 1}`); h.addEventListener('click', () => play(i)); }
    board.appendChild(h); holes.push(h);
  }
  const geo = [];
  const layout = () => {
    const r = board.getBoundingClientRect(); const W = r.width, H = r.height;
    const d = Math.min(W * 0.085, H * 0.3);
    for (let i = 0; i < 16; i++) {
      let x, y, w, h;
      if (i === P_STORE) { x = W * 0.935; y = H * 0.5; w = d * 1.15; h = H * 0.62; }
      else if (i === A_STORE) { x = W * 0.065; y = H * 0.5; w = d * 1.15; h = H * 0.62; }
      else if (isPlayerHole(i)) { x = W * (0.18 + i * 0.107); y = H * 0.72; w = h = d; }
      else { const k = 14 - i; x = W * (0.18 + k * 0.107); y = H * 0.28; w = h = d; }
      geo[i] = { x, y, w, h };
      Object.assign(holes[i].style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    }
  };
  const spot = (i) => { const g = geo[i]; const a = Math.random() * Math.PI * 2; const r = Math.sqrt(Math.random()) * 0.32; return { x: g.x + Math.cos(a) * g.w * r, y: g.y + Math.sin(a) * g.h * r * (i === P_STORE || i === A_STORE ? 1.1 : 1) }; };
  const place = (el, i, dur = 0) => {
    const p = spot(i); el.dataset.h = i; const rot = Math.random() * 180;
    if (!dur) { utils.set(el, { translateX: p.x, translateY: p.y, rotate: rot }); return; }
    animate(el, { translateX: p.x, translateY: p.y, rotate: rot, duration: dur, ease: 'outQuad' });
  };
  const counts = () => { for (let i = 0; i < 16; i++) holes[i].querySelector('.cg-count').textContent = B[i]; youEl.textContent = B[P_STORE]; aiEl.textContent = B[A_STORE]; holes.forEach((h, i) => h.classList.toggle('can', isPlayerHole(i) && B[i] > 0 && turn === 0 && !busy && !over)); };

  function reset() {
    board.querySelectorAll('.cg-seed').forEach((s) => s.remove());
    B = Array(16).fill(0); for (let i = 0; i < 16; i++) if (i !== P_STORE && i !== A_STORE) B[i] = 7;
    layout(); seeds = Array.from({ length: 16 }, () => []);
    for (let i = 0; i < 16; i++) for (let k = 0; k < B[i]; k++) { const s = document.createElement('i'); s.className = 'cg-seed'; board.appendChild(s); place(s, i); seeds[i].push(s); }
    busy = false; over = false; turn = 0; counts();
    status.textContent = 'Your move. Pick a hole on the bottom row.';
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function animateEvents(ev) {
    let hand = [];
    for (const e of ev) {
      if (e.t === 'pick') {
        hand = seeds[e.h].splice(0); B[e.h] = 0; counts();
        const g = geo[e.h];
        hand.forEach((s, k) => animate(s, { translateX: g.x + (k % 4) * 3 - 6, translateY: g.y - g.h * 0.9 - Math.floor(k / 4) * 3, duration: 240, ease: 'outQuad' }));
        holes[e.h].classList.remove('is-hit'); void holes[e.h].offsetWidth; holes[e.h].classList.add('is-hit');
        await wait(260);
      } else if (e.t === 'drop') {
        const s = hand.shift(); if (!s) continue;
        seeds[e.h].push(s); B[e.h]++;
        const g = geo[e.h]; hand.forEach((h, k) => animate(h, { translateX: g.x + (k % 4) * 3 - 6, translateY: g.y - g.h * 0.9 - Math.floor(k / 4) * 3, duration: 160, ease: 'outQuad' }));
        place(s, e.h, 170); sound.seed(e.h); counts();
        await wait(150);
      } else if (e.t === 'capture') {
        const moving = [...seeds[e.from[0]].splice(0), ...seeds[e.from[1]].splice(0)];
        B[e.from[0]] = 0; B[e.from[1]] = 0; seeds[e.to].push(...moving); B[e.to] += moving.length;
        moving.forEach((s, k) => setTimeout(() => { place(s, e.to, 420); }, k * 30));
        sound.success(); counts();
        toast(turn === 0 ? `Captured ${e.n} shells. Nenek raises an eyebrow.` : `Nenek captured ${e.n}. She smiles politely.`, 'whisper');
        await wait(500 + moving.length * 30);
      }
    }
  }

  function finishIfOver() {
    if (!sideEmpty(B, 0) && !sideEmpty(B, 1)) return false;
    over = true;
    for (let i = 0; i < 7; i++) { const mv = seeds[i].splice(0); seeds[P_STORE].push(...mv); B[P_STORE] += mv.length; B[i] = 0; mv.forEach((s) => place(s, P_STORE, 600)); }
    for (let i = 8; i < 15; i++) { const mv = seeds[i].splice(0); seeds[A_STORE].push(...mv); B[A_STORE] += mv.length; B[i] = 0; mv.forEach((s) => place(s, A_STORE, 600)); }
    counts();
    const you = B[P_STORE], ai = B[A_STORE];
    if (you > ai) {
      status.textContent = `You win, ${you} to ${ai}. Nenek wants a rematch.`;
      const r = board.getBoundingClientRect(); confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, n: 160 }); award('congklak');
    } else if (you === ai) status.textContent = `A draw, ${you} each. Very diplomatic.`;
    else status.textContent = `Nenek wins, ${ai} to ${you}. She has played for seventy years.`;
    return true;
  }

  async function play(i) {
    if (busy || over || turn !== 0 || B[i] === 0) { if (B[i] === 0 && !busy) { gsap.fromTo(holes[i], { x: -4 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); } return; }
    busy = true; counts();
    const r = simulate(B, 0, i, true);
    await animateEvents(r.ev);
    if (finishIfOver()) { busy = false; return; }
    if (r.extra) { status.textContent = `Your big hole. Go again, ${visitorName()}.`; sound.chime(); busy = false; counts(); return; }
    turn = 1; await aiTurn();
  }
  async function aiTurn() {
    while (!over) {
      status.innerHTML = 'Nenek is thinking<span class="think"><i>.</i><i>.</i><i>.</i></span>';
      counts(); await wait(900);
      const ms = moves(B, 1); if (!ms.length) { finishIfOver(); break; }
      const scored = ms.map((m) => { const s = simulate(B, 1, m); return { m, v: s.extra ? evaluate(s.b, 2, 1) + 2 : evaluate(s.b, 2, 0) }; }).sort((a, b) => b.v - a.v);
      const pick = Math.random() < 0.8 || scored.length < 2 ? scored[0].m : scored[1].m;
      const r = simulate(B, 1, pick, true);
      status.textContent = 'Nenek sows.';
      await animateEvents(r.ev);
      if (finishIfOver()) break;
      if (r.extra) { status.textContent = 'Nenek landed in her big hole. She goes again.'; await wait(500); continue; }
      break;
    }
    if (!over) { turn = 0; busy = false; status.textContent = 'Your move.'; counts(); }
    busy = false;
  }

  document.getElementById('cg-reset').addEventListener('click', reset);
  window.addEventListener('resize', () => { if (!B) return; layout(); for (let i = 0; i < 16; i++) seeds[i].forEach((s) => place(s, i)); });
  return { start() { if (!B) reset(); else { layout(); for (let i = 0; i < 16; i++) seeds[i].forEach((s) => place(s, i)); } } };
}
