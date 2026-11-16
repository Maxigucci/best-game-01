// Boot, input, the game loop and the rules of the night. This is the only module
// that knows about states (title, playing, paused, over) and about winning or losing.

import { CONFIG, VIEW, clamp, mulberry32 } from './state.js';
import { Particles } from './particles.js';
import { EmberField } from './embers.js';
import { MothSwarm } from './moths.js';
import { Firefly } from './firefly.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;
const random = mulberry32(seed);

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = VIEW.width * dpr;
canvas.height = VIEW.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const particles = new Particles();
const embers = new EmberField(random);
const moths = new MothSwarm(random);
const firefly = new Firefly(particles);
const renderer = new Renderer(ctx);
const sound = new Sound();

const input = { keys: new Set(), x: 0, y: 0 };
const state = {
  mode: 'title',
  elapsed: 0,
  timeLeft: CONFIG.nightSeconds,
  embers: 0,
  stunned: 0,
  score: 0,
  won: false,
  lives: CONFIG.lives,
  shake: 0,
  flash: 0,
  muted: false,
};

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function resetNight() {
  particles.clear();
  embers.reset();
  moths.reset();
  firefly.reset();
  state.timeLeft = CONFIG.nightSeconds;
  state.embers = 0;
  state.stunned = 0;
  state.score = 0;
  state.won = false;
  state.lives = CONFIG.lives;
  state.shake = 0;
  state.flash = 0;
  announce('The night begins. Gather 18 embers before dawn.');
}

function startGame() {
  sound.unlock();
  resetNight();
  state.mode = 'playing';
  sound.start();
}

function finishNight(won) {
  state.mode = 'over';
  state.won = won;
  state.score =
    state.embers * CONFIG.scorePerEmber +
    (won ? Math.floor(Math.max(0, state.timeLeft)) * CONFIG.scorePerSecond : 0) +
    Math.max(0, firefly.lives) * CONFIG.scorePerLife +
    state.stunned * 25;
  if (won) {
    renderer.best = Math.max(renderer.best, state.score);
    sound.win();
    announce(`Dawn breaks. You gathered ${state.embers} embers and scored ${state.score}. Press Enter to fly again.`);
  } else {
    sound.lose();
    announce(`The dark wins. You gathered ${state.embers} embers and scored ${state.score}. Press Enter to fly again.`);
  }
}

function setupScreenshot() {
  if (shot === 'play') {
    resetNight();
    state.mode = 'playing';
    state.timeLeft = 47;
    state.embers = 11;
    state.stunned = 6;
    firefly.x = 584;
    firefly.y = 352;
    firefly.vx = 120;
    firefly.vy = -40;
    firefly.glow = 66;
    firefly.lives = 2;
    const spots = [
      [820, 250], [960, 470], [250, 210], [1080, 340], [430, 560], [700, 600], [170, 470], [1180, 560],
    ];
    for (const [x, y] of spots) {
      moths.spawn(60);
      const m = moths.moths[moths.moths.length - 1];
      m.x = x;
      m.y = y;
      m.vx = 20;
      m.vy = 20;
    }
    firefly.invulnerable = 999;
  } else if (shot === 'end') {
    resetNight();
    state.mode = 'over';
    state.won = true;
    state.embers = CONFIG.quota;
    state.timeLeft = 12.4;
    state.stunned = 17;
    state.score = CONFIG.quota * CONFIG.scorePerEmber + 12 * CONFIG.scorePerSecond + 2 * CONFIG.scorePerLife + 17 * 25;
    renderer.best = Math.max(renderer.best, state.score);
    state.players = null;
  }
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  input.keys.add(event.code);
  if (event.repeat) return;

  if (event.code === 'KeyM') {
    sound.unlock();
    state.muted = sound.toggle();
    announce(state.muted ? 'Sound muted.' : 'Sound on.');
    return;
  }

  if (state.mode === 'title' && (event.code === 'Enter' || event.code === 'NumpadEnter')) {
    startGame();
    return;
  }
  if (state.mode === 'over' && (event.code === 'Enter' || event.code === 'NumpadEnter')) {
    startGame();
    return;
  }
  if (state.mode === 'playing' || state.mode === 'paused') {
    if (event.code === 'KeyP' || event.code === 'Escape') {
      state.mode = state.mode === 'playing' ? 'paused' : 'playing';
      announce(state.mode === 'paused' ? 'Paused. Press P to resume.' : 'Resumed.');
      return;
    }
    if (event.code === 'Space' && state.mode === 'playing') {
      if (firefly.vent()) {
        sound.vent();
        state.stunned += moths.ventAt(firefly.x, firefly.y, CONFIG.ventRadius);
        particles.burst(firefly.x, firefly.y, 26, { color: '#9fd8ff', speed: 240, life: 0.7, size: 2.2 });
        for (let i = 0; i < 3; i += 1) {
          particles.spawn(firefly.x, firefly.y, {
            vx: Math.cos((i / 3) * Math.PI * 2) * 60,
            vy: Math.sin((i / 3) * Math.PI * 2) * 60,
            life: 0.9,
            size: 2,
            color: '#dff2ff',
            drag: 0.8,
          });
        }
        announce(`Vent. ${state.stunned} moths scattered. Glow ${Math.round(firefly.glow)}.`);
      }
    }
  }
});

window.addEventListener('keyup', (event) => {
  input.keys.delete(event.code);
});

window.addEventListener('blur', () => {
  input.keys.clear();
  if (state.mode === 'playing') {
    state.mode = 'paused';
    announce('Paused. Press P to resume.');
  }
});

function readMovement() {
  const keys = input.keys;
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  input.x = x;
  input.y = y;
}

function updatePlaying(dt) {
  readMovement();
  state.timeLeft -= dt;
  firefly.update(dt, input, state.elapsed);
  embers.update(dt, state.elapsed);
  moths.update(dt, firefly, firefly.glow, state.elapsed);
  particles.update(dt);

  const caught = embers.collectAt(firefly.x, firefly.y, firefly.radius + 3);
  if (caught) {
    state.embers += 1;
    firefly.addGlow(CONFIG.glowPerEmber);
    sound.ember();
    particles.burst(caught.x, caught.y, 14, { color: '#ffe9a8', speed: 130, life: 0.6, size: 1.8 });
    announce(`Ember ${state.embers} of ${CONFIG.quota}. Glow ${Math.round(firefly.glow)}. ${Math.ceil(state.timeLeft)} seconds of night left.`);
    if (state.embers >= CONFIG.quota) {
      finishNight(true);
      return;
    }
  }

  for (const moth of moths.moths) {
    if (moth.stun > 0) continue;
    const d = Math.hypot(moth.x - firefly.x, moth.y - firefly.y);
    if (d < moth.size * 0.72 + firefly.radius) {
      if (firefly.sting()) {
        sound.sting();
        state.shake = 16;
        state.flash = 0.5;
        state.embers = Math.max(0, state.embers - 1);
        embers.scatter(random);
        particles.burst(firefly.x, firefly.y, 20, { color: '#ff5d7a', speed: 210, life: 0.7, size: 2.4 });
        moth.stun = 0.8;
        moth.vx = (moth.x - firefly.x) * 6;
        moth.vy = (moth.y - firefly.y) * 6;
        announce(`Stung. ${Math.max(0, firefly.lives)} lives left.`);
        if (firefly.lives <= 0) {
          finishNight(false);
          return;
        }
      }
    }
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    finishNight(false);
  }
}

function update(dt) {
  state.elapsed += dt;
  state.shake = Math.max(0, state.shake - dt * 34);
  state.flash = Math.max(0, state.flash - dt * 1.8);
  if (state.mode === 'playing') {
    updatePlaying(dt);
  } else if (state.mode === 'title' || state.mode === 'over') {
    particles.update(dt);
  }
}

function draw() {
  const { elapsed } = state;
  renderer.background(elapsed, state.mode === 'title' ? 1 : 0.5);

  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  if (state.mode === 'title') {
    drawTitleFireflies(elapsed);
    renderer.titleScreen(elapsed);
    ctx.restore();
    return;
  }

  embers.draw(ctx);
  particles.draw(ctx);
  moths.drawGlow(ctx);
  moths.draw(ctx);
  if (state.mode !== 'over') firefly.draw(ctx);
  ctx.restore();

  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = state.flash * 0.5;
    renderer.vignettePulse('rgba(255, 60, 100, 0.65)');
    ctx.restore();
  }

  if (state.mode === 'playing' || state.mode === 'paused') {
    renderer.hud({
      firefly,
      embers: state.embers,
      timeLeft: state.timeLeft,
      stunned: state.stunned,
      muted: state.muted,
    });
  }
  if (state.mode === 'paused') renderer.pauseScreen();
  if (state.mode === 'over') {
    renderer.endScreen(
      {
        won: state.won,
        score: state.score,
        embers: state.embers,
        lives: Math.max(0, firefly.lives),
        stunned: state.stunned,
      },
      elapsed,
    );
  }
}

function drawTitleFireflies(elapsed) {
  const cx = VIEW.width / 2;
  const cy = 236;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i += 1) {
    const angle = elapsed * (0.3 + i * 0.015) + i;
    const radius = 90 + i * 16;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle * 1.3) * radius * 0.42;
    const pulse = 0.4 + Math.sin(elapsed * 2 + i) * 0.3;
    ctx.globalAlpha = clamp(pulse, 0.1, 0.8);
    ctx.fillStyle = i % 4 === 0 ? '#cfe6ff' : '#ffe9a8';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

if (shot === 'start' || shot === 'play' || shot === 'end') {
  setupScreenshot();
}
announce('Emberlight. Press Enter to kindle the night.');
requestAnimationFrame(frame);
