// All the drawing that is not an entity: the moonlit garden, the HUD, the title
// and result screens, and the small typographic helpers they share. Everything is
// canvas, so the game loads no image or font file at all.

import { CONFIG, PALETTE, VIEW, clamp, rankFor } from './state.js';

const GRASS = makeGrass();

function makeGrass() {
  const blades = [];
  let seed = 91;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 110; i += 1) {
    blades.push({
      x: rand() * VIEW.width,
      h: 16 + rand() * 52,
      lean: (rand() - 0.5) * 30,
      sway: rand() * Math.PI * 2,
      width: 0.8 + rand() * 1.3,
    });
  }
  return blades;
}

const MOTES = [
  [140, 210, 0.0], [312, 142, 1.7], [470, 268, 3.1], [610, 120, 0.9],
  [742, 232, 2.4], [902, 168, 4.2], [1032, 288, 1.2], [1160, 200, 3.6],
  [204, 402, 2.2], [388, 352, 5.0], [560, 430, 0.4], [706, 366, 2.9],
  [858, 452, 4.6], [1010, 388, 1.5], [1128, 470, 3.3], [96, 520, 5.4],
  [338, 560, 1.1], [620, 520, 4.0], [936, 566, 2.6], [1204, 340, 0.7],
];

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.best = 0;
  }

  background(elapsed, brightness) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    sky.addColorStop(0, '#040811');
    sky.addColorStop(0.45, '#08192c');
    sky.addColorStop(0.78, '#0a2628');
    sky.addColorStop(1, '#061714');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const moonX = 1120;
    const moonY = 198;
    const moonR = 42;
    const moon = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 320);
    moon.addColorStop(0, 'rgba(150, 196, 210, 0.26)');
    moon.addColorStop(0.35, 'rgba(96, 142, 170, 0.09)');
    moon.addColorStop(1, 'rgba(20, 40, 60, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(760, 0, 520, 440);
    ctx.restore();

    ctx.save();
    const disc = ctx.createRadialGradient(moonX - moonR * 0.38, moonY - moonR * 0.42, 2, moonX, moonY, moonR);
    disc.addColorStop(0, '#f3f7f4');
    disc.addColorStop(0.55, '#cfe0e2');
    disc.addColorStop(1, '#93aeb6');
    ctx.fillStyle = disc;
    ctx.shadowColor = 'rgba(170, 216, 230, 0.75)';
    ctx.shadowBlur = 46;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#5f7b86';
    for (const [dx, dy, r] of [[-12, 10, 11], [12, -8, 7], [6, 16, 5], [-6, -16, 4]]) {
      ctx.beginPath();
      ctx.arc(moonX + dx, moonY + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const shade = ctx.createRadialGradient(moonX - 14, moonY - 16, 6, moonX, moonY, moonR * 1.12);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.62, 'rgba(10, 26, 40, 0.06)');
    shade.addColorStop(1, 'rgba(4, 12, 22, 0.62)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 244, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR - 0.5, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();

    this.hills();
    this.ambientMotes(elapsed, brightness);

    ctx.save();
    for (const blade of GRASS) {
      const sway = Math.sin(elapsed * 0.8 + blade.sway) * 4;
      const tipX = blade.x + blade.lean + sway;
      const tipY = VIEW.height - blade.h;
      const fade = ctx.createLinearGradient(blade.x, VIEW.height, tipX, tipY);
      fade.addColorStop(0, 'rgba(8, 30, 26, 0.85)');
      fade.addColorStop(0.65, 'rgba(20, 58, 47, 0.4)');
      fade.addColorStop(1, 'rgba(46, 104, 82, 0.12)');
      ctx.strokeStyle = fade;
      ctx.lineWidth = blade.width;
      ctx.beginPath();
      ctx.moveTo(blade.x, VIEW.height);
      ctx.quadraticCurveTo(blade.x + blade.lean * 0.4, VIEW.height - blade.h * 0.5, tipX, tipY);
      ctx.stroke();
    }
    ctx.restore();

    const mist = ctx.createLinearGradient(0, VIEW.height - 150, 0, VIEW.height);
    mist.addColorStop(0, 'rgba(24, 62, 58, 0)');
    mist.addColorStop(1, 'rgba(24, 62, 58, 0.16)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, VIEW.height - 150, VIEW.width, 150);

    const vignette = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 220, VIEW.width / 2, VIEW.height / 2, 760);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.34)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  hills() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#04100f';
    ctx.beginPath();
    ctx.moveTo(0, 560);
    ctx.bezierCurveTo(180, 486, 330, 556, 520, 520);
    ctx.bezierCurveTo(710, 484, 840, 548, 1010, 512);
    ctx.bezierCurveTo(1130, 486, 1220, 508, VIEW.width, 494);
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.lineTo(0, VIEW.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#071b18';
    ctx.beginPath();
    ctx.moveTo(0, 618);
    ctx.bezierCurveTo(230, 566, 420, 622, 640, 590);
    ctx.bezierCurveTo(880, 554, 1040, 618, VIEW.width, 584);
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.lineTo(0, VIEW.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ambientMotes(elapsed, brightness) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MOTES.length; i += 1) {
      const [x, y, phase] = MOTES[i];
      const driftX = Math.sin(elapsed * 0.35 + phase) * 18;
      const driftY = Math.cos(elapsed * 0.28 + phase * 1.3) * 12;
      const pulse = 0.35 + Math.sin(elapsed * 1.2 + phase * 2) * 0.2;
      const alpha = pulse * (0.25 + brightness * 0.2);
      const radius = 2.2 + (i % 3) * 0.8;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = i % 5 === 0 ? '#cfe6ff' : PALETTE.emberHot;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x + driftX, y + driftY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  vignettePulse(color) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 300, VIEW.width / 2, VIEW.height / 2, 760);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  hud(state) {
    const ctx = this.ctx;
    const { firefly, embers, timeLeft, stunned, muted } = state;
    const glow = firefly.glow;
    const ratio = clamp(glow / CONFIG.glowMax, 0, 1);

    ctx.save();
    const panel = ctx.createLinearGradient(0, 0, 0, 92);
    panel.addColorStop(0, 'rgba(4, 11, 18, 0.82)');
    panel.addColorStop(1, 'rgba(4, 11, 18, 0)');
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, VIEW.width, 92);

    ctx.fillStyle = 'rgba(232, 243, 238, 0.34)';
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('E M B E R L I G H T', 42, 34);

    ctx.fillStyle = PALETTE.emberHot;
    ctx.font = '700 22px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(String(embers).padStart(2, '0'), 42, 66);
    const emberWidth = ctx.measureText(String(embers).padStart(2, '0')).width;
    ctx.fillStyle = 'rgba(232, 243, 238, 0.5)';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`/ ${CONFIG.quota} EMBERS`, 42 + emberWidth + 8, 65);

    ctx.textAlign = 'right';
    const seconds = Math.max(0, Math.ceil(timeLeft));
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, '0');
    const urgent = timeLeft < 15;
    ctx.fillStyle = urgent ? PALETTE.danger : 'rgba(232, 243, 238, 0.85)';
    ctx.font = '700 24px ui-monospace, Menlo, monospace';
    ctx.fillText(`${mm}:${ss}`, VIEW.width - 42, 62);
    ctx.fillStyle = 'rgba(232, 243, 238, 0.34)';
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.fillText('NIGHT REMAINING', VIEW.width - 42, 34);

    ctx.fillStyle = 'rgba(232, 243, 238, 0.22)';
    ctx.fillRect(VIEW.width - 202, 72, 160, 4);
    ctx.fillStyle = urgent ? PALETTE.danger : 'rgba(255, 212, 121, 0.75)';
    ctx.fillRect(VIEW.width - 202, 72, 160 * clamp(timeLeft / CONFIG.nightSeconds, 0, 1), 4);

    const foot = ctx.createLinearGradient(0, VIEW.height - 118, 0, VIEW.height);
    foot.addColorStop(0, 'rgba(3, 8, 14, 0)');
    foot.addColorStop(1, 'rgba(3, 8, 14, 0.88)');
    ctx.fillStyle = foot;
    ctx.fillRect(0, VIEW.height - 118, VIEW.width, 118);

    this.hudGlow(ratio, firefly, muted);
    this.hudLives(firefly);
    this.hudHint(stunned, muted);
    ctx.restore();
  }

  hudGlow(ratio, firefly, muted) {
    const ctx = this.ctx;
    const w = 300;
    const x = VIEW.width / 2 - w / 2;
    const y = VIEW.height - 96;

    ctx.textAlign = 'center';
    ctx.fillStyle = ratio > 0.75 ? PALETTE.danger : 'rgba(232, 243, 238, 0.55)';
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.fillText('G L O W', VIEW.width / 2, y - 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    roundRect(ctx, x, y, w, 10, 5);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ffd479');
    grad.addColorStop(0.6, '#ffb347');
    grad.addColorStop(1, PALETTE.danger);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 18;
    roundRect(ctx, x, y, Math.max(6, w * ratio), 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    const ventReady = firefly.canVent;
    const label = ventReady ? 'SPACE · VENT' : 'VENT RECHARGING';
    ctx.font = '700 13px ui-monospace, Menlo, monospace';
    const chipW = ctx.measureText(label).width + 26;
    ctx.fillStyle = ventReady ? 'rgba(159, 216, 255, 0.10)' : 'rgba(159, 216, 255, 0.05)';
    roundRect(ctx, VIEW.width / 2 - chipW / 2, y + 14, chipW, 24, 12);
    ctx.fill();
    ctx.strokeStyle = ventReady ? 'rgba(159, 216, 255, 0.45)' : 'rgba(159, 216, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = ventReady ? '#bde6ff' : 'rgba(159, 216, 255, 0.4)';
    ctx.fillText(label, VIEW.width / 2, y + 31);
    ctx.fillStyle = 'rgba(232, 243, 238, 0.72)';
    ctx.font = '500 12px ui-monospace, Menlo, monospace';
    ctx.fillText(muted ? 'M · SOUND OFF' : 'M · MUTE', VIEW.width / 2, y + 56);
  }

  hudLives(firefly) {
    const ctx = this.ctx;
    const x = 44;
    const y = VIEW.height - 54;
    for (let i = 0; i < CONFIG.lives; i += 1) {
      const alive = i < firefly.lives;
      ctx.globalAlpha = alive ? 1 : 0.18;
      ctx.fillStyle = alive ? PALETTE.emberHot : PALETTE.muted;
      ctx.shadowColor = PALETTE.ember;
      ctx.shadowBlur = alive ? 14 : 0;
      ctx.beginPath();
      ctx.arc(x + i * 26, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(232, 243, 238, 0.75)';
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LIVES', x, y + 22);
  }

  hudHint(stunned, muted) {
    const ctx = this.ctx;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(232, 243, 238, 0.82)';
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.fillText(`SCATTERED ${stunned}`, VIEW.width - 44, VIEW.height - 40);
    if (muted) {
      ctx.fillStyle = 'rgba(159, 216, 255, 0.55)';
      ctx.font = '500 12px ui-monospace, Menlo, monospace';
      ctx.fillText('SOUND OFF', VIEW.width - 44, VIEW.height - 60);
    }
  }

  titleScreen(elapsed) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 8, 14, 0.42)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const cx = VIEW.width / 2;
    ctx.save();
    ctx.textAlign = 'center';
    const breathe = 0.86 + Math.sin(elapsed * 1.4) * 0.05;
    ctx.globalAlpha = 0.5 * breathe;
    const halo = ctx.createRadialGradient(cx, 236, 10, cx, 236, 300);
    halo.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
    halo.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, 236, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.emberHot;
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 40;
    ctx.font = '800 88px ui-serif, Georgia, serif';
    spacedText(ctx, 'EMBERLIGHT', cx, 236, 14);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(232, 243, 238, 0.82)';
    ctx.font = 'italic 25px ui-serif, Georgia, serif';
    ctx.fillText("a firefly's last night", cx, 294);

    ctx.fillStyle = 'rgba(232, 243, 238, 0.82)';
    ctx.font = '500 19px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Gather 18 embers before the night runs out.', cx, 372);
    ctx.fillStyle = '#f0a087';
    ctx.fillText('Your glow feeds you — and it calls the shadow moths.', cx, 402);

    const controls = [['WASD / ARROWS', 'FLY'], ['SPACE', 'VENT DARKNESS'], ['M', 'MUTE']];
    ctx.font = '700 14px ui-monospace, Menlo, monospace';
    const widths = controls.map(([key, act]) => {
      const keyW = ctx.measureText(key).width;
      const actW = ctx.measureText(act).width;
      return keyW + 10 + actW;
    });
    const totalW = widths.reduce((a, b) => a + b, 0) + 40 * (controls.length - 1);
    let controlX = cx - totalW / 2;
    controls.forEach(([key, act]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '700 14px ui-monospace, Menlo, monospace';
      ctx.fillText(key, controlX, 462);
      controlX += ctx.measureText(key).width + 10;
      ctx.fillStyle = 'rgba(232, 243, 238, 0.6)';
      ctx.font = '600 14px ui-monospace, Menlo, monospace';
      ctx.fillText(act, controlX, 462);
      controlX += ctx.measureText(act).width + 40;
    });
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(3, 8, 14, 0.6)';
    roundRect(ctx, cx - 232, 516, 464, 46, 23);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 212, 121, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const pulse = 0.62 + Math.sin(elapsed * 3.2) * 0.32;
    ctx.globalAlpha = clamp(pulse, 0.25, 1);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 24px ui-monospace, Menlo, monospace';
    spacedText(ctx, 'PRESS ENTER TO KINDLE', cx, 547, 4);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(232, 243, 238, 0.5)';
    ctx.font = '500 12px ui-monospace, Menlo, monospace';
    ctx.fillText('make.fun  ·  best-game-01', cx, VIEW.height - 34);
    ctx.restore();
  }

  endScreen(state, elapsed) {
    const ctx = this.ctx;
    const won = state.won;
    ctx.fillStyle = won ? 'rgba(14, 22, 14, 0.68)' : 'rgba(12, 6, 16, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const cx = VIEW.width / 2;
    ctx.save();
    ctx.textAlign = 'center';

    const tint = won ? 'rgba(255, 214, 120, 0.30)' : 'rgba(255, 93, 122, 0.24)';
    const halo = ctx.createRadialGradient(cx, 210, 10, cx, 210, 420);
    halo.addColorStop(0, tint);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, 210, 420, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = won ? PALETTE.emberHot : PALETTE.danger;
    ctx.shadowColor = won ? '#ffb347' : PALETTE.danger;
    ctx.shadowBlur = 36;
    ctx.font = '800 64px ui-serif, Georgia, serif';
    spacedText(ctx, won ? 'DAWN BREAKS' : 'THE DARK WINS', cx, 190, 8);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(232, 243, 238, 0.72)';
    ctx.font = 'italic 20px ui-serif, Georgia, serif';
    ctx.fillText(
      won ? `You carried ${state.embers} embers through to morning.` : `The night took you after ${state.embers} embers.`,
      cx,
      236,
    );

    ctx.fillStyle = 'rgba(232, 243, 238, 0.5)';
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    spacedText(ctx, 'FINAL GLOW', cx, 304, 3);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 76px ui-monospace, Menlo, monospace';
    ctx.fillText(String(state.score), cx, 372);

    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    spacedText(ctx, rankFor(state.score), cx, 408, 5);

    const cols = [
      ['EMBERS', `${state.embers} / ${CONFIG.quota}`],
      ['LIVES LEFT', `${Math.max(0, state.lives)} / ${CONFIG.lives}`],
      ['MOTHS SCATTERED', String(state.stunned)],
      ['BEST', String(Math.max(this.best, state.score))],
    ];
    cols.forEach(([label, value], i) => {
      const x = cx + (i - (cols.length - 1) / 2) * 200;
      ctx.fillStyle = 'rgba(232, 243, 238, 0.62)';
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      ctx.fillText(label, x, 474);
      ctx.fillStyle = 'rgba(232, 243, 238, 0.88)';
      ctx.font = '700 22px ui-monospace, Menlo, monospace';
      ctx.fillText(value, x, 502);
    });

    ctx.fillStyle = 'rgba(3, 8, 14, 0.62)';
    roundRect(ctx, cx - 210, 544, 420, 42, 21);
    ctx.fill();
    ctx.strokeStyle = won ? 'rgba(255, 212, 121, 0.24)' : 'rgba(255, 93, 122, 0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const pulse = 0.62 + Math.sin(elapsed * 3.2) * 0.32;
    ctx.globalAlpha = clamp(pulse, 0.25, 1);
    ctx.fillStyle = won ? PALETTE.emberHot : '#ffd0da';
    ctx.font = '700 22px ui-monospace, Menlo, monospace';
    spacedText(ctx, 'PRESS ENTER TO FLY AGAIN', cx, 573, 4);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(232, 243, 238, 0.5)';
    ctx.font = '500 12px ui-monospace, Menlo, monospace';
    ctx.fillText('make.fun  ·  best-game-01', cx, VIEW.height - 34);
    ctx.restore();
  }

  pauseScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 10, 16, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 44px ui-serif, Georgia, serif';
    spacedText(ctx, 'PAUSED', VIEW.width / 2, 340, 8);
    ctx.fillStyle = 'rgba(232, 243, 238, 0.6)';
    ctx.font = '600 15px ui-monospace, Menlo, monospace';
    ctx.fillText('P TO RESUME', VIEW.width / 2, 392);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spacedText(ctx, text, x, y, gap) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (chars.length - 1);
  let cursor = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  const previous = ctx.fillStyle;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + gap;
  });
  ctx.textAlign = align;
  ctx.fillStyle = previous;
}
