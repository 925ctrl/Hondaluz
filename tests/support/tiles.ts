import type { TileQuery } from '../../src/domain/world/WorldMap';

/**
 * Mapa de pruebas a partir de filas de texto: `#` es sólido, `~` es agua y cualquier otro
 * carácter, aire. Fuera del dibujo todo es aire.
 */
export function tilesFrom(rows: readonly string[]): TileQuery {
  return { isSolid: (x, y) => rows[y]?.[x] === '#', isLiquid: (x, y) => rows[y]?.[x] === '~' };
}
