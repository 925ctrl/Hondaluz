import { approach } from '../../entities/Player';
import { moveBox } from '../../physics/tileCollision';
import { GRAVITY, MAX_FALL_SPEED, sightOf, wander, type EnemyBehavior } from './EnemyBehavior';

const ACCELERATION = 600;
/** Salto suficiente para remontar un bloque. */
const JUMP_SPEED = 260;
/** Fracción de la velocidad con la que se mueve mientras deambula. */
const WANDER_PACE = 0.4;

/** Camina por el suelo hacia el jugador y salta los obstáculos; si no lo ve, deambula. */
export const walker: EnemyBehavior = (enemy, context) => {
  const { dt, tiles, tileSize } = context;
  const { speed } = enemy.definition;
  if (enemy.canSteer) {
    const sight = sightOf(enemy, context);
    const direction = sight ? Math.sign(sight.dx) : wander(enemy, context);
    const pace = sight ? 1 : WANDER_PACE;
    enemy.vx = approach(enemy.vx, direction * speed * pace, ACCELERATION * dt);
    if (direction !== 0) enemy.facing = direction > 0 ? 1 : -1;
  }
  enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY * dt);

  const moved = moveBox(enemy, enemy.vx * dt, 0, tiles, tileSize);
  if (moved.blockedX) {
    if (enemy.grounded && enemy.canSteer) enemy.vy = -JUMP_SPEED;
    else enemy.vx = 0;
  }
  enemy.x = moved.x;
  const fallen = moveBox(enemy, 0, enemy.vy * dt, tiles, tileSize);
  enemy.y = fallen.y;
  enemy.grounded = fallen.blockedY && enemy.vy > 0;
  if (fallen.blockedY) enemy.vy = 0;
};
