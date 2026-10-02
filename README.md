# WAAWer Coaster

**Build the ride. Bring back the WAAW.**

WAAWer Coaster is a cozy toon roller coaster builder that runs in the browser. You lay track piece by piece across a living cartoon valley, close the circuit, send the train, and listen to the riders shout. Every model, sound and song is made in code. No downloads, no asset files.

## The story

Waaw Valley used to be loud. A wooden coaster ran along its hills and every rider shouted the same word at the top of the drop. Then the ride was taken apart and the valley went quiet. Wawa, a small station keeper in a yellow hard hat, stayed behind and waited for a builder. That is you.

The story runs over eight short chapters. Each one is a small goal. Finishing a chapter brings color, music and visitors back into the valley, and unlocks new train styles. Free build mode skips the story and opens everything.

## Play

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
npm run preview
```

The repo ships with a GitHub Pages workflow. Enable Pages with the "GitHub Actions" source and every push to `main` deploys the game.

## Controls

| Action | Mouse and keyboard | Touch |
| --- | --- | --- |
| Orbit | Left drag | Two finger twist |
| Pan | Right drag, Ctrl or Shift + drag, WASD, arrows | One finger drag |
| Zoom | Wheel, + and - | Pinch |
| Rotate 45 degrees | Q and E, compass button | Compass button |
| Place basic pieces | 1 to 7 | Tap a piece |
| Undo | Backspace or Ctrl + Z | Undo button |
| Play or pause | Space | Play button |
| Photo mode | P | Camera button |
| Ride camera | F | Camera button |
| Build or view mode | B and V | Mode switch |
| Day and night | T | Sun button |
| Rotate decoration | R | Rotate button |
| Help | H | Settings, How to play |

## Features

**Track building.** A grid based builder that grows from the station. Hover a piece to see a live ghost preview, click to place it. Pieces that cannot fit are marked with the reason. The piece that closes the loop glows gold. Supports grow down to the ground by themselves, and track can pass over other track when there is room.

**21 pieces.** Straights, tight and wide banked turns, ramps, lift hills with a chain, big drops, airtime hops, a vertical loop, a barrel roll, four spirals, boosters, brakes, a grassy tunnel, a splash pool and an on-ride photo spot.

**Magic wand.** A path finder that steers the end of your track back into the station with basic pieces.

**Ride physics.** Gravity, chain lifts, boosters and brakes, station dispatch with a bell, shuttle runs on open tracks, G force and airtime measurement, and a ride report with excitement, intensity and nausea ratings after every lap.

**Cameras.** Smooth orbit, pan and zoom with inertia, a chase camera, and a front seat camera with speed lines and look around.

**Paint and decorate.** Fourteen colors for rails, spine and supports, per piece or for the whole track. Seventeen decorations including trees, benches, balloon carts, fountains, a mini Ferris wheel, a carousel and a golden Wawa statue.

**A living valley.** Bird flocks and gulls, butterflies and bees by day, fireflies by night, cows, sheep, pigs, chickens, rabbits, ducks, a dog and a rooftop cat, visitors who queue and cheer, a toy plane with a banner, a hot air balloon, sailboats, a shy whale, leaping fish, a kite, chimney smoke, wind gusts with swirling ribbons, pollen and a full day to night cycle with stars, a moon and a lighthouse beam. Almost everything reacts when you click it.

**Photo mode.** Filters, captions, time of day presets and a polaroid frame. Photos and on-ride pictures are kept in an album in your browser and can be downloaded.

**Saving and sharing.** Autosave, three save slots with thumbnails, share links that encode the whole park, and JSON export and import.

**Badges.** Twenty four badges, some of them hidden in the world.

**Sound.** A WebAudio synth makes every sound: wooden clacks, chain clicks, wind, rumble, animal voices, rider shouts and a generative music box score that changes at night.

## Tech

- three.js with a banded toon ramp and inverted hull outlines baked into every geometry, so outlines cost no extra draw calls
- Track pieces merged into chunks, nature fully instanced, wind sway in the vertex shader
- An adaptive quality governor that lowers pixel ratio, shadows and density on slower devices
- GSAP for camera moves, timelines and panels
- anime.js for staggered UI entrances and letter animations
- Motion for spring hover and press feedback and speech bubbles
- Vite for development and builds

## Project layout

```
src/
  core/      renderer, toon materials, camera rig, audio synth, saves, palette
  coaster/   piece catalog, track model, track meshes, train, ride physics, decorations
  world/     sky, water, terrain, nature, village, station, mascot, animals, sky life, visitors, particles
  ui/        interface, modals, effects, icons, illustrations, story text
  game.js    the conductor that wires it all together
```

## License

MIT
