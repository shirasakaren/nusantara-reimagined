// Saving. Autosave and three named slots in localStorage, a compact share code for links,
// JSON export and import, and an IndexedDB photo album. Every storage call is guarded so
// private windows and blocked storage never break the game.
import { PIECE_CODES } from '../coaster/pieces.js';

const KEY = 'waawer:v1:';
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

export function lsGet(k, fallback = null) {
  try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function lsSet(k, v) {
  try { localStorage.setItem(KEY + k, JSON.stringify(v)); return true; } catch { return false; }
}
export function lsDel(k) { try { localStorage.removeItem(KEY + k); } catch { /* ignore */ } }

// ---- share codes ------------------------------------------------------------
// v1.<station colors>.<pieces>.<decor>
// piece = code(1) rail(1) spine(1) support(1)    decor = type(1) i(1) j(1) rot(1)
export function encodeShare(track, decor) {
  const c = (n) => B36[Math.max(0, Math.min(35, n | 0))];
  const st = track.s.map(c).join('');
  const ps = track.p.map(([t, a, b, d]) => c(t) + c(a) + c(b) + c(d)).join('');
  const ds = decor.map(([t, i, j, r]) => c(t) + c(i + 10) + c(j + 10) + c(r)).join('');
  return `v1.${st}.${ps}.${ds}`;
}

export function decodeShare(code) {
  try {
    const [v, st, ps = '', ds = ''] = code.split('.');
    if (v !== 'v1') return null;
    const n = (ch) => B36.indexOf(ch);
    const s = [...st].map(n);
    const p = [];
    for (let i = 0; i + 3 < ps.length; i += 4) p.push([n(ps[i]), n(ps[i + 1]), n(ps[i + 2]), n(ps[i + 3])]);
    const d = [];
    for (let i = 0; i + 3 < ds.length; i += 4) d.push([n(ds[i]), n(ds[i + 1]) - 10, n(ds[i + 2]) - 10, n(ds[i + 3])]);
    if (p.some((r) => !PIECE_CODES[r[0]])) return null;
    return { track: { v: 1, s, p }, decor: d };
  } catch { return null; }
}

export function shareURL(code) {
  const u = new URL(window.location.href);
  u.hash = 'c=' + code;
  return u.toString();
}

export function readHashCode() {
  const h = window.location.hash || '';
  const m = h.match(/c=([a-z0-9.]+)/i);
  return m ? m[1] : null;
}

// ---- album -------------------------------------------------------------------
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const req = indexedDB.open('waawer-album', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}

const memAlbum = [];
export async function albumAdd(photo) {
  const d = await db();
  if (!d) { memAlbum.unshift(photo); return; }
  await new Promise((res) => {
    try {
      const tx = d.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(photo);
      tx.oncomplete = res; tx.onerror = res;
    } catch { memAlbum.unshift(photo); res(); }
  });
}

export async function albumList() {
  const d = await db();
  if (!d) return [...memAlbum];
  return new Promise((res) => {
    try {
      const tx = d.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').getAll();
      req.onsuccess = () => res((req.result || []).sort((a, b) => b.id - a.id));
      req.onerror = () => res([...memAlbum]);
    } catch { res([...memAlbum]); }
  });
}

export async function albumDelete(id) {
  const i = memAlbum.findIndex((p) => p.id === id);
  if (i >= 0) memAlbum.splice(i, 1);
  const d = await db();
  if (!d) return;
  await new Promise((res) => {
    try { const tx = d.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = res; tx.onerror = res; } catch { res(); }
  });
}

export function download(dataUrl, name) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

export function downloadJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
