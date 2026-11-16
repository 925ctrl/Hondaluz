import type Phaser from 'phaser';
import type { Enemy } from '../../domain/enemies/Enemy';
import { ENEMY_ATLAS_KEY, enemyFrame } from './enemyTextures';

/** Fotogramas por segundo de la animación de las criaturas. */
const FRAME_RATE = 6;
const HIT_FLASH = 0xffffff;

/** Dibuja las criaturas vivas: animación, orientación y un destello blanco al recibir un golpe. */
export class EnemiesView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
  ) {}

  sync(enemies: readonly Enemy[]): void {
    const alive = new Set<number>();
    for (const enemy of enemies) {
      alive.add(enemy.id);
      const { definition } = enemy;
      let sprite = this.sprites.get(enemy.id);
      if (!sprite) {
        sprite = this.scene.add
          .sprite(0, 0, ENEMY_ATLAS_KEY, enemyFrame(definition.id, 0))
          .setOrigin(0.5, 1)
          .setDepth(this.depth);
        this.sprites.set(enemy.id, sprite);
      }
      const frame = Math.floor(enemy.age * FRAME_RATE) % definition.frames.length;
      sprite
        .setFrame(enemyFrame(definition.id, frame))
        .setPosition(Math.round(enemy.x + enemy.width / 2), Math.round(enemy.y + enemy.height))
        .setFlipX(enemy.facing < 0);
      if (enemy.health.isInvulnerable) sprite.setTintFill(HIT_FLASH);
      else sprite.clearTint();
    }
    for (const [id, sprite] of this.sprites) {
      if (alive.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }
  }
}
