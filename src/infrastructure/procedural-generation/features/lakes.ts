import { AIR } from '../../../domain/world/BlockDefinition';
import type { ChunkFeature } from '../generators/TerrainGenerator';

/**
 * Llena de agua (o de lo que indique el bioma, como hielo) el aire de los valles que quedan
 * por debajo del nivel del agua. Las laderas del valle lo contienen, así que el lago queda en
 * reposo hasta que el jugador le abre un hueco.
 */
export const lakes: ChunkFeature = ({
  chunkX,
  chunkY,
  size,
  tiles,
  surfaceAt,
  surfaceBiomeAt,
  waterLevel,
}) => {
  for (let x = 0; x < size; x++) {
    const tileX = chunkX * size + x;
    const surface = surfaceAt(tileX);
    if (surface <= waterLevel) continue;
    const lake = surfaceBiomeAt(tileX).lake;
    if (lake === AIR) continue;
    for (let y = 0; y < size; y++) {
      const tileY = chunkY * size + y;
      const index = y * size + x;
      if (tileY >= waterLevel && tileY < surface && tiles[index] === AIR) tiles[index] = lake;
    }
  }
};
