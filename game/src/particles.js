// A tiny particle pool: motes, sparks, vent rings and moth dust. Purely cosmetic,
// but it is what makes every action visible on screen.

const MAX_PARTICLES = 900;

export class Particles {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  spawn(x, y, options = {}) {
    if (this.items.length >= MAX_PARTICLES) this.items.shift();
    const life = options.life ?? 0.7;
    this.items.push({
      x,
      y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      drag: options.drag ?? 2.4,
      size: options.size ?? 2,
      life,
      ttl: life,
      color: options.color ?? '#ffc95c',
      fade: options.fade ?? 1,
      gravity: options.gravity ?? 0,
      shrink: options.shrink ?? true,
      glow: options.glow ?? true,
    });
  }

  burst(x, y, count, options = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (options.spin ?? 0);
      const speed = (options.speed ?? 90) * (0.45 + Math.random() * 0.75);
      this.spawn(x, y, {
        ...options,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: (options.life ?? 0.7) * (0.7 + Math.random() * 0.7),
        size: (options.size ?? 2.4) * (0.6 + Math.random() * 0.8),
      });
    }
  }

  trail(x, y, color) {
    this.spawn(x, y, {
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 26,
      size: 1.4 + Math.random() * 1.6,
      life: 0.55 + Math.random() * 0.35,
      color,
      drag: 1.4,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const drag = Math.max(0, 1 - p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const t = p.life / p.ttl;
      const alpha = Math.pow(t, p.fade);
      const size = p.shrink ? p.size * (0.35 + t * 0.65) : p.size;
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = size * 6;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
