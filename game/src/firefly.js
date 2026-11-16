// The firefly itself: steering, drag, the glow meter, the vent burst and the small
// warm body that carries all of it. Glow is both multiplier and magnet for danger.

import { CONFIG, PALETTE, WORLD, VIEW, clamp } from './state.js';

export class Firefly {
  constructor(particles) {
    this.particles = particles;
    this.x = VIEW.width / 2;
    this.y = VIEW.height / 2 + 40;
    this.vx = 0;
    this.vy = 0;
    this.glow = 34;
    this.lives = CONFIG.lives;
    this.invulnerable = 0;
    this.ventCooldown = 0;
    this.ventFlash = 0;
    this.wing = 0;
    this.trailTimer = 0;
    this.facing = 1;
  }

  reset() {
    this.x = VIEW.width / 2;
    this.y = VIEW.height / 2 + 40;
    this.vx = 0;
    this.vy = 0;
    this.glow = 34;
    this.lives = CONFIG.lives;
    this.invulnerable = 0;
    this.ventCooldown = 0;
    this.ventFlash = 0;
    this.wing = 0;
  }

  get canVent() {
    return this.ventCooldown <= 0 && this.glow >= CONFIG.ventCost;
  }

  get radius() {
    return CONFIG.playerRadius;
  }

  get lightRadius() {
    return 26 + this.glow * 1.15;
  }

  addGlow(amount) {
    this.glow = clamp(this.glow + amount, 0, CONFIG.glowMax);
  }

  vent() {
    if (!this.canVent) return false;
    this.glow = clamp(this.glow - CONFIG.ventCost, 0, CONFIG.glowMax);
    this.ventCooldown = CONFIG.ventCooldown;
    this.ventFlash = 0.5;
    this.invulnerable = Math.max(this.invulnerable, 0.35);
    return true;
  }

  sting() {
    if (this.invulnerable > 0) return false;
    this.lives -= 1;
    this.invulnerable = CONFIG.hitInvulnerable;
    this.glow = clamp(this.glow * 0.45, 0, CONFIG.glowMax);
    this.vx *= -0.4;
    this.vy *= -0.4;
    return true;
  }

  update(dt, input, elapsed) {
    this.wing += dt * 34;
    this.ventCooldown = Math.max(0, this.ventCooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.ventFlash = Math.max(0, this.ventFlash - dt);

    let ax = input.x;
    let ay = input.y;
    const length = Math.hypot(ax, ay);
    if (length > 1) {
      ax /= length;
      ay /= length;
    }

    this.vx += ax * CONFIG.playerAccel * dt;
    this.vy += ay * CONFIG.playerAccel * dt;
    const drag = Math.max(0, 1 - CONFIG.playerDrag * dt);
    this.vx *= drag;
    this.vy *= drag;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > CONFIG.playerMaxSpeed) {
      this.vx = (this.vx / speed) * CONFIG.playerMaxSpeed;
      this.vy = (this.vy / speed) * CONFIG.playerMaxSpeed;
    }
    if (Math.abs(this.vx) > 8) this.facing = this.vx > 0 ? 1 : -1;

    this.x = clamp(this.x + this.vx * dt, WORLD.pad, VIEW.width - WORLD.pad);
    this.y = clamp(this.y + this.vy * dt, WORLD.top, WORLD.bottom);

    this.glow = clamp(this.glow - CONFIG.glowDecay * dt, 0, CONFIG.glowMax);

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.035;
      const warm = this.glow > 55 ? PALETTE.emberHot : PALETTE.ember;
      this.particles.trail(this.x - this.vx * 0.02, this.y - this.vy * 0.02, warm);
    }
    void elapsed;
  }

  draw(ctx) {
    const flicker = 1 + Math.sin(this.wing * 0.7) * 0.08;
    const light = this.lightRadius * flicker;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, light);
    halo.addColorStop(0, `rgba(255, 238, 170, ${0.5 + this.glow * 0.004})`);
    halo.addColorStop(0.28, 'rgba(255, 197, 92, 0.22)');
    halo.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(this.x, this.y, light, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.ventFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = 1 - this.ventFlash / 0.5;
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 6 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20 + t * CONFIG.ventRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    const blink = this.invulnerable > 0 ? (Math.floor(this.invulnerable * 14) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = blink;

    const flap = Math.sin(this.wing) * 0.7;
    ctx.fillStyle = 'rgba(214, 240, 255, 0.55)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * this.facing, 1);
      ctx.rotate(-0.5 + flap * 0.35);
      ctx.beginPath();
      ctx.ellipse(6, -4, 9, 3.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#2a1d12';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.shadowColor = PALETTE.glow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, -7.4, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
