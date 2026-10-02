// The story of Waaw Valley, told in chapters. Each chapter is a small goal. Finishing one
// brings a little more color, music and people back to the valley.

export const PROLOGUE = [
  {
    art: 'valley',
    title: 'This is Waaw Valley.',
    text: 'A sleepy island with soft hills, a windmill that creaks, and cows with strong opinions.',
  },
  {
    art: 'past',
    title: 'It used to be loud here.',
    text: 'Long ago, a wooden coaster ran along the hills. Every rider shouted the same word at the top of the drop. WAAW. The whole valley could hear it.',
  },
  {
    art: 'quiet',
    title: 'Then the ride was gone.',
    text: 'The track was taken apart, piece by piece. The valley grew quiet. People forgot how good a big shout of joy feels.',
  },
  {
    art: 'wawa',
    title: 'Wawa kept the station.',
    text: 'One small keeper stayed. Wawa polished the bell every morning and waited for someone who could build again.',
  },
  {
    art: 'you',
    title: 'That someone is you.',
    text: 'Lay the track. Bring the riders. Fill the valley with WAAWs again. Wawa will be right beside you.',
  },
];

export const CHAPTERS = [
  {
    id: 'ch1', title: 'A quiet valley', goal: 'Lay 5 pieces of track',
    hint: 'Pick a piece from the dock at the bottom. Hover to preview, click to place.',
    intro: 'The station is ready. The track is not. Shall we lay the first pieces together?',
    outro: 'Look at that. Real track, in our valley. The cows are already staring.',
    progress: (g) => Math.min(1, g.counts.pieces / 5),
    label: (g) => `${Math.min(5, g.counts.pieces)} / 5 pieces`,
  },
  {
    id: 'ch2', title: 'Full circle', goal: 'Bring the track back to the station',
    hint: 'A coaster is a loop. Steer the end of the track back into the station. Stuck? Try the magic wand.',
    intro: 'A coaster needs to come home. Steer the track around and connect it back to the station.',
    outro: 'A full circuit! I unlocked the Bumble Buzz train for you. Bzzz.',
    reward: 'Bumble Buzz train',
    progress: (g) => (g.counts.closed ? 1 : Math.min(0.9, g.counts.pieces / 24)),
    label: (g) => (g.counts.closed ? 'Connected' : 'Not connected yet'),
  },
  {
    id: 'ch3', title: 'First ride', goal: 'Press play and finish one full lap',
    hint: 'Press the big play button. The train leaves when the bell rings.',
    intro: 'Riders are lining up. They have been waiting for years. Let us send the first train.',
    outro: 'Did you hear that? The first WAAW in a very long time. I might cry.',
    progress: (g) => Math.min(1, g.counts.laps),
    label: (g) => `${Math.min(1, g.counts.laps)} / 1 lap`,
  },
  {
    id: 'ch4', title: 'Reach for the clouds', goal: 'Build track 8 levels high',
    hint: 'Ramps and lift hills climb. The supports grow by themselves.',
    intro: 'From the old windmill you could once see the coaster peak over the hills. Build higher than the windmill.',
    outro: 'So high! The Pocket Rocket train is yours now. It loves altitude.',
    reward: 'Pocket Rocket train',
    progress: (g) => Math.min(1, g.counts.maxLevel / 8),
    label: (g) => `Level ${Math.min(8, g.counts.maxLevel)} / 8`,
  },
  {
    id: 'ch5', title: 'Upside down', goal: 'Add a loop or a barrel roll',
    hint: 'Find the loop and the barrel roll in the Thrills tab.',
    intro: 'The old coaster never went upside down. Ours can. Riders say the world looks funnier that way.',
    outro: 'Heads over heels! The Melon Dash train just rolled into the depot.',
    reward: 'Melon Dash train',
    progress: (g) => Math.min(1, g.counts.inversions),
    label: (g) => `${Math.min(1, g.counts.inversions)} / 1 inversion`,
  },
  {
    id: 'ch6', title: 'Hear the valley', goal: 'Collect 60 WAAWs from riders',
    hint: 'Drops, loops, airtime hops and splashes make riders shout. Each shout counts.',
    intro: 'Now for the real test. Make the riders shout. Sixty good WAAWs should wake the whole valley up.',
    outro: 'The village heard you. More visitors are walking up the path right now.',
    progress: (g) => Math.min(1, g.counts.waaws / 60),
    label: (g) => `${Math.min(60, g.counts.waaws)} / 60 WAAWs`,
  },
  {
    id: 'ch7', title: 'Make it yours', goal: 'Paint the track and place 4 decorations',
    hint: 'Use the Paint tool for colors and the Decor tool for trees, benches, balloons and more.',
    intro: 'A park should feel like someone loves it. Give it your colors and a few cozy spots.',
    outro: 'It looks like a real park now. The Midnight Owl train is ready for late rides.',
    reward: 'Midnight Owl train',
    progress: (g) => (Math.min(1, g.counts.painted ? 0.5 : 0) + Math.min(0.5, g.counts.decor / 8)),
    label: (g) => `${g.counts.painted ? 'Painted' : 'Not painted'} · ${Math.min(4, g.counts.decor)} / 4 decor`,
  },
  {
    id: 'ch8', title: 'A memory to keep', goal: 'Take a photo of your park',
    hint: 'Open the camera at the top right, frame your favorite view and snap.',
    intro: 'One last thing. Take a picture for the village notice board. Something to remember this day by.',
    outro: 'Perfect. That one goes right in the middle of the board.',
    progress: (g) => Math.min(1, g.counts.photos),
    label: (g) => `${Math.min(1, g.counts.photos)} / 1 photo`,
  },
];

export const FINALE = {
  title: 'The valley sings again',
  text: 'You did it. The track hums, the riders shout, and the whole valley is awake again. Thank you, builder. The park is yours. Keep building, keep riding, and come back whenever you need a good WAAW.',
};

export const BADGES = [
  { id: 'first', name: 'Ground breaker', desc: 'Place your first piece of track.', icon: 'shovel' },
  { id: 'lift', name: 'Click clack', desc: 'Build a lift hill.', icon: 'chain' },
  { id: 'loop', name: 'Loop de loop', desc: 'Build a loop.', icon: 'loop' },
  { id: 'twist', name: 'Barrel of fun', desc: 'Build a barrel roll.', icon: 'twist' },
  { id: 'splash', name: 'Make a splash', desc: 'Ride through a splash pool.', icon: 'drop' },
  { id: 'tunnel', name: 'Into the dark', desc: 'Build a tunnel.', icon: 'tunnel' },
  { id: 'cheese', name: 'Say cheese', desc: 'Get an on-ride photo.', icon: 'camera' },
  { id: 'sky', name: 'Sky scraper', desc: 'Reach level 12.', icon: 'cloud' },
  { id: 'speed', name: 'Speed demon', desc: 'Hit 70 km/h on a lap.', icon: 'bolt' },
  { id: 'float', name: 'Floaty', desc: 'Get 1.5 seconds of airtime in one lap.', icon: 'feather' },
  { id: 'long', name: 'Marathon', desc: 'Build 80 pieces of track.', icon: 'ruler' },
  { id: 'night', name: 'Night owl', desc: 'Run the coaster at night.', icon: 'moon' },
  { id: 'decor', name: 'Decorator', desc: 'Place 15 decorations.', icon: 'flower' },
  { id: 'rainbow', name: 'Rainbow road', desc: 'Use 6 different paint colors.', icon: 'palette' },
  { id: 'friend', name: 'Animal friend', desc: 'Say hi to 10 animals.', icon: 'heart' },
  { id: 'rain', name: 'Rain maker', desc: 'Tickle a cloud.', icon: 'rain' },
  { id: 'whale', name: 'Whale hello', desc: 'Wave at the whale.', icon: 'whale' },
  { id: 'air', name: 'Air show', desc: 'Ask the pilot for a loop.', icon: 'plane' },
  { id: 'wish', name: 'Wishful thinking', desc: 'Toss a wish into the well.', icon: 'star' },
  { id: 'helper', name: 'Little helper', desc: 'Let the magic wand finish a track.', icon: 'wand' },
  { id: 'legend', name: 'Legendary', desc: 'Get an excitement rating of 8 or more.', icon: 'trophy' },
  { id: 'crowd', name: 'Crowd pleaser', desc: 'Bring 25 visitors to the park.', icon: 'people' },
  { id: 'loud', name: 'Loudest valley', desc: 'Collect 300 WAAWs.', icon: 'mega' },
  { id: 'tour', name: 'Valley tourist', desc: 'Click 20 different things in the world.', icon: 'map' },
];

export const TIPS = [
  'Tip. Right drag or hold Ctrl to slide the camera.',
  'Tip. Q and E rotate the view in neat 45 degree steps.',
  'Tip. Tracks can pass over each other if there is room.',
  'Tip. Lift hills give the train enough energy for big drops.',
  'Tip. The magic wand can steer your track home.',
  'Tip. Click the sun to fast forward to night.',
  'Tip. Clouds rain when you tickle them.',
  'Tip. Photo spots take a picture every lap.',
  'Tip. Press 1 to 7 for quick basic pieces.',
];

export const IDLE_NUDGES = [
  'Need an idea? A lift hill followed by a big drop is a classic.',
  'Try a loop. Riders adore loops.',
  'You can paint every piece a different color.',
  'The riders are getting restless. Press play!',
  'Have you visited the farm? The sheep are very fluffy today.',
  'The camera button takes lovely pictures at sunset.',
];
