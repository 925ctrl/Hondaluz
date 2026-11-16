import { approach } from '../../entities/Player';
import { overlapsSolid } from '../../physics/tileCollision';
import { GRAVITY, MAX_FALL_SPEED, sightOf, wander, type EnemyBehavior } from './EnemyBehavior';

const ACCELERATION = 200;
/** En el aire conserva parte del control horizontal mientras cae. */
const AIR_CONTROL = 0.6;

/**
 * Excava a través de la roca hacia el jugador, sin chocar con los bloques. Fuera de la
 * tierra cae por su peso, así que asoma, salta sobre su presa y vuelve a hundirse.
 */
export const burrower: EnemyBehavior = (enemy, context) => {
  const { dt, tiles, tileSize, worldWidth, worldHeight } = context;
  const { speed } = enemy.definition;
  const sight = enemy.canSteer ? sightOf(enemy, context) : null;

  if (overlapsSolid(enemy, tiles, tileSize)) {
    if (enemy.canSteer) {
      const targetVx = sight ? (sight.dx / sight.distance) * speed : wander(enemy, context) * speed;
      const targetVy = sight ? (sight.dy / sight.distance) * speed : 0;
      enemy.vx = approach(enemy.vx, targetVx, ACCELERATION * dt);
      enemy.vy = approach(enemy.vy, targetVy, ACCELERATION * dt);
    }
  } else {
    if (sight)
      enemy.vx = approach(enemy.vx, Math.sign(sight.dx) * speed, ACCELERATION * AIR_CONTROL * dt);
    enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY * dt);
  }
  if (Math.abs(enemy.vx) > 1) enemy.facing = enemy.vx > 0 ? 1 : -1;

  enemy.x = Math.min(worldWidth - enemy.width, Math.max(0, enemy.x + enemy.vx * dt));
  enemy.y = Math.min(worldHeight - enemy.height, enemy.y + enemy.vy * dt);
};
