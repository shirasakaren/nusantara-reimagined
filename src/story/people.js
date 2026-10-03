// People of the old city, as little 3D portraits. Hover or tap and they wave hello.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state } from '../core/state.js';
import { sound } from '../core/audio.js';

gsap.registerPlugin(ScrollTrigger);

const PEOPLE = [
  { type: 'clerk', name: 'The Company Clerk', role: 'VOC servant', text: 'He signed on for a few years in the Indies. Many like him never sailed home. Fever was the usual reason.' },
  { type: 'mardijker', name: 'The Mardijker', role: 'Freed, Portuguese speaking', text: 'Freed people of Asian origin who spoke a Portuguese creole and prayed in Portuguese churches. Their name comes from merdeka, free.' },
  { type: 'kapitan', name: 'The Kapitan Cina', role: 'Chinese officer', text: 'The Company let the Chinese community run its own affairs through officers. The first Kapitan, Souw Beng Kong, served under Coen himself.' },
  { type: 'budak', name: 'The Enslaved', role: 'From Bali, Sulawesi, India, Arakan', text: 'In the 18th century, more than half of Batavia was enslaved. They built, carried, cooked and served. The colony banned slavery only in 1860.' },
  { type: 'nyai', name: 'The Nyai', role: 'Housekeeper and companion', text: 'She ran a European man\'s home and often bore his children. She had no legal protection. She could be sent away, with or without them.' },
  { type: 'kroncong', name: 'The Kroncong Player', role: 'Kampung Tugu', text: 'In 1661, the Company freed Portuguese speaking captives at Tugu. Their songs on small guitars grew into kroncong.' },
  { type: 'batikmaker', name: 'The Batik Maker', role: 'North coast, from about 1840', text: 'Indo women ran batik workshops and drew tulips, bouquets and fairy tales in wax. Batik Belanda was born.' },
  { type: 'farmer', name: 'The Farmer', role: 'Java, from 1830', text: 'Under the Cultivation System, he was told what to plant and when. The rice he needed came second.' },
  { type: 'kuli', name: 'The Coolie', role: 'Sumatra plantations', text: 'Contract workers were brought to the tobacco estates of Deli. Breaking the contract could be punished as a crime.' },
];

export function initPeople({ relics } = {}) {
  const sec = document.getElementById('people'); if (!sec) return;
  const list = sec.querySelector('.people-list'); const track = sec.querySelector('.people-track');
  list.innerHTML = PEOPLE.map((p) => `<li class="person" tabindex="0" data-cursor="Wave"><div class="person-stage" data-char="${p.type}" aria-label="${p.name}, a 3D figure"></div><div class="person-cap"><small>${p.role}</small><h3>${p.name}</h3><p>${p.text}</p></div></li>`).join('');
  const people = [...list.children];
  people.forEach((p, i) => {
    if (relics) relics.addCharacter(p.querySelector('.person-stage'), PEOPLE[i].type);
    p.addEventListener('pointerenter', () => sound.note(i % 7, 0.14));
    p.addEventListener('focus', () => p.classList.add('is-near')); p.addEventListener('blur', () => p.classList.remove('is-near'));
  });
  const dist = () => Math.max(0, list.scrollWidth - window.innerWidth);
  gsap.to(list, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: track, pin: true, scrub: 0.8, start: 'top top', end: () => '+=' + dist(), invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: () => {
        const cx = window.innerWidth / 2; let best = null, bd = 1e9;
        for (const p of people) { const r = p.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = p; } }
        if (state.touch) people.forEach((p) => p.classList.toggle('is-near', p === best));
      },
    },
  });
}
