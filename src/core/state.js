// Shared runtime state. Plain object, mutated by systems, observed through the bus.
import { bus } from './bus.js';

const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 720;

export const state = {
  started: false,
  mode: 'build',        // build | view | ride | photo
  tool: 'build',        // build | erase | paint | decor
  rideCam: 'orbit',     // orbit | follow | first
  isTouch,
  isMobile: isTouch && small,
  quality: 'auto',      // auto | low | medium | high
  tier: 'high',         // resolved tier
  sound: true,
  music: true,
  timeOfDay: 0.32,      // 0..1, 0.25 sunrise, 0.5 noon-ish, 0.75 sunset, 0 / 1 midnight
  dayPreset: 'day',
  liveTime: false,
  story: true,
  joy: 0,               // 0..1 valley joy, drives saturation and life
  waaws: 0,
  paint: { rail: 0, spine: 1, support: 2 },
  paintColor: 0,
  paintTarget: 'rail',
  decorType: 'tree',
  trainTheme: 'classic',
  trainCars: 3,
  reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
};

export function setState(patch) {
  const changed = {};
  for (const k in patch) {
    if (state[k] !== patch[k]) { changed[k] = patch[k]; state[k] = patch[k]; }
  }
  for (const k in changed) bus.emit('state:' + k, changed[k]);
  if (Object.keys(changed).length) bus.emit('state', changed);
}
