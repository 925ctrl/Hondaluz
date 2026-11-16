import { approach } from '../../entities/Player';
import { moveBox } from '../../physics/tileCollision';
import { sightOf, wander, type EnemyBehavior } from './EnemyBehavior';

const ACCELERATION = 260;
/** Amplitud y frecuencia del aleteo vertical, para que no vuele en línea recta. */
const FLUTTER_AMPLITUDE = 0.5;
const FLUTTER_FREQUENCY = 5;
const WANDER_PACE = 0.35;

/** Vuela hacia el jugador con un aleteo irregular, chocando con los bloques; sin gravedad. */
export const flyer: EnemyBehavior = (enemy, context) => {
  const { dt, tiles, tileSize } = context;
  const { speed } = enemy.definition;
  if (enemy.canSteer) {
    const sight = sightOf(enemy, context);
    const flutter = Math.sin(enemy.age * FLUTTER_FREQUENCY) * speed * FLUTTER_AMPLITUDE;
    let targetVx: number;
    let targetVy: number;
    if (sight && sight.distance > 0) {
      targetVx = (sight.dx / sight.distance) * speed;
      targetVy = (sight.dy / sight.distance) * speed + flutter;
    } else {
      targetVx = wander(enemy, context) * speed * WANDER_PACE;
      targetVy = flutter * WANDER_PACE;
    }
    enemy.vx = approach(enemy.vx, targetVx, ACCELERATION * dt);
    enemy.vy = approach(enemy.vy, targetVy, ACCELERATION * dt);
    if (Math.abs(enemy.vx) > 1) enemy.facing = enemy.vx > 0 ? 1 : -1;
  }

  const moved = moveBox(enemy, enemy.vx * dt, enemy.vy * dt, tiles, tileSize);
  // Al chocar rebota un poco en lugar de quedarse pegado a la pared.
  if (moved.blockedX) enemy.vx *= -0.5;
  if (moved.blockedY) enemy.vy *= -0.5;
  enemy.x = moved.x;
  enemy.y = moved.y;
};
