import { MAX_CROWN_RADIUS } from '../../../domain/world/BiomeDefinition';
import { AIR } from '../../../domain/world/BlockDefinition';
import type { ChunkDraft, ChunkFeature, GenerationPlant } from '../generators/TerrainGenerator';
import { hash01 } from '../noise/valueNoise';

const SEED_EXISTS = 0x7e3a;
const SEED_COLUMN = 0x1b0f;
const SEED_HEIGHT = 0x44c9;

/**
 * Planta la vegetación de cada bioma sobre la superficie seca: un tallo y su copa.
 * Cada planta se deduce solo de su franja de columnas, así que un chunk puede dibujar la
 * parte que le toca de una planta cuyo tallo está en el chunk vecino.
 */
export function vegetation(
  seed: number,
  /** Columnas donde no debe crecer nada, como las bocas de cueva. */
  isBlocked: (tileX: number, draft: ChunkDraft) => boolean,
): ChunkFeature {
  /** Altura de la planta que nace en una columna, o 0 si no hay. */
  const heightAt = (plant: GenerationPlant, order: number, tileX: number): number => {
    const salt = seed + order * 0x3b9;
    const cell = Math.floor(tileX / plant.cellSize);
    if (hash01(salt ^ SEED_EXISTS, cell) >= plant.chance) return 0;
    const column =
      cell * plant.cellSize + Math.floor(hash01(salt ^ SEED_COLUMN, cell) * plant.cellSize);
    if (column !== tileX) return 0;
    const span = plant.maxHeight - plant.minHeight + 1;
    return plant.minHeight + Math.floor(hash01(salt ^ SEED_HEIGHT, cell) * span);
  };

  return (draft) => {
    const { chunkX, chunkY, size, tiles, surfaceAt, surfaceBiomeAt, waterLevel } = draft;
    const originX = chunkX * size;
    const originY = chunkY * size;
    const put = (tileX: number, tileY: number, block: number, onlyOnAir: boolean): void => {
      const x = tileX - originX;
      const y = tileY - originY;
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      if (onlyOnAir && tiles[y * size + x] !== AIR) return;
      tiles[y * size + x] = block;
    };

    for (
      let tileX = originX - MAX_CROWN_RADIUS;
      tileX < originX + size + MAX_CROWN_RADIUS;
      tileX++
    ) {
      const surface = surfaceAt(tileX);
      if (surface >= waterLevel) continue;
      const plants = surfaceBiomeAt(tileX).plants;
      const index = plants.findIndex((plant, order) => heightAt(plant, order, tileX) > 0);
      const plant = plants[index];
      if (!plant || isBlocked(tileX, draft)) continue;
      const top = surface - heightAt(plant, index, tileX);
      const crown = plant.crown;
      if (crown?.shape === 'round') {
        const r = crown.radius;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + 1) put(tileX + dx, top + dy, crown.block, true);
          }
        }
      } else if (crown?.shape === 'cone') {
        // Pisos que se ensanchan hacia abajo, de la punta a la base de la copa.
        for (let dy = 0; dy <= crown.radius * 2; dy++) {
          const half = Math.min(crown.radius, Math.ceil(dy / 2));
          for (let dx = -half; dx <= half; dx++) put(tileX + dx, top - 1 + dy, crown.block, true);
        }
      }
      for (let tileY = top; tileY < surface; tileY++) put(tileX, tileY, plant.stem, false);
    }
  };
}
