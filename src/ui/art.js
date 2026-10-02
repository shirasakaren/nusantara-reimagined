// Inline SVG illustrations for the storybook, the Wawa avatar and the help cards.
// All original drawings, built from simple shapes with the same ink outline as the 3D world.
const INK = '#2a1f3d';

export const WAWA_SVG = `
<svg viewBox="0 0 120 136" aria-label="Wawa">
  <ellipse cx="60" cy="128" rx="34" ry="6" fill="${INK}" opacity=".15"/>
  <ellipse cx="42" cy="121" rx="13" ry="7" fill="#ff9f43" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="78" cy="121" rx="13" ry="7" fill="#ff9f43" stroke="${INK}" stroke-width="4"/>
  <path d="M28 58 L22 30 L44 46 Z" fill="#fff0d6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M92 58 L98 30 L76 46 Z" fill="#fff0d6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="60" cy="80" rx="40" ry="44" fill="#fff0d6" stroke="${INK}" stroke-width="4.5"/>
  <ellipse cx="60" cy="94" rx="25" ry="24" fill="#ffffff"/>
  <path d="M22 84 C 14 90, 14 100, 22 104" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M98 84 C 106 80, 110 70, 106 62" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <g class="eyes">
    <ellipse cx="47" cy="70" rx="9" ry="11" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="73" cy="70" rx="9" ry="11" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="48" cy="72" rx="5" ry="6.5" fill="${INK}"/>
    <ellipse cx="72" cy="72" rx="5" ry="6.5" fill="${INK}"/>
    <circle cx="50" cy="69" r="2" fill="#fff"/><circle cx="74" cy="69" r="2" fill="#fff"/>
  </g>
  <ellipse cx="34" cy="84" rx="7" ry="4.5" fill="#ff9ec7"/>
  <ellipse cx="86" cy="84" rx="7" ry="4.5" fill="#ff9ec7"/>
  <path d="M52 86 Q60 94 68 86" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M26 46 C 26 18, 94 18, 94 46 Z" fill="#ffc94a" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M18 47 Q60 38 102 47 Q60 54 18 47 Z" fill="#ffc94a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M60 20 V44" stroke="#ffe08a" stroke-width="7" stroke-linecap="round"/>
  <circle cx="60" cy="34" r="5" fill="#fff" stroke="${INK}" stroke-width="3"/>
</svg>`;

const hills = (c1, c2, c3) => `
  <path d="M0 230 C 120 150, 220 170, 330 200 S 560 140, 760 190 V 330 H 0 Z" fill="${c1}" stroke="${INK}" stroke-width="4"/>
  <path d="M0 270 C 160 220, 300 250, 420 240 S 640 210, 760 250 V 330 H 0 Z" fill="${c2}" stroke="${INK}" stroke-width="4"/>
  <path d="M0 300 C 200 280, 420 300, 760 286 V 330 H 0 Z" fill="${c3}" stroke="${INK}" stroke-width="4"/>`;

const cloud = (x, y, s = 1, cls = 'sb-cloud') => `
  <g class="${cls}" transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 30 C -2 14, 18 8, 26 16 C 30 0, 58 0, 62 16 C 76 10, 90 22, 84 32 Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  </g>`;

const windmill = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-16 0 L-10 -64 H10 L16 0 Z" fill="#fff3df" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-14 -62 L0 -84 L14 -62 Z" fill="#e25b45" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <g class="sb-spin" style="transform-origin: 0px -60px">
      <rect x="-4" y="-112" width="8" height="52" rx="3" fill="#ff6b6b" stroke="${INK}" stroke-width="3"/>
      <rect x="-4" y="-60" width="8" height="52" rx="3" fill="#fff3df" stroke="${INK}" stroke-width="3"/>
      <rect x="-52" y="-64" width="52" height="8" rx="3" fill="#fff3df" stroke="${INK}" stroke-width="3"/>
      <rect x="0" y="-64" width="52" height="8" rx="3" fill="#ff6b6b" stroke="${INK}" stroke-width="3"/>
      <circle cx="0" cy="-60" r="6" fill="#ffc94a" stroke="${INK}" stroke-width="3"/>
    </g>
  </g>`;

const sun = (x, y, face = true) => `
  <g transform="translate(${x} ${y})">
    <g class="sb-spin-slow">${Array.from({ length: 10 }, (_, i) => `<path d="M0 -50 L7 -36 L-7 -36 Z" fill="#ffc02e" stroke="${INK}" stroke-width="2.5" transform="rotate(${i * 36})"/>`).join('')}</g>
    <circle r="30" fill="#ffd65a" stroke="${INK}" stroke-width="4"/>
    ${face ? `<path d="M-14 -4 q5 -6 10 0 M4 -4 q5 -6 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-8 8 q8 8 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-16" cy="6" r="4" fill="#ff9a7a"/><circle cx="16" cy="6" r="4" fill="#ff9a7a"/>` : ''}
  </g>`;

const coaster = (op = 1, broken = false) => `
  <g opacity="${op}">
    <path d="M60 250 C 140 250, 160 90, 240 90 S 330 230, 400 230 S 470 130, 540 130 S 640 250, 720 250" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" ${broken ? 'stroke-dasharray="40 26"' : ''}/>
    <path d="M60 250 C 140 250, 160 90, 240 90 S 330 230, 400 230 S 470 130, 540 130 S 640 250, 720 250" fill="none" stroke="#c99a6b" stroke-width="5" stroke-linecap="round" ${broken ? 'stroke-dasharray="40 26"' : ''}/>
    ${[150, 200, 240, 290, 350, 470, 520, 560, 620].map((x, i) => `<path d="M${x} ${[200, 120, 92, 130, 222, 150, 132, 140, 214][i] + 6} V 300" stroke="${INK}" stroke-width="4" ${broken && i % 3 === 1 ? 'opacity=".3"' : ''}/>`).join('')}
  </g>`;

export const STORY_ART = {
  valley: `<svg viewBox="0 0 760 330" preserveAspectRatio="xMidYMid slice">
    <rect width="760" height="330" fill="#8fd3ff"/>
    ${sun(640, 70)}
    ${cloud(80, 40, 1.1)}${cloud(330, 70, 0.8)}${cloud(500, 20, 0.9)}
    ${hills('#a4dc78', '#8fd16a', '#7bc35c')}
    ${windmill(150, 236, 0.9)}
    <g transform="translate(470 252)"><rect x="-26" y="-34" width="52" height="34" fill="#ffe1e8" stroke="${INK}" stroke-width="4"/><path d="M-34 -32 L0 -58 L34 -32 Z" fill="#7a4fb5" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-7" y="-20" width="14" height="20" fill="#7d5232" stroke="${INK}" stroke-width="3"/></g>
    <g transform="translate(560 262)"><rect x="-22" y="-28" width="44" height="28" fill="#e3f4ff" stroke="${INK}" stroke-width="4"/><path d="M-30 -26 L0 -48 L30 -26 Z" fill="#e25b45" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>
    <g class="sb-bob" transform="translate(300 268)"><ellipse rx="22" ry="13" fill="#fff" stroke="${INK}" stroke-width="3.5"/><circle cx="-12" cy="-6" r="6" fill="${INK}"/><rect x="12" y="-14" width="14" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M-14 12 v8 M12 12 v8" stroke="${INK}" stroke-width="3"/></g>
  </svg>`,
  past: `<svg viewBox="0 0 760 330" preserveAspectRatio="xMidYMid slice">
    <rect width="760" height="330" fill="#ffd9a8"/>
    ${sun(110, 70, true)}
    ${cloud(520, 30, 0.9)}
    ${hills('#e8c27a', '#d9ae66', '#c99a56')}
    ${coaster(1)}
    <g class="sb-ride" transform="translate(240 82)"><rect x="-26" y="-22" width="52" height="22" rx="8" fill="#e84a5f" stroke="${INK}" stroke-width="4"/><circle cx="-10" cy="-30" r="8" fill="#ffd9b8" stroke="${INK}" stroke-width="3"/><circle cx="10" cy="-30" r="8" fill="#b87a4b" stroke="${INK}" stroke-width="3"/><path d="M-16 -40 l-6 -14 M16 -40 l6 -14" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>
    <g class="sb-pop" transform="translate(330 40)"><rect x="-70" y="-26" width="140" height="52" rx="22" fill="#ffc94a" stroke="${INK}" stroke-width="4"/><text x="0" y="12" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="${INK}">WAAW!</text></g>
  </svg>`,
  quiet: `<svg viewBox="0 0 760 330" preserveAspectRatio="xMidYMid slice">
    <rect width="760" height="330" fill="#b9c3d8"/>
    <circle cx="600" cy="70" r="26" fill="#f2efe4" stroke="${INK}" stroke-width="4"/>
    ${cloud(120, 50, 1, 'sb-cloud grey')}
    ${hills('#a7b59c', '#97a68c', '#88987e')}
    ${coaster(0.45, true)}
    <g class="sb-bob" transform="translate(380 150)"><path d="M-16 0 q8 -10 16 0 q8 -10 16 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></g>
    <text x="380" y="300" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="22" fill="${INK}" opacity=".45">shhh...</text>
  </svg>`,
  wawa: `<svg viewBox="0 0 760 330" preserveAspectRatio="xMidYMid slice">
    <rect width="760" height="330" fill="#ffe7c9"/>
    <rect x="0" y="250" width="760" height="80" fill="#c99a6b" stroke="${INK}" stroke-width="4"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 90 - 10}" y="40" width="90" height="34" fill="${i % 2 ? '#fff3df' : '#ff6b6b'}" stroke="${INK}" stroke-width="4"/>`).join('')}
    <rect x="60" y="74" width="16" height="176" fill="#fff3df" stroke="${INK}" stroke-width="4"/>
    <rect x="680" y="74" width="16" height="176" fill="#fff3df" stroke="${INK}" stroke-width="4"/>
    <g transform="translate(560 120)" class="sb-swing"><path d="M0 0 V30" stroke="${INK}" stroke-width="4"/><path d="M-26 70 Q-26 30 0 30 Q26 30 26 70 Z" fill="#ffc94a" stroke="${INK}" stroke-width="4"/><circle cx="0" cy="76" r="7" fill="#ff9f43" stroke="${INK}" stroke-width="3"/></g>
    <g transform="translate(290 112) scale(1.05)" class="sb-bob">${WAWA_SVG.replace('<svg viewBox="0 0 120 136" aria-label="Wawa">', '<g>').replace('</svg>', '</g>')}</g>
    <g class="sb-twinkle"><path d="M470 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" fill="#fff" stroke="${INK}" stroke-width="3"/></g>
  </svg>`,
  you: `<svg viewBox="0 0 760 330" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffb38a"/></radialGradient></defs>
    <rect width="760" height="330" fill="url(#glow)"/>
    <g class="sb-spin-slow" style="transform-origin: 380px 170px">${Array.from({ length: 16 }, (_, i) => `<path d="M380 170 L ${380 + Math.cos(i * 0.3927) * 520} ${170 + Math.sin(i * 0.3927) * 520} L ${380 + Math.cos(i * 0.3927 + 0.12) * 520} ${170 + Math.sin(i * 0.3927 + 0.12) * 520} Z" fill="#fff" opacity=".35"/>`).join('')}</g>
    <g transform="translate(380 190)">
      <path d="M-200 60 C -120 60, -100 -40, -20 -40 S 80 60, 200 20" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
      <path d="M-200 60 C -120 60, -100 -40, -20 -40 S 80 60, 200 20" fill="none" stroke="#ff6b6b" stroke-width="9" stroke-linecap="round" class="sb-draw"/>
      <path d="M-46 -98 C -46 -150, 46 -150, 46 -98 Z" fill="#ffc94a" stroke="${INK}" stroke-width="5" stroke-linejoin="round" class="sb-bob"/>
    </g>
    <g class="sb-twinkle"><path d="M160 80 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" fill="#fff" stroke="${INK}" stroke-width="3"/></g>
    <g class="sb-twinkle d2"><path d="M600 70 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" fill="#ffc94a" stroke="${INK}" stroke-width="3"/></g>
    <g class="sb-twinkle d3"><path d="M640 240 l5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5 Z" fill="#7cc6fe" stroke="${INK}" stroke-width="3"/></g>
  </svg>`,
};

export const STORY_CSS = `
  .sb-cloud { animation: sbdrift 14s ease-in-out infinite alternate; }
  .sb-cloud.grey path { fill: #e3e6ee; }
  .sb-spin { animation: spin 6s linear infinite; transform-box: view-box; }
  .sb-spin-slow { animation: spin 40s linear infinite; transform-box: fill-box; transform-origin: center; }
  .sb-bob { animation: sbbob 2.4s ease-in-out infinite; }
  .sb-pop { animation: sbpop 1.6s cubic-bezier(.34,1.56,.64,1) infinite; transform-box: fill-box; transform-origin: center; }
  .sb-ride { animation: sbride 3.2s ease-in-out infinite; }
  .sb-swing { animation: sbswing 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: top center; }
  .sb-twinkle { animation: sbtw 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .sb-twinkle.d2 { animation-delay: .5s; } .sb-twinkle.d3 { animation-delay: 1s; }
  .sb-draw { stroke-dasharray: 600; stroke-dashoffset: 600; animation: sbdraw 2.6s ease forwards; }
  @keyframes sbdrift { from { translate: 0 0; } to { translate: 40px 0; } }
  @keyframes sbbob { 0%,100% { translate: 0 0; } 50% { translate: 0 -8px; } }
  @keyframes sbpop { 0%,100% { scale: 1; } 50% { scale: 1.12; } }
  @keyframes sbride { 0%,100% { translate: 0 0; rotate: 0deg; } 50% { translate: 8px -4px; rotate: 4deg; } }
  @keyframes sbswing { 0%,100% { rotate: -10deg; } 50% { rotate: 10deg; } }
  @keyframes sbtw { 0%,100% { scale: .7; opacity: .6; } 50% { scale: 1.15; opacity: 1; } }
  @keyframes sbdraw { to { stroke-dashoffset: 0; } }
`;

// tiny looping help illustrations
export const HELP_ART = {
  move: `<svg viewBox="0 0 200 86"><rect x="70" y="18" width="60" height="50" rx="12" fill="#fff" stroke="${INK}" stroke-width="3"/><g class="ha-pan"><circle cx="100" cy="43" r="9" fill="#ffc94a" stroke="${INK}" stroke-width="3"/></g><path d="M30 43h24M146 43h24M100 6v8M100 72v8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`,
  rotate: `<svg viewBox="0 0 200 86"><ellipse cx="100" cy="46" rx="62" ry="20" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="6 6"/><g class="ha-orbit"><circle cx="162" cy="46" r="10" fill="#7cc6fe" stroke="${INK}" stroke-width="3"/></g><rect x="88" y="30" width="24" height="28" rx="6" fill="#ff6b6b" stroke="${INK}" stroke-width="3"/></svg>`,
  build: `<svg viewBox="0 0 200 86"><path d="M20 60h40" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><g class="ha-drop"><path d="M66 60h34" stroke="#ff6b6b" stroke-width="8" stroke-linecap="round"/></g><path d="M108 60 q40 0 40 -30" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" opacity=".2" stroke-dasharray="4 8"/></svg>`,
  modes: `<svg viewBox="0 0 200 86"><rect x="30" y="26" width="140" height="34" rx="17" fill="#fff" stroke="${INK}" stroke-width="3"/><g class="ha-slide"><rect x="34" y="30" width="44" height="26" rx="13" fill="#ffc94a" stroke="${INK}" stroke-width="2.5"/></g></svg>`,
  ride: `<svg viewBox="0 0 200 86"><path d="M10 66 C 50 66, 60 20, 100 20 S 150 66, 190 66" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><g class="ha-ride"><rect x="-12" y="-14" width="24" height="12" rx="5" fill="#e84a5f" stroke="${INK}" stroke-width="2.5"/></g></svg>`,
  world: `<svg viewBox="0 0 200 86"><g class="ha-pop"><ellipse cx="100" cy="50" rx="30" ry="18" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="84" cy="44" r="6" fill="${INK}"/><path d="M128 40l12-6" stroke="${INK}" stroke-width="3"/></g><path d="M146 20l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="#ffc94a" stroke="${INK}" stroke-width="2" class="ha-tw"/></svg>`,
};

export const HELP_CSS = `
  .ha-pan { animation: hapan 2.4s ease-in-out infinite; }
  .ha-orbit { animation: haorbit 3s linear infinite; transform-origin: 100px 46px; }
  .ha-drop { animation: hadrop 1.8s cubic-bezier(.34,1.56,.64,1) infinite; }
  .ha-slide { animation: haslide 3s cubic-bezier(.34,1.56,.64,1) infinite; }
  .ha-ride { offset-path: path('M10 60 C 50 60, 60 14, 100 14 S 150 60, 190 60'); animation: haride 2.6s ease-in-out infinite; }
  .ha-pop { animation: hapop 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .ha-tw { animation: sbtw 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes hapan { 0%,100% { translate: -20px 0; } 50% { translate: 20px 0; } }
  @keyframes haorbit { 0% { transform: scale(1,.32) rotate(0deg) scale(1,3.1); } 100% { transform: scale(1,.32) rotate(360deg) scale(1,3.1); } }
  @keyframes hadrop { 0% { translate: 0 -26px; opacity: 0; } 40% { translate: 0 0; opacity: 1; } 100% { translate: 0 0; opacity: 1; } }
  @keyframes haslide { 0%,20% { translate: 0 0; } 33%,53% { translate: 44px 0; } 66%,86% { translate: 88px 0; } 100% { translate: 0 0; } }
  @keyframes haride { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
  @keyframes hapop { 0%,100% { scale: 1; } 50% { scale: 1.1; } }
`;

/** Mini train preview for the theme picker. */
export function carSVG(body, accent, stripe) {
  return `<svg viewBox="0 0 120 50"><path d="M4 42h112" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <rect x="10" y="12" width="44" height="24" rx="9" fill="${body}" stroke="${INK}" stroke-width="3.5"/>
    <rect x="12" y="24" width="40" height="5" fill="${stripe}"/>
    <rect x="62" y="12" width="44" height="24" rx="9" fill="${body}" stroke="${INK}" stroke-width="3.5"/>
    <rect x="64" y="24" width="40" height="5" fill="${stripe}"/>
    <circle cx="18" cy="19" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="27" cy="19" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <rect x="8" y="8" width="48" height="6" rx="3" fill="${accent}" stroke="${INK}" stroke-width="2.5"/>
    <rect x="60" y="8" width="48" height="6" rx="3" fill="${accent}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="20" cy="38" r="4" fill="${INK}"/><circle cx="44" cy="38" r="4" fill="${INK}"/><circle cx="72" cy="38" r="4" fill="${INK}"/><circle cx="96" cy="38" r="4" fill="${INK}"/></svg>`;
}
