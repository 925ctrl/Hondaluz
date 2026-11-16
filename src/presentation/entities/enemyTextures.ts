import type Phaser from 'phaser';
import type { EnemyRegistry } from '../../domain/catalog/GameContent';
import { createCanvasTexture } from '../display/canvasTexture';
import { drawPixelSprite } from '../display/pixelSprite';

export const ENEMY_ATLAS_KEY = 'enemies';
const FRAME_SIZE = 16;

/** Nombre del fotograma `index` de un enemigo dentro del atlas. */
export const enemyFrame = (enemyId: string, index: number): string => `${enemyId}:${String(index)}`;

/** Dibuja todos los fotogramas de todos los enemigos en un atlas: una fila por enemigo. */
export function generateEnemyAtlas(
  textures: Phaser.Textures.TextureManager,
  enemies: EnemyRegistry,
): void {
  const columns = Math.max(...enemies.all.map((enemy) => enemy.frames.length), 1);
  const atlas = createCanvasTexture(
    textures,
    ENEMY_ATLAS_KEY,
    columns * FRAME_SIZE,
    Math.max(1, enemies.all.length) * FRAME_SIZE,
    (ctx) => {
      enemies.all.forEach((enemy, row) => {
        enemy.frames.forEach((frame, column) => {
          drawPixelSprite(ctx, frame, column * FRAME_SIZE, row * FRAME_SIZE);
        });
      });
    },
  );
  enemies.all.forEach((enemy, row) => {
    enemy.frames.forEach((_, column) => {
      atlas.add(
        enemyFrame(enemy.id, column),
        0,
        column * FRAME_SIZE,
        row * FRAME_SIZE,
        FRAME_SIZE,
        FRAME_SIZE,
      );
    });
  });
}
