// Extracts the archipelago region from world-atlas into a compact JSON.
import fs from 'node:fs';
import { feature } from 'topojson-client';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const fc = feature(topo, topo.objects.countries);
const want = { '360': 'Indonesia', '458': 'Malaysia', '096': 'Brunei', '702': 'Singapore', '626': 'Timor-Leste', '598': 'Papua New Guinea', '608': 'Philippines', '036': 'Australia', '764': 'Thailand', '116': 'Cambodia', '704': 'Vietnam', '104': 'Myanmar', '418': 'Laos' };
const B = { x0: 88, x1: 150, y0: -16, y1: 14 };
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
// simple Douglas-Peucker
function dp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const out = [];
for (const f of fc.features) {
  const name = want[f.id]; if (!name) continue;
  const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const keep = [];
  for (const p of polys) {
    const outer = p[0];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < B.x0 || x0 > B.x1 || y1 < B.y0 || y0 > B.y1) continue;
    const a = area(outer);
    if (a < (name === 'Indonesia' ? 0.004 : 0.02)) continue;
    const ring = dp(outer, name === 'Indonesia' ? 0.012 : 0.03).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
    if (ring.length < 4) continue;
    keep.push(ring);
  }
  if (keep.length) out.push({ id: f.id, name, polys: keep });
}
fs.writeFileSync('src/data/archipelago.json', JSON.stringify(out));
for (const c of out) console.log(c.name, c.polys.length, c.polys.reduce((s, p) => s + p.length, 0));
console.log('bytes', fs.statSync('src/data/archipelago.json').size);
