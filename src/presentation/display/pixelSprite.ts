import type { PixelSprite } from '../../domain/catalog/PixelSprite';
import { cssColor } from './canvasTexture';

/** Dibuja un sprite definido como datos, píxel a píxel, con su esquina en el punto dado. */
export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  offsetX: number,
  offsetY: number,
): void {
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = sprite.palette[row.charAt(x)];
      if (color === undefined) continue;
      ctx.fillStyle = cssColor(color);
      ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
    }
  });
}
