// Visual side of the track. Pieces are merged into chunks so a long coaster stays at a
// handful of draw calls. New pieces drop in with a springy bounce before merging.
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toonMat } from '../core/toon.js';
import { buildPieceGeometry, buildSupports } from './trackMesh.js';
import { PAL } from '../core/palette.js';

const CHUNK = 10;

export const trackGlowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

export class TrackView {
  constructor(scene, track, space) {
    this.scene = scene; this.track = track; this.space = space;
    this.group = new THREE.Group(); this.group.name = 'track';
    scene.add(this.group);
    this.mat = toonMat();
    this.geo = new Map();     // uid -> { main, glow }
    this.chunks = new Map();  // chunk -> { mesh, glow }
    this.dirty = new Set();
    this.busy = new Set();    // uids currently animating
    this.supports = null;
    this.supportsDirty = true;

    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    this.ghost = new THREE.Mesh(new THREE.BufferGeometry(), this.ghostMat);
    this.ghost.renderOrder = 5;
    this.ghost.visible = false;
    this.group.add(this.ghost);
    this._ghostKey = '';

    this.hlMat = new THREE.MeshBasicMaterial({ color: 0xff5d73, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.hl = new THREE.Group(); this.group.add(this.hl);

    this._buildCursor();
    this.time = 0;
  }

  _buildCursor() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 32), new THREE.MeshBasicMaterial({ color: PAL.sun, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.7); shape.lineTo(0.55, 0); shape.lineTo(0.22, 0); shape.lineTo(0.22, -0.6); shape.lineTo(-0.22, -0.6); shape.lineTo(-0.22, 0); shape.lineTo(-0.55, 0); shape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
    arrowGeo.center();
    const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshToonMaterial({ color: PAL.sun, emissive: 0x553300, emissiveIntensity: 0.3 }));
    arrow.rotation.x = -Math.PI / 2;
    const outline = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide }));
    outline.scale.setScalar(1.12);
    arrow.add(outline);
    const arrowHolder = new THREE.Group(); arrowHolder.add(arrow);
    g.add(arrowHolder);
    this.cursor = g; this.cursorArrow = arrowHolder; this.cursorRing = ring;
    g.visible = false;
    this.group.add(g);
  }

  pieceGeo(piece, force) {
    let e = this.geo.get(piece.uid);
    if (!e || force) {
      if (e) { e.main.dispose(); e.glow?.dispose(); }
      e = buildPieceGeometry(piece);
      this.geo.set(piece.uid, e);
    }
    return e;
  }

  chunkOf(index) { return Math.floor(index / CHUNK); }

  /** Full rebuild, used after loading. */
  rebuildAll() {
    for (const [, e] of this.geo) { e.main.dispose(); e.glow?.dispose(); }
    this.geo.clear();
    for (const [, c] of this.chunks) this._disposeChunk(c);
    this.chunks.clear();
    this.busy.clear();
    for (const p of this.track.pieces) { this.pieceGeo(p); this.dirty.add(this.chunkOf(p.index)); }
    this.supportsDirty = true;
  }

  _disposeChunk(c) {
    if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
    if (c.glow) { this.group.remove(c.glow); c.glow.geometry.dispose(); }
  }

  _rebuildChunk(ci) {
    const old = this.chunks.get(ci);
    if (old) this._disposeChunk(old);
    const mains = [], glows = [];
    for (let i = ci * CHUNK; i < Math.min(this.track.pieces.length, (ci + 1) * CHUNK); i++) {
      const p = this.track.pieces[i];
      if (this.busy.has(p.uid)) continue;
      const e = this.pieceGeo(p);
      mains.push(e.main);
      if (e.glow) glows.push(e.glow);
    }
    const c = {};
    if (mains.length) {
      c.mesh = new THREE.Mesh(mains.length === 1 ? mains[0].clone() : mergeGeometries(mains, false), this.mat);
      c.mesh.castShadow = true; c.mesh.receiveShadow = true;
      this.group.add(c.mesh);
    }
    if (glows.length) {
      c.glow = new THREE.Mesh(glows.length === 1 ? glows[0].clone() : mergeGeometries(glows, false), trackGlowMat);
      this.group.add(c.glow);
    }
    this.chunks.set(ci, c);
  }

  onAdd(piece, animate = true) {
    const e = this.pieceGeo(piece);
    this.supportsDirty = true;
    if (!animate) { this.dirty.add(this.chunkOf(piece.index)); return; }
    this.busy.add(piece.uid);
    const tmp = new THREE.Group();
    const m = new THREE.Mesh(e.main, this.mat); m.castShadow = true;
    tmp.add(m);
    if (e.glow) tmp.add(new THREE.Mesh(e.glow, trackGlowMat));
    // scale around the piece center for a satisfying pop
    const c = e.main.boundingSphere.center;
    const pivot = new THREE.Group(); pivot.position.copy(c);
    tmp.position.set(-c.x, -c.y, -c.z);
    pivot.add(tmp);
    this.group.add(pivot);
    pivot.scale.setScalar(0.4);
    pivot.position.y += 2.2;
    gsap.to(pivot.position, { y: c.y, duration: 0.55, ease: 'bounce.out' });
    gsap.to(pivot.scale, {
      x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.55)',
      onComplete: () => {
        this.group.remove(pivot);
        this.busy.delete(piece.uid);
        this.dirty.add(this.chunkOf(piece.index));
      },
    });
    this.dirty.add(this.chunkOf(piece.index));
  }

  onRemove(pieces, animate = true) {
    for (const p of pieces) {
      const e = this.geo.get(p.uid);
      this.geo.delete(p.uid);
      this.busy.delete(p.uid);
      this.dirty.add(this.chunkOf(p.index));
      if (!e) continue;
      if (!animate) { e.main.dispose(); e.glow?.dispose(); continue; }
      const c = e.main.boundingSphere.center;
      const pivot = new THREE.Group(); pivot.position.copy(c);
      const m = new THREE.Mesh(e.main, this.mat);
      m.position.set(-c.x, -c.y, -c.z);
      pivot.add(m);
      this.group.add(pivot);
      const delay = Math.min(0.6, (pieces.length - 1 - pieces.indexOf(p)) * 0.04);
      gsap.to(pivot.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, delay, ease: 'back.in(2)' });
      gsap.to(pivot.position, {
        y: c.y + 1.5, duration: 0.35, delay, ease: 'power2.in',
        onComplete: () => { this.group.remove(pivot); e.main.dispose(); e.glow?.dispose(); },
      });
    }
    // chunks above the removed range may now be empty
    const maxChunk = this.chunkOf(Math.max(0, this.track.pieces.length - 1));
    for (const [ci, c] of this.chunks) if (ci > maxChunk) { this._disposeChunk(c); this.chunks.delete(ci); }
    this.supportsDirty = true;
  }

  onRecolor(piece) {
    this.pieceGeo(piece, true);
    this.dirty.add(this.chunkOf(piece.index));
    this.supportsDirty = true;
  }

  /** Show or hide the translucent preview of the next piece. */
  setGhost(ev, pieceType) {
    if (!ev || !ev.samples) { this.ghost.visible = false; this._ghostKey = ''; return; }
    const key = pieceType + JSON.stringify(ev.state) + this.track.version;
    if (key !== this._ghostKey) {
      this._ghostKey = key;
      this.ghost.geometry.dispose();
      const fake = { samples: ev.samples, def: ev.def, colors: { rail: 2, spine: 2, support: 2 }, index: 0 };
      this.ghost.geometry = buildPieceGeometry(fake, { lite: true }).main;
    }
    this.ghost.visible = true;
    this.ghostColor = ev.ok ? (ev.closes ? 0xffd34d : 0xbff7e6) : 0xff5d73;
    this.ghostMat.color.set(this.ghostColor);
  }

  setHighlight(indices, color = 0xff5d73) {
    while (this.hl.children.length) this.hl.remove(this.hl.children[0]);
    if (!indices || !indices.length) return;
    this.hlMat.color.set(color);
    for (const i of indices) {
      const p = this.track.pieces[i];
      if (!p) continue;
      const e = this.pieceGeo(p);
      this.hl.add(new THREE.Mesh(e.main, this.hlMat));
    }
  }

  showCursor(on) { this.cursor.visible = on; }

  update(dt, night) {
    this.time += dt;
    for (const ci of this.dirty) this._rebuildChunk(ci);
    this.dirty.clear();
    if (this.supportsDirty) {
      this.supportsDirty = false;
      if (this.supports) { this.group.remove(this.supports); this.supports.geometry.dispose(); this.supports = null; }
      const g = buildSupports(this.track, this.space);
      if (g) {
        this.supports = new THREE.Mesh(g, this.mat);
        this.supports.castShadow = true; this.supports.receiveShadow = true;
        this.group.add(this.supports);
      }
    }
    // ghost pulse
    if (this.ghost.visible) this.ghostMat.opacity = 0.38 + Math.sin(this.time * 5) * 0.14;
    this.hlMat.opacity = 0.35 + Math.sin(this.time * 7) * 0.15;
    // cursor at the track end
    if (this.cursor.visible) {
      const end = this.track.pieces[this.track.pieces.length - 1];
      const sm = end.samples, k = sm.n;
      const x = sm.pos[k * 3], y = sm.pos[k * 3 + 1], z = sm.pos[k * 3 + 2];
      const tx = sm.tan[k * 3], tz = sm.tan[k * 3 + 2];
      this.cursor.position.set(x + tx * 1.4, y - 0.45, z + tz * 1.4);
      this.cursorArrow.rotation.y = Math.atan2(-tx, -tz) + 0;
      this.cursorArrow.children[0].rotation.z = 0;
      this.cursorArrow.position.y = 1.4 + Math.sin(this.time * 4) * 0.25;
      this.cursorRing.scale.setScalar(1 + Math.sin(this.time * 4) * 0.08);
      this.cursorRing.material.opacity = 0.55 + Math.sin(this.time * 4) * 0.25;
    }
    // night lights
    const k = 0.35 + night * 0.95;
    trackGlowMat.color.setRGB(k, k, k);
  }
}
