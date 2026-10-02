// Modal windows: settings, album, badges, share, save slots, help, train styles,
// confirmations and the chapter celebrations.
import gsap from 'gsap';
import { animate as animeAnimate, stagger } from 'animejs';
import { icon } from './icons.js';
import { state, setState } from '../core/state.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/bus.js';
import { lsGet, lsDel, albumList, albumDelete, download, downloadJSON, shareURL, decodeShare } from '../core/store.js';
import { BADGES, CHAPTERS, FINALE } from './story.js';
import { TRAIN_THEMES, hexToCss } from '../core/palette.js';
import { HELP_ART, HELP_CSS, WAWA_SVG, carSVG } from './art.js';
import { applyTier } from '../core/renderer.js';

const root = () => document.getElementById('modal-root');
let stack = [];

export function fillIcons(el) {
  el.querySelectorAll('[data-icon]').forEach((n) => { if (!n.firstElementChild) n.innerHTML = icon(n.dataset.icon); });
}

export function openModal({ html, wide = false, cls = '', onMount, onClose, dismissable = true }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">${dismissable ? '<button class="icon-btn modal-x" aria-label="Close"><span data-icon="close"></span></button>' : ''}${html}</div>`;
  root().appendChild(back);
  const el = back.querySelector('.modal');
  fillIcons(el);
  audio.play('open');
  gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(el, { y: 50, scale: 0.88, rotate: -2 }, { y: 0, scale: 1, rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.7)' });
  let closed = false;
  const api = {
    el,
    close: () => {
      if (closed) return; closed = true;
      stack = stack.filter((s) => s !== api);
      audio.play('close');
      gsap.to(el, { y: 30, scale: 0.92, opacity: 0, duration: 0.22, ease: 'power2.in' });
      gsap.to(back, { opacity: 0, duration: 0.25, onComplete: () => back.remove() });
      onClose?.();
    },
  };
  if (dismissable) {
    back.addEventListener('pointerdown', (e) => { if (e.target === back) api.close(); });
    el.querySelector('.modal-x').addEventListener('click', api.close);
  }
  stack.push(api);
  onMount?.(el, api);
  bus.emit('ui:modal', el);
  return api;
}

export function closeTopModal() { const m = stack[stack.length - 1]; if (m) { m.close(); return true; } return false; }
export function anyModal() { return stack.length > 0; }

function staggerIn(el, sel) {
  const items = el.querySelectorAll(sel);
  if (!items.length) return;
  animeAnimate(items, { opacity: [0, 1], translateY: [18, 0], scale: [0.92, 1], delay: stagger(35), duration: 520, ease: 'outBack(1.6)' });
}

// ---------------------------------------------------------------- confirm
export function confirmModal({ title, text, yes = 'Yes', no = 'No, keep it', danger = false }) {
  return new Promise((res) => {
    let answered = false;
    const m = openModal({
      html: `<h2>${title}</h2><p class="sub">${text}</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-a="no">${no}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${yes}</button></div>`,
      onClose: () => { if (!answered) res(false); },
      onMount: (el, api) => {
        el.querySelector('[data-a="no"]').onclick = () => { answered = true; res(false); api.close(); };
        el.querySelector('[data-a="yes"]').onclick = () => { answered = true; res(true); api.close(); };
      },
    });
    return m;
  });
}

// ---------------------------------------------------------------- settings
export function settingsModal(game, ui) {
  const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l, ic]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${ic ? `<span data-icon="${ic}"></span>` : ''}${l}</button>`).join('')}</div>`;
  const sw = (name, on, label) => `<button class="switch ${on ? 'on' : ''}" data-sw="${name}"><i></i>${label}</button>`;
  openModal({
    html: `<h2>Settings</h2><p class="sub">Make the valley feel just right.</p>
      <div class="group"><span class="gl">Time of day</span>${seg('time', [['morning', 'Morning', 'sunrise'], ['day', 'Day', 'sun'], ['sunset', 'Sunset', 'sunset'], ['night', 'Night', 'moon']], state.dayPreset)}
        <div style="margin-top:10px">${sw('live', state.liveTime, 'Let time pass by itself')}</div></div>
      <div class="group"><span class="gl">Sound</span><div class="row">${sw('sound', state.sound, 'Sound effects')}${sw('music', state.music, 'Music')}</div></div>
      <div class="group"><span class="gl">Graphics</span>${seg('quality', [['auto', 'Auto'], ['low', 'Light'], ['medium', 'Balanced'], ['high', 'Pretty']], state.quality)}
        <p class="sub" style="margin:8px 0 0;font-size:13px">Light is kindest to older phones. Auto adjusts while you play.</p></div>
      <div class="group"><span class="gl">Park</span><div class="row">
        <button class="btn small" data-act="help"><span data-icon="help"></span>How to play</button>
        <button class="btn small" data-act="story"><span data-icon="star"></span>Replay prologue</button>
        <button class="btn small danger" data-act="new"><span data-icon="trash"></span>Start a new park</button>
      </div></div>
      <p class="sub" style="margin:18px 0 0;font-size:12px">WAAWer Coaster v1.0. Built with three.js, GSAP, anime.js and Motion. Every model, sound and song is made in code.</p>`,
    onMount: (el, api) => {
      el.querySelectorAll('[data-seg]').forEach((s) => s.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        audio.play('click');
        const v = b.dataset.v;
        if (s.dataset.seg === 'time') game.sky.setPreset(v);
        if (s.dataset.seg === 'quality') { setState({ quality: v }); if (v !== 'auto') applyTier(v); game._autosave(); }
      }));
      el.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.sw;
        const key = k === 'live' ? 'liveTime' : k;
        const on = !state[key];
        setState({ [key]: on });
        b.classList.toggle('on', on);
        audio.play('toggle', { on });
        game._autosave();
      }));
      el.querySelector('[data-act="help"]').onclick = () => { api.close(); helpModal(); };
      el.querySelector('[data-act="story"]').onclick = () => { api.close(); ui.storybook(() => {}); };
      el.querySelector('[data-act="new"]').onclick = async () => {
        api.close();
        const ok = await confirmModal({ title: 'Start a new park?', text: 'Your current track, decorations and story progress will be cleared. Your photo album stays.', yes: 'Yes, start fresh', danger: true });
        if (ok) { game.newPark(state.story); ui.afterNewPark(); }
      };
      staggerIn(el, '.group');
    },
  });
}

// ---------------------------------------------------------------- album
export async function albumModal() {
  const photos = await albumList();
  const m = openModal({
    wide: true,
    html: `<h2>Album</h2><p class="sub">${photos.length ? `${photos.length} memories from the valley.` : 'Your snapshots and on-ride photos land here.'}</p>
      ${photos.length ? `<div class="album-grid">${photos.map((p) => `<div class="photo-card" data-id="${p.id}"><img src="${p.url}" alt="${p.caption}" loading="lazy"><div class="pc-bar"><span>${p.kind === 'ride' ? 'On-ride photo' : (p.caption || 'Snapshot')}</span><div class="pc-acts"><button data-a="dl" aria-label="Download"><span data-icon="download"></span></button><button data-a="del" aria-label="Delete"><span data-icon="trash"></span></button></div></div></div>`).join('')}</div>`
        : `<div class="empty"><div class="e-ic">${icon('camera')}</div>No photos yet. Open the camera at the top right and snap your park.</div>`}`,
    onMount: (el) => {
      el.querySelectorAll('.photo-card').forEach((card) => {
        const id = Number(card.dataset.id);
        const p = photos.find((x) => x.id === id);
        card.querySelector('[data-a="dl"]').onclick = () => { download(p.url, `waawer-${id}.jpg`); audio.play('click'); };
        card.querySelector('[data-a="del"]').onclick = async () => { await albumDelete(id); audio.play('erase'); gsap.to(card, { scale: 0.6, opacity: 0, duration: 0.3, onComplete: () => card.remove() }); };
        card.querySelector('img').onclick = () => viewPhoto(p);
      });
      staggerIn(el, '.photo-card');
    },
  });
  return m;
}

export function viewPhoto(p, extra = '') {
  return openModal({
    wide: true,
    html: `<img src="${p.url}" alt="" style="width:100%;border-radius:14px;border:2.5px solid #2a1f3d;display:block">
      <div class="row" style="justify-content:center;margin-top:14px">${extra}<button class="btn primary" data-a="dl"><span data-icon="download"></span>Download</button></div>`,
    onMount: (el) => { el.querySelector('[data-a="dl"]').onclick = () => download(p.url, `waawer-${p.id}.jpg`); },
  });
}

// ---------------------------------------------------------------- badges
export function badgesModal(game) {
  const have = new Set(game.badges);
  openModal({
    wide: true,
    html: `<h2>Badges</h2><p class="sub">${have.size} of ${BADGES.length} collected. Some are hiding in the world.</p>
      <div class="grid-cards">${BADGES.map((b) => `<div class="badge-card ${have.has(b.id) ? '' : 'locked'}"><div class="bi">${icon(b.icon)}</div><b>${have.has(b.id) ? b.name : 'Locked'}</b><small>${b.desc}</small></div>`).join('')}</div>`,
    onMount: (el) => staggerIn(el, '.badge-card'),
  });
}

// ---------------------------------------------------------------- share
export function shareModal(game, ui) {
  const code = game.shareCode();
  const url = shareURL(code);
  openModal({
    html: `<h2>Share your coaster</h2><p class="sub">Anyone with this link can load your track and decorations.</p>
      <div class="group"><span class="gl">Link</span><div class="share-box"><input readonly value="${url}" aria-label="Share link"><button class="btn small primary" data-a="copy"><span data-icon="copy"></span>Copy</button></div></div>
      <div class="group"><span class="gl">More ways</span><div class="row">
        ${navigator.share ? '<button class="btn small" data-a="native"><span data-icon="share"></span>Share</button>' : ''}
        <button class="btn small" data-a="export"><span data-icon="download"></span>Export file</button>
        <label class="btn small" style="cursor:pointer"><span data-icon="upload"></span>Import file<input type="file" accept=".json,application/json" hidden data-a="import"></label>
      </div></div>
      <div class="group"><span class="gl">Paste a code</span><div class="share-box"><input data-a="code" placeholder="Paste a WAAWer link or code"><button class="btn small" data-a="load">Load</button></div></div>`,
    onMount: (el, api) => {
      const inp = el.querySelector('input[readonly]');
      el.querySelector('[data-a="copy"]').onclick = async () => {
        try { await navigator.clipboard.writeText(url); } catch { inp.select(); document.execCommand?.('copy'); }
        audio.play('pop');
        ui.toasts.show({ title: 'Link copied', text: 'Send it to a friend.', ic: 'link' });
      };
      el.querySelector('[data-a="native"]')?.addEventListener('click', () => navigator.share({ title: 'My WAAWer Coaster', text: 'Ride my coaster in WAAWer Coaster!', url }).catch(() => {}));
      el.querySelector('[data-a="export"]').onclick = () => { downloadJSON({ app: 'waawer-coaster', ...game.snapshot() }, 'my-waawer-coaster.json'); audio.play('click'); };
      el.querySelector('[data-a="import"]').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try { const d = JSON.parse(r.result); game.loadPark(d); game._autosave(true); api.close(); ui.toasts.show({ title: 'Park imported', text: 'Welcome back to your coaster.', ic: 'upload' }); }
          catch { ui.toasts.show({ title: 'That file did not work', text: 'Please choose a WAAWer export file.', kind: 'error', ic: 'info' }); }
        };
        r.readAsText(f);
      };
      el.querySelector('[data-a="load"]').onclick = () => {
        const v = el.querySelector('[data-a="code"]').value.trim();
        const m = v.match(/c=([a-z0-9.]+)/i);
        const code2 = m ? m[1] : v;
        if (decodeShare(code2) && game.loadShared(code2)) { api.close(); ui.toasts.show({ title: 'Coaster loaded', text: 'Press play to try it.', ic: 'coaster' }); }
        else ui.toasts.show({ title: 'Hmm, that code looks broken', text: 'Check that you copied the whole link.', kind: 'error', ic: 'info' });
      };
    },
  });
}

// ---------------------------------------------------------------- save slots
export function saveModal(game, ui) {
  const render = (el) => {
    const slots = [0, 1, 2].map((i) => ({ i, s: lsGet('slot' + i) }));
    el.querySelector('.slots').innerHTML = slots.map(({ i, s }) => `<div class="slot" data-i="${i}">
      ${s?.thumb ? `<img src="${s.thumb}" alt="">` : '<div class="noimg"></div>'}
      <div class="s-info"><b>${s ? s.name : `Empty slot ${i + 1}`}</b><small>${s ? new Date(s.date).toLocaleString() + ` · ${(s.data?.track?.p?.length || 0)} pieces` : 'Save your park here.'}</small></div>
      <div class="s-acts"><button class="btn small primary" data-a="save"><span data-icon="save"></span>Save</button>${s ? '<button class="btn small" data-a="load"><span data-icon="upload"></span>Load</button><button class="btn small danger" data-a="del" aria-label="Delete"><span data-icon="trash"></span></button>' : ''}</div></div>`).join('');
    fillIcons(el);
    el.querySelectorAll('.slot').forEach((row) => {
      const i = Number(row.dataset.i);
      row.querySelector('[data-a="save"]').onclick = () => { game.saveSlot(i, `Park ${i + 1}`); render(el); ui.toasts.show({ title: 'Saved', text: `Slot ${i + 1} holds your park now.`, ic: 'save' }); };
      row.querySelector('[data-a="load"]')?.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Load this park?', text: 'Your current park is autosaved, but it will be replaced on screen.', yes: 'Load it' });
        if (ok && game.loadSlot(i)) ui.toasts.show({ title: 'Park loaded', text: 'All aboard.', ic: 'coaster' });
      });
      row.querySelector('[data-a="del"]')?.addEventListener('click', () => { lsDel('slot' + i); audio.play('erase'); render(el); });
    });
  };
  openModal({
    html: `<h2>Save slots</h2><p class="sub">Your park also autosaves every change.</p><div class="slots"></div>`,
    onMount: (el) => { render(el); staggerIn(el, '.slot'); },
  });
}

// ---------------------------------------------------------------- help
export function helpModal() {
  const cards = [
    ['move', 'Move around', 'Right drag, or hold <kbd>Ctrl</kbd> and drag, to slide the view. Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> too. On touch, drag with one finger.'],
    ['rotate', 'Rotate and zoom', 'Left drag to orbit. Scroll to zoom. <kbd>Q</kbd> and <kbd>E</kbd> turn in neat steps. On touch, twist and pinch with two fingers.'],
    ['build', 'Build the track', 'Hover a piece to preview it, click to place it. <kbd>1</kbd> to <kbd>7</kbd> place basics. <kbd>Backspace</kbd> undoes. Bring the track back to the station to close the loop.'],
    ['modes', 'Switch modes', 'Build to edit, View to admire, Ride to sit in the front row. Paint, Decor and Erase live in the dock.'],
    ['ride', 'Run the ride', 'Press play or <kbd>Space</kbd>. Send the train home any time. Each lap ends with a ride report.'],
    ['world', 'Poke the world', 'Almost everything reacts. Clouds, cows, the sun, the windmill, even the whale. Explore and collect badges.'],
  ];
  openModal({
    wide: true,
    html: `<style>${HELP_CSS}</style><h2>How to play</h2><p class="sub">A quick tour. You can open this again from Settings.</p>
      <div class="help-grid">${cards.map(([k, t, p]) => `<div class="help-card"><div class="hc-art">${HELP_ART[k]}</div><h4>${t}</h4><p>${p}</p></div>`).join('')}</div>`,
    onMount: (el) => staggerIn(el, '.help-card'),
  });
}

// ---------------------------------------------------------------- train styles
export function themeModal(game) {
  const render = (el) => {
    el.querySelector('.theme-grid').innerHTML = Object.entries(TRAIN_THEMES).map(([k, t]) => {
      const locked = !game.unlockedThemes.includes(k);
      const ch = CHAPTERS.find((c) => c.id === t.unlock);
      return `<button class="theme-card ${state.trainTheme === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-k="${k}"><div class="tc-car">${carSVG(hexToCss(t.body), hexToCss(t.accent), hexToCss(t.stripe))}</div><b>${t.name}</b><small>${locked ? `Unlocks in ${ch ? ch.title : 'the story'}` : state.trainTheme === k ? 'Riding now' : 'Ready'}</small></button>`;
    }).join('');
    el.querySelectorAll('.theme-card').forEach((b) => b.onclick = () => {
      if (b.classList.contains('locked')) { audio.play('error'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500); return; }
      game.setTheme(b.dataset.k); render(el);
    });
    el.querySelectorAll('[data-cars]').forEach((b) => b.classList.toggle('on', Number(b.dataset.cars) === state.trainCars));
  };
  openModal({
    html: `<h2>Train style</h2><p class="sub">Pick a look for your train. The story unlocks more.</p><div class="theme-grid"></div>
      <div class="group"><span class="gl">Cars</span><div class="seg">${[1, 2, 3, 4, 5].map((n) => `<button data-cars="${n}">${n}</button>`).join('')}</div></div>`,
    onMount: (el) => {
      render(el);
      el.querySelectorAll('[data-cars]').forEach((b) => b.onclick = () => { game.setCars(Number(b.dataset.cars)); audio.play('click'); render(el); });
      staggerIn(el, '.theme-card');
    },
  });
}

// ---------------------------------------------------------------- celebrations
export function chapterModal({ chapter, unlock, next }, onDone) {
  const idx = CHAPTERS.indexOf(chapter) + 1;
  openModal({
    cls: 'celebrate',
    html: `<div class="cel-badge"><div class="rays"></div><div style="width:90px;height:100px">${WAWA_SVG}</div></div>
      <span class="eyebrow2">Chapter ${idx} complete</span>
      <h2 class="cel-title">${chapter.title}</h2>
      <p class="say">${chapter.outro}</p>
      ${chapter.reward ? `<div class="reward"><span data-icon="coaster" style="width:20px;height:20px"></span>New train: ${chapter.reward}</div>` : ''}
      ${next ? `<div class="next"><small>Next chapter</small>${next.title}. ${next.goal}.</div>` : `<div class="next"><small>One last thing</small>Look up at the sky.</div>`}
      <button class="btn big primary" data-a="go">${next ? 'Keep building' : 'See the finale'}</button>`,
    onClose: onDone,
    onMount: (el, api) => {
      el.querySelector('[data-a="go"]').onclick = api.close;
      const t = el.querySelector('.cel-title');
      t.innerHTML = [...t.textContent].map((c) => `<span style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
      animeAnimate(t.querySelectorAll('span'), { translateY: [-30, 0], rotate: [() => (Math.random() - 0.5) * 40, 0], opacity: [0, 1], delay: stagger(30, { start: 250 }), duration: 700, ease: 'outElastic(1, .6)' });
      gsap.fromTo(el.querySelector('.cel-badge'), { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 1, ease: 'elastic.out(1, 0.5)', delay: 0.1 });
    },
  });
}

export function finaleModal(game, onDone) {
  const c = game.counts;
  openModal({
    cls: 'celebrate',
    html: `<div class="cel-badge"><div class="rays"></div><div style="width:90px;height:100px">${WAWA_SVG}</div></div>
      <span class="eyebrow2">The end, and the beginning</span>
      <h2>${FINALE.title}</h2>
      <p class="say">${FINALE.text}</p>
      <div class="stat-row">
        <div><b>${c.pieces}</b><small>pieces</small></div>
        <div><b>${c.waaws}</b><small>WAAWs</small></div>
        <div><b>${c.laps}</b><small>laps</small></div>
        <div><b>${game.badges.length}</b><small>badges</small></div>
      </div>
      <button class="btn big primary" data-a="go">Keep playing</button>`,
    onClose: onDone,
    onMount: (el, api) => {
      el.querySelector('[data-a="go"]').onclick = api.close;
      staggerIn(el, '.stat-row div');
    },
  });
}

export function menuModal(game, ui) {
  openModal({
    html: `<div style="display:flex;align-items:center;gap:14px;margin-bottom:6px"><div style="width:70px;height:80px;flex:none">${WAWA_SVG}</div><div><h2>Hello, builder</h2><p class="sub" style="margin:0">What would you like to do?</p></div></div>
      <div class="slots" style="margin-top:12px">
        <button class="btn" data-a="resume"><span data-icon="play"></span>Back to the park</button>
        <button class="btn" data-a="help"><span data-icon="help"></span>How to play</button>
        <button class="btn" data-a="story"><span data-icon="star"></span>Read the prologue again</button>
        <button class="btn" data-a="settings"><span data-icon="gear"></span>Settings</button>
        <button class="btn" data-a="title"><span data-icon="home"></span>Title screen</button>
      </div>`,
    onMount: (el, api) => {
      el.querySelector('[data-a="resume"]').onclick = api.close;
      el.querySelector('[data-a="help"]').onclick = () => { api.close(); helpModal(); };
      el.querySelector('[data-a="story"]').onclick = () => { api.close(); ui.storybook(() => {}); };
      el.querySelector('[data-a="settings"]').onclick = () => { api.close(); settingsModal(game, ui); };
      el.querySelector('[data-a="title"]').onclick = () => { api.close(); game._autosave(true); setTimeout(() => window.location.reload(), 200); };
      staggerIn(el, '.slots .btn');
    },
  });
}
