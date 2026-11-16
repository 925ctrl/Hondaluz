import type Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
  readonly color: number;
  readonly size: number;
  readonly gravity: number;
}

export interface Burst {
  readonly x: number;
  readonly y: number;
  readonly colors: readonly number[];
  readonly count: number;
  /** Velocidad máxima de salida, en px/s. */
  readonly speed: number;
  readonly gravity: number;
  readonly life: number;
  readonly size?: number;
}

/** Límite de partículas vivas: las ráfagas nuevas no pasan de aquí. */
const MAX_PARTICLES = 400;

/**
 * Partículas sencillas de pixel art: cuadrados que salen disparados, caen y se desvanecen.
 * Todas se dibujan en un único objeto gráfico, repintado cada frame.
 */
export class ParticleView {
  private readonly particles: Particle[] = [];
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth: number) {
    this.graphics = scene.add.graphics().setDepth(depth);
  }

  get count(): number {
    return this.particles.length;
  }

  burst({ x, y, colors, count, speed, gravity, life, size = 2 }: Burst): void {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - speed * 0.4,
        life: life * (0.6 + Math.random() * 0.4),
        maxLife: life,
        color: colors[i % colors.length] ?? 0xffffff,
        size,
        gravity,
      });
    }
  }

  update(dt: number): void {
    const g = this.graphics;
    g.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, Math.min(1, (p.life / p.maxLife) * 1.5));
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.particles.length = 0;
  }
}
