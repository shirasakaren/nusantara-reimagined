// Shared state, a tiny event bus and safe storage.
const KEY = 'nusantara-reimagined-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ name: state.name, stamps: [...state.stamps], best: state.best, lite: state.lite })); } catch { /* storage may be blocked */ }
}

const saved = load();
const listeners = new Map();

export const state = {
  name: saved.name || '',
  stamps: new Set(saved.stamps || []),
  best: saved.best || {},
  lite: !!saved.lite,
  sound: false,
  entered: false,
  scene: 'map',
  mood: 'dawn',
  section: null,
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  snap: /[?&]snap/.test(location.search),
  touch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
  mobile: window.innerWidth < 760,
  pointer: { x: 0, y: 0, nx: 0, ny: 0 },
  save,
};

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, data) {
  const set = listeners.get(evt);
  if (set) for (const fn of set) fn(data);
}

export function visitorName(fallback = 'friend') {
  return state.name ? state.name : fallback;
}

window.addEventListener('resize', () => { state.mobile = window.innerWidth < 760; });
window.addEventListener('pointermove', (e) => {
  state.pointer.x = e.clientX; state.pointer.y = e.clientY;
  state.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  state.pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });
