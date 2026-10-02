// Track piece catalog. Every piece is described in a local frame:
//   f = forward from the entry edge of the entry cell (world units)
//   r = to the right of the centerline
//   y = height above the entry level
// Pieces always begin and end level and unrolled so any piece can follow any other.
export const T = 4;            // tile size
export const H = 1.5;          // height of one level
export const BASE = 0.55;      // rail height of level 0 above the ground
export const GRID = 10;        // cells span -GRID .. GRID-1 on both axes
export const MAX_LEVEL = 14;

const PI = Math.PI;
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function straight(len) { return (t) => ({ f: t * T * len, r: 0, y: 0 }); }

function curve(dir, radius) {
  return (t) => {
    const a = t * PI / 2;
    return { f: radius * Math.sin(a), r: dir * radius * (1 - Math.cos(a)), y: 0 };
  };
}

function withRise(base, dh, ease = smooth) {
  return (t) => { const p = base(t); p.y += dh * H * ease(t); return p; };
}

const bank = (dir, amt = 0.42) => (t) => dir * amt * Math.sin(PI * t);

const LOOP_R = 3.7;
const LOOP_LEN = 3;
const LOOP_W = 1.05;
function loopPath(t) {
  const th = t * PI * 2;
  const a = (LOOP_LEN * T) / (PI * 2);
  // clothoid-ish: tighter at the top so it reads like a real teardrop loop
  const rr = LOOP_R * (1 - 0.12 * Math.sin(th / 2) ** 2);
  // lateral offset keeps the two legs apart, eased to zero at both ends so joints stay straight
  const e = Math.min(th, PI * 2 - th) / 0.9;
  const ease = e >= 1 ? 1 : smooth(e);
  return { f: a * th + rr * Math.sin(th), r: LOOP_W * Math.sin(th) * ease, y: rr * (1 - Math.cos(th)) };
}

/**
 * exit: { f, r } is the next cell offset in local cells, turn is +1 right / -1 left, dh in levels.
 */
export const PIECES = {
  station: {
    id: 'station', cat: 'hidden', name: 'Station', len: 3, exit: { f: 3, r: 0 }, turn: 0, dh: 0,
    path: straight(3), roll: () => 0, flags: { station: true, brake: true },
  },
  straight: {
    id: 'straight', cat: 'basic', name: 'Straight', key: '1', icon: 'straight',
    desc: 'A steady stretch. Calm before the fun.',
    exit: { f: 1, r: 0 }, turn: 0, dh: 0, path: straight(1), roll: () => 0, flags: {},
  },
  left: {
    id: 'left', cat: 'basic', name: 'Turn left', key: '2', icon: 'left',
    desc: 'A snug banked turn to the left.',
    exit: { f: 0, r: -1 }, turn: -1, dh: 0, path: curve(-1, T / 2), roll: bank(-1), flags: { curve: true },
  },
  right: {
    id: 'right', cat: 'basic', name: 'Turn right', key: '3', icon: 'right',
    desc: 'A snug banked turn to the right.',
    exit: { f: 0, r: 1 }, turn: 1, dh: 0, path: curve(1, T / 2), roll: bank(1), flags: { curve: true },
  },
  up: {
    id: 'up', cat: 'basic', name: 'Ramp up', key: '4', icon: 'up',
    desc: 'Climb one level. Supports grow by themselves.',
    exit: { f: 1, r: 0 }, turn: 0, dh: 1, path: withRise(straight(1), 1), roll: () => 0, flags: {},
  },
  down: {
    id: 'down', cat: 'basic', name: 'Ramp down', key: '5', icon: 'down',
    desc: 'Drop one level. A small tummy flip.',
    exit: { f: 1, r: 0 }, turn: 0, dh: -1, path: withRise(straight(1), -1), roll: () => 0, flags: {},
  },
  wideLeft: {
    id: 'wideLeft', cat: 'basic', name: 'Wide left', key: '6', icon: 'wideLeft',
    desc: 'A sweeping curve. Smooth and fast.',
    exit: { f: 1, r: -2 }, turn: -1, dh: 0, path: curve(-1, T * 1.5), roll: bank(-1, 0.55), flags: { curve: true },
  },
  wideRight: {
    id: 'wideRight', cat: 'basic', name: 'Wide right', key: '7', icon: 'wideRight',
    desc: 'A sweeping curve. Smooth and fast.',
    exit: { f: 1, r: 2 }, turn: 1, dh: 0, path: curve(1, T * 1.5), roll: bank(1, 0.55), flags: { curve: true },
  },
  lift: {
    id: 'lift', cat: 'thrill', name: 'Lift hill', key: 'Q', icon: 'lift',
    desc: 'A chain pulls riders up three levels. Click, clack, suspense.',
    exit: { f: 2, r: 0 }, turn: 0, dh: 3, path: withRise(straight(2), 3, smoother), roll: () => 0, flags: { chain: true },
  },
  drop: {
    id: 'drop', cat: 'thrill', name: 'Big drop', icon: 'drop',
    desc: 'Four levels straight down. Hold on to your hat.',
    exit: { f: 2, r: 0 }, turn: 0, dh: -4, path: withRise(straight(2), -4, smoother), roll: () => 0, flags: { drop: true },
  },
  hop: {
    id: 'hop', cat: 'thrill', name: 'Airtime hop', icon: 'hop',
    desc: 'A camelback hill. Riders float out of their seats.',
    exit: { f: 2, r: 0 }, turn: 0, dh: 0,
    path: (t) => ({ f: t * T * 2, r: 0, y: 2 * H * Math.sin(PI * t) ** 2 }), roll: () => 0, flags: { airtime: true },
  },
  loop: {
    id: 'loop', cat: 'thrill', name: 'Loop', icon: 'loop',
    desc: 'The classic. Upside down and back again.',
    exit: { f: LOOP_LEN, r: 0 }, turn: 0, dh: 0, path: loopPath, roll: () => 0, sideFixed: true,
    flags: { inversion: true, loop: true }, samples: 90,
  },
  twist: {
    id: 'twist', cat: 'thrill', name: 'Barrel roll', icon: 'twist',
    desc: 'A full roll in a straight line. Sky, ground, sky.',
    exit: { f: 2, r: 0 }, turn: 0, dh: 0, path: straight(2),
    roll: (t) => PI * 2 * smoother(t), flags: { inversion: true, twist: true }, samples: 48,
  },
  helixLeftUp: {
    id: 'helixLeftUp', cat: 'thrill', name: 'Spiral left up', icon: 'helixLU',
    desc: 'Turn left while climbing. Stack four for a tower.',
    exit: { f: 0, r: -1 }, turn: -1, dh: 1, path: withRise(curve(-1, T / 2), 1), roll: bank(-1, 0.35), flags: { curve: true },
  },
  helixRightUp: {
    id: 'helixRightUp', cat: 'thrill', name: 'Spiral right up', icon: 'helixRU',
    desc: 'Turn right while climbing. Stack four for a tower.',
    exit: { f: 0, r: 1 }, turn: 1, dh: 1, path: withRise(curve(1, T / 2), 1), roll: bank(1, 0.35), flags: { curve: true },
  },
  helixLeftDown: {
    id: 'helixLeftDown', cat: 'thrill', name: 'Spiral left down', icon: 'helixLD',
    desc: 'Corkscrew down to the left.',
    exit: { f: 0, r: -1 }, turn: -1, dh: -1, path: withRise(curve(-1, T / 2), -1), roll: bank(-1, 0.5), flags: { curve: true },
  },
  helixRightDown: {
    id: 'helixRightDown', cat: 'thrill', name: 'Spiral right down', icon: 'helixRD',
    desc: 'Corkscrew down to the right.',
    exit: { f: 0, r: 1 }, turn: 1, dh: -1, path: withRise(curve(1, T / 2), -1), roll: bank(1, 0.5), flags: { curve: true },
  },
  booster: {
    id: 'booster', cat: 'special', name: 'Booster', icon: 'booster',
    desc: 'Magnetic kick. Riders go from zero to whoa.',
    exit: { f: 1, r: 0 }, turn: 0, dh: 0, path: straight(1), roll: () => 0, flags: { boost: true },
  },
  brake: {
    id: 'brake', cat: 'special', name: 'Brakes', icon: 'brake',
    desc: 'Gentle fins that calm the train down.',
    exit: { f: 1, r: 0 }, turn: 0, dh: 0, path: straight(1), roll: () => 0, flags: { brake: true },
  },
  tunnel: {
    id: 'tunnel', cat: 'special', name: 'Tunnel', icon: 'tunnel',
    desc: 'A grassy hill with a dark hole. Ground level only.',
    exit: { f: 2, r: 0 }, turn: 0, dh: 0, path: straight(2), roll: () => 0, flags: { tunnel: true }, groundOnly: true, height: 4.2,
  },
  splash: {
    id: 'splash', cat: 'special', name: 'Splash pool', icon: 'splash',
    desc: 'Skim the water. Front row gets wet. Ground level only.',
    exit: { f: 2, r: 0 }, turn: 0, dh: 0, path: straight(2), roll: () => 0, flags: { splash: true }, groundOnly: true,
  },
  photo: {
    id: 'photo', cat: 'special', name: 'Photo spot', icon: 'photo',
    desc: 'An on-ride camera. Every pass lands in your album.',
    exit: { f: 1, r: 0 }, turn: 0, dh: 0, path: straight(1), roll: () => 0, flags: { photo: true }, height: 3.2,
  },
};

export const PIECE_ORDER = [
  'straight', 'left', 'right', 'up', 'down', 'wideLeft', 'wideRight',
  'lift', 'drop', 'hop', 'loop', 'twist', 'helixLeftUp', 'helixRightUp', 'helixLeftDown', 'helixRightDown',
  'booster', 'brake', 'tunnel', 'splash', 'photo',
];

// Stable numeric ids for compact share codes. Never reorder, only append.
export const PIECE_CODES = ['station', ...PIECE_ORDER];

export const DIRS = [
  { x: 0, z: -1 }, // 0 north
  { x: 1, z: 0 },  // 1 east
  { x: 0, z: 1 },  // 2 south
  { x: -1, z: 0 }, // 3 west
];

export const levelY = (lvl) => BASE + lvl * H;
export const cellCenter = (i) => (i + 0.5) * T;
export const inGrid = (i, j) => i >= -GRID && i < GRID && j >= -GRID && j < GRID;
