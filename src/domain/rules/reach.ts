import type { Box } from '../physics/tileCollision';
import type { TileQuery } from '../world/WorldMap';

/** Indica si el centro de un bloque está al alcance del centro de una caja. */
export function tileWithinReach(
  box: Box,
  tileX: number,
  tileY: number,
  tileSize: number,
  reachTiles: number,
): boolean {
  const dx = (tileX + 0.5) * tileSize - (box.x + box.width / 2);
  const dy = (tileY + 0.5) * tileSize - (box.y + box.height / 2);
  return Math.hypot(dx, dy) <= reachTiles * tileSize;
}

/** Cuenta cuántos de los cuatro vecinos de un bloque son sólidos. */
export function solidNeighbors(tiles: TileQuery, tileX: number, tileY: number): number {
  return (
    Number(tiles.isSolid(tileX - 1, tileY)) +
    Number(tiles.isSolid(tileX + 1, tileY)) +
    Number(tiles.isSolid(tileX, tileY - 1)) +
    Number(tiles.isSolid(tileX, tileY + 1))
  );
}
