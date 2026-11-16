// The embers are the firefly's food and its score. They drift on slow sine paths and
// respawn elsewhere in the garden once gathered, so there is always another light
// to chase while the night runs out.

import { CONFIG, WORLD, VIEW, distance } from './state.js';

export class EmberField {
  constructor(random) {
    this.random = random;
    this.embers = [];
    this.sparkTimer = 0;
  }

  reset() {
    this.embers.length = 0;
    for (let i = 0; i < CONFIG.emberCount; i += 1) {
      this.embers.push(this.makeEmber());
    }
  }

  makeEmber() {
    const margin = WORLD.pad + 30;
    return {
      x: margin + this.random() * (VIEW.width - margin * 2),
      y: WORLD.top + 20 + this.random() * (WORLD.bottom - WORLD.top - 40),
      phase: this.random() * Math.PI * 2,
      pulse: 0.6 + this.random() * 0.8,
      driftX: 14 + this.random() * 18,
      driftY: 10 + this.random() * 14,
      r: CONFIG.emberRadius * (0.8 + this.random() * 0.4),
      born: 0,
      alive: true,
    };
  }

  get remaining() {
    return this.embers.length;
  }

  update(dt, elapsed) {
    for (const ember of this.embers) {
      ember.born += dt;
      ember.phase += dt * ember.pulse;
      ember.x += Math.cos(ember.phase * 0.7) * ember.driftX * dt;
      ember.y += Math.sin(ember.phase * 0.9) * ember.driftY * dt;
      if (ember.x < WORLD.pad) {
        ember.x = WORLD.pad;
        ember.phase += 1.7;
      }
      if (ember.x > WORLD.width - WORLD.pad) {
        ember.x = WORLD.width - WORLD.pad;
        ember.phase += 1.7;
      }
      if (ember.y < WORLD.top) {
        ember.y = WORLD.top;
        ember.phase += 1.7;
      }
      if (ember.y > WORLD.bottom) {
        ember.y = WORLD.bottom;
        ember.phase += 1.7;
      }
    }
  }

  collectAt(x, y, radius) {
    for (let i = 0; i < this.embers.length; i += 1) {
      const ember = this.embers[i];
      if (distance(x, y, ember.x, ember.y) <= radius + ember.r) {
        this.embers.splice(i, 1);
        const fresh = this.makeEmber();
        fresh.born = 0;
        this.embers.push(fresh);
        return ember;
      }
    }
    return null;
  }

  // An ember is knocked loose when a moth stings the firefly, then falls back in.
  scatter(random) {
    for (let i = 0; i < 3; i += 1) {
      const fresh = this.makeEmber();
      fresh.born = -0.4;
      this.embers.push(fresh);
    }
    if (this.embers.length > CONFIG.emberCount + 4) {
      this.embers.splice(0, this.embers.length - (CONFIG.emberCount + 4));
    }
    void random;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ember of this.embers) {
      const rise = Math.min(1, Math.max(0, ember.born * 2.2));
      const glow = 0.55 + Math.sin(ember.phase * 2.2) * 0.18;
      ctx.globalAlpha = (0.35 + glow * 0.45) * rise;
      ctx.fillStyle = '#ffb347';
      ctx.shadowColor = '#ffc95c';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.r * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = rise;
      const core = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, ember.r * 1.1);
      core.addColorStop(0, '#fff7d6');
      core.addColorStop(0.55, '#ffd166');
      core.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = core;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.r * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
