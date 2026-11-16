import { Health } from '../combat/Health';
import { moveBox, overlapsLiquid, type Box } from '../physics/tileCollision';
import type { TileQuery } from '../world/WorldMap';

/** Parámetros de movimiento, en píxeles y segundos. */
export interface PlayerTuning {
  readonly width: number;
  readonly height: number;
  readonly moveSpeed: number;
  readonly groundAcceleration: number;
  readonly airAcceleration: number;
  readonly gravity: number;
  readonly jumpSpeed: number;
  readonly maxFallSpeed: number;
  /** Fracción de la velocidad de subida que se conserva al soltar el salto. */
  readonly jumpCutFactor: number;
  /** Margen para saltar justo después de dejar el suelo. */
  readonly coyoteTime: number;
  /** Margen para que cuente un salto pulsado justo antes de aterrizar. */
  readonly jumpBufferTime: number;
  /** Movimiento dentro de un líquido. */
  readonly swim: {
    /** Fracción de la gravedad y de la velocidad horizontal que se conserva en el agua. */
    readonly gravityFactor: number;
    readonly moveFactor: number;
    readonly maxSinkSpeed: number;
    /** Velocidad de subida mientras se mantiene el salto. */
    readonly riseSpeed: number;
    readonly riseAcceleration: number;
    /** Fracción del salto normal que da una brazada, para salir del agua a una orilla. */
    readonly strokeFactor: number;
  };
}

/** Lo que el jugador quiere hacer en un paso, independiente del dispositivo de entrada. */
export interface PlayerIntent {
  readonly moveX: -1 | 0 | 1;
  readonly jump: boolean;
}

const NO_INTENT: PlayerIntent = { moveX: 0, jump: false };

export const approach = (value: number, target: number, maxChange: number): number =>
  value < target ? Math.min(target, value + maxChange) : Math.max(target, value - maxChange);

/** Estado y reglas de movimiento del jugador. `x`, `y` son la esquina superior izquierda. */
export class Player implements Box {
  vx = 0;
  vy = 0;
  grounded = false;
  /** Toca un líquido en este paso. */
  submerged = false;
  facing: -1 | 1 = 1;
  readonly health: Health;
  /** Segundos durante los que un golpe recibido le quita el control. */
  private stunned = 0;
  private jumpWasHeld = false;
  private sinceGrounded = Infinity;
  private sinceJumpPressed = Infinity;

  constructor(
    readonly tuning: PlayerTuning,
    public x: number,
    public y: number,
    maxHealth: number,
  ) {
    this.health = new Health(maxHealth);
  }

  get width(): number {
    return this.tuning.width;
  }

  get height(): number {
    return this.tuning.height;
  }

  /**
   * Avanza la simulación un paso. Devuelve los píxeles que el jugador ha subido de golpe
   * al remontar un escalón, para que la vista pueda suavizarlo.
   */
  step(input: PlayerIntent, dt: number, tiles: TileQuery, tileSize: number): number {
    const t = this.tuning;
    const swim = t.swim;
    this.submerged = overlapsLiquid(this, tiles, tileSize);
    // Mientras dura el retroceso de un golpe, el jugador no controla al personaje.
    const intent = this.stunned > 0 ? NO_INTENT : input;
    if (this.stunned > 0) {
      this.stunned = Math.max(0, this.stunned - dt);
    } else {
      if (intent.moveX !== 0) this.facing = intent.moveX;
      const acceleration = this.grounded ? t.groundAcceleration : t.airAcceleration;
      const speed = t.moveSpeed * (this.submerged ? swim.moveFactor : 1);
      this.vx = approach(this.vx, intent.moveX * speed, acceleration * dt);
    }

    this.sinceGrounded = this.grounded ? 0 : this.sinceGrounded + dt;
    const pressed = intent.jump && !this.jumpWasHeld;
    this.sinceJumpPressed = pressed ? 0 : this.sinceJumpPressed + dt;
    if (this.submerged) {
      // En el agua se sube manteniendo el salto, y cada pulsación da una brazada.
      if (pressed) this.vy = Math.min(this.vy, -t.jumpSpeed * swim.strokeFactor);
      else if (intent.jump)
        this.vy = approach(this.vy, -swim.riseSpeed, swim.riseAcceleration * dt);
      this.sinceJumpPressed = Infinity;
      this.vy = Math.min(swim.maxSinkSpeed, this.vy + t.gravity * swim.gravityFactor * dt);
    } else {
      if (this.sinceJumpPressed <= t.jumpBufferTime && this.sinceGrounded <= t.coyoteTime) {
        this.vy = -t.jumpSpeed;
        this.sinceJumpPressed = Infinity;
        this.sinceGrounded = Infinity;
      } else if (!intent.jump && this.jumpWasHeld && this.vy < 0) {
        this.vy *= t.jumpCutFactor;
      }
      this.vy = Math.min(t.maxFallSpeed, this.vy + t.gravity * dt);
    }
    this.jumpWasHeld = intent.jump;

    const deltaX = this.vx * dt;
    let moved = moveBox(this, deltaX, 0, tiles, tileSize);
    let lift = 0;
    if (moved.blockedX && this.grounded) {
      // Escalón de un bloque: se sube solo si hay hueco encima y al otro lado.
      const raised = moveBox(this, 0, -tileSize, tiles, tileSize);
      const stepped = moveBox({ ...this.box(), y: raised.y }, deltaX, 0, tiles, tileSize);
      if (!raised.blockedY && !stepped.blockedX) {
        // Se posa sobre el escalón en el mismo paso para no quedar flotando.
        moved = moveBox({ ...this.box(), ...stepped }, 0, tileSize, tiles, tileSize);
        lift = this.y - moved.y;
      }
    }
    if (moved.blockedX) this.vx = 0;
    this.x = moved.x;
    this.y = moved.y;

    const fallen = moveBox(this, 0, this.vy * dt, tiles, tileSize);
    this.y = fallen.y;
    this.grounded = fallen.blockedY && this.vy > 0;
    if (fallen.blockedY) this.vy = 0;
    return lift;
  }

  /** Empuja al jugador y le quita el control durante `stunSeconds`. */
  knockBack(vx: number, vy: number, stunSeconds: number): void {
    this.vx = vx;
    this.vy = vy;
    this.grounded = false;
    this.stunned = stunSeconds;
  }

  /** Vuelve a la vida en una posición, quieto y con la vida completa. */
  respawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.stunned = 0;
    this.health.restore();
  }

  private box(): Box {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}
