// Shared configuration, small maths helpers and the seeded random source.
// Everything the game tunes lives here so the other modules read as behaviour.

export const VIEW = { width: 1280, height: 720 };
export const WORLD = { pad: 46, top: 96, bottom: 664 };

export const CONFIG = {
  quota: 18,
  nightSeconds: 75,
  lives: 3,
  emberCount: 14,
  emberRadius: 8,
  playerRadius: 9,
  playerAccel: 2400,
  playerDrag: 5.2,
  playerMaxSpeed: 330,
  glowMax: 100,
  glowDecay: 1.6,
  glowPerEmber: 17,
  ventCost: 38,
  ventCooldown: 2.6,
  ventRadius: 190,
  mothBaseSpeed: 52,
  mothSpeedPerGlow: 1.25,
  mothCap: 26,
  hitInvulnerable: 1.6,
  scorePerEmber: 100,
  scorePerSecond: 10,
  scorePerLife: 250,
};

export const PALETTE = {
  ink: '#050a12',
  night: '#081527',
  dusk: '#0d2436',
  moss: '#12352f',
  glow: '#ffe9a8',
  ember: '#ffc95c',
  emberHot: '#fff3c4',
  moth: '#7d5cff',
  mothWing: '#b9a4ff',
  danger: '#ff5d7a',
  leaf: '#1f5c4a',
  text: '#e8f3ee',
  muted: '#8fb3aa',
  gold: '#ffd479',
};

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function rankFor(score) {
  if (score >= 2800) return 'LUMINARY';
  if (score >= 2200) return 'BEACON';
  if (score >= 1600) return 'LANTERN';
  if (score >= 1000) return 'SPARK';
  return 'DIM';
}
