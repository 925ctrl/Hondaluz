import Phaser from 'phaser';
import type { BackdropPalette } from '../theme/palette';
import { BACKDROP_TEXTURES } from './backdropTextures';

const SKY_BANDS = 14;
/** Fracción del desplazamiento que recorre cada capa: las lejanas se mueven menos. */
const HILL_FACTORS = [0.2, 0.5, 1] as const;
const STAR_FACTOR = 0.06;

/**
 * Cielo en bandas, estrellas y colinas en parallax, fijo a la pantalla.
 * La escena decide cuánto se desplaza (`scrollTo`) y lo redimensiona (`layout`).
 */
export class ParallaxBackdrop {
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.TileSprite;
  private readonly hills: Phaser.GameObjects.TileSprite[];
  private size = { width: 0, height: 0 };

  constructor(
    scene: Phaser.Scene,
    private palette: BackdropPalette,
    /** Altura de pantalla en la que se apoyan las colinas; por defecto, el borde inferior. */
    private readonly horizonFor: (height: number) => number = (height) => height,
  ) {
    this.sky = scene.add.graphics().setScrollFactor(0);
    // Cada capa nace con la altura de su textura; `layout` solo ajusta el ancho.
    const heightOf = (key: string): number => scene.textures.getFrame(key).height;
    this.stars = scene.add
      .tileSprite(0, 0, 1, heightOf(BACKDROP_TEXTURES.stars), BACKDROP_TEXTURES.stars)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(palette.starAlpha);
    this.hills = BACKDROP_TEXTURES.hills.map((key, index) =>
      scene.add
        .tileSprite(0, 0, 1, heightOf(key), key)
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setTint(palette.hills[index] ?? 0xffffff),
    );
    if (palette.emberTint !== undefined) {
      // Las ascuas nacen bajo el borde inferior, a lo ancho de la vista actual.
      const embers = scene.add.particles(0, 0, BACKDROP_TEXTURES.ember, {
        x: { onEmit: () => Phaser.Math.Between(0, scene.scale.width) },
        y: { onEmit: () => scene.scale.height + 2 },
        lifespan: 7000,
        speedY: { min: -14, max: -5 },
        speedX: { min: -4, max: 4 },
        alpha: { start: 0.9, end: 0 },
        tint: palette.emberTint,
        frequency: 380,
      });
      embers.setScrollFactor(0);
    }
    this.layout(scene.scale.width, scene.scale.height);
  }

  layout(width: number, height: number): void {
    this.size = { width, height };
    const horizon = this.horizonFor(height);
    this.drawSky(width, height, horizon);
    this.stars.setSize(width, this.stars.height);
    for (const layer of this.hills) {
      layer.setPosition(0, horizon);
      layer.setSize(width, layer.height);
    }
  }

  /** Cambia los colores del fondo, por ejemplo al avanzar la hora del día. */
  setPalette(palette: BackdropPalette): void {
    this.palette = palette;
    this.stars.setAlpha(palette.starAlpha);
    this.hills.forEach((layer, index) => layer.setTint(palette.hills[index] ?? 0xffffff));
    const { width, height } = this.size;
    this.drawSky(width, height, this.horizonFor(height));
  }

  /** Coloca las capas para un desplazamiento horizontal dado, en píxeles. */
  scrollTo(distance: number): void {
    // Posiciones enteras: evita que las capas tiemblen entre dos píxeles.
    this.stars.tilePositionX = Math.floor(distance * STAR_FACTOR);
    this.hills.forEach((layer, index) => {
      layer.tilePositionX = Math.floor(distance * (HILL_FACTORS[index] ?? 0));
    });
  }

  private drawSky(width: number, height: number, horizon: number): void {
    const top = Phaser.Display.Color.ValueToColor(this.palette.skyTop);
    const bottom = Phaser.Display.Color.ValueToColor(this.palette.skyBottom);
    const bandHeight = Math.ceil(height / SKY_BANDS);
    this.sky.clear();
    for (let band = 0; band < SKY_BANDS; band++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        top,
        bottom,
        SKY_BANDS - 1,
        band,
      );
      this.sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      this.sky.fillRect(0, band * bandHeight, width, bandHeight);
    }
    // Bajo el horizonte continúa el color de la colina más cercana.
    this.sky.fillStyle(this.palette.hills[2]);
    this.sky.fillRect(0, horizon, width, Math.max(0, height - horizon));
  }
}
