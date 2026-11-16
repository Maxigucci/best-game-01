// Shadow moths are drawn to light. The brighter the firefly burns, the faster they
// come and the quicker they fly. Venting darkness stuns them for a moment, which is
// the whole tension of the game: the thing that scores you is the thing that hunts you.

import { CONFIG, PALETTE, VIEW, clamp } from './state.js';

export class MothSwarm {
  constructor(random) {
    this.random = random;
    this.moths = [];
    this.spawnTimer = 0;
  }

  reset() {
    this.moths.length = 0;
    this.spawnTimer = 0.8;
  }

  spawn(glow) {
    const edge = Math.floor(this.random() * 4);
    const margin = 60;
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = -margin;
      y = this.random() * VIEW.height;
    } else if (edge === 1) {
      x = VIEW.width + margin;
      y = this.random() * VIEW.height;
    } else if (edge === 2) {
      x = this.random() * VIEW.width;
      y = -margin;
    } else {
      x = this.random() * VIEW.width;
      y = VIEW.height + margin;
    }
    const size = 7 + this.random() * 5;
    this.moths.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size,
      wing: this.random() * Math.PI * 2,
      flutter: 1.4 + this.random() * 2.2,
      speedScale: 0.85 + this.random() * 0.4,
      stun: 0,
      glare: clamp(glow / 100, 0, 1),
      hue: this.random() < 0.22 ? PALETTE.danger : PALETTE.moth,
    });
  }

  get count() {
    return this.moths.length;
  }

  ventAt(x, y, radius) {
    let stunned = 0;
    for (const moth of this.moths) {
      const dx = moth.x - x;
      const dy = moth.y - y;
      const d = Math.hypot(dx, dy);
      if (d < radius && d > 0.001) {
        moth.stun = 1.35;
        moth.vx = (dx / d) * 430;
        moth.vy = (dy / d) * 430;
        stunned += 1;
      }
    }
    return stunned;
  }

  update(dt, player, glow, elapsed) {
    const pressure = clamp(glow / 100, 0, 1);
    const want = Math.min(CONFIG.mothCap, Math.floor(2 + pressure * 16));
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.moths.length < want) {
      this.spawn(glow);
      this.spawnTimer = Math.max(0.34, 1.35 - pressure * 1.05) * (0.8 + this.random() * 0.5);
    }

    const speed = CONFIG.mothBaseSpeed + CONFIG.mothSpeedPerGlow * glow;
    for (let i = this.moths.length - 1; i >= 0; i -= 1) {
      const moth = this.moths[i];
      moth.wing += dt * (moth.stun > 0 ? 4 : 13);
      if (moth.stun > 0) {
        moth.stun -= dt;
        moth.vx *= Math.max(0, 1 - 2.2 * dt);
        moth.vy *= Math.max(0, 1 - 2.2 * dt);
        moth.x += moth.vx * dt;
        moth.y += moth.vy * dt;
        continue;
      }

      const dx = player.x - moth.x;
      const dy = player.y - moth.y;
      const d = Math.hypot(dx, dy) || 1;
      const aimX = dx / d;
      const aimY = dy / d;
      const sway = Math.sin(elapsed * moth.flutter + moth.wing) * 0.55;
      const targetX = aimX * speed * moth.speedScale + -aimY * sway * 60;
      const targetY = aimY * speed * moth.speedScale + aimX * sway * 60;
      const steer = 3.4;
      moth.vx += (targetX - moth.vx) * steer * dt;
      moth.vy += (targetY - moth.vy) * steer * dt;
      moth.x += moth.vx * dt;
      moth.y += moth.vy * dt;

      if (moth.x < -260 || moth.x > VIEW.width + 260 || moth.y < -260 || moth.y > VIEW.height + 260) {
        this.moths.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const moth of this.moths) {
      const stunned = moth.stun > 0;
      const flap = Math.sin(moth.wing);
      const span = 0.45 + Math.abs(flap) * 0.55;
      ctx.save();
      ctx.translate(moth.x, moth.y);
      const heading = Math.atan2(moth.vy, moth.vx) + Math.PI / 2;
      ctx.rotate(heading);
      ctx.globalAlpha = stunned ? 0.4 : 0.94;
      ctx.fillStyle = stunned ? PALETTE.muted : moth.hue;
      ctx.shadowColor = moth.hue;
      ctx.shadowBlur = stunned ? 4 : 20;

      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        const s = moth.size;
        // Forewing: broad at the shoulder, tapering to a soft torn tip.
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -s * 0.2);
        ctx.quadraticCurveTo(s * 1.25, -s * (0.5 + span * 0.7), s * 1.05, s * 0.35);
        ctx.quadraticCurveTo(s * 0.8, s * 0.7, s * 0.12, s * 0.3);
        ctx.closePath();
        ctx.fill();
        // Hindwing: smaller, lower.
        ctx.globalAlpha = stunned ? 0.28 : 0.72;
        ctx.beginPath();
        ctx.moveTo(s * 0.08, s * 0.1);
        ctx.quadraticCurveTo(s * 0.86, s * (0.35 + span * 0.5), s * 0.62, s * 0.86);
        ctx.quadraticCurveTo(s * 0.3, s * 1.0, s * 0.08, s * 0.44);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = stunned ? 0.4 : 0.94;
        // Wing veins give the silhouette some texture at a glance.
        ctx.strokeStyle = stunned ? 'rgba(160,180,190,0.35)' : 'rgba(20, 12, 42, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s * 0.16, -s * 0.1);
        ctx.quadraticCurveTo(s * 0.7, -s * 0.2, s * 1.0, s * 0.28);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = stunned ? '#5d7278' : '#2b1b52';
      ctx.beginPath();
      ctx.ellipse(0, 0, moth.size * 0.3, moth.size * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = stunned ? '#8aa4ab' : PALETTE.mothWing;
      ctx.beginPath();
      ctx.arc(0, -moth.size * 0.62, moth.size * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stunned ? 'rgba(160,180,190,0.4)' : 'rgba(185, 164, 255, 0.75)';
      ctx.lineWidth = 1.1;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * moth.size * 0.1, -moth.size * 0.72);
        ctx.quadraticCurveTo(side * moth.size * 0.5, -moth.size * 1.2, side * moth.size * 0.72, -moth.size * 1.34);
        ctx.stroke();
      }
      ctx.restore();

      if (stunned) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#9fd8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(moth.x, moth.y, moth.size * 1.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawGlow(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const moth of this.moths) {
      const g = ctx.createRadialGradient(moth.x, moth.y, 0, moth.x, moth.y, moth.size * 3.6);
      g.addColorStop(0, moth.stun > 0 ? 'rgba(120,180,210,0.12)' : 'rgba(125,92,255,0.20)');
      g.addColorStop(1, 'rgba(125,92,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(moth.x, moth.y, moth.size * 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}