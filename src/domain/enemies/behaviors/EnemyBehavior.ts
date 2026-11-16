import type { RandomSource } from '../../../core/utils/random';
import type { Box } from '../../physics/tileCollision';
import type { TileQuery } from '../../world/WorldMap';
import type { Enemy } from '../Enemy';

/** Lo que un comportamiento puede consultar en cada paso. */
export interface BehaviorContext {
  readonly dt: number;
  readonly tiles: TileQuery;
  readonly tileSize: number;
  /** A quién persigue; `null` si no hay objetivo (por ejemplo, el jugador ha caído). */
  readonly target: Box | null;
  readonly random: RandomSource;
  /** Tamaño del mundo en píxeles, para no salirse de él. */
  readonly worldWidth: number;
  readonly worldHeight: number;
}

/** Decide hacia dónde se mueve una criatura y la desplaza un paso. */
export type EnemyBehavior = (enemy: Enemy, context: BehaviorContext) => void;

export const GRAVITY = 900;
export const MAX_FALL_SPEED = 480;

export const centerX = (box: Box): number => box.x + box.width / 2;
export const centerY = (box: Box): number => box.y + box.height / 2;

/** Vector hacia el objetivo si está dentro del rango de detección; `null` si no lo ve. */
export function sightOf(
  enemy: Enemy,
  context: BehaviorContext,
): { dx: number; dy: number; distance: number } | null {
  const { target, tileSize } = context;
  if (!target) return null;
  const dx = centerX(target) - centerX(enemy);
  const dy = centerY(target) - centerY(enemy);
  const distance = Math.hypot(dx, dy);
  return distance <= enemy.definition.detectionRange * tileSize ? { dx, dy, distance } : null;
}

/** Cambia cada pocos segundos entre ir a la izquierda, a la derecha o quedarse quieto. */
export function wander(enemy: Enemy, context: BehaviorContext): number {
  enemy.wanderTimer -= context.dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderDirection = Math.floor(context.random() * 3) - 1;
    enemy.wanderTimer = 1.5 + context.random() * 2.5;
  }
  return enemy.wanderDirection;
}
