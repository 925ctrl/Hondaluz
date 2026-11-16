import type Phaser from 'phaser';
import { hashString, mulberry32, type RandomSource } from '../../core/utils/random';
import type { BlockRegistry, BlockVisual, GrainVisual } from '../../domain/world/BlockDefinition';
import { createCanvasTexture, cssColor } from '../display/canvasTexture';
import { drawPixelSprite } from '../display/pixelSprite';

export const TILESET_KEY = 'tileset';
/** Variantes dibujadas por bloque; se alternan según la posición para romper la repetición. */
export const TILE_VARIANTS = 4;

/** Variante que corresponde a una posición del mundo. Estable: no depende del orden de dibujo. */
export function tileVariant(tileX: number, tileY: number): number {
  return ((Math.imul(tileX, 73856093) ^ Math.imul(tileY, 19349663)) >>> 0) % TILE_VARIANTS;
}

/**
 * Dibuja el atlas de bloques a partir de sus definiciones: una fila por bloque
 * (según su índice en el registro) y una columna por variante.
 */
export function generateTileset(
  textures: Phaser.Textures.TextureManager,
  blocks: BlockRegistry,
  tileSize: number,
): void {
  const width = TILE_VARIANTS * tileSize;
  createCanvasTexture(textures, TILESET_KEY, width, blocks.all.length * tileSize, (ctx) => {
    blocks.all.forEach((block, index) => {
      if (!block.visual) return;
      for (let variant = 0; variant < TILE_VARIANTS; variant++) {
        const random = mulberry32(hashString(block.id) + variant);
        ctx.save();
        ctx.translate(variant * tileSize, index * tileSize);
        drawTile(ctx, tileSize, block.visual, random);
        ctx.restore();
      }
    });
  });
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  visual: BlockVisual,
  random: RandomSource,
): void {
  if ('sprite' in visual) drawPixelSprite(ctx, visual.sprite, 0, 0);
  else drawGrainTile(ctx, size, visual, random);
}

function drawGrainTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  visual: GrainVisual,
  random: RandomSource,
): void {
  const pick = (max: number): number => Math.floor(random() * max);
  ctx.globalAlpha = visual.alpha ?? 1;
  ctx.fillStyle = cssColor(visual.base);
  ctx.fillRect(0, 0, size, size);

  for (const color of [visual.shade, visual.highlight]) {
    ctx.fillStyle = cssColor(color);
    if (visual.grain === 'bark') {
      // Vetas verticales de longitud irregular.
      for (let i = 0; i < 4; i++) ctx.fillRect(pick(size), pick(size), 1, 3 + pick(size - 3));
    } else if (visual.grain === 'coarse') {
      for (let i = 0; i < 5; i++) ctx.fillRect(pick(size), pick(size), 2 + pick(3), 1 + pick(2));
    } else {
      const motes = Math.round(size * size * 0.07);
      for (let i = 0; i < motes; i++) ctx.fillRect(pick(size), pick(size), 1, 1);
    }
  }

  if (visual.flecks) {
    for (let i = 0; i < 5; i++) {
      const x = 1 + pick(size - 4);
      const y = 1 + pick(size - 4);
      ctx.fillStyle = cssColor(visual.flecks.color);
      ctx.fillRect(x, y, 2 + pick(2), 2);
      ctx.fillStyle = cssColor(visual.flecks.highlight);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  if (visual.cap) {
    const { base, highlight, depth } = visual.cap;
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = cssColor(base);
      ctx.fillRect(x, 0, 1, depth - 1 + pick(3));
      ctx.fillStyle = cssColor(highlight);
      ctx.fillRect(x, 0, 1, 1);
      if (random() < 0.2) ctx.fillRect(x, 1 + pick(2), 1, 1);
    }
  }
}
