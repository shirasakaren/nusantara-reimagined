# Nusantara Reimagined

An interactive archive of Indonesia under colonial rule. It starts before the ships arrived, walks through the Portuguese, the Spanish, the VOC, the British interlude, the Dutch East Indies and the Japanese occupation, then reaches the proclamation of 1945 and the revolution that ended in 1949. The last chapter looks at quieter pressures today.

The goal is simple. Keep the history close, and let people feel what daily life looked like: the houses, the streets, the jobs, the food, the games.

## What is inside

- A cartoon 3D map of the archipelago that moves with every chapter. Moods, routes, ships, rain, the Great Post Road and the Tambora eruption.
- Batavia around 1730, rebuilt in toon style. Canal houses, the Stadhuis, the castle, a working drawbridge, markets, boats and a crowd of little people. Flip to today with one switch.
- People of the old city as 3D portraits. Hover or tap and they wave.
- Small interactions in every chapter: a nutmeg to spin, a flag to raise, a blue strip to tear, a word wall, buildings you can still visit.
- Four traditional games: Congklak against Nenek, Gasing, Kata Warisan and Membatik.
- A travel pass with stamps, an Atlas mode to wander freely, generative gamelan sound and lanterns at the end.

## Built with

Vite, Three.js (toon shading and generated models, no external 3D files), GSAP with ScrollTrigger, Lenis, anime.js, Motion, and world-atlas coastlines via topojson. Fonts are Fredoka, Plus Jakarta Sans, Caveat and Courier Prime.

## Run it

```bash
npm install
npm run dev
```

Build for production with `npm run build`. The output goes to `dist/`. Pushing to `main` deploys to GitHub Pages through the included workflow.

## Accessibility

Keyboard navigation, focus states, reduced motion support, a lighter 3D mode for slower devices and a fallback when WebGL is missing. Works on phones, tablets and wide screens.

## Sources

Every chapter lists its sources in the credits at the end of the site. Numbers and dates were checked against encyclopedias, museum collections and published histories. If you spot a mistake, please open an issue.

## Older project

The previous WAAWer Coaster game lives on the `archive/waawer-coaster-game` branch.
