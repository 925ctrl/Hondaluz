import Phaser from 'phaser';
import { MAX_LIGHT } from '../../domain/world/BlockDefinition';
import type { Rect } from '../../domain/world/ChunkRange';
import { LightField, type LightSettings, type TileRect } from '../../domain/world/LightField';
import type { WorldMap } from '../../domain/world/WorldMap';
import { LANTERN_LIGHT_KEY } from './lightTexture';

export interface LightingOverlaySettings {
  readonly tileSize: number;
  readonly color: number;
  /** Opacidad de la oscuridad donde no llega ninguna luz (0-1). */
  readonly maxDarkness: number;
  /** Fracción de la luz del cielo que queda en plena noche. */
  readonly nightSkyBrightness: number;
  readonly daylightSteps: number;
  readonly refreshSeconds: number;
  readonly light: LightSettings;
}

const SHADE_KEY = 'fx-light-shade';
/** La zona calculada se alinea a esta rejilla para no recalcular con cada píxel de cámara. */
const SNAP_TILES = 8;

/**
 * Oscuridad sobre el mundo según la luz de cada bloque y la hora: el cielo ilumina lo que
 * está a la intemperie (menos de noche), los bloques luminosos iluminan a su alrededor y el
 * farol del jugador abre un hueco de luz. La luz se recalcula solo al moverse la zona visible
 * o cambiar bloques, nunca en cada frame; cada frame solo se compone la imagen.
 */
export class LightingOverlay {
  private readonly texture: Phaser.GameObjects.RenderTexture;
  private readonly lantern: Phaser.GameObjects.Image;
  private shade: { canvas: Phaser.Textures.CanvasTexture; image: Phaser.GameObjects.Image } | null =
    null;
  private field: LightField | null = null;
  private readonly emission: readonly number[];
  private readonly solid: readonly boolean[];
  private dirty = true;
  private sinceRefresh = Infinity;
  private paintedStep = -1;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: WorldMap,
    blocks: readonly { readonly solid: boolean; readonly light?: number }[],
    depth: number,
    private readonly settings: LightingOverlaySettings,
  ) {
    this.emission = blocks.map((block) => block.light ?? 0);
    this.solid = blocks.map((block) => block.solid);
    this.texture = scene.add
      .renderTexture(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);
    this.lantern = scene.make.image({ key: LANTERN_LIGHT_KEY, add: false });
    this.unsubscribe = map.onTileChange((x, y) => {
      if (this.field?.contains(x, y)) this.dirty = true;
    });
  }

  layout(width: number, height: number): void {
    this.texture.resize(width, height);
  }

  /**
   * `view`: zona visible en píxeles del mundo. `daylight`: luz del sol (0 de noche, 1 de día).
   * `lights`: puntos de luz en coordenadas de pantalla, como el farol del jugador.
   */
  update(
    view: Rect,
    daylight: number,
    lights: readonly { x: number; y: number }[],
    deltaSeconds: number,
  ): void {
    const { tileSize, daylightSteps, refreshSeconds } = this.settings;
    this.sinceRefresh += deltaSeconds;
    const rect = this.rectFor(view);
    const moved = !this.field || !sameRect(this.field.rect, rect);
    if (moved || (this.dirty && this.sinceRefresh >= refreshSeconds)) {
      this.field = LightField.compute(
        this.map,
        this.emission,
        this.solid,
        rect,
        this.settings.light,
      );
      this.dirty = false;
      this.sinceRefresh = 0;
      this.paintedStep = -1;
    }
    const step = Math.round(daylight * daylightSteps);
    const shade = this.paintShade(step / daylightSteps, step);

    this.texture.clear();
    shade.image.setPosition(rect.x * tileSize - view.x, rect.y * tileSize - view.y);
    this.texture.draw(shade.image);
    for (const light of lights) {
      this.texture.erase(this.lantern, Math.round(light.x), Math.round(light.y));
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.releaseShade();
    this.texture.destroy();
  }

  private releaseShade(): void {
    if (!this.shade) return;
    this.shade.image.destroy();
    this.scene.textures.remove(SHADE_KEY);
    this.shade = null;
  }

  /** La zona visible más un margen por el que la luz aún puede entrar, alineada a la rejilla. */
  private rectFor(view: Rect): TileRect {
    const { tileSize } = this.settings;
    const margin = MAX_LIGHT + 1;
    const snap = (value: number): number => Math.floor(value / SNAP_TILES) * SNAP_TILES;
    const x = snap(Math.floor(view.x / tileSize) - margin);
    const y = snap(Math.floor(view.y / tileSize) - margin);
    const right = snap(Math.ceil((view.x + view.width) / tileSize) + margin) + SNAP_TILES;
    const bottom = snap(Math.ceil((view.y + view.height) / tileSize) + margin) + SNAP_TILES;
    return { x, y, width: right - x, height: bottom - y };
  }

  /** Pinta un píxel de sombra por bloque; ampliada, la luz cae en escalones de un bloque. */
  private paintShade(
    daylight: number,
    step: number,
  ): { canvas: Phaser.Textures.CanvasTexture; image: Phaser.GameObjects.Image } {
    const field = this.field;
    if (!field) throw new Error('La luz no está calculada.');
    const { width, height } = field.rect;
    let shade = this.shade;
    if (shade?.canvas.width !== width || shade.canvas.height !== height) {
      this.releaseShade();
      const canvas = this.scene.textures.createCanvas(SHADE_KEY, width, height);
      if (!canvas) throw new Error('No se pudo crear la textura de sombra.');
      const image = this.scene.make
        .image({ key: SHADE_KEY, add: false })
        .setOrigin(0, 0)
        .setScale(this.settings.tileSize);
      shade = { canvas, image };
      this.shade = shade;
      this.paintedStep = -1;
    }
    if (step === this.paintedStep) return shade;
    this.paintedStep = step;

    const { color, maxDarkness, nightSkyBrightness } = this.settings;
    const sky = nightSkyBrightness + (1 - nightSkyBrightness) * daylight;
    const ctx = shade.canvas.getContext();
    const pixels = ctx.createImageData(width, height);
    const data = pixels.data;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    for (let i = 0; i < width * height; i++) {
      const brightness = Math.max(
        (field.block[i] ?? 0) / MAX_LIGHT,
        ((field.sky[i] ?? 0) / MAX_LIGHT) * sky,
      );
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = Math.round(255 * maxDarkness * (1 - brightness));
    }
    ctx.putImageData(pixels, 0, 0);
    shade.canvas.refresh();
    return shade;
  }
}

const sameRect = (a: TileRect, b: TileRect): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
