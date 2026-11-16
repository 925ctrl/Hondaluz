import type { BiomeDefinition } from './BiomeDefinition';

/** Genera el mundo original a partir de la semilla. Debe ser determinista y sin estado. */
export interface WorldGenerator {
  /** Columna en la que aparece el jugador. */
  readonly spawnTileX: number;
  /** Bloques de un chunk en orden de filas: índice `y * chunkSize + x`. */
  generateChunk(chunkX: number, chunkY: number): Uint16Array;
  /** Fila de la superficie natural de una columna, antes de cuevas y modificaciones. */
  surfaceTileAt(tileX: number): number;
  /**
   * Material de la pared de fondo que se ve tras un hueco: el aire bajo la superficie
   * natural deja ver la tierra o la roca. Devuelve `AIR` donde se ve el cielo.
   */
  backgroundAt(tileX: number, tileY: number): number;
  biomeAt(tileX: number, tileY: number): BiomeDefinition;
}
