import type Phaser from 'phaser';

/** Convierte un color `0xRRGGBB` en el formato que entiende el canvas. */
export const cssColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Crea una textura de Phaser dibujándola con la API 2D del canvas. */
export function createCanvasTexture(
  textures: Phaser.Textures.TextureManager,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Phaser.Textures.CanvasTexture {
  const texture = textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`No se pudo crear la textura "${key}".`);
  draw(texture.getContext());
  texture.refresh();
  return texture;
}
