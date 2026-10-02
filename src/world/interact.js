// Registry of everything in the world that reacts to the cursor. Ray vs sphere tests keep
// picking cheap no matter how much life the valley holds.
import * as THREE from 'three';
import gsap from 'gsap';

export const interactives = [];
const _c = new THREE.Vector3();
const _oc = new THREE.Vector3();

/**
 * @param {object} o
 * @param {THREE.Object3D} [o.obj]
 * @param {() => THREE.Vector3} [o.center]
 * @param {number} o.radius
 * @param {string} o.name
 * @param {string} [o.hint]
 * @param {(hit) => void} [o.onClick]
 * @param {() => void} [o.onHover]
 * @param {() => boolean} [o.enabled]
 */
export function addInteractive(o) {
  o.id = interactives.length;
  interactives.push(o);
  return o;
}

export function removeInteractive(o) {
  const i = interactives.indexOf(o);
  if (i >= 0) interactives.splice(i, 1);
}

export function centerOf(it, out = _c) {
  if (it.center) return out.copy(it.center());
  it.obj.getWorldPosition(out);
  if (it.offset) out.add(it.offset);
  return out;
}

export function pickInteractive(ray, maxDist = 700) {
  let best = null, bestT = maxDist;
  for (const it of interactives) {
    if (it.enabled && !it.enabled()) continue;
    if (it.obj && !it.obj.visible) continue;
    const c = centerOf(it);
    _oc.subVectors(c, ray.origin);
    const tca = _oc.dot(ray.direction);
    if (tca < 0) continue;
    const d2 = _oc.lengthSq() - tca * tca;
    const r = it.radius;
    if (d2 > r * r) continue;
    const t = tca - Math.sqrt(r * r - d2);
    if (t < bestT) { bestT = t; best = it; }
  }
  return best ? { it: best, t: bestT } : null;
}

// ---- shared reactions --------------------------------------------------------
export function squash(obj, k = 1) {
  if (!obj || obj.userData._sq) return;
  obj.userData._sq = true;
  const s = obj.scale.clone();
  gsap.timeline({ onComplete: () => { obj.scale.copy(s); obj.userData._sq = false; } })
    .to(obj.scale, { x: s.x * (1 + 0.25 * k), y: s.y * (1 - 0.22 * k), z: s.z * (1 + 0.25 * k), duration: 0.09, ease: 'power2.out' })
    .to(obj.scale, { x: s.x * (1 - 0.1 * k), y: s.y * (1 + 0.18 * k), z: s.z * (1 - 0.1 * k), duration: 0.12, ease: 'power2.out' })
    .to(obj.scale, { x: s.x, y: s.y, z: s.z, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
}

export function hop(obj, h = 1.2, spin = 0) {
  if (!obj || obj.userData._hop) return;
  obj.userData._hop = true;
  const y = obj.position.y, ry = obj.rotation.y;
  gsap.timeline({ onComplete: () => { obj.position.y = y; obj.userData._hop = false; } })
    .to(obj.position, { y: y + h, duration: 0.25, ease: 'power2.out' })
    .to(obj.position, { y, duration: 0.3, ease: 'bounce.out' });
  if (spin) gsap.to(obj.rotation, { y: ry + spin, duration: 0.55, ease: 'power2.inOut' });
  squash(obj, 0.6);
}

export function wobble(obj, amt = 0.12) {
  if (!obj || obj.userData._wob) return;
  obj.userData._wob = true;
  const rz = obj.rotation.z, rx = obj.rotation.x;
  gsap.timeline({ onComplete: () => { obj.rotation.z = rz; obj.rotation.x = rx; obj.userData._wob = false; } })
    .to(obj.rotation, { z: rz + amt, x: rx - amt * 0.5, duration: 0.08 })
    .to(obj.rotation, { z: rz - amt * 0.8, x: rx + amt * 0.4, duration: 0.12 })
    .to(obj.rotation, { z: rz, x: rx, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
}
