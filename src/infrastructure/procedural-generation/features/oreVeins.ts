import type { ChunkFeature } from '../generators/TerrainGenerator';
import { valueNoise2D } from '../noise/valueNoise';

export interface OreVein {
  /** Índice del bloque de mineral. */
  readonly block: number;
  /** Bloques bajo la superficie a partir de los que aparece. */
  readonly minDepth: number;
  /** Tamaño aproximado de las vetas, en bloques. */
  readonly scale: number;
  /** Umbral de ruido (0-1): cuanto más alto, más escaso el mineral. */
  readonly threshold: number;
}

/**
 * Sustituye la roca de cada bioma por mineral donde el ruido supera el umbral de cada veta.
 * Las vetas comunes valen en cualquier roca; después se aplican las propias del bioma.
 * Si dos vetas coinciden gana la última, que debe ser la más profunda y valiosa.
 */
export function oreVeins(seed: number, veins: readonly OreVein[]): ChunkFeature {
  return ({ chunkX, chunkY, size, tiles, surfaceAt, biomeAt }) => {
    for (let x = 0; x < size; x++) {
      const tileX = chunkX * size + x;
      const surface = surfaceAt(tileX);
      for (let y = 0; y < size; y++) {
        const index = y * size + x;
        const tileY = chunkY * size + y;
        const biome = biomeAt(tileX, tileY);
        if (tiles[index] !== biome.rock) continue;
        const depth = tileY - surface;
        veins.forEach((vein, order) => {
          if (depth < vein.minDepth) return;
          const noise = valueNoise2D(
            seed + (order + 1) * 977,
            tileX / vein.scale,
            tileY / vein.scale,
          );
          if (noise > vein.threshold) tiles[index] = vein.block;
        });
        for (const vein of biome.veins) {
          const noise = valueNoise2D(
            seed + vein.block * 1361,
            tileX / vein.scale,
            tileY / vein.scale,
          );
          if (noise > vein.threshold) tiles[index] = vein.block;
        }
      }
    }
  };
}
