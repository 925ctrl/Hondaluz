import type Phaser from 'phaser';
import type { GameContent } from '../../domain/catalog/GameContent';
import { createCanvasTexture } from '../display/canvasTexture';
import { drawPixelSprite } from '../display/pixelSprite';
import type { ItemIcons } from '../ui/ItemIcons';
import { TILESET_KEY } from './tileTextures';

export const ITEM_ATLAS_KEY = 'items';

/**
 * Dibuja el atlas de objetos, con un fotograma por id de objeto, y entrega a la interfaz
 * cada icono como imagen. Un objeto sin icono propio usa el dibujo del bloque que coloca.
 * Requiere que el atlas de bloques ya exista.
 */
export function generateItemAtlas(
  textures: Phaser.Textures.TextureManager,
  content: GameContent,
  tileSize: number,
  icons: ItemIcons,
): void {
  const tileset = textures.get(TILESET_KEY).getSourceImage() as HTMLCanvasElement;
  const items = content.items.all;
  const atlas = createCanvasTexture(
    textures,
    ITEM_ATLAS_KEY,
    items.length * tileSize,
    tileSize,
    (ctx) => {
      items.forEach((item, index) => {
        const x = index * tileSize;
        if (item.icon) {
          drawPixelSprite(ctx, item.icon, x, 0);
        } else if (item.placesBlock !== undefined) {
          const row = content.blocks.indexOf(item.placesBlock);
          ctx.drawImage(tileset, 0, row * tileSize, tileSize, tileSize, x, 0, tileSize, tileSize);
        }
      });
    },
  );

  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = tileSize;
  iconCanvas.height = tileSize;
  const iconContext = iconCanvas.getContext('2d');
  if (!iconContext) throw new Error('No se pudo crear el canvas de iconos.');
  items.forEach((item, index) => {
    atlas.add(item.id, 0, index * tileSize, 0, tileSize, tileSize);
    iconContext.clearRect(0, 0, tileSize, tileSize);
    iconContext.drawImage(atlas.getSourceImage() as HTMLCanvasElement, -index * tileSize, 0);
    icons.set(item.id, iconCanvas.toDataURL());
  });
}
