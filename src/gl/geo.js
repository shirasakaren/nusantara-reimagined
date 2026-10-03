// Geography helpers: projection, places, camera focus presets and routes.
export const MAP = { lon0: 86, lon1: 150, lat0: -18, lat1: 14, cx: 118, cy: -2 };
export const MAP_W = MAP.lon1 - MAP.lon0; // 64 units
export const MAP_H = MAP.lat1 - MAP.lat0; // 32 units

export function project(lon, lat) {
  return { x: lon - MAP.cx, z: -(lat - MAP.cy) };
}
export function uvOf(lon, lat) {
  return { u: (lon - MAP.lon0) / MAP_W, v: (lat - MAP.lat0) / MAP_H };
}

export const PLACES = {
  palembang: { lon: 104.76, lat: -2.99, name: 'Palembang', note: 'Srivijaya' },
  trowulan: { lon: 112.38, lat: -7.56, name: 'Trowulan', note: 'Majapahit' },
  ternate: { lon: 127.38, lat: 0.79, name: 'Ternate', note: 'Cloves' },
  tidore: { lon: 127.42, lat: 0.68, name: 'Tidore', note: 'Cloves', dy: 1 },
  banda: { lon: 129.9, lat: -4.53, name: 'Banda', note: 'Nutmeg and mace' },
  run: { lon: 129.69, lat: -4.55, name: 'Run', note: 'Traded for Manhattan', dy: 1 },
  ambon: { lon: 128.18, lat: -3.69, name: 'Ambon', note: 'VOC, 1605' },
  malacca: { lon: 102.25, lat: 2.2, name: 'Malacca', note: 'Taken 1511' },
  timor: { lon: 125.57, lat: -8.56, name: 'Timor', note: 'Portuguese until 1975' },
  banten: { lon: 106.15, lat: -6.03, name: 'Banten', note: 'Dutch arrive 1596' },
  batavia: { lon: 106.81, lat: -6.13, name: 'Batavia', note: 'Jakarta' },
  anyer: { lon: 105.88, lat: -6.07, name: 'Anyer', note: 'Km 0' },
  panarukan: { lon: 114.05, lat: -7.7, name: 'Panarukan', note: 'Km 1,000' },
  borobudur: { lon: 110.2, lat: -7.61, name: 'Borobudur', note: 'Cleared 1814' },
  tambora: { lon: 118.0, lat: -8.25, name: 'Tambora', note: 'April 1815' },
  yogyakarta: { lon: 110.37, lat: -7.8, name: 'Yogyakarta', note: '' },
  magelang: { lon: 110.22, lat: -7.47, name: 'Magelang', note: '28 March 1830' },
  cirebon: { lon: 108.55, lat: -6.71, name: 'Cirebon', note: 'Famine 1843' },
  demak: { lon: 110.64, lat: -6.89, name: 'Demak', note: 'Famine 1848' },
  grobogan: { lon: 110.92, lat: -7.08, name: 'Grobogan', note: 'Famine 1849', dy: 1 },
  lebak: { lon: 106.25, lat: -6.56, name: 'Lebak', note: 'Max Havelaar' },
  aceh: { lon: 95.32, lat: 5.55, name: 'Aceh', note: 'War from 1873' },
  badung: { lon: 115.22, lat: -8.65, name: 'Badung', note: 'Puputan 1906' },
  jepara: { lon: 110.67, lat: -6.59, name: 'Jepara', note: 'Kartini' },
  kalijati: { lon: 107.66, lat: -6.53, name: 'Kalijati', note: '8 March 1942' },
  blitar: { lon: 112.17, lat: -8.1, name: 'Blitar', note: 'PETA revolt 1945' },
  rengasdengklok: { lon: 107.3, lat: -6.15, name: 'Rengasdengklok', note: '16 August 1945' },
  surabaya: { lon: 112.75, lat: -7.25, name: 'Surabaya', note: 'Hotel Yamato' },
  linggadjati: { lon: 108.48, lat: -6.88, name: 'Linggadjati', note: '1947', dy: 1 },
  morowali: { lon: 122.1, lat: -2.85, name: 'Morowali', note: 'Nickel' },
  weda: { lon: 127.95, lat: 0.45, name: 'Weda Bay', note: 'Nickel' },
  riau: { lon: 101.45, lat: 0.5, name: 'Riau', note: 'Palm oil' },
  grasberg: { lon: 137.1, lat: -4.06, name: 'Grasberg', note: '51 percent, 2018' },
  jakarta: { lon: 106.85, lat: -6.2, name: 'Jakarta', note: 'Data centres' },
  natuna: { lon: 108.2, lat: 3.9, name: 'Natuna Sea', note: 'Fishing grounds' },
};

// lon, lat, distance, tilt (degrees from straight down), azimuth (degrees)
export const FOCUS = {
  gate: [118, -3, 46, 58, -8],
  overview: [117, -2.5, 36, 42, 0],
  palembang: [104.8, -3.0, 9, 46, -10],
  majapahit: [112.4, -7.6, 8, 52, 6],
  maluku: [127.8, -1.6, 14, 44, 8],
  banda: [129.9, -4.6, 7, 50, 14],
  ternate: [127.4, 0.7, 6.2, 52, -6],
  tidore: [127.4, 0.6, 6.5, 48, 18],
  malacca: [102.3, 2.0, 9, 46, -14],
  timor: [125.5, -8.6, 9, 46, 10],
  banten: [106.2, -6.1, 7, 54, -12],
  batavia: [106.8, -6.2, 6.5, 56, 8],
  postroad: [109.9, -7.0, 15, 40, 0],
  borobudur: [110.2, -7.6, 5.5, 58, 20],
  tambora: [118.0, -8.3, 7, 54, -18],
  java: [110.0, -7.2, 13, 44, -4],
  yogyakarta: [110.4, -7.8, 6.5, 54, 10],
  magelang: [110.2, -7.5, 6, 56, -12],
  cirebon: [109.6, -6.9, 7, 50, 6],
  aceh: [95.6, 5.0, 7, 50, -10],
  bali: [115.2, -8.5, 6.5, 54, 12],
  jepara: [110.7, -6.7, 6, 54, -8],
  kalijati: [107.6, -6.6, 6.5, 56, 4],
  rengasdengklok: [107.2, -6.2, 6, 56, -10],
  surabaya: [112.7, -7.3, 6.2, 56, 14],
  myth: [117, -2.5, 30, 30, 0],
  modern: [116, -2.5, 30, 46, 10],
  night: [114, -4, 26, 62, -14],
};

export const ROUTES = {
  portugal: [[86, 6], [95, 6.5], [101.5, 2.6], [104.5, 1.2], [108, -1.5], [113, -4.5], [119, -5.5], [124, -3.5], [127.3, 0.8]],
  spain: [[150, 12], [140, 8], [132, 4], [127.5, 0.7]],
  dutch: [[86, -9], [95, -8.5], [103, -7.3], [105.6, -6.3], [106.15, -6.03]],
  voc: [[106.8, -6.1], [110, -5.6], [115, -6.2], [120, -6.2], [125, -5.2], [128.2, -3.7], [129.9, -4.5]],
  modern: [[106.8, -6.1], [104, -1], [100, 3], [92, 7], [86, 9]],
  modern2: [[122.1, -2.9], [126, 2], [133, 8], [142, 13], [150, 14]],
  modern3: [[112.7, -7.2], [118, -9], [126, -11], [136, -12.5], [150, -14]],
};

export const ROAD = [[105.88, -6.07], [106.15, -6.12], [106.63, -6.18], [106.81, -6.15], [106.8, -6.6], [107.14, -6.82], [107.61, -6.91], [107.92, -6.86], [108.55, -6.71], [109.14, -6.87], [109.67, -6.89], [110.42, -6.97], [110.64, -6.89], [110.84, -6.8], [111.34, -6.7], [112.05, -6.9], [112.65, -7.16], [112.75, -7.25], [112.9, -7.64], [113.22, -7.75], [113.69, -7.73], [114.05, -7.7]];

export const VOLCANOES = [
  [105.42, -6.1, 0.5], [110.44, -7.54, 1.0], [112.92, -8.11, 1.1], [116.46, -8.41, 1.0], [118.0, -8.25, 1.15],
  [101.26, -1.7, 1.1], [115.5, -8.34, 0.9], [112.95, -7.94, 0.7], [107.73, -7.2, 0.7], [106.73, -6.72, 0.7], [109.2, -7.24, 0.8],
  [111.2, -7.63, 0.7], [113.55, -7.98, 0.6], [98.39, 3.17, 0.8], [100.47, -0.38, 0.7], [125.4, 1.36, 0.6], [127.33, 0.8, 0.6], [121.7, -8.8, 0.6],
];

export const CITIES = [[106.85, -6.2, 1], [112.75, -7.25, 0.8], [107.6, -6.9, 0.7], [110.42, -6.97, 0.6], [98.67, 3.6, 0.7], [104.75, -2.98, 0.5], [119.43, -5.15, 0.6], [110.37, -7.8, 0.5], [115.2, -8.65, 0.5], [116.85, -1.25, 0.4], [124.85, 1.48, 0.4], [100.35, -0.95, 0.4], [109.33, -0.03, 0.35], [105.26, -5.43, 0.4], [104.0, 1.1, 0.5], [140.7, -2.53, 0.25], [128.18, -3.69, 0.3]];
