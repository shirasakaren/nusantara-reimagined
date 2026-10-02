// Renderer, scene, camera, lights and the adaptive quality governor.
import * as THREE from 'three';
import { state, setState } from './state.js';
import { bus } from './bus.js';

export const TIERS = {
  low:    { pixelRatio: 1.0, shadows: false, shadowSize: 512,  grass: 900,  flowers: 140, particles: 0.35, antialias: false, trees: 0.6 },
  medium: { pixelRatio: 1.35, shadows: true, shadowSize: 1024, grass: 2600, flowers: 320, particles: 0.7, antialias: true, trees: 0.85 },
  high:   { pixelRatio: 2.0, shadows: true, shadowSize: 2048, grass: 5200, flowers: 560, particles: 1.0, antialias: true, trees: 1.0 },
};

export function detectTier() {
  if (state.quality !== 'auto') return state.quality;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (state.isMobile) return (mem >= 6 && cores >= 6) ? 'medium' : 'low';
  if (cores <= 2 || mem <= 2) return 'low';
  return 'high';
}

export const gfx = {
  renderer: null,
  scene: null,
  camera: null,
  sun: null,
  hemi: null,
  ambient: null,
  tier: TIERS.high,
  canvas: null,
};

export function initRenderer(canvas) {
  const tierName = detectTier();
  setState({ tier: tierName });
  const tier = TIERS[tierName];
  gfx.tier = tier;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier.antialias,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8ff);
  scene.fog = new THREE.Fog(0xbfe6ff, 140, 520);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.3, 1600);
  camera.position.set(60, 55, 80);

  const hemi = new THREE.HemisphereLight(0xdff3ff, 0x8a7a5a, 1.15);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
  sun.position.set(40, 70, 25);
  sun.castShadow = tier.shadows;
  sun.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
  const sc = sun.shadow.camera;
  sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  Object.assign(gfx, { renderer, scene, camera, sun, hemi, ambient, canvas });

  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  return gfx;
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  gfx.camera.aspect = w / h;
  gfx.camera.updateProjectionMatrix();
  gfx.renderer.setSize(w, h, false);
  bus.emit('resize', { w, h });
}

export function applyTier(name) {
  const tier = TIERS[name];
  gfx.tier = tier;
  setState({ tier: name });
  gfx.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.pixelRatio));
  gfx.renderer.setSize(window.innerWidth, window.innerHeight, false);
  const wasShadows = gfx.renderer.shadowMap.enabled;
  gfx.renderer.shadowMap.enabled = tier.shadows;
  gfx.sun.castShadow = tier.shadows;
  if (tier.shadows && gfx.sun.shadow.mapSize.x !== tier.shadowSize) {
    gfx.sun.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
    gfx.sun.shadow.map?.dispose();
    gfx.sun.shadow.map = null;
  }
  if (wasShadows !== tier.shadows) {
    gfx.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => (m.needsUpdate = true)); } });
  }
  bus.emit('tier', name);
}

// Frame-time governor. Steps quality down if the device struggles, never thrashes back up.
const perf = { acc: 0, frames: 0, slow: 0, cooldown: 4 };
export function governor(dt) {
  if (state.quality !== 'auto' || !state.started) return;
  perf.cooldown -= dt;
  perf.acc += dt; perf.frames++;
  if (perf.acc >= 1.5) {
    const fps = perf.frames / perf.acc;
    perf.acc = 0; perf.frames = 0;
    if (perf.cooldown > 0) return;
    if (fps < 38) perf.slow++; else perf.slow = Math.max(0, perf.slow - 1);
    if (perf.slow >= 2) {
      perf.slow = 0; perf.cooldown = 6;
      if (state.tier === 'high') applyTier('medium');
      else if (state.tier === 'medium') applyTier('low');
    }
  }
}
