// The WAAWer palette. Warm, candy, a little sunburnt. Every 3D asset and UI chip pulls from here.
export const INK = 0x2a1f3d;

export const PAL = {
  ink: INK,
  cream: 0xfff3df,
  white: 0xffffff,
  coral: 0xff6b6b,
  cherry: 0xe84a5f,
  tangerine: 0xff9f43,
  sun: 0xffc94a,
  butter: 0xffe08a,
  mint: 0x5ed6b4,
  leaf: 0x7bcf5e,
  grass: 0x8fd16a,
  grassDark: 0x5fae4e,
  moss: 0x4e9a48,
  pine: 0x2f7d4f,
  sky: 0x7cc6fe,
  ocean: 0x3fa7d6,
  deep: 0x2a6fb0,
  lilac: 0xb79cf2,
  plum: 0x7a4fb5,
  pink: 0xff9ec7,
  bubblegum: 0xff7eb6,
  sand: 0xf3d9a4,
  dirt: 0xc99a6b,
  wood: 0xb27a4a,
  woodDark: 0x7d5232,
  stone: 0xb8b2c4,
  stoneDark: 0x857e96,
  roof: 0xe25b45,
  snow: 0xf7fbff,
  night: 0x1b1f45,
};

// Paint swatches for track, spine and supports. Order matters: save files store indices.
export const SWATCHES = [
  { name: 'Cherry', hex: 0xe84a5f },
  { name: 'Sunflower', hex: 0xffc94a },
  { name: 'Cream', hex: 0xfff3df },
  { name: 'Mint', hex: 0x5ed6b4 },
  { name: 'Sky', hex: 0x7cc6fe },
  { name: 'Lilac', hex: 0xb79cf2 },
  { name: 'Bubblegum', hex: 0xff7eb6 },
  { name: 'Tangerine', hex: 0xff9f43 },
  { name: 'Leaf', hex: 0x7bcf5e },
  { name: 'Ocean', hex: 0x2a6fb0 },
  { name: 'Plum', hex: 0x7a4fb5 },
  { name: 'Ink', hex: 0x3a2f52 },
  { name: 'Snow', hex: 0xf7fbff },
  { name: 'Wood', hex: 0xb27a4a },
];

export const TRAIN_THEMES = {
  classic:  { name: 'Classic Cherry', body: 0xe84a5f, accent: 0xffc94a, stripe: 0xfff3df, face: true, unlock: null },
  bee:      { name: 'Bumble Buzz', body: 0xffc94a, accent: 0x3a2f52, stripe: 0x3a2f52, face: true, unlock: 'ch2' },
  rocket:   { name: 'Pocket Rocket', body: 0xf7fbff, accent: 0xe84a5f, stripe: 0x7cc6fe, face: true, unlock: 'ch4' },
  melon:    { name: 'Melon Dash', body: 0x7bcf5e, accent: 0xff7eb6, stripe: 0x2f7d4f, face: true, unlock: 'ch5' },
  midnight: { name: 'Midnight Owl', body: 0x3a2f52, accent: 0xb79cf2, stripe: 0xffc94a, face: true, unlock: 'ch7' },
};

export function hexToCss(h) { return '#' + h.toString(16).padStart(6, '0'); }
