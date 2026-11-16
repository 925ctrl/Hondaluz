import type { Box } from '../physics/tileCollision';
import { ENEMY_BEHAVIORS } from './behaviors';
import type { BehaviorContext } from './behaviors/EnemyBehavior';
import { Enemy } from './Enemy';
import type { EnemyDefinition } from './EnemyDefinition';

/** Criaturas vivas del mundo. Las mueve con su comportamiento y avanza sus temporizadores. */
export class EnemyRoster {
  private readonly enemies: Enemy[] = [];
  private nextId = 1;

  get all(): readonly Enemy[] {
    return this.enemies;
  }

  add(definition: EnemyDefinition, x: number, y: number): Enemy {
    const enemy = new Enemy(this.nextId++, definition, x, y);
    this.enemies.push(enemy);
    return enemy;
  }

  remove(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
  }

  clear(): void {
    this.enemies.length = 0;
  }

  step(context: BehaviorContext): void {
    for (const enemy of this.enemies) {
      enemy.age += context.dt;
      enemy.health.tick(context.dt);
      enemy.stunned = Math.max(0, enemy.stunned - context.dt);
      ENEMY_BEHAVIORS[enemy.definition.behavior](enemy, context);
    }
  }

  /** Criaturas cuya caja toca la indicada. */
  touching(box: Box): Enemy[] {
    return this.enemies.filter(
      (enemy) =>
        enemy.x < box.x + box.width &&
        enemy.x + enemy.width > box.x &&
        enemy.y < box.y + box.height &&
        enemy.y + enemy.height > box.y,
    );
  }
}
