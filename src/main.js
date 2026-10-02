// WAAWer Coaster entry point.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles.css';
import { Game } from './game.js';
import { UI } from './ui/ui.js';
import gsap from 'gsap';

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

async function boot() {
  if (!webglOK()) {
    document.getElementById('loader-text').textContent = 'This browser cannot draw 3D yet. Please try a recent Chrome, Safari, Edge or Firefox.';
    return;
  }
  const game = new Game(document.getElementById('scene'));
  const ui = new UI(game);
  window.__waawer = { game, ui, gsap };
  try { await document.fonts?.load?.('700 20px Fredoka'); } catch { /* fonts are optional */ }
  await game.init((p, label) => ui.progress(p, label));
  window.__waawer.renderer = game.gfx.renderer;
  await ui.hideLoader();
  ui.showTitle();
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loader-text');
  if (t) t.textContent = 'Something tripped over the tracks. Please reload the page.';
});
