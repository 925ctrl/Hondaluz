import type Phaser from 'phaser';
import { createCanvasTexture } from '../display/canvasTexture';
import { drawPixelSprite } from '../display/pixelSprite';

export const PLAYER_TEXTURE_KEY = 'player';
export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAMES = { idle: 0, pass: 1, half: 2, apart: 3, jump: 4 } as const;

const PALETTE: Readonly<Record<string, number>> = {
  o: 0x1c1633, // contorno
  h: 0xf08a5d, // capucha
  H: 0xc4553f,
  s: 0xfbd3a8, // piel
  e: 0x1c1633,
  c: 0x6d4a86, // túnica
  C: 0x4a3168,
  l: 0xfff3b0, // farol
  L: 0xffc56b,
  p: 0x3a3560, // pantalón
  b: 0x8a5a3c, // botas
};

/** Cabeza y torso, comunes a todos los fotogramas. El personaje mira a la derecha. */
const BODY = [
  '.....ooooooo....',
  '....ohhhhhhho...',
  '...ohhhhhhhhho..',
  '...ohhhHssssso..',
  '...ohhHsseseso..',
  '...ohhHsssssso..',
  '...ohHHhsssso...',
  '....oHHhhhho....',
  '....occcccco....',
  '...occcccccco...',
  '...oCccccccso...',
  '...oCcccccoooo..',
  '...oCcccccolLo..',
  '...oCcccccolLo..',
  '...oCccccccooo..',
  '...oCcccccco....',
  '...oCCccccco....',
  '...ooooooooo....',
];

/** Piernas de cada fotograma, en el orden de `PLAYER_FRAMES`. */
const LEGS = [
  [
    '....opppppo.....',
    '....oppoppo.....',
    '....oppoppo.....',
    '....oppoppo.....',
    '....oppoppo.....',
    '....oppoppo.....',
    '....obbobbo.....',
    '....ooooooo.....',
  ],
  [
    '....opppppo.....',
    '....opppppo.....',
    '.....opppo......',
    '.....opppo......',
    '.....opppo......',
    '.....opppo......',
    '.....obbbo......',
    '.....ooooo......',
  ],
  [
    '....opppppo.....',
    '....oppoppo.....',
    '...oppo.oppo....',
    '...oppo.oppo....',
    '...oppo.oppo....',
    '..oppo...oppo...',
    '..obbo...obbo...',
    '..oooo...oooo...',
  ],
  [
    '....opppppo.....',
    '...oppoooppo....',
    '..oppo...oppo...',
    '..oppo...oppo...',
    '.oppo.....oppo..',
    '.oppo.....oppo..',
    '.obbo.....obbo..',
    '.oooo.....oooo..',
  ],
  [
    '....opppppo.....',
    '...oppoooppo....',
    '..oppo..oppo....',
    '..obbo..oppo....',
    '..oooo..oppo....',
    '........obbo....',
    '........oooo....',
    '................',
  ],
];

export const PLAYER_FRAME_HEIGHT = BODY.length + (LEGS[0]?.length ?? 0);

/** Dibuja la hoja de sprites del jugador y registra un fotograma por postura. */
export function generatePlayerTexture(textures: Phaser.Textures.TextureManager): void {
  const texture = createCanvasTexture(
    textures,
    PLAYER_TEXTURE_KEY,
    PLAYER_FRAME_WIDTH * LEGS.length,
    PLAYER_FRAME_HEIGHT,
    (ctx) => {
      LEGS.forEach((legs, frame) => {
        const x = frame * PLAYER_FRAME_WIDTH;
        drawPixelSprite(ctx, { rows: BODY, palette: PALETTE }, x, 0);
        drawPixelSprite(ctx, { rows: legs, palette: PALETTE }, x, BODY.length);
      });
    },
  );
  LEGS.forEach((_, frame) => {
    texture.add(frame, 0, frame * PLAYER_FRAME_WIDTH, 0, PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT);
  });
}
