// Gasing: pull the string, throw the top, keep it humming.
import * as THREE from 'three';
import gsap from 'gsap';
import { sound } from '../core/audio.js';
import { state } from '../core/state.js';
import { award, confetti, toast } from '../ui/fx.js';
import { RAMP3 } from '../gl/toon.js';

const ink = (geo, push = 0.025) => { const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { p: { value: push } }, vertexShader: 'uniform float p; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * p, 1.0); }', fragmentShader: 'void main(){ gl_FragColor = vec4(0.141,0.106,0.227,1.0); }' })); return m; };

function topTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  const bands = ['#ff5b4d', '#ffc93c', '#ffffff', '#5ab4ff', '#8f7cff', '#ff5b4d', '#3cc8b4', '#ffc93c', '#ff8fb1'];
  bands.forEach((b, i) => { g.fillStyle = b; g.fillRect(0, (i / bands.length) * 64, 512, 64 / bands.length + 1); });
  for (let i = 0; i < 40; i++) { g.fillStyle = '#241b3a'; g.beginPath(); g.arc(i * 13, 36, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

export function initGasing() {
  const stage = document.getElementById('gs-stage'); if (!stage) return null;
  const timeEl = document.getElementById('gs-time'), bestEl = document.getElementById('gs-best'), status = document.getElementById('gs-status');
  let renderer, scene, camera, top, spinGroup, stringLine, shadow, running = false, built = false;
  let best = state.best.gasing || 0; bestEl.textContent = best.toFixed(1);
  const S = { mode: 'ready', w: 0, tilt: 0.25, prec: 0, x: 0, z: 0, vx: 0, vz: 0, t: 0, pull: null, nudges: 0, fall: 0, lastTap: 0 };

  function build() {
    built = true;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    stage.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 50); camera.position.set(0, 3.2, 5.6); camera.lookAt(0, 0.4, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a6ff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 5, 3); scene.add(key);
    // packed earth floor with a chalk ring
    const fc = document.createElement('canvas'); fc.width = fc.height = 512; const g = fc.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#9ce6d8'); gr.addColorStop(1, '#3cc8b4'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc((i % 55) * 9.4 + ((i / 55 | 0) % 2) * 4.7, (i / 55 | 0) * 9.4, 1.6, 0, 7); g.fill(); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.setLineDash([18, 12]); g.beginPath(); g.arc(256, 256, 170, 0, 7); g.stroke();
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshToonMaterial({ map: ft, gradientMap: RAMP3 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // the top
    const prof = [[0, 0], [0.06, 0.02], [0.1, 0.12], [0.42, 0.42], [0.52, 0.56], [0.5, 0.66], [0.36, 0.74], [0.12, 0.78], [0.08, 0.95], [0.04, 1.05], [0, 1.06]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshToonMaterial({ map: topTexture(), gradientMap: RAMP3 }));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), new THREE.MeshToonMaterial({ color: 0xc9d3e6, gradientMap: RAMP3 })); tip.rotation.x = Math.PI; tip.position.y = 0.05;
    spinGroup = new THREE.Group(); spinGroup.add(body, tip, ink(body.geometry, 0.022)); tip.add(ink(tip.geometry, 0.012));
    top = new THREE.Group(); top.add(spinGroup); scene.add(top);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x241b3a, transparent: true, opacity: 0.28, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow);
    const sg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    stringLine = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0x241b3a })); stringLine.visible = false; scene.add(stringLine);
    resize(); window.addEventListener('resize', resize);
    bind();
  }
  function resize() { if (!renderer) return; const r = stage.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }

  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5); const hit = new THREE.Vector3();
  const toWorld = (e) => { const r = stage.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); ray.ray.intersectPlane(plane, hit); return hit.clone(); };

  function bind() {
    const el = renderer.domElement; el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture?.(e.pointerId);
      if (S.mode === 'ready') { S.mode = 'pull'; S.pull = toWorld(e); stringLine.visible = true; status.textContent = 'Pull further. Then let go.'; sound.note(1, 0.08); }
      else if (S.mode === 'spin') {
        const now = performance.now(); if (now - S.lastTap < 700) return; S.lastTap = now;
        const good = S.tilt < 0.12; S.w += good ? 7 : 2; S.tilt += good ? 0.01 : 0.06; S.nudges++;
        sound.note(good ? 5 : 1, 0.12); status.textContent = good ? 'A clean tap. It hums louder.' : 'Too wobbly for that. Careful.';
      } else if (S.mode === 'fallen') reset();
    });
    el.addEventListener('pointermove', (e) => { if (S.mode !== 'pull') return; S.pull = toWorld(e); });
    const release = () => {
      if (S.mode !== 'pull') return;
      const d = Math.min(3, Math.hypot(S.pull.x - S.x, S.pull.z - S.z)); stringLine.visible = false;
      if (d < 0.4) { S.mode = 'ready'; status.textContent = 'A longer pull. Really yank it.'; return; }
      S.mode = 'spin'; S.w = 30 + d * 26; S.tilt = 0.05 + Math.random() * 0.03; S.t = 0; S.nudges = 0;
      S.vx = -(S.pull.x - S.x) * 0.25; S.vz = -(S.pull.z - S.z) * 0.25;
      status.textContent = 'Spinning. Tap it gently to keep it going.'; sound.whoosh();
    };
    el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  }

  function reset() { S.mode = 'ready'; S.w = 0; S.tilt = 0.25; S.x = 0; S.z = 0; S.vx = S.vz = 0; S.fall = 0; S.t = 0; timeEl.textContent = '0.0'; status.textContent = 'Pull the string.'; sound.stopSpin(); }

  let lastT = 0;
  function loop(t) {
    if (!running) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;
    if (S.mode === 'spin') {
      S.t += dt; timeEl.textContent = S.t.toFixed(1);
      S.w -= (1.5 + S.w * 0.08) * dt;
      const crit = 22; if (S.w < crit) S.tilt += (crit - S.w) * 0.0045 * dt * 10; else S.tilt = Math.max(0.02, S.tilt - dt * 0.02);
      S.prec += dt * (2 + S.tilt * 10);
      S.x += S.vx * dt; S.z += S.vz * dt; S.vx *= Math.pow(0.4, dt); S.vz *= Math.pow(0.4, dt);
      S.x += Math.cos(S.prec) * S.tilt * dt * 0.8; S.z += Math.sin(S.prec) * S.tilt * dt * 0.8;
      const R = Math.hypot(S.x, S.z); if (R > 2.6) { S.x *= 2.6 / R; S.z *= 2.6 / R; S.vx *= -0.5; S.vz *= -0.5; }
      sound.spin(Math.min(1, S.w / 80));
      if (S.tilt > 0.9 || S.w < 4) fall();
    } else if (S.mode === 'fallen') {
      S.fall = Math.min(1, S.fall + dt * 2.2); S.w *= Math.pow(0.1, dt);
    }
    spinGroup.rotation.y += S.w * dt;
    const tilt = S.mode === 'fallen' ? 0.9 + S.fall * 0.62 : S.mode === 'ready' || S.mode === 'pull' ? 0.25 : S.tilt;
    top.position.set(S.x, S.mode === 'fallen' ? 0.45 * S.fall * 0.9 : 0, S.z);
    top.rotation.set(Math.sin(S.prec) * tilt, 0, Math.cos(S.prec) * tilt);
    shadow.position.set(S.x + 0.1, 0.01, S.z + 0.08); shadow.scale.setScalar(1 + tilt * 0.4);
    if (S.mode === 'pull') {
      const p = stringLine.geometry.attributes.position; p.setXYZ(0, S.x + 0.4, 0.55, S.z); p.setXYZ(1, S.pull.x, 0.5, S.pull.z); p.needsUpdate = true;
      top.rotation.y = -Math.hypot(S.pull.x - S.x, S.pull.z - S.z) * 0.6;
    }
    renderer.render(scene, camera);
  }
  function fall() {
    S.mode = 'fallen'; sound.stopSpin(); sound.seed(3);
    const time = S.t;
    if (time > best) { best = time; state.best.gasing = best; state.save(); bestEl.textContent = best.toFixed(1); gsap.fromTo(bestEl, { scale: 1.5 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' }); }
    if (time >= 10) { const r = stage.getBoundingClientRect(); confetti({ x: r.left + r.width / 2, y: r.top + r.height / 3, n: 120 }); award('gasing'); status.textContent = `${time.toFixed(1)} seconds. A champion of the kampung. Tap to throw again.`; }
    else status.textContent = `${time.toFixed(1)} seconds. ${time > 6 ? 'Not bad at all.' : 'Pull harder next time.'} Tap to throw again.`;
  }

  return {
    start() { if (!built) build(); resize(); if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); } },
    stop() { running = false; sound.stopSpin(); },
  };
}
