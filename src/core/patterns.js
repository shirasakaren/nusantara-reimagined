// Batik patterns drawn in code: kawung, parang, truntum and mega mendung clouds.
const enc = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export function kawungTile(color = '#d9b45a', bg = 'none', sw = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">${bg !== 'none' ? `<rect width="40" height="40" fill="${bg}"/>` : ''}<g fill="none" stroke="${color}" stroke-width="${sw}">
  <ellipse cx="10" cy="10" rx="12.5" ry="5.6" transform="rotate(45 10 10)"/><ellipse cx="30" cy="10" rx="12.5" ry="5.6" transform="rotate(-45 30 10)"/>
  <ellipse cx="10" cy="30" rx="12.5" ry="5.6" transform="rotate(-45 10 30)"/><ellipse cx="30" cy="30" rx="12.5" ry="5.6" transform="rotate(45 30 30)"/>
  <ellipse cx="10" cy="10" rx="6" ry="1.6" transform="rotate(45 10 10)"/><ellipse cx="30" cy="10" rx="6" ry="1.6" transform="rotate(-45 30 10)"/>
  <ellipse cx="10" cy="30" rx="6" ry="1.6" transform="rotate(-45 10 30)"/><ellipse cx="30" cy="30" rx="6" ry="1.6" transform="rotate(45 30 30)"/>
  </g><g fill="${color}"><circle cx="20" cy="20" r="1.6"/><circle cx="0" cy="0" r="1.6"/><circle cx="40" cy="0" r="1.6"/><circle cx="0" cy="40" r="1.6"/><circle cx="40" cy="40" r="1.6"/>
  <circle cx="20" cy="2.5" r=".9"/><circle cx="20" cy="37.5" r=".9"/><circle cx="2.5" cy="20" r=".9"/><circle cx="37.5" cy="20" r=".9"/></g></svg>`;
}

export function parangTile(ink = '#0d1426', soga = '#8a5a2b', bg = '#f5eedd') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 26" width="52" height="26"><rect width="52" height="26" fill="${bg}"/>
  <g fill="${soga}"><path d="M-6 26 Q2 10 14 6 Q6 18 4 26Z"/><path d="M20 26 Q28 10 40 6 Q32 18 30 26Z"/><path d="M46 26 Q54 10 66 6 Q58 18 56 26Z"/></g>
  <g fill="none" stroke="${ink}" stroke-width="1.6"><path d="M0 26 L26 0 M26 26 L52 0"/></g>
  <g fill="${ink}"><circle cx="13" cy="19" r="1.6"/><circle cx="39" cy="19" r="1.6"/><path d="M26 6 l3 3 -3 3 -3 -3z"/><path d="M0 6 l3 3 -3 3 -3 -3z"/><path d="M52 6 l3 3 -3 3 -3 -3z"/></g></svg>`;
}

export function truntumTile(color = '#d9b45a') {
  const star = (x, y, r) => {
    let d = '';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`; }
    return d + 'Z';
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><g fill="${color}"><path d="${star(7.5, 7.5, 4)}"/><path d="${star(22.5, 22.5, 4)}"/><circle cx="22.5" cy="7.5" r="1"/><circle cx="7.5" cy="22.5" r="1"/></g></svg>`;
}

export function installPatternVars() {
  const r = document.documentElement.style;
  r.setProperty('--kawung', enc(kawungTile('#d9b45a')));
  r.setProperty('--kawung-ink', enc(kawungTile('rgba(13,20,38,.35)')));
  r.setProperty('--parang', enc(parangTile()));
  r.setProperty('--truntum', enc(truntumTile()));
}

// A mega mendung (Cirebon cloud) outline: a chain of rounded lobes, closed below.
export function cloudPath(cx, cy, w, h, lobes = 5, seed = 1) {
  let rnd = seed;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const pts = [];
  const left = cx - w / 2;
  let d = `M${left} ${cy}`;
  const step = w / lobes;
  for (let i = 0; i < lobes; i++) {
    const x0 = left + i * step; const x1 = x0 + step;
    const lift = h * (0.55 + rand() * 0.45) * Math.sin(((i + 0.5) / lobes) * Math.PI) + h * 0.2;
    d += ` C${x0} ${cy - lift * 1.25} ${x1} ${cy - lift * 1.25} ${x1} ${cy}`;
    pts.push(lift);
  }
  // curl back underneath with a spiral tip, as in mega mendung
  d += ` C${cx + w / 2 + step * 0.4} ${cy + h * 0.25} ${cx + w * 0.3} ${cy + h * 0.45} ${cx} ${cy + h * 0.32}`;
  d += ` C${cx - w * 0.3} ${cy + h * 0.45} ${left - step * 0.4} ${cy + h * 0.25} ${left} ${cy}Z`;
  return d;
}

// Concentric cloud bands from dark to light, the signature of the motif.
export function megaMendungSVG(w, h, { colors = ['#0d1426', '#1f2b55', '#2e3f7a', '#4c62a6', '#8ea2d6', '#dfe6f5'], clouds = null } = {}) {
  const list = clouds || [
    { x: w * 0.25, y: h * 0.35, w: w * 0.7, h: h * 0.3, l: 5, s: 3 },
    { x: w * 0.78, y: h * 0.62, w: w * 0.62, h: h * 0.26, l: 4, s: 7 },
    { x: w * 0.4, y: h * 0.9, w: w * 0.9, h: h * 0.3, l: 6, s: 11 },
  ];
  let out = '';
  for (const c of list) {
    colors.forEach((col, i) => {
      const k = 1 - i * 0.13;
      out += `<path d="${cloudPath(c.x, c.y, c.w * k, c.h * k, c.l, c.s)}" fill="${col}"/>`;
    });
  }
  return out;
}
