import { Health } from '../combat/Health';
import type { Box } from '../physics/tileCollision';
import type { EnemyDefinition } from './EnemyDefinition';

/** Una criatura viva en el mundo. `x`, `y` son la esquina superior izquierda de su caja. */
export class Enemy implements Box {
  vx = 0;
  vy = 0;
  grounded = false;
  facing: -1 | 1 = 1;
  /** Segundos que lleva en el mundo; sirve para animar y para oscilaciones de vuelo. */
  age = 0;
  /** Segundos en los que un golpe recibido le impide dirigir su movimiento. */
  stunned = 0;
  /** Estado de deambular: dirección elegida y tiempo restante para cambiarla. */
  wanderDirection = 0;
  wanderTimer = 0;
  readonly health: Health;

  constructor(
    readonly id: number,
    readonly definition: EnemyDefinition,
    public x: number,
    public y: number,
  ) {
    this.health = new Health(definition.maxHealth);
  }

  get width(): number {
    return this.definition.width;
  }

  get height(): number {
    return this.definition.height;
  }

  get canSteer(): boolean {
    return this.stunned <= 0;
  }

  knockBack(vx: number, vy: number, stunSeconds: number): void {
    const keep = 1 - this.definition.knockbackResistance;
    this.vx = vx * keep;
    this.vy = vy * keep;
    this.stunned = stunSeconds * keep;
  }
}
