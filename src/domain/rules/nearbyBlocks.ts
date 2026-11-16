import type { Box } from '../physics/tileCollision';
import { tileWithinReach } from './reach';

/** Devuelve cuáles de los bloques buscados hay al alcance de una caja. */
export function blocksNear(
  map: { tileAt(tileX: number, tileY: number): number },
  box: Box,
  tileSize: number,
  reachTiles: number,
  wanted: ReadonlySet<number>,
): Set<number> {
  const found = new Set<number>();
  if (wanted.size === 0) return found;
  const centerX = Math.floor((box.x + box.width / 2) / tileSize);
  const centerY = Math.floor((box.y + box.height / 2) / tileSize);
  const radius = Math.ceil(reachTiles);
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      const block = map.tileAt(x, y);
      if (wanted.has(block) && tileWithinReach(box, x, y, tileSize, reachTiles)) found.add(block);
    }
  }
  return found;
}
