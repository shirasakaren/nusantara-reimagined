// Hands-on moments inside the story: a village, a pledge, a typewriter, two flags, a chart, words, stones and lanterns.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { animate, stagger } from 'animejs';
import { animate as springTo } from 'motion';
import { state, emit, on, visitorName } from '../core/state.js';
import { sound } from '../core/audio.js';
import { award, toast, confetti } from '../ui/fx.js';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

export function initSections({ lenis }) {
  wordFlips(); village(); pledge(); typewriter(); flag(); yamato(); myth(); wordWall(); stones(); today(); lanterns(lenis); cards();
}

function wordFlips() {
  document.querySelectorAll('.word-flip li').forEach((li, i) => {
    li.addEventListener('click', () => { li.classList.toggle('is-flipped'); sound.note(i % 7, 0.12); });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.classList.toggle('is-flipped'); } });
  });
  gsap.from('.word-flip li', { opacity: 0, y: 30, rotateX: -40, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.word-flip', start: 'top 85%' } });
}

function village() {
  const root = document.getElementById('ix-village'); if (!root) return;
  const fields = root.querySelector('.ixv-fields'); fields.innerHTML = '<i></i>'.repeat(40);
  const cells = [...fields.children];
  const range = document.getElementById('ixv-range'), count = document.getElementById('ixv-count'), verdict = document.getElementById('ixv-verdict');
  const rice = document.getElementById('m-rice'), profit = document.getElementById('m-profit');
  // fill from the edges inward, as land was taken field by field
  const order = cells.map((_, i) => i).sort((a, b) => ((a * 7919) % 40) - ((b * 7919) % 40));
  let last = -1;
  const say = (n) => {
    if (n === 0) return 'No export crops at all. The official would not allow this for long.';
    if (n < 8) return 'Less than the rule asks. Expect a visit from the official.';
    if (n === 8) return 'This is the rule on paper. One fifth of the land.';
    if (n <= 14) return 'More than the rule. Common in practice, because officials earned a share of every harvest.';
    if (n <= 22) return 'Now the rice runs short. Your labour is pulled away from your own fields too.';
    return 'Hunger. In the 1840s, places like Cirebon and Grobogan knew this feeling.';
  };
  const update = () => {
    const n = +range.value; count.textContent = n;
    order.forEach((ci, k) => cells[ci].classList.toggle('is-cash', k < n));
    const r = Math.max(0, Math.min(1, (40 - n) / 32));
    rice.style.setProperty('--v', `${r * 100}%`); rice.style.setProperty('--c', r > 0.75 ? '#7cc45a' : r > 0.5 ? '#ffc93c' : '#ff5b4d');
    profit.style.setProperty('--v', `${(n / 40) * 100}%`); profit.style.setProperty('--c', '#8f7cff');
    const text = say(n); if (verdict.textContent !== text) { verdict.textContent = text; gsap.fromTo(verdict, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }); }
    if (n !== last) { sound.note(Math.round(8 - n / 6), 0.06); last = n; }
    if (n >= 23 && !root.dataset.warned) { root.dataset.warned = '1'; emit('famine'); }
  };
  range.addEventListener('input', update); update();
  animate(cells, { scale: [0, 1], opacity: [0, 1], delay: stagger(18, { grid: [8, 5], from: 'center' }), duration: 700, ease: 'outBack', autoplay: false });
  ScrollTrigger.create({ trigger: fields, start: 'top 80%', once: true, onEnter: () => animate(cells, { scale: [0, 1], opacity: [0, 1], delay: stagger(22, { grid: [8, 5], from: 'center' }), duration: 700, ease: 'outBack' }) });
}

function pledge() {
  const root = document.getElementById('ix-pledge'); if (!root) return;
  const btns = [...root.querySelectorAll('.pledge-lines button')]; const after = root.querySelector('.pledge-after');
  btns.forEach((b, i) => b.addEventListener('click', () => {
    if (b.classList.contains('is-sworn')) return;
    b.classList.add('is-sworn'); sound.note(2 + i * 2, 0.22);
    springTo(b, { scale: [0.96, 1] }, { type: 'spring', stiffness: 500, damping: 14 });
    const r = b.getBoundingClientRect(); confetti({ x: r.left + r.width * 0.15, y: r.top + r.height / 2, n: 26 });
    if (btns.every((x) => x.classList.contains('is-sworn'))) {
      after.classList.add('is-on'); sound.success(); toast(`Three promises, ${visitorName()}. The same ones, almost a century later.`, 'whisper'); award('pledge');
    }
  }));
  gsap.from(btns, { opacity: 0, x: -30, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: root, start: 'top 75%' } });
}

function typewriter() {
  const root = document.getElementById('ix-proklamasi'); if (!root) return;
  const lines = [...root.querySelectorAll('[data-type]')];
  const title = root.querySelector('.tw-title');
  lines.forEach((p) => { const t = p.dataset.type; p.innerHTML = `<span class="typed"></span><span class="tw-caret" hidden></span><span class="ghost" style="visibility:hidden">${p.innerHTML}</span>`; p.dataset.full = t; });
  let started = false;
  const run = async () => {
    if (started) return; started = true;
    gsap.from(title, { opacity: 0, letterSpacing: '0.6em', duration: 1.2, ease: 'expo.out' });
    for (const p of lines) {
      const typed = p.querySelector('.typed'), ghost = p.querySelector('.ghost'), caret = p.querySelector('.tw-caret');
      caret.hidden = false; const full = p.dataset.full; const sign = p.classList.contains('tw-sign');
      for (let i = 1; i <= full.length; i++) {
        let txt = full.slice(0, i);
        if (sign) txt = txt.replace('Indonesia, ', 'Indonesia,<br>');
        typed.innerHTML = txt; ghost.innerHTML = sign ? '' : full.slice(i);
        if (full[i - 1] !== ' ') sound.type();
        await new Promise((r) => setTimeout(r, state.reduced ? 0 : 24 + Math.random() * 46 + (full[i - 1] === ',' ? 120 : 0)));
      }
      caret.hidden = true; sound.bell();
      await new Promise((r) => setTimeout(r, 300));
    }
    gsap.from(root.querySelectorAll('.tw-notes p'), { opacity: 0, y: 20, duration: 1, stagger: 0.18, ease: 'expo.out' });
  };
  ScrollTrigger.create({ trigger: root, start: 'top 65%', once: true, onEnter: run });
}

function flagPaths(x0, yTop, w, h, t, amp, tear = 0) {
  const N = 18; const top = [], mid = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N; const x = x0 + u * w; const a = amp * u;
    const wy = Math.sin(u * 6 - t * 4) * a + Math.sin(u * 11 - t * 6.3) * a * 0.3;
    const sx = x - Math.abs(Math.sin(u * 6 - t * 4)) * a * 0.15;
    top.push([sx, yTop + wy]); mid.push([sx, yTop + h / 2 + wy * 1.05]); bot.push([sx, yTop + h + wy * 1.1]);
  }
  const P = (arr) => arr.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const R = (arr) => arr.slice().reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { red: `${P(top)}${R(mid)}Z`, white: `${P(mid)}${R(bot)}Z`, top, mid, bot };
}

function flag() {
  const root = document.getElementById('ix-flag'); if (!root) return;
  const red = root.querySelector('.flag-red'), white = root.querySelector('.flag-white'), rope = root.querySelector('.flag-rope');
  const btn = document.getElementById('flag-hold'); const prog = btn.querySelector('.hold-prog'); const done = root.querySelector('.flag-done');
  const st = { p: 0, holding: false, t: 0, finished: false };
  let visible = false;
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  gsap.ticker.add((time, dt) => {
    if (!visible) return;
    st.t += dt / 1000;
    if (st.holding && !st.finished) {
      st.p = Math.min(1, st.p + dt / 1000 / 7);
      if (Math.random() < 0.035) sound.note(Math.floor(st.p * 8), 0.09);
      if (st.p >= 1) finish();
    }
    prog.style.strokeDashoffset = String(352 * (1 - st.p));
    const yTop = 410 - st.p * 376; const amp = 6 + st.p * 6;
    const f = flagPaths(104, yTop, 150, 100, st.t, amp);
    red.setAttribute('d', f.red); white.setAttribute('d', f.white);
    rope.setAttribute('d', `M104 30 L104 ${yTop.toFixed(1)} M104 ${(yTop + 100).toFixed(1)} L106 505`);
  });
  const down = (e) => { if (st.finished) return; e.preventDefault(); st.holding = true; btn.classList.add('is-holding'); };
  const up = () => { st.holding = false; btn.classList.remove('is-holding'); };
  btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up); btn.addEventListener('pointercancel', up);
  btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) down(e); }); btn.addEventListener('keyup', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  function finish() {
    st.finished = true; st.holding = false;
    done.textContent = `Merdeka, ${visitorName()}. You were there.`;
    gsap.from(done, { opacity: 0, y: 20, scale: 0.9, duration: 1, ease: 'back.out(1.8)' });
    const r = root.querySelector('.flag-svg').getBoundingClientRect();
    confetti({ x: r.left + r.width * 0.6, y: r.top + r.height * 0.15, n: 180 });
    sound.success(); award('merdeka');
    btn.querySelector('.hold-text b').textContent = 'Merdeka'; btn.querySelector('.hold-text small').textContent = '17 08 1945';
  }
}

function yamato() {
  const root = document.getElementById('ix-yamato'); if (!root) return;
  const svg = root.querySelector('.yamato-svg'); const done = root.querySelector('.yamato-done');
  svg.innerHTML = `
    <defs><linearGradient id="ysky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#ffe2c2"/></linearGradient></defs>
    <rect x="0" y="0" width="420" height="420" rx="6" fill="url(#ysky)"/>
    <circle cx="330" cy="90" r="36" fill="#ffc93c" stroke="#241b3a" stroke-width="3"/>
    <g fill="#ffe9c9" stroke="#241b3a" stroke-width="3" stroke-linejoin="round">
      <path d="M0 420 V300 h60 v-30 h40 v30 h70 V230 h20 v-30 h36 v30 h20 v70 h60 v-20 h40 v20 h74 v120z"/>
      <rect x="196" y="140" width="12" height="62" fill="#ffd7a8"/>
      <rect x="182" y="196" width="40" height="8"/>
    </g>
    <g fill="#5ab4ff" stroke="#241b3a" stroke-width="2">${Array.from({ length: 12 }, (_, i) => `<rect x="${20 + (i % 6) * 64}" y="${330 + Math.floor(i / 6) * 34}" width="10" height="16"/>`).join('')}</g>
    <rect x="199" y="40" width="6" height="110" rx="3" fill="#ffffff" stroke="#241b3a" stroke-width="2"/>
    <circle cx="202" cy="38" r="6" fill="#ffc93c" stroke="#241b3a" stroke-width="2"/>
    <path class="y-red" fill="#ff3b3b" stroke="#241b3a" stroke-width="2.5" stroke-linejoin="round"/><path class="y-white" fill="#ffffff" stroke="#241b3a" stroke-width="2.5" stroke-linejoin="round"/><path class="y-blue" fill="#2f5fbf" stroke="#241b3a" stroke-width="2.5" stroke-linejoin="round" style="cursor:grab"/>
    <path class="y-tear" fill="none" stroke="#241b3a" stroke-width="2" stroke-dasharray="4 3"/>
    <g class="y-crowd" fill="#241b3a">${Array.from({ length: 22 }, (_, i) => `<g transform="translate(${10 + i * 19} ${404 - (i % 3) * 4})"><circle cy="-22" r="6"/><rect x="-6" y="-16" width="12" height="18" rx="4"/><rect class="y-arm" x="4" y="-30" width="3" height="16" rx="1.5" transform="rotate(${-10 + (i % 4) * 8})"/></g>`).join('')}</g>
    <text class="y-shout" x="210" y="270" text-anchor="middle" font-family="Fredoka Variable, sans-serif" font-weight="700" font-size="52" fill="#ff3b3b" stroke="#241b3a" stroke-width="4" paint-order="stroke" opacity="0">Merdeka!</text>`;
  const red = svg.querySelector('.y-red'), white = svg.querySelector('.y-white'), blue = svg.querySelector('.y-blue'), tear = svg.querySelector('.y-tear');
  const st = { pull: 0, prog: 0, t: 0, torn: false, fall: null };
  let visible = false;
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  const H = 84, W = 128, X = 204, Y = 46;
  gsap.ticker.add((time, dt) => {
    if (!visible) return; st.t += dt / 1000;
    const N = 16; const amp = 5; const rows = [[], [], [], []];
    for (let i = 0; i <= N; i++) {
      const u = i / N; const x = X + u * W; const a = amp * u; const wy = Math.sin(u * 6 - st.t * 4) * a;
      for (let r = 0; r < 4; r++) rows[r].push([x, Y + (H / 3) * r + wy * (1 + r * 0.04) + (r === 3 && !st.torn ? st.pull * 18 * u : 0) + (r === 2 && !st.torn ? st.pull * 4 * u : 0)]);
    }
    const P = (a) => a.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const R = (a) => a.slice().reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    red.setAttribute('d', P(rows[0]) + R(rows[1]) + 'Z'); white.setAttribute('d', P(rows[1]) + R(rows[2]) + 'Z');
    if (!st.torn) {
      blue.setAttribute('d', P(rows[2]) + R(rows[3]) + 'Z');
      const k = Math.round(st.prog * N); const seg = rows[2].slice(0, k + 1).map(([x, y], i) => [x, y + (i % 2 ? 2.5 : -2.5)]);
      tear.setAttribute('d', seg.length > 1 ? P(seg) : '');
    } else if (st.fall) {
      const f = st.fall; f.vy += 420 * (dt / 1000); f.y += f.vy * (dt / 1000); f.r += f.vr * (dt / 1000); f.x += f.vx * (dt / 1000);
      blue.setAttribute('d', P(rows[2]) + R(rows[3]) + 'Z');
      blue.setAttribute('transform', `translate(${f.x} ${f.y}) rotate(${f.r} ${X + W / 2} ${Y + H * 0.83})`);
      if (f.y > 500) st.fall = null;
    }
  });
  let drag = null;
  const stage = root.querySelector('.yamato-stage');
  stage.tabIndex = 0;
  stage.addEventListener('pointerdown', (e) => { if (st.torn) return; drag = { y: e.clientY }; stage.setPointerCapture?.(e.pointerId); blue.style.cursor = 'grabbing'; });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || st.torn) return; const dy = e.clientY - drag.y; drag.y = e.clientY;
    if (dy > 0) { st.pull = Math.min(1, st.pull + dy / 120); st.prog = Math.min(1, st.prog + dy / 260); if (Math.random() < 0.3) sound.noiseHit && sound.can() && sound.noiseHit(sound.ctx.currentTime, { freq: 1800 + Math.random() * 1500, q: 1, dur: 0.05, vel: 0.15 }); }
    if (st.prog >= 1) tearIt();
  });
  const release = () => { drag = null; if (!st.torn) gsap.to(st, { pull: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }); };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); st.prog = Math.min(1, st.prog + 0.25); st.pull = 0.6; if (st.prog >= 1) tearIt(); } });
  function tearIt() {
    if (st.torn) return; st.torn = true; tear.setAttribute('d', '');
    st.fall = { x: 0, y: 0, vy: -60, vx: 40, r: 0, vr: 70 };
    sound.tear(); setTimeout(() => sound.success(), 400);
    const shout = svg.querySelector('.y-shout');
    gsap.fromTo(shout, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2)' });
    gsap.to(svg.querySelectorAll('.y-arm'), { rotate: -150, transformOrigin: '50% 100%', duration: 0.4, stagger: 0.02, ease: 'back.out(3)' });
    gsap.to(svg.querySelectorAll('.y-crowd > g'), { y: '-=8', duration: 0.25, yoyo: true, repeat: 5, stagger: 0.02 });
    done.textContent = 'Red and white. Merdeka!';
    root.querySelector('.yamato-try').textContent = 'The blue fell into the street. The crowd below roared.';
    const r = svg.getBoundingClientRect(); confetti({ x: r.left + r.width * 0.6, y: r.top + r.height * 0.2, n: 120 });
    award('yamato');
  }
}

const MYTH = [
  { name: 'Ambon', sub: 'Maluku', a: 1605 }, { name: 'Batavia', sub: 'Jakarta', a: 1619 }, { name: 'Banda', sub: 'Maluku', a: 1621 },
  { name: 'Most of Java', sub: 'after the Java War', a: 1830 }, { name: 'West Sumatra', sub: 'after the Padri War', a: 1837 },
  { name: 'Aceh', sub: 'after 31 years of war', a: 1904 }, { name: 'Bali', sub: 'after Klungkung', a: 1908 },
];
function myth() {
  const rows = document.querySelector('.mc-rows'); const axis = document.querySelector('.mc-axis'); if (!rows) return;
  const Y0 = 1590, Y1 = 1950; const pct = (y) => ((y - Y0) / (Y1 - Y0)) * 100;
  axis.innerHTML = [1600, 1700, 1800, 1900, 1942].map((y) => `<span style="position:absolute;left:${pct(y)}%;transform:translateX(-50%)">${y}</span>`).join('');
  axis.style.height = '22px';
  rows.innerHTML = `<li><span class="mc-label">The slogan<small>1596 to 1945</small></span><span class="mc-ghost" style="left:${pct(1596)}%;right:${100 - pct(1945)}%"></span></li>` +
    MYTH.map((r) => `<li><span class="mc-label">${r.name}<small>${r.sub}</small></span><span class="mc-bar" style="left:${pct(r.a)}%;right:${100 - pct(1942)}%" data-years="${1942 - r.a} years"></span></li>`).join('');
  const bars = rows.querySelectorAll('.mc-bar');
  bars.forEach((b) => (b.style.transform = 'scaleX(0)'));
  ScrollTrigger.create({ trigger: rows, start: 'top 75%', once: true, onEnter: () => {
    animate(bars, { scaleX: [0, 1], duration: 1600, delay: stagger(140), ease: 'outExpo' });
    sound.chime();
    setTimeout(() => { const r = rows.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) award('myth'); }, 2200);
  } });
}

const WORDS = [
  ['kantor', 'kantoor', 'office'], ['handuk', 'handdoek', 'towel'], ['kulkas', 'koelkast', 'fridge'], ['wortel', 'wortel', 'carrot'], ['gratis', 'gratis', 'free'],
  ['knalpot', 'knalpot', 'exhaust'], ['setir', 'stuur', 'steering wheel'], ['rem', 'rem', 'brake'], ['apotek', 'apotheek', 'pharmacy'], ['bioskop', 'bioscoop', 'cinema'],
  ['polisi', 'politie', 'police'], ['om', 'oom', 'uncle'], ['tante', 'tante', 'aunt'], ['pabrik', 'fabriek', 'factory'], ['korsleting', 'kortsluiting', 'short circuit'],
  ['persneling', 'versnelling', 'gear'], ['gorden', 'gordijn', 'curtain'], ['buku', 'boek', 'book'], ['kamar', 'kamer', 'room'], ['dongkrak', 'dommekracht', 'car jack'],
  ['sekrup', 'schroef', 'screw'], ['karcis', 'kaartjes', 'ticket'], ['ember', 'emmer', 'bucket'], ['wastafel', 'wastafel', 'washbasin'], ['bengkel', 'winkel', 'workshop'], ['kopi', 'koffie', 'coffee'],
];
export { WORDS };
function wordWall() {
  const wall = document.getElementById('word-wall'); if (!wall) return;
  wall.innerHTML = WORDS.map(([id, nl, en]) => `<span class="ww" tabindex="0" data-id="${id}" data-nl="${nl}" data-cursor="Dutch"><span class="ww-t">${id}</span><small>${en}</small></span>`).join('');
  const items = [...wall.querySelectorAll('.ww')];
  const flip = (el, on) => {
    const t = el.querySelector('.ww-t'); el.classList.toggle('is-on', on);
    gsap.to(t, { duration: 0.6, scrambleText: { text: on ? el.dataset.nl : el.dataset.id, chars: 'abcdefghijklmnoprstuvwz', speed: 0.6 }, overwrite: true });
  };
  let seen = new Set();
  items.forEach((el, i) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; flip(el, true); seen.add(i); check(); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; flip(el, false); });
    el.addEventListener('click', () => { flip(el, !el.classList.contains('is-on')); seen.add(i); check(); });
    el.addEventListener('focus', () => flip(el, true)); el.addEventListener('blur', () => flip(el, false));
  });
  const check = () => { if (seen.size === 12) toast('Twelve words and counting. Dutch lives on in your kitchen, your garage and your cinema.', 'whisper'); };
  ScrollTrigger.create({ trigger: wall, start: 'top 80%', once: true, onEnter: () => animate(items, { opacity: [0, 1], translateY: () => [60 + Math.random() * 80, 0], rotate: () => [(Math.random() - 0.5) * 20, 0], duration: 1300, delay: stagger(35), ease: 'outExpo' }) });
}

const STONES = [
  { y: '1695', n: 'Gereja Sion', c: 'Jakarta', d: 'Consecrated in 1695 as the Portuguese Outer Church for the Mardijkers. Still in use.', art: 'church' },
  { y: '1710', n: 'Fatahillah Museum', c: 'Jakarta', d: 'The old Stadhuis, built 1707 to 1710. A museum since 1974.', art: 'hall' },
  { y: '1730', n: 'Toko Merah', c: 'Jakarta', d: 'Built for Van Imhoff on Kali Besar. Painted red after 1851.', art: 'house' },
  { y: '1817', n: 'Kebun Raya Bogor', c: 'Bogor', d: "Founded on 18 May 1817 as 's Lands Plantentuin, the botanical garden of the colony.", art: 'garden' },
  { y: '1879', n: 'Istana Merdeka', c: 'Jakarta', d: 'Built 1873 to 1879 as the palace on Koningsplein. Today, the presidential palace.', art: 'palace' },
  { y: '1907', n: 'Lawang Sewu', c: 'Semarang', d: 'Railway company offices, built from 1904. The name means a thousand doors.', art: 'lawang' },
  { y: '1924', n: 'Gedung Sate', c: 'Bandung', d: 'Built 1920 to 1924, designed by J. Gerber. The ornament on its spire looks like a skewer of satay.', art: 'sate' },
  { y: '1926', n: 'Gedung Merdeka', c: 'Bandung', d: 'Built in 1895 for the Societeit Concordia club, rebuilt in 1926. Host of the Asian-African Conference in 1955.', art: 'palace' },
  { y: '1929', n: 'Stasiun Jakarta Kota', c: 'Jakarta', d: 'Opened on 8 October 1929. Many people still call it Beos.', art: 'station' },
];
const STONE_ART = {
  church: '<path d="M40 150 V80 h120 v70z M30 80 l70 -45 70 45 M60 100 v25 M85 100 v25 M115 100 v25 M140 100 v25 M90 150 v-20 q10 -12 20 0 v20"/>',
  hall: '<path d="M20 150 V85 h160 v65z M15 85 l20 -18 h130 l20 18 M85 67 V50 h30 v17 M90 50 q10 -25 20 0 M100 25 v-10 M35 100 h12 v18 h-12z M60 100 h12 v18 h-12z M128 100 h12 v18 h-12z M153 100 h12 v18 h-12z M90 120 h20 v30 h-20z"/>',
  house: '<path d="M25 150 V70 h150 v80z M20 70 l80 -40 80 40 M45 90 h20 v20 h-20z M90 90 h20 v20 h-20z M135 90 h20 v20 h-20z M90 125 h20 v25 h-20z"/>',
  garden: '<path d="M100 150 V70 M100 100 q-40 -10 -50 -50 q40 0 50 50 M100 85 q40 -10 50 -50 q-40 0 -50 50 M40 150 h120 M60 150 q10 -30 0 -50 M140 150 q-10 -30 0 -50"/>',
  palace: '<path d="M20 150 V90 h160 v60z M60 90 V70 h80 v20 M55 70 l45 -25 45 25 M70 150 V100 M90 150 V100 M110 150 V100 M130 150 V100 M20 110 h30 M150 110 h30"/>',
  lawang: '<path d="M15 150 V70 h170 v80z M15 70 l15 -15 h140 l15 15 M30 150 v-30 q8 -12 16 0 v30 M56 150 v-30 q8 -12 16 0 v30 M82 150 v-30 q8 -12 16 0 v30 M108 150 v-30 q8 -12 16 0 v30 M134 150 v-30 q8 -12 16 0 v30 M160 150 v-30 q8 -12 16 0 v30 M30 100 h140"/>',
  sate: '<path d="M20 150 V95 h160 v55z M70 95 V70 h60 v25 M65 70 l35 -18 35 18 M100 52 V15 M94 22 h12 M94 30 h12 M94 38 h12 M40 115 h12 v18 h-12z M148 115 h12 v18 h-12z M88 115 h24 v35 h-24z"/>',
  station: '<path d="M15 150 V90 h170 v60z M60 90 q40 -55 80 0 M75 150 V105 h50 v45 M30 105 h20 v20 h-20z M150 105 h20 v20 h-20z M100 50 v-10"/>',
};
function stones() {
  const list = document.getElementById('stone-list'); if (!list) return;
  list.innerHTML = STONES.map((s) => `<li><div class="stone" tabindex="0" data-art="${s.art}" data-cursor="Look"><span class="stone-year">${s.y}</span><span class="stone-name">${s.n}<small>${s.d}</small></span><span class="stone-city">${s.c}</span></div></li>`).join('');
  const fl = document.createElement('div'); fl.className = 'stone-float'; document.body.appendChild(fl);
  const qx = gsap.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' }), qy = gsap.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
  let cur = null;
  list.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; qx(e.clientX + 30); qy(e.clientY - 100); });
  list.querySelectorAll('.stone').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      if (cur !== el.dataset.art) { cur = el.dataset.art; fl.innerHTML = `<svg viewBox="0 0 200 170" fill="none" stroke="#241b3a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${STONE_ART[cur]}</svg>`; const ps = fl.querySelectorAll('path'); ps.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }); animate(ps, { strokeDashoffset: 0, duration: 900, ease: 'outQuad' }); }
      gsap.to(fl, { opacity: 1, scale: 1, rotate: -2, duration: 0.4, ease: 'expo.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(fl, { opacity: 0, scale: 0.9, duration: 0.3 }));
  });
  gsap.from(list.querySelectorAll('.stone'), { opacity: 0, y: 30, duration: 1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: list, start: 'top 80%' } });
}

const TODAY = [
  { tag: 'Nickel', num: '60%', cap: 'of the world\'s mined nickel came from Indonesia in 2024.', back: ['Indonesia banned raw ore exports from 2020 so the metal would be processed at home. Smelters rose fast, many of them Chinese owned, like those in the Morowali park.', 'A smelter fire there killed 21 workers in December 2023. Communities report polluted water and air.'], q: 'Who owns the furnace, and who breathes the smoke?', src: 'USGS 2025 and 2026. Morowali reporting.', icon: '<path d="M10 40 L30 10 L50 40 Z M20 40 v8 M40 40 v8"/>' },
  { tag: 'Palm oil', num: '58%', cap: 'of the world\'s palm oil was grown in Indonesia in 2024.', back: ['Palm oil feeds millions of families. It has also driven forest loss. Indonesia lost about 32 million hectares of tree cover between 2001 and 2024.', 'New European rules on deforestation are praised by some and called unfair by others.'], q: 'Whose forest pays for whose breakfast?', src: 'USDA via IndexMundi. Global Forest Watch.', icon: '<path d="M30 50 V20 M30 22 q-14 -2 -20 10 M30 22 q14 -2 20 10 M30 20 q-6 -12 -16 -12 M30 20 q6 -12 16 -12"/>' },
  { tag: 'Data', num: '221M', cap: 'Indonesians were online in 2024. That is 79.5 percent of us.', back: ['In June 2024, ransomware hit a national data centre in Surabaya. Services at 239 government bodies were disrupted. Much of the data had no backup.', 'A personal data protection law passed in 2022. Its oversight agency is still being set up.'], q: 'Where does your data sleep at night?', src: 'APJII 2024. Antara News.', icon: '<path d="M10 20 h40 v24 H10z M22 44 v6 h16 v-6 M18 30 h24"/>' },
  { tag: 'The sea', num: '556', cap: 'illegal fishing boats were sunk by Indonesia between 2014 and 2019.', back: ['Most were foreign flagged, many from Vietnam, the Philippines, Thailand and Malaysia.', 'Research credits the crackdown with cutting fishing effort in our waters by at least a quarter.'], q: 'Who fishes our seas?', src: 'Ministry records via Wikipedia. IUU fishing research.', icon: '<path d="M8 32 q22 -22 44 0 q-22 22 -44 0z M52 32 l6 -6 v12z M20 30 h1"/>' },
  { tag: 'Waste', num: '2,194', cap: 'containers of imported waste were held by customs by October 2019.', back: ['They came from the United States, Europe, Australia and more. Hundreds were sent back.', 'Waste trade is legal in some forms. Dumping contaminated waste on poorer countries is not.'], q: 'Why does their trash sail to us?', src: 'Antara News, 2019.', icon: '<path d="M14 20 h32 l-4 30 H18z M10 20 h40 M24 14 h12 v6"/>' },
  { tag: 'Language', num: '718', cap: 'regional languages live in Indonesia. At least 11 are already extinct.', back: ['Of the 87 languages assessed by the education ministry, 25 were endangered and 5 critical.', 'Languages fade when children stop hearing them at home, often in favour of national or global media.'], q: 'Which words will your grandchildren still know?', src: 'Kemendikbudristek via Antara, 2024.', icon: '<path d="M10 14 h40 v24 H26 l-10 10 v-10 H10z"/>' },
  { tag: 'Land', num: '2,939', cap: 'agrarian conflicts were recorded from 2015 to 2023, over 6.3 million hectares.', back: ['They affected about 1.7 million farming households.', 'Many involve domestic companies and state projects, not only foreign ones. The colonial pattern of who holds the deed has not fully gone.'], q: 'Who holds the deed?', src: 'Konsorsium Pembaruan Agraria via Antara.', icon: '<path d="M10 46 h40 M14 46 V26 l16 -12 16 12 v20 M24 46 V34 h12 v12"/>' },
  { tag: 'Debt', num: '$453B', cap: 'was Indonesia\'s external debt in mid 2026, about 30 percent of GDP.', back: ['Many economists consider this level moderate. Borrowing builds ports and roads.', 'Debt becomes a leash only when the terms decide your policies for you.'], q: 'Who lends, and on what terms?', src: 'Bank Indonesia via Antara, 2026.', icon: '<path d="M30 10 v40 M40 18 q-4 -6 -10 -6 q-10 0 -10 8 q0 8 10 8 q10 0 10 8 q0 8 -10 8 q-6 0 -10 -6"/>' },
];
function today() {
  const grid = document.getElementById('today-grid'); if (!grid) return;
  grid.innerHTML = TODAY.map((c, i) => `<li class="tcard"><button aria-label="${c.tag}: ${c.num} ${c.cap} Tap to read more." data-cursor="Flip">
    <span class="tc-face tc-front"><span class="tf-tag">${String(i + 1).padStart(2, '0')} ${c.tag}</span><svg class="tf-icon" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg><span><span class="tf-num" data-num="${c.num}">${c.num}</span><p class="tf-cap">${c.cap}</p></span></span>
    <span class="tc-face tc-back">${c.back.map((p) => `<p>${p}</p>`).join('')}<p class="tb-q">${c.q}</p><p class="tb-src">${c.src}</p></span></button></li>`).join('');
  const flipped = new Set();
  grid.querySelectorAll('.tcard').forEach((li, i) => {
    li.querySelector('button').addEventListener('click', () => {
      li.classList.toggle('is-flipped'); flipped.add(i); sound.note(i % 6, 0.12);
      if (flipped.size === TODAY.length && !grid.dataset.all) { grid.dataset.all = '1'; toast(`You looked closely at all eight, ${visitorName()}. That is the whole point.`, 'whisper'); sound.success(); }
    });
  });
  gsap.from(grid.querySelectorAll('.tcard'), { opacity: 0, y: 60, rotateX: -25, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: grid, start: 'top 80%' } });
  grid.querySelectorAll('.tf-num').forEach((n) => {
    const raw = n.dataset.num; const m = raw.match(/[\d,.]+/); if (!m) return;
    const target = parseFloat(m[0].replace(/,/g, '')); const pre = raw.slice(0, m.index), post = raw.slice(m.index + m[0].length);
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: n, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: target, duration: 2, ease: 'power3.out', onUpdate: () => { n.textContent = pre + Math.round(o.v).toLocaleString('en-US') + post; } }) });
  });
}

function cards() {
  document.querySelectorAll('.tc-card').forEach((c) => {
    c.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; gsap.to(c, { rotateY: x * 12, rotateX: -y * 10, y: -6, duration: 0.5, ease: 'power3.out' }); });
    c.addEventListener('pointerleave', () => gsap.to(c, { rotateY: 0, rotateX: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }));
  });
  gsap.from('.tc-card', { opacity: 0, y: 50, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.table-cloth', start: 'top 80%' } });
  document.querySelectorAll('.btn-line, .btn-solid, .play-tabs button, .bk-tool').forEach((b) => {
    b.addEventListener('pointerenter', () => springTo(b, { scale: 1.05 }, { type: 'spring', stiffness: 400, damping: 15 }));
    b.addEventListener('pointerleave', () => springTo(b, { scale: 1 }, { type: 'spring', stiffness: 300, damping: 18 }));
    b.addEventListener('pointerdown', () => springTo(b, { scale: 0.94 }, { type: 'spring', stiffness: 600, damping: 20 }));
    b.addEventListener('pointerup', () => springTo(b, { scale: 1.05 }, { type: 'spring', stiffness: 400, damping: 12 }));
  });
}

function lanterns(lenis) {
  const form = document.getElementById('lantern-form'); if (!form) return;
  const input = document.getElementById('lantern-text');
  const layer = document.createElement('div'); layer.className = 'lantern-layer'; document.body.appendChild(layer);
  const release = (text, fromEl, ambient = false) => {
    const l = document.createElement('div'); l.className = 'lantern' + (ambient ? ' is-ambient' : '');
    l.innerHTML = `<span class="lt-body"><span class="lt-glow"></span>${text ? `<span class="lt-text"></span>` : ''}</span>`;
    if (text) l.querySelector('.lt-text').textContent = text;
    layer.appendChild(l);
    const r = fromEl ? fromEl.getBoundingClientRect() : { left: Math.random() * window.innerWidth, top: window.innerHeight + 40, width: 0, height: 0 };
    const x0 = r.left + r.width / 2, y0 = r.top;
    const s = ambient ? 0.35 + Math.random() * 0.4 : 1;
    gsap.set(l, { x: x0, y: y0, scale: s, opacity: 0 });
    const dur = ambient ? 16 + Math.random() * 10 : 14;
    gsap.to(l, { opacity: 1, duration: 1.2 });
    gsap.to(l, { y: -160, duration: dur, ease: 'sine.in' });
    gsap.to(l, { x: x0 + (Math.random() - 0.5) * 300, duration: dur, ease: 'sine.inOut' });
    gsap.to(l, { rotate: 6, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', startAt: { rotate: -6 } });
    gsap.to(l, { scale: s * 0.45, duration: dur, ease: 'power1.in', onComplete: () => l.remove() });
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 40) || 'For everyone who stayed';
    release(text, form.querySelector('button')); input.value = '';
    sound.chime(); award('lantern');
    toast('It is rising. Thank you for remembering with me.', 'whisper');
  });
  let amb = null;
  ScrollTrigger.create({ trigger: '#epilogue', start: 'top 60%', end: 'bottom top', onToggle: (s) => {
    clearInterval(amb);
    if (s.isActive && !state.reduced) amb = setInterval(() => release('', null, true), 2400);
  } });
  document.getElementById('btn-top')?.addEventListener('click', () => { lenis ? lenis.scrollTo(0, { duration: 3 }) : window.scrollTo(0, 0); });
}
