import type Phaser from 'phaser';
import { AIR } from '../../domain/world/BlockDefinition';
import {
  chunkRangeForRect,
  diffRanges,
  expandRange,
  rangeContains,
  sameRange,
  type ChunkCoord,
  type ChunkRange,
  type Rect,
} from '../../domain/world/ChunkRange';
import type { WorldMap } from '../../domain/world/WorldMap';
import { TILESET_KEY, tileVariant } from './tileTextures';

export interface ChunkLayerSettings {
  readonly tileSize: number;
  readonly viewMarginTiles: number;
  readonly buildsPerFrame: number;
  readonly dataRetainMargin: number;
}

interface ChunkView {
  readonly texture: Phaser.Textures.CanvasTexture;
  readonly image: Phaser.GameObjects.Image;
}

const EDGE_SHADOW = 'rgba(11, 16, 32, 0.28)';
/** Velo sobre la pared de fondo, para que se lea como algo lejano y no como un bloque. */
const WALL_SHADE = 'rgba(9, 10, 30, 0.58)';
/** Brillo en la superficie de un líquido. */
const LIQUID_SURFACE = 'rgba(190, 220, 255, 0.55)';

/**
 * Dibuja el terreno cercano a la cámara: una textura por chunk, pintada una sola vez.
 * Los chunks que salen de la vista devuelven su textura a una reserva para reutilizarla.
 * Tras los huecos bajo tierra pinta la pared de fondo, y repinta los bloques que cambian
 * (por el jugador, el agua o la arena) en el siguiente `update`.
 */
export class ChunkLayer {
  private readonly views = new Map<number, ChunkView>();
  private readonly pool: ChunkView[] = [];
  private pending: ChunkCoord[] = [];
  private range: ChunkRange | undefined;
  private created = 0;
  private readonly tileset: CanvasImageSource;
  private readonly chunkPixels: number;
  /** Bloques cambiados desde el último `update`, por clave `y * ancho + x`. */
  private readonly changed = new Set<number>();
  private readonly widthTiles: number;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: WorldMap,
    private readonly settings: ChunkLayerSettings,
  ) {
    this.tileset = scene.textures.get(TILESET_KEY).getSourceImage() as HTMLCanvasElement;
    this.chunkPixels = map.dimensions.chunkSize * settings.tileSize;
    this.widthTiles = map.dimensions.widthChunks * map.dimensions.chunkSize;
    this.unsubscribe = map.onTileChange((x, y) => {
      this.changed.add(y * this.widthTiles + x);
    });
  }

  /** Número de chunks dibujados en este momento. */
  get visibleChunkCount(): number {
    return this.views.size;
  }

  /**
   * Ajusta los chunks dibujados a la vista. Con `immediate` los pinta todos de una vez;
   * si no, reparte el trabajo entre frames según `buildsPerFrame`.
   */
  update(view: Rect, immediate = false): void {
    const { tileSize, viewMarginTiles, buildsPerFrame, dataRetainMargin } = this.settings;
    const { dimensions } = this.map;
    const next = chunkRangeForRect(view, this.chunkPixels, viewMarginTiles * tileSize, dimensions);
    if (!this.range || !sameRange(this.range, next)) {
      const { entered, left } = diffRanges(this.range, next);
      for (const coord of left) this.release(coord);
      this.pending = [...this.pending, ...entered].filter((c) => rangeContains(next, c.x, c.y));
      this.range = next;
      this.map.evictOutside(expandRange(next, dataRetainMargin, dimensions));
    }
    for (let built = 0; this.pending.length > 0 && (immediate || built < buildsPerFrame);) {
      const coord = this.pending.shift();
      if (coord && this.build(coord)) built++;
    }
    if (this.changed.size === 0) return;
    const touched = new Set<ChunkView>();
    for (const key of this.changed) {
      this.repaintAround(key % this.widthTiles, Math.floor(key / this.widthTiles), touched);
    }
    this.changed.clear();
    for (const view of touched) view.texture.refresh();
  }

  destroy(): void {
    this.unsubscribe();
    for (const view of [...this.views.values(), ...this.pool]) {
      view.image.destroy();
      view.texture.destroy();
    }
    this.views.clear();
    this.pool.length = 0;
  }

  private release(coord: ChunkCoord): void {
    const key = this.map.chunkKey(coord.x, coord.y);
    const view = this.views.get(key);
    if (!view) return;
    view.image.setVisible(false);
    this.views.delete(key);
    this.pool.push(view);
  }

  /** Pinta un chunk. Devuelve `false` si es cielo vacío y no ha hecho falta dibujarlo. */
  private build(coord: ChunkCoord): boolean {
    if (this.isEmptySky(coord)) return false;

    const view = this.pool.pop() ?? this.createView();
    this.paint(view.texture, coord);
    view.image.setPosition(coord.x * this.chunkPixels, coord.y * this.chunkPixels).setVisible(true);
    this.views.set(this.map.chunkKey(coord.x, coord.y), view);
    return true;
  }

  private createView(): ChunkView {
    const key = `chunk-view-${String(this.created++)}`;
    const texture = this.scene.textures.createCanvas(key, this.chunkPixels, this.chunkPixels);
    if (!texture) throw new Error(`No se pudo crear la textura "${key}".`);
    return { texture, image: this.scene.add.image(0, 0, key).setOrigin(0, 0) };
  }

  /** Un chunk de solo aire por encima de la superficie: no tiene nada que dibujar. */
  private isEmptySky(coord: ChunkCoord): boolean {
    const size = this.map.dimensions.chunkSize;
    if (!this.map.chunk(coord.x, coord.y).every((tile) => tile === AIR)) return false;
    // La pared de fondo empieza en la superficie: si falta en la fila más baja, falta en todas.
    const bottom = coord.y * size + size - 1;
    for (let x = coord.x * size; x < (coord.x + 1) * size; x++) {
      if (this.map.backgroundAt(x, bottom) !== AIR) return false;
    }
    return true;
  }

  /**
   * Repinta un bloque que ha cambiado y sus vecinos, cuyas sombras de borde dependen de él.
   * Solo se redibuja esa zona, no el chunk entero.
   */
  private repaintAround(tileX: number, tileY: number, touched: Set<ChunkView>): void {
    const size = this.map.dimensions.chunkSize;
    for (let y = tileY - 1; y <= tileY + 1; y++) {
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        if (!this.map.isInBounds(x, y)) continue;
        const coord = { x: Math.floor(x / size), y: Math.floor(y / size) };
        if (!this.range || !rangeContains(this.range, coord.x, coord.y)) continue;
        const view = this.views.get(this.map.chunkKey(coord.x, coord.y));
        if (view) {
          this.paintTile(view.texture.getContext(), x, y);
          touched.add(view);
        } else if (!this.pending.some((p) => p.x === coord.x && p.y === coord.y)) {
          // El chunk estaba vacío y sin textura: ahora puede tener su primer bloque.
          this.build(coord);
        }
      }
    }
  }

  private paint(texture: Phaser.Textures.CanvasTexture, coord: ChunkCoord): void {
    const size = this.map.dimensions.chunkSize;
    const ctx = texture.getContext();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        this.paintTile(ctx, coord.x * size + x, coord.y * size + y);
      }
    }
    texture.refresh();
  }

  /** Borra y redibuja un bloque en la textura de su chunk. */
  private paintTile(ctx: CanvasRenderingContext2D, tileX: number, tileY: number): void {
    const { map } = this;
    const { tileSize } = this.settings;
    const size = map.dimensions.chunkSize;
    const px = (tileX % size) * tileSize;
    const py = (tileY % size) * tileSize;
    ctx.clearRect(px, py, tileSize, tileSize);
    const tile = map.tileAt(tileX, tileY);
    const solid = map.isSolid(tileX, tileY);
    if (!solid) {
      const wall = map.backgroundAt(tileX, tileY);
      if (wall !== AIR) {
        this.drawBlock(ctx, wall, tileX, tileY, px, py);
        ctx.fillStyle = WALL_SHADE;
        ctx.fillRect(px, py, tileSize, tileSize);
      }
    }
    if (tile === AIR) return;
    this.drawBlock(ctx, tile, tileX, tileY, px, py);
    if (map.isLiquid(tileX, tileY)) {
      if (!map.isLiquid(tileX, tileY - 1) && !map.isSolid(tileX, tileY - 1)) {
        ctx.fillStyle = LIQUID_SURFACE;
        ctx.fillRect(px, py, tileSize, 1);
      }
      return;
    }
    // Sombra de un píxel en los bordes que dan al aire, para dar relieve a lo sólido.
    if (!solid) return;
    ctx.fillStyle = EDGE_SHADOW;
    if (!this.map.isSolid(tileX - 1, tileY)) ctx.fillRect(px, py, 1, tileSize);
    if (!this.map.isSolid(tileX + 1, tileY)) ctx.fillRect(px + tileSize - 1, py, 1, tileSize);
    if (!this.map.isSolid(tileX, tileY + 1)) ctx.fillRect(px, py + tileSize - 1, tileSize, 1);
  }

  private drawBlock(
    ctx: CanvasRenderingContext2D,
    block: number,
    tileX: number,
    tileY: number,
    px: number,
    py: number,
  ): void {
    const { tileSize } = this.settings;
    ctx.drawImage(
      this.tileset,
      tileVariant(tileX, tileY) * tileSize,
      block * tileSize,
      tileSize,
      tileSize,
      px,
      py,
      tileSize,
      tileSize,
    );
  }
}
