// The Atlas: wander the archipelago freely and open any place on the map.
import gsap from 'gsap';
import { PLACES } from '../gl/geo.js';
import { state } from '../core/state.js';
import { sound } from '../core/audio.js';
import { openModal, toast } from '../ui/fx.js';

const STORIES = {
  palembang: 'The heart of Srivijaya. From the 7th century, a Buddhist trading power that watched over the Strait of Malacca.',
  trowulan: 'The likely capital of Majapahit, founded in 1293. Its brick ruins still lie among the rice fields of East Java.',
  ternate: 'The clove sultanate. The Portuguese built a stone fort here from 1522. Sultan Baabullah drove them out in 1575.',
  tidore: 'Ternate\'s neighbour and rival. Spain allied with Tidore from 1521 and left in 1663.',
  banda: 'For centuries, the only home of nutmeg and mace. Conquered by the VOC in 1621. Of about 15,000 people, roughly 1,000 remained.',
  run: 'A speck of an island. At Breda in 1667, the Dutch kept Run and the English kept Manhattan.',
  ambon: 'Taken by the Dutch from the Portuguese in 1605. One of the Company\'s first strongholds.',
  malacca: 'Taken by Afonso de Albuquerque in 1511. It opened the sea road to the spice islands.',
  timor: 'Portuguese traders arrived around 1515. Portuguese rule over East Timor lasted until 1975.',
  banten: 'A great pepper port. Dutch ships first anchored here in June 1596.',
  batavia: 'Founded by the VOC on 30 May 1619 on the ruins of Jayakarta. Today it is Jakarta.',
  anyer: 'Kilometre zero of the Great Post Road, begun by Daendels in 1808.',
  panarukan: 'The eastern end of the Great Post Road, about 1,000 kilometres from Anyer.',
  borobudur: 'The 9th century Buddhist monument, cleared from the jungle in 1814.',
  tambora: 'Erupted in April 1815, the most powerful eruption in recorded history. In 1816 Europe had a year without a summer.',
  yogyakarta: 'Diponegoro\'s homeland. During the Revolution, from 1946, the capital of the Republic.',
  magelang: 'Where Prince Diponegoro was arrested during negotiations on 28 March 1830.',
  cirebon: 'Struck by famine in 1843 and 1844, in the years of the Cultivation System.',
  demak: 'Struck by famine in 1848.',
  grobogan: 'Struck by famine in 1849 and 1850.',
  lebak: 'Eduard Douwes Dekker served here as assistant resident in 1856. His novel Max Havelaar is set in Lebak.',
  aceh: 'At war with the Dutch from 1873. Officially conquered in 1904, it resisted for years after.',
  badung: 'On 20 September 1906, the royal court walked into Dutch fire in a puputan.',
  jepara: 'Kartini\'s home. She wrote her letters here and taught girls at a small school.',
  kalijati: 'The air base where the Dutch surrendered Java to Japan on 8 March 1942.',
  blitar: 'PETA soldiers under Supriyadi revolted against the Japanese here in February 1945.',
  rengasdengklok: 'Young activists brought Sukarno and Hatta here before dawn on 16 August 1945.',
  surabaya: 'The Hotel Yamato flag was torn on 19 September 1945. The battle that began on 10 November is remembered as Heroes\' Day.',
  linggadjati: 'The Linggadjati Agreement was negotiated here in November 1946.',
  morowali: 'A huge nickel industrial park, opened in 2015. Jobs, smelters and serious pollution concerns.',
  weda: 'Another nickel park, on Halmahera. Majority owned by a Chinese steel group.',
  riau: 'Palm oil country. Plantations replaced much of the old forest.',
  grasberg: 'One of the world\'s largest gold and copper mines. Indonesia bought a 51 percent stake in 2018.',
  jakarta: 'Home to the government data centres that ransomware hit in 2024.',
  natuna: 'Rich fishing grounds, long visited by foreign boats fishing illegally.',
};

export function initAtlas({ stage, map, lenis, story }) {
  if (!stage || !map.markers) return { open() {} };
  const el = document.createElement('div'); el.id = 'atlas'; el.className = 'atlas'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="atlas-ui"><p class="atlas-kicker">The Atlas</p><h3>Wander the islands</h3><p>Drag to move. Scroll or pinch to zoom. Tap any name to read its story.</p></div><button class="menu-close" aria-label="Close the atlas" data-cursor="Close"><span></span><span></span></button>`;
  document.body.appendChild(el);
  const labels = document.getElementById('labels');
  for (const [id, m] of Object.entries(map.markers)) {
    m.el.dataset.id = id; m.el.dataset.cursor = 'Read'; m.el.setAttribute('role', 'button'); m.el.tabIndex = -1;
    m.el.addEventListener('click', () => { if (!open) return; const p = PLACES[id]; openModal({ kicker: p.note || 'A place', title: p.name, html: `<p>${STORIES[id] || ''}</p>`, art: 'ship' }); });
    m.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') m.el.click(); });
  }
  let open = false; let prev = null; let drag = null; let pinch = null;
  const t = () => map.target;
  const show = () => {
    open = true; prev = { scene: stage.active, skip: stage.skip, rig: { ...map.target } };
    stage.show('map'); stage.skip = false; lenis?.stop();
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); labels.classList.add('is-atlas');
    map.setMarks(Object.keys(map.markers)); map.setRoutes([]); map.setFocus('overview'); map.setDim(0);
    Object.values(map.markers).forEach((m) => { m.el.tabIndex = 0; });
    gsap.fromTo(el.querySelector('.atlas-ui'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
    sound.whoosh();
    setTimeout(() => el.querySelector('.menu-close').focus(), 200);
  };
  const hide = () => {
    open = false; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); labels.classList.remove('is-atlas');
    Object.values(map.markers).forEach((m) => { m.el.tabIndex = -1; });
    if (prev) { stage.show(prev.scene); stage.skip = prev.skip; map.target = prev.rig; }
    lenis?.start(); story?.reactivate?.();
  };
  el.querySelector('.menu-close').addEventListener('click', hide);
  window.addEventListener('keydown', (e) => { const md = document.getElementById('modal'); if (open && e.key === 'Escape' && (!md.classList.contains('is-open') || md.dataset.closing)) hide(); }, true);
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .mlabel')) return; drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return; const k = t().dist / 900;
    const az = (t().az * Math.PI) / 180; const dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    t().lon = Math.max(92, Math.min(144, t().lon - (dx * Math.cos(az) + dy * Math.sin(az)) * 1.4));
    t().lat = Math.max(-12, Math.min(9, t().lat + (dy * Math.cos(az) - dx * Math.sin(az)) * 1.4));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  el.addEventListener('pointerup', () => { drag = null; });
  el.addEventListener('wheel', (e) => { e.preventDefault(); t().dist = Math.max(4, Math.min(44, t().dist * (1 + Math.sign(e.deltaY) * 0.12))); }, { passive: false });
  el.addEventListener('touchmove', (e) => { if (e.touches.length !== 2) { pinch = null; return; } const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) t().dist = Math.max(4, Math.min(44, t().dist * (pinch / d))); pinch = d; }, { passive: true });
  el.addEventListener('touchend', () => { pinch = null; });
  return { open: () => { show(); toast('Every name on this map has a story. Tap one.', 'whisper'); }, close: hide };
}
