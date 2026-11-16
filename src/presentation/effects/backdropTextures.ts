import type Phaser from 'phaser';
import { mulberry32, type RandomSource } from '../../core/utils/random';
import { createCanvasTexture } from '../display/canvasTexture';

export const BACKDROP_TEXTURES = {
  stars: 'backdrop-stars',
  hills: ['backdrop-hills-far', 'backdrop-hills-mid', 'backdrop-hills-near'],
  ember: 'fx-ember',
} as const;

const TILE_WIDTH = 512;
const STARS_HEIGHT = 160;
const TEXTURE_SEED = 0x40d4;

interface HillLayerShape {
  readonly height: number;
  readonly baseline: number;
  readonly amplitude: number;
  readonly pines: number;
}

const HILL_LAYERS: readonly HillLayerShape[] = [
  { height: 120, baseline: 44, amplitude: 26, pines: 0 },
  { height: 96, baseline: 46, amplitude: 18, pines: 0 },
  { height: 72, baseline: 44, amplitude: 10, pines: 26 },
];

/**
 * Genera por código las texturas de fondo. Son siluetas en escala de grises que se
 * repiten sin costura en horizontal; cada escena las tiñe con su paleta.
 */
export function generateBackdropTextures(textures: Phaser.Textures.TextureManager): void {
  const random = mulberry32(TEXTURE_SEED);
  createCanvasTexture(textures, BACKDROP_TEXTURES.stars, TILE_WIDTH, STARS_HEIGHT, (ctx) => {
    drawStars(ctx, random);
  });
  HILL_LAYERS.forEach((shape, index) => {
    const key = BACKDROP_TEXTURES.hills[index];
    if (key === undefined) return;
    createCanvasTexture(textures, key, TILE_WIDTH, shape.height, (ctx) => {
      drawHills(ctx, shape, random);
    });
  });
  createCanvasTexture(textures, BACKDROP_TEXTURES.ember, 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
}

function drawStars(ctx: CanvasRenderingContext2D, random: RandomSource): void {
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(random() * TILE_WIDTH);
    const y = Math.floor(random() * random() * STARS_HEIGHT);
    ctx.fillStyle = random() < 0.25 ? '#ffffff' : '#b9b4d6';
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  shape: HillLayerShape,
  random: RandomSource,
): void {
  // Suma de senos con frecuencias enteras: el perfil coincide en ambos bordes del tile.
  const waves = [1, 2, 3, 5, 8].map((frequency) => ({
    frequency,
    phase: random() * Math.PI * 2,
    weight: (0.5 + random() * 0.5) / frequency,
  }));
  const totalWeight = waves.reduce((sum, wave) => sum + wave.weight, 0);
  const topAt = (x: number): number => {
    const angle = (x / TILE_WIDTH) * Math.PI * 2;
    const sample = waves.reduce(
      (sum, wave) => sum + Math.sin(angle * wave.frequency + wave.phase) * wave.weight,
      0,
    );
    return Math.round(shape.baseline - (sample / totalWeight) * shape.amplitude);
  };

  for (let x = 0; x < TILE_WIDTH; x++) {
    const top = topAt(x);
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x, top, 1, shape.height - top);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, top, 1, 2);
  }

  ctx.fillStyle = '#d0d0d0';
  for (let i = 0; i < shape.pines; i++) {
    const x = Math.floor(random() * TILE_WIDTH);
    const pineHeight = 7 + Math.floor(random() * 9);
    drawPine(ctx, x, topAt(x) + 1, pineHeight);
  }
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, groundY: number, height: number): void {
  for (let row = 0; row < height; row++) {
    const halfWidth = Math.floor(row / 3) + (row % 3 === 2 ? 1 : 0);
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      // El módulo hace que un pino cortado por el borde continúe en el lado opuesto.
      ctx.fillRect((x + dx + TILE_WIDTH) % TILE_WIDTH, groundY - height + row, 1, 1);
    }
  }
}
