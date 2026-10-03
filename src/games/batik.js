// Membatik: wax resist on a digital cloth. Draw, dip, draw again, dip again.
import gsap from 'gsap';
import { sound } from '../core/audio.js';
import { award, toast } from '../ui/fx.js';

export function initBatik() {
  const cv = document.getElementById('bk-canvas'); if (!cv) return null;
  const S = cv.width; const ctx = cv.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const cloth = mk(), dye = mk(), wax = mk(), crack = mk();
  const cx = cloth.getContext('2d'), dx = dye.getContext('2d'), wx = wax.getContext('2d'), kx = crack.getContext('2d');
  const status = document.getElementById('bk-status');
  let tool = 'line', drawing = false, last = null, dips = 0, melting = 1;

  function weave() {
    cx.fillStyle = '#fff6e6'; cx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 3) { cx.fillStyle = `rgba(150,120,80,${0.03 + Math.random() * 0.03})`; cx.fillRect(0, y, S, 1); }
    for (let x = 0; x < S; x += 3) { cx.fillStyle = `rgba(150,120,80,${0.02 + Math.random() * 0.03})`; cx.fillRect(x, 0, 1, S); }
  }
  function reset() {
    weave(); dx.clearRect(0, 0, S, S); wx.clearRect(0, 0, S, S); kx.clearRect(0, 0, S, S); dips = 0; melting = 1;
    // a light pencil guide border, as batik makers sketch first
    wx.save(); wx.strokeStyle = 'rgba(230,200,120,.95)'; wx.lineWidth = 10; wx.strokeRect(40, 40, S - 80, S - 80); wx.lineWidth = 4; wx.strokeRect(62, 62, S - 124, S - 124); wx.restore();
    status.textContent = 'Draw anything. A tulip would make Eliza van Zuylen proud.';
    render();
  }
  function render() {
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(cloth, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(dye, 0, 0); ctx.drawImage(crack, 0, 0); ctx.restore();
    if (melting > 0) { ctx.save(); ctx.globalAlpha = 0.85 * melting; ctx.drawImage(wax, 0, 0); ctx.restore(); }
  }
  const waxStyle = () => { wx.strokeStyle = 'rgba(232,204,128,.96)'; wx.fillStyle = 'rgba(232,204,128,.96)'; wx.lineCap = 'round'; wx.lineJoin = 'round'; };
  function pos(e) { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * S, y: ((e.clientY - r.top) / r.height) * S }; }
  function kawung(x, y, s = 46) {
    waxStyle(); wx.lineWidth = 5;
    for (const a of [45, 135, 225, 315]) { const r = (a * Math.PI) / 180; wx.beginPath(); wx.ellipse(x + Math.cos(r) * s * 0.55, y + Math.sin(r) * s * 0.55, s * 0.55, s * 0.26, r, 0, Math.PI * 2); wx.stroke(); wx.beginPath(); wx.ellipse(x + Math.cos(r) * s * 0.55, y + Math.sin(r) * s * 0.55, s * 0.22, s * 0.06, r, 0, Math.PI * 2); wx.fill(); }
    wx.beginPath(); wx.arc(x, y, 5, 0, 7); wx.fill();
  }
  function tulip(x, y, s = 1) {
    waxStyle(); wx.lineWidth = 5; wx.save(); wx.translate(x, y); wx.scale(s, s);
    wx.beginPath(); wx.moveTo(0, 60); wx.quadraticCurveTo(-6, 20, 0, -6); wx.stroke();
    wx.beginPath(); wx.moveTo(0, 40); wx.quadraticCurveTo(-34, 30, -40, 2); wx.quadraticCurveTo(-16, 10, 0, 34); wx.stroke();
    wx.beginPath(); wx.moveTo(0, 46); wx.quadraticCurveTo(30, 40, 38, 14); wx.quadraticCurveTo(16, 20, 0, 40); wx.stroke();
    wx.beginPath(); wx.moveTo(-22, -10); wx.quadraticCurveTo(-26, -44, -10, -56); wx.lineTo(-4, -34); wx.lineTo(0, -60); wx.lineTo(6, -34); wx.lineTo(12, -56); wx.quadraticCurveTo(28, -44, 22, -10); wx.quadraticCurveTo(0, 6, -22, -10); wx.stroke();
    for (let i = 0; i < 6; i++) { wx.beginPath(); wx.arc(-10 + (i % 3) * 10, -30 + Math.floor(i / 3) * 12, 2.6, 0, 7); wx.fill(); }
    wx.restore();
  }
  function dots(x, y) { waxStyle(); for (let i = 0; i < 9; i++) { const a = Math.random() * 7, r = Math.random() * 28; wx.beginPath(); wx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 3 + Math.random() * 2, 0, 7); wx.fill(); } }

  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture?.(e.pointerId); const p = pos(e); melting = 1;
    if (tool === 'line') { drawing = true; last = p; waxStyle(); wx.lineWidth = 6; wx.beginPath(); wx.arc(p.x, p.y, 3, 0, 7); wx.fill(); }
    else if (tool === 'kawung') { kawung(p.x, p.y); sound.note(3, 0.1); }
    else if (tool === 'tulip') { tulip(p.x, p.y, 0.9 + Math.random() * 0.3); sound.note(5, 0.1); }
    else if (tool === 'dots') { dots(p.x, p.y); sound.seed(2); }
    render();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return; const p = pos(e); const d = Math.hypot(p.x - last.x, p.y - last.y); if (d < 2) return;
    waxStyle(); wx.lineWidth = Math.max(3, 8 - d * 0.12); wx.beginPath(); wx.moveTo(last.x, last.y); wx.lineTo(p.x, p.y); wx.stroke();
    if (Math.random() < 0.015) { wx.beginPath(); wx.arc(p.x + (Math.random() - 0.5) * 14, p.y + 6 + Math.random() * 10, 2 + Math.random() * 3, 0, 7); wx.fill(); }
    last = p; render();
  });
  const end = () => { drawing = false; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  function dip(color, name) {
    if (melting < 1) melting = 1;
    // cracks in the wax let a little dye through, the signature of real batik
    kx.save(); kx.strokeStyle = color; kx.globalAlpha = 0.5; kx.lineWidth = 1;
    for (let i = 0; i < 160; i++) { let x = Math.random() * S, y = Math.random() * S; kx.beginPath(); kx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; kx.lineTo(x, y); } kx.stroke(); }
    kx.globalCompositeOperation = 'destination-in'; kx.globalAlpha = 1; kx.drawImage(wax, 0, 0); kx.restore();
    const st = { y: S }; let prev = S;
    const layer = mk(); const lx = layer.getContext('2d');
    sound.whoosh();
    gsap.to(st, { y: -40, duration: 1.8, ease: 'power2.inOut', onUpdate: () => {
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, S, S);
      const top = Math.max(0, st.y); if (top >= prev) return;
      lx.fillStyle = color; lx.globalAlpha = 0.82; lx.fillRect(0, top, S, prev - top + 1); prev = top;
      lx.globalAlpha = 1; lx.globalCompositeOperation = 'destination-out'; lx.drawImage(wax, 0, 0);
      dx.drawImage(layer, 0, 0); render();
    }, onComplete: () => {
      dips++; status.textContent = dips === 1 ? `Dyed in ${name}. Add more wax to keep some ${name} areas, then dip again.` : `Another layer of ${name}. Press Save to melt off the wax.`;
      if (dips === 1) award('batik');
    } });
  }
  document.querySelectorAll('.bk-tool').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('.bk-tool').forEach((x) => x.classList.toggle('is-on', x === b)); tool = b.dataset.tool; sound.click(); }));
  document.getElementById('bk-dye').addEventListener('click', () => dip('#2f4fb8', 'indigo'));
  document.getElementById('bk-soga').addEventListener('click', () => dip('#b5652a', 'soga brown'));
  document.getElementById('bk-clear').addEventListener('click', () => { reset(); sound.click(); });
  document.getElementById('bk-save').addEventListener('click', () => {
    const st = { m: 1 }; status.textContent = 'Boiling off the wax. This step is called lorod.';
    gsap.to(st, { m: 0, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { melting = st.m; render(); }, onComplete: () => {
      try { const a = document.createElement('a'); a.download = 'my-batik.png'; a.href = cv.toDataURL('image/png'); a.click(); } catch { /* download may be blocked */ }
      status.textContent = 'Your batik is saved. It is one of a kind.'; toast('Saved as my-batik.png', ''); sound.success();
    } });
  });
  let ready = false;
  return { start() { if (!ready) { ready = true; reset(); } } };
}
