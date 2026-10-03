// Gentle company: whispers when you pause, a welcome when you come back.
import { state, visitorName, on } from '../core/state.js';
import { toast } from './fx.js';

const WHISPERS = [
  'Still here? Take your time. The islands are patient.',
  'Try dragging one of the objects in the glass cases.',
  'Every glowing point on the map has a story.',
  'Headphones help. The gamelan changes with every era.',
  'You can jump between chapters from the menu at the top.',
  'Breathe. Some of these stories are heavy.',
];

export function initIdle() {
  let t = 0, i = 0, hiddenAt = 0;
  const reset = () => { clearTimeout(t); t = setTimeout(whisper, 38000); };
  const whisper = () => { if (state.entered && !document.hidden) toast(WHISPERS[i++ % WHISPERS.length], 'whisper'); reset(); };
  ['pointermove', 'wheel', 'touchstart', 'keydown', 'scroll'].forEach((e) => window.addEventListener(e, reset, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (state.entered && hiddenAt && Date.now() - hiddenAt > 45000) toast(`Welcome back, ${visitorName()}. I kept your place.`, 'whisper');
  });
  on('famine', () => toast('That is what happened to real villages. Slide it back if you like.', 'whisper'));
  on('stamp', () => { if (state.stamps.size === 10) setTimeout(() => toast(`Ten stamps, ${visitorName()}. You are a proper traveller now.`, 'whisper'), 2600); });
  reset();
}
