import type { Player } from '../../domain/entities/Player';
import type { TileQuery } from '../../domain/world/WorldMap';
import type { InputSource } from '../input/InputSource';

/** Rapidez con la que se disuelve el salto visual al subir un escalón (1/s). */
const LIFT_DECAY = 22;

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Convierte la entrada en intención, avanza al jugador en cada paso de simulación y calcula
 * la posición a dibujar, interpolada entre pasos para que sea fluida a cualquier FPS.
 */
export class PlayerMovementSystem {
  /** Punto central de los pies, en píxeles del mundo, listo para dibujar. */
  feetX = 0;
  feetY = 0;
  private previousX: number;
  private previousY: number;
  private lift = 0;

  constructor(
    private readonly player: Player,
    private readonly input: InputSource,
    private readonly tiles: TileQuery,
    private readonly tileSize: number,
  ) {
    this.previousX = player.x;
    this.previousY = player.y;
    this.interpolate(0, 0);
  }

  /** Avanza un paso de simulación con la entrada actual. */
  step(stepSeconds: number): void {
    const { player, input } = this;
    const right = input.isActive('moveRight') ? 1 : 0;
    const left = input.isActive('moveLeft') ? 1 : 0;
    const intent = { moveX: (right - left) as -1 | 0 | 1, jump: input.isActive('jump') };

    this.previousX = player.x;
    this.previousY = player.y;
    const lifted = player.step(intent, stepSeconds, this.tiles, this.tileSize);
    // El escalón se sube de golpe en la simulación y poco a poco en pantalla.
    this.previousY -= lifted;
    this.lift += lifted;
  }

  /** Calcula la posición a dibujar; `alpha` es la fracción recorrida hacia el siguiente paso. */
  interpolate(alpha: number, deltaSeconds: number): void {
    const { player } = this;
    this.lift *= Math.exp(-LIFT_DECAY * deltaSeconds);
    if (this.lift < 0.5) this.lift = 0;
    this.feetX = lerp(this.previousX, player.x, alpha) + player.width / 2;
    this.feetY = lerp(this.previousY, player.y, alpha) + player.height + this.lift;
  }
}
