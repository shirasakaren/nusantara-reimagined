// Kata Warisan: a memory game of inherited words.
import gsap from 'gsap';
import { sound } from '../core/audio.js';
import { award, confetti, toast } from '../ui/fx.js';
import { WORDS } from '../story/sections.js';

const PORTUGUESE = [['sepatu', 'sapato', 'shoe'], ['meja', 'mesa', 'table'], ['jendela', 'janela', 'window'], ['bendera', 'bandeira', 'flag'], ['keju', 'queijo', 'cheese'], ['mentega', 'manteiga', 'butter'], ['Minggu', 'domingo', 'Sunday'], ['boneka', 'boneca', 'doll'], ['gereja', 'igreja', 'church'], ['sekolah', 'escola', 'school'], ['lemari', 'armário', 'cupboard'], ['garpu', 'garfo', 'fork'], ['kemeja', 'camisa', 'shirt'], ['pesta', 'festa', 'party'], ['sabun', 'sabão', 'soap']];

export function initKata() {
  const grid = document.getElementById('kt-grid'); if (!grid) return null;
  const movesEl = document.getElementById('kt-moves'), pairsEl = document.getElementById('kt-pairs'), status = document.getElementById('kt-status');
  let first = null, lock = false, moves = 0, pairs = 0;
  const deal = () => {
    const pool = [...WORDS.map((w) => [...w, 'Dutch']), ...PORTUGUESE.map((w) => [...w, 'Portuguese'])].sort(() => Math.random() - 0.5);
    const pick = []; const seen = new Set();
    for (const w of pool) { if (w[0] === w[1] || seen.has(w[0])) continue; seen.add(w[0]); pick.push(w); if (pick.length === 6) break; }
    const cards = pick.flatMap((w, i) => [{ id: i, word: w[0], lang: 'Indonesian', en: w[2] }, { id: i, word: w[1], lang: w[3], en: w[2] }]).sort(() => Math.random() - 0.5);
    grid.innerHTML = cards.map((c, k) => `<div class="kt-card" data-id="${c.id}" data-en="${c.en}"><button aria-label="Card ${k + 1}, face down" data-cursor="Flip"><span class="kt-face kt-back"></span><span class="kt-face kt-front"><b>${c.word}</b><small>${c.lang}</small></span></button></div>`).join('');
    moves = 0; pairs = 0; first = null; lock = false; movesEl.textContent = '0'; pairsEl.textContent = '0'; status.textContent = 'Flip two cards.';
    gsap.from(grid.children, { opacity: 0, y: 30, rotateY: 90, duration: 0.8, stagger: 0.04, ease: 'expo.out' });
    grid.querySelectorAll('.kt-card').forEach((card) => card.querySelector('button').addEventListener('click', () => flip(card)));
  };
  function flip(card) {
    if (lock || card.classList.contains('is-up') || card.classList.contains('is-done')) return;
    card.classList.add('is-up'); card.querySelector('button').setAttribute('aria-label', card.querySelector('b').textContent + ', ' + card.querySelector('small').textContent);
    sound.note(Math.floor(Math.random() * 5) + 2, 0.12);
    if (!first) { first = card; return; }
    moves++; movesEl.textContent = moves;
    const a = first, b = card; first = null;
    if (a.dataset.id === b.dataset.id) {
      setTimeout(() => {
        a.classList.add('is-done'); b.classList.add('is-done'); pairs++; pairsEl.textContent = pairs;
        sound.chime(); status.textContent = `Yes. It means ${a.dataset.en}.`;
        gsap.fromTo([a, b], { scale: 1.08 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
        if (pairs === 6) {
          status.textContent = `All six in ${moves} moves. Your tongue is a museum.`;
          const r = grid.getBoundingClientRect(); confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, n: 140 }); sound.success(); award('kata');
        }
      }, 450);
    } else {
      lock = true;
      setTimeout(() => { a.classList.add('is-wrong'); b.classList.add('is-wrong'); }, 500);
      setTimeout(() => { a.classList.remove('is-up', 'is-wrong'); b.classList.remove('is-up', 'is-wrong'); lock = false; status.textContent = moves > 10 ? 'Take a breath. Look for the sounds.' : 'Not a pair. Try again.'; }, 1100);
    }
  }
  document.getElementById('kt-reset').addEventListener('click', deal);
  let dealt = false;
  return { start() { if (!dealt) { dealt = true; deal(); } } };
}
