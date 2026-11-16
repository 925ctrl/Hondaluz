import type Phaser from 'phaser';
import { createCanvasTexture } from '../display/canvasTexture';

export const LANTERN_LIGHT_KEY = 'fx-lantern-light';
/** Escalones de intensidad: la luz se dibuja en anillos, al estilo pixel art. */
const BANDS = 5;

/** Genera la textura de un círculo de luz que se desvanece en anillos hacia el borde. */
export function generateLightTexture(
  textures: Phaser.Textures.TextureManager,
  radius: number,
): void {
  const size = radius * 2;
  createCanvasTexture(textures, LANTERN_LIGHT_KEY, size, size, (ctx) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distance = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
        if (distance >= 1) continue;
        const band = Math.floor(distance * BANDS);
        const strength = band === 0 ? 1 : 1 - band / BANDS;
        ctx.fillStyle = `rgba(255, 255, 255, ${strength.toFixed(2)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}
