import * as THREE from 'three';
import { makeCharacter, TYPES } from '../src/gl/chars.js';
import * as A from '../src/gl/assets.js';
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(innerWidth, innerHeight); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color('#bfe3ff');
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);
const q = new URLSearchParams(location.search); const what = q.get('w') || 'chars';
s.add(new THREE.HemisphereLight(0xcfe8ff, 0xb08a6a, 1.6)); const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(4, 8, 6); sun.castShadow = true; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); s.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ color: '#9fd27a' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
const items = [];
if (what === 'chars') {
  Object.keys(TYPES).forEach((t, i) => { const c = makeCharacter(t); c.group.position.set((i % 6 - 2.5) * 0.75, 0, Math.floor(i / 6) * -1.1); s.add(c.group); items.push(c); });
  cam.position.set(0, 1.6, 5.2); cam.lookAt(0, 0.5, -0.5);
} else {
  const list = A.PREVIEW(what); list.forEach((o, i) => s.add(o));
  const d = +(q.get('d') || 14); cam.position.set(d * 0.55, d * 0.45, d * 0.8); cam.lookAt(0, +(q.get('y') || 1.5), 0);
}
let t = 0; (function loop() { requestAnimationFrame(loop); t += 0.016; items.forEach((c, i) => c.pose(t + i, { walk: i % 2 ? 1 : 0, wave: i === 3 ? 1 : 0 })); r.render(s, cam); })();
