import type { BiomeDefinition } from './BiomeDefinition';
import { AIR, type BlockDefinition } from './BlockDefinition';
import { rangeContains, type ChunkRange } from './ChunkRange';
import { heightInTiles, widthInTiles, type WorldDimensions } from './WorldDimensions';
import type { WorldGenerator } from './WorldGenerator';

/** Consulta mínima que necesita la física. */
export interface TileQuery {
  isSolid(tileX: number, tileY: number): boolean;
  isLiquid(tileX: number, tileY: number): boolean;
}

/** Lo que el mapa necesita saber de cada bloque, por índice. */
export type BlockTraits = Pick<BlockDefinition, 'solid' | 'physics'>;

/** Aviso de que un bloque ha cambiado. */
export type TileChangeListener = (tileX: number, tileY: number) => void;

/**
 * Bloques del mundo, guardados por chunks. Un chunk se genera la primera vez que se
 * consulta y puede descartarse cuando queda lejos: al ser determinista, se regenera igual.
 */
export class WorldMap implements TileQuery {
  private readonly chunks = new Map<number, Uint16Array>();
  /** Chunks con bloques cambiados por el jugador: no pueden regenerarse, así que no se descartan. */
  private readonly modified = new Set<number>();
  /** Chunks cambiados desde el último guardado. */
  private readonly unsaved = new Set<number>();
  private readonly listeners = new Set<TileChangeListener>();
  private readonly solidByBlock: readonly boolean[];
  private readonly liquidByBlock: readonly boolean[];
  private readonly widthTiles: number;
  private readonly heightTiles: number;

  constructor(
    readonly dimensions: WorldDimensions,
    private readonly generator: WorldGenerator,
    blocks: readonly BlockTraits[],
  ) {
    this.widthTiles = widthInTiles(dimensions);
    this.heightTiles = heightInTiles(dimensions);
    this.solidByBlock = blocks.map((block) => block.solid);
    this.liquidByBlock = blocks.map((block) => block.physics === 'liquid');
  }

  /** Avisa de cada bloque que cambie. Devuelve la función para darse de baja. */
  onTileChange(listener: TileChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  chunkKey(chunkX: number, chunkY: number): number {
    return chunkY * this.dimensions.widthChunks + chunkX;
  }

  chunk(chunkX: number, chunkY: number): Uint16Array {
    const key = this.chunkKey(chunkX, chunkY);
    let tiles = this.chunks.get(key);
    if (!tiles) {
      tiles = this.generator.generateChunk(chunkX, chunkY);
      this.chunks.set(key, tiles);
    }
    return tiles;
  }

  /** Bloque en una posición; fuera del mundo devuelve aire. */
  tileAt(tileX: number, tileY: number): number {
    if (!this.isInBounds(tileX, tileY)) return AIR;
    const size = this.dimensions.chunkSize;
    const chunkX = Math.floor(tileX / size);
    const chunkY = Math.floor(tileY / size);
    const tiles = this.chunk(chunkX, chunkY);
    return tiles[(tileY - chunkY * size) * size + (tileX - chunkX * size)] ?? AIR;
  }

  /** Cambia un bloque. Devuelve `false` si la posición está fuera del mundo o ya lo contenía. */
  setTile(tileX: number, tileY: number, block: number): boolean {
    if (!this.isInBounds(tileX, tileY)) return false;
    const size = this.dimensions.chunkSize;
    const chunkX = Math.floor(tileX / size);
    const chunkY = Math.floor(tileY / size);
    const tiles = this.chunk(chunkX, chunkY);
    const index = (tileY - chunkY * size) * size + (tileX - chunkX * size);
    if (tiles[index] === block) return false;
    tiles[index] = block;
    const key = this.chunkKey(chunkX, chunkY);
    this.modified.add(key);
    this.unsaved.add(key);
    for (const listener of this.listeners) listener(tileX, tileY);
    return true;
  }

  /** Los lados y el fondo del mundo son paredes; por encima del límite superior hay cielo. */
  isSolid(tileX: number, tileY: number): boolean {
    if (tileY < 0) return false;
    if (!this.isInBounds(tileX, tileY)) return true;
    return this.solidByBlock[this.tileAt(tileX, tileY)] ?? false;
  }

  isLiquid(tileX: number, tileY: number): boolean {
    return this.liquidByBlock[this.tileAt(tileX, tileY)] ?? false;
  }

  /** Pared de fondo tras un bloque; `AIR` donde se ve el cielo. */
  backgroundAt(tileX: number, tileY: number): number {
    return this.isInBounds(tileX, tileY) ? this.generator.backgroundAt(tileX, tileY) : AIR;
  }

  /** Fila de la superficie natural de una columna, antes de cuevas y cambios. */
  surfaceAt(tileX: number): number {
    return this.generator.surfaceTileAt(tileX);
  }

  biomeAt(tileX: number, tileY: number): BiomeDefinition {
    return this.generator.biomeAt(tileX, tileY);
  }

  /** Sustituye un chunk por uno guardado. Queda como modificado, pero no pendiente de guardar. */
  restoreChunk(chunkX: number, chunkY: number, tiles: Uint16Array): void {
    const size = this.dimensions.chunkSize;
    if (tiles.length !== size * size) throw new Error('Chunk guardado de tamaño incorrecto.');
    const key = this.chunkKey(chunkX, chunkY);
    this.chunks.set(key, tiles.slice());
    this.modified.add(key);
  }

  /** Copia de los chunks cambiados desde el último guardado; dejan de estar pendientes. */
  takeUnsavedChunks(): { chunkX: number; chunkY: number; tiles: Uint16Array }[] {
    const { widthChunks } = this.dimensions;
    const taken = [...this.unsaved].map((key) => {
      const chunkX = key % widthChunks;
      const chunkY = Math.floor(key / widthChunks);
      return { chunkX, chunkY, tiles: this.chunk(chunkX, chunkY).slice() };
    });
    this.unsaved.clear();
    return taken;
  }

  /** Vuelve a marcar chunks como pendientes, por ejemplo si su guardado ha fallado. */
  markUnsaved(chunks: readonly { chunkX: number; chunkY: number }[]): void {
    for (const { chunkX, chunkY } of chunks) this.unsaved.add(this.chunkKey(chunkX, chunkY));
  }

  get unsavedChunkCount(): number {
    return this.unsaved.size;
  }

  /** Descarta los datos de los chunks sin modificar que quedan fuera del rango indicado. */
  evictOutside(range: ChunkRange): void {
    const { widthChunks } = this.dimensions;
    for (const key of this.chunks.keys()) {
      if (this.modified.has(key)) continue;
      if (!rangeContains(range, key % widthChunks, Math.floor(key / widthChunks))) {
        this.chunks.delete(key);
      }
    }
  }

  isInBounds(tileX: number, tileY: number): boolean {
    return tileX >= 0 && tileY >= 0 && tileX < this.widthTiles && tileY < this.heightTiles;
  }
}
