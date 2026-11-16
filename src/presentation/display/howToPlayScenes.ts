import type Phaser from 'phaser';
import type { GameContent } from '../../domain/catalog/GameContent';
import { LANTERN_LIGHT_KEY } from '../effects/lightTexture';
import { enemyFrame, ENEMY_ATLAS_KEY } from '../entities/enemyTextures';
import { PLAYER_FRAMES, PLAYER_TEXTURE_KEY } from '../entities/playerTextures';
import { DAY_BACKDROP, NIGHT_BACKDROP, type BackdropPalette } from '../theme/palette';
import type { HowToPlaySceneId, HowToPlayScenes } from '../ui/HowToPlayScenes';
import { ITEM_ATLAS_KEY } from '../world/itemTextures';
import { TILESET_KEY } from '../world/tileTextures';
import { cssColor } from './canvasTexture';

/** Tamaño nativo de un fotograma: 6 × 3 bloques de 16 px. */
const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 48;
const TILE = 16;
/** Fila superior del suelo y altura a la que se apoya algo de un bloque de alto. */
const GROUND_Y = FRAME_HEIGHT - TILE;
const ON_GROUND_Y = GROUND_Y - TILE;
/** El jugador mide 26 px: así sus pies tocan el suelo. */
const PLAYER_Y = GROUND_Y - 26;

/** Lo que puede dibujar una escena: piezas sacadas de las texturas que ya generó la precarga. */
interface Painter {
  readonly ctx: CanvasRenderingContext2D;
  sky(palette: BackdropPalette): void;
  ground(blockId: string): void;
  tile(blockId: string, x: number, y: number): void;
  item(itemId: string, x: number, y: number, rotation?: number): void;
  player(frame: number, x: number, y: number): void;
  enemy(enemyId: string, frame: number, x: number, y: number, flash?: boolean): void;
  /** Oscurece el fotograma salvo un círculo de luz centrado en el punto dado. */
  darkness(alpha: number, lightX: number, lightY: number, radius: number): void;
}

type SceneFrame = (painter: Painter) => void;

const SCENES: Readonly<Record<HowToPlaySceneId, readonly SceneFrame[]>> = {
  move: [
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.pass, 8, PLAYER_Y);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.half, 20, PLAYER_Y);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.apart, 32, PLAYER_Y);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.jump, 46, PLAYER_Y - 12);
    },
  ],
  mine: [
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 14, PLAYER_Y);
      p.tile('stone', 48, ON_GROUND_Y);
      p.item('wood_pickaxe', 30, 4, -0.6);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 14, PLAYER_Y);
      p.tile('stone', 48, ON_GROUND_Y);
      cracks(p.ctx, 48, ON_GROUND_Y);
      p.item('wood_pickaxe', 34, 12, 0.6);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 14, PLAYER_Y);
      p.item('wood_pickaxe', 30, 4, -0.6);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 14, PLAYER_Y);
      p.tile('dirt', 48, ON_GROUND_Y);
    },
  ],
  hotbar: [0, 1, 2, 3].map((selected) => (p: Painter) => {
    hotbar(p, selected);
  }),
  craft: [
    (p) => {
      dayGround(p);
      p.item('workbench', 16, ON_GROUND_Y);
      p.item('wood', 16, 0);
    },
    (p) => {
      dayGround(p);
      p.item('workbench', 16, ON_GROUND_Y);
      p.item('wood', 16, 0);
      arrow(p.ctx, 38, 8);
    },
    (p) => {
      dayGround(p);
      p.item('workbench', 16, ON_GROUND_Y);
      arrow(p.ctx, 38, 8);
      p.item('wood_pickaxe', 60, 0);
    },
  ],
  combat: [
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 22, PLAYER_Y);
      p.item('wood_sword', 34, 5, -0.8);
      p.enemy('stump', 0, 56, ON_GROUND_Y);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 22, PLAYER_Y);
      p.item('wood_sword', 40, 12, 0.8);
      p.enemy('stump', 0, 60, ON_GROUND_Y, true);
    },
    (p) => {
      dayGround(p);
      p.player(PLAYER_FRAMES.idle, 22, PLAYER_Y);
      p.item('wood_sword', 36, 12, 0.3);
      p.enemy('stump', 1, 62, ON_GROUND_Y);
    },
  ],
  night: [32, 36].map((radius) => (p: Painter) => {
    p.sky(NIGHT_BACKDROP);
    p.ground('grass');
    p.player(PLAYER_FRAMES.idle, 12, PLAYER_Y);
    p.item('torch', 48, ON_GROUND_Y);
    p.darkness(0.75, 56, ON_GROUND_Y + 8, radius);
  }),
};

/**
 * Compone las escenas animadas de la guía «Cómo jugar» con las texturas del juego y las
 * entrega a la interfaz como tiras de fotogramas. Requiere que tileset, objetos, jugador,
 * enemigos y luz ya existan. Una escena que no se puede componer se omite.
 */
export function generateHowToPlayScenes(
  textures: Phaser.Textures.TextureManager,
  content: GameContent,
  scenes: HowToPlayScenes,
): void {
  for (const [id, frames] of Object.entries(SCENES) as [HowToPlaySceneId, SceneFrame[]][]) {
    try {
      scenes.set(id, { url: drawStrip(textures, content, frames), frames: frames.length });
    } catch (error) {
      console.warn(`No se pudo componer la escena «${id}» de la guía.`, error);
    }
  }
}

function drawStrip(
  textures: Phaser.Textures.TextureManager,
  content: GameContent,
  frames: readonly SceneFrame[],
): string {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH * frames.length;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas de la escena.');
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, index) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(index * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.clip();
    ctx.translate(index * FRAME_WIDTH, 0);
    frame(createPainter(ctx, textures, content));
    ctx.restore();
  });
  return canvas.toDataURL('image/png');
}

function createPainter(
  ctx: CanvasRenderingContext2D,
  textures: Phaser.Textures.TextureManager,
  content: GameContent,
): Painter {
  const source = (key: string): CanvasImageSource =>
    textures.get(key).getSourceImage() as CanvasImageSource;

  const drawAtlasFrame = (key: string, name: string | number, x: number, y: number): void => {
    const texture = textures.get(key);
    if (!texture.has(String(name))) throw new Error(`Falta el fotograma «${String(name)}».`);
    const frame = texture.get(name);
    ctx.drawImage(
      source(key),
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      x,
      y,
      frame.cutWidth,
      frame.cutHeight,
    );
  };

  const painter: Painter = {
    ctx,
    sky(palette) {
      const gradient = ctx.createLinearGradient(0, 0, 0, FRAME_HEIGHT);
      gradient.addColorStop(0, cssColor(palette.skyTop));
      gradient.addColorStop(1, cssColor(palette.skyBottom));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    },
    ground(blockId) {
      for (let x = 0; x < FRAME_WIDTH; x += TILE) painter.tile(blockId, x, GROUND_Y);
    },
    tile(blockId, x, y) {
      const row = content.blocks.indexOf(blockId);
      ctx.drawImage(source(TILESET_KEY), 0, row * TILE, TILE, TILE, x, y, TILE, TILE);
    },
    item(itemId, x, y, rotation = 0) {
      if (rotation === 0) {
        drawAtlasFrame(ITEM_ATLAS_KEY, itemId, x, y);
        return;
      }
      ctx.save();
      ctx.translate(x + TILE / 2, y + TILE / 2);
      ctx.rotate(rotation);
      drawAtlasFrame(ITEM_ATLAS_KEY, itemId, -TILE / 2, -TILE / 2);
      ctx.restore();
    },
    player(frame, x, y) {
      drawAtlasFrame(PLAYER_TEXTURE_KEY, frame, x, y);
    },
    enemy(enemyId, frame, x, y, flash = false) {
      if (!flash) {
        drawAtlasFrame(ENEMY_ATLAS_KEY, enemyFrame(enemyId, frame), x, y);
        return;
      }
      // Silueta blanca: se dibuja aparte para no teñir el resto del fotograma.
      const sprite = document.createElement('canvas');
      sprite.width = TILE;
      sprite.height = TILE;
      const spriteCtx = sprite.getContext('2d');
      if (!spriteCtx) throw new Error('No se pudo crear el canvas del destello.');
      createPainter(spriteCtx, textures, content).enemy(enemyId, frame, 0, 0);
      spriteCtx.globalCompositeOperation = 'source-atop';
      spriteCtx.fillStyle = '#ffffff';
      spriteCtx.fillRect(0, 0, TILE, TILE);
      ctx.drawImage(sprite, x, y);
    },
    darkness(alpha, lightX, lightY, radius) {
      const shade = document.createElement('canvas');
      shade.width = FRAME_WIDTH;
      shade.height = FRAME_HEIGHT;
      const shadeCtx = shade.getContext('2d');
      if (!shadeCtx) throw new Error('No se pudo crear el canvas de la noche.');
      shadeCtx.imageSmoothingEnabled = false;
      shadeCtx.fillStyle = `rgba(7, 10, 24, ${alpha.toFixed(2)})`;
      shadeCtx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      shadeCtx.globalCompositeOperation = 'destination-out';
      shadeCtx.drawImage(
        source(LANTERN_LIGHT_KEY),
        lightX - radius,
        lightY - radius,
        radius * 2,
        radius * 2,
      );
      ctx.drawImage(shade, 0, 0);
    },
  };
  return painter;
}

function dayGround(p: Painter): void {
  p.sky(DAY_BACKDROP);
  p.ground('grass');
}

/** Grietas de un bloque a punto de romperse. */
function cracks(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = cssColor(0x1c1633);
  const pixels: readonly [number, number][] = [
    [7, 2],
    [7, 3],
    [6, 4],
    [6, 5],
    [7, 6],
    [8, 7],
    [8, 8],
    [9, 9],
    [5, 8],
    [4, 9],
    [10, 5],
    [11, 4],
    [12, 4],
    [7, 10],
    [7, 11],
    [6, 12],
  ];
  for (const [dx, dy] of pixels) ctx.fillRect(x + dx, y + dy, 1, 1);
}

/** Flecha horizontal de 16 × 9 px que apunta a la derecha. */
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = cssColor(0xfff3b0);
  ctx.fillRect(x, y + 3, 12, 3);
  for (let step = 0; step < 5; step++) ctx.fillRect(x + 11 + step, y + step, 1, 9 - step * 2);
}

const HOTBAR_ITEMS = ['wood_pickaxe', 'wood_sword', 'dirt', 'torch', 'balm'] as const;
const SLOT = 18;

/** Barra rápida de cinco ranuras con la ranura `selected` marcada. */
function hotbar(p: Painter, selected: number): void {
  const { ctx } = p;
  ctx.fillStyle = cssColor(0x1c1633);
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  const left = Math.floor((FRAME_WIDTH - HOTBAR_ITEMS.length * SLOT) / 2);
  const top = Math.floor((FRAME_HEIGHT - SLOT) / 2);
  HOTBAR_ITEMS.forEach((itemId, index) => {
    const x = left + index * SLOT;
    ctx.fillStyle = cssColor(index === selected ? 0xffc56b : 0x6d4a86);
    ctx.fillRect(x, top, SLOT, SLOT);
    ctx.fillStyle = cssColor(0x3f2d63);
    ctx.fillRect(x + 1, top + 1, SLOT - 2, SLOT - 2);
    p.item(itemId, x + 1, top + 1);
  });
}
