import { WORLD_CONFIG } from '../../src/config/world.config';
import type { BiomeDefinition } from '../../src/domain/world/BiomeDefinition';
import { createBiomeRegistry } from '../../src/domain/world/BiomeDefinition';
import {
  createCaves,
  type Caves,
} from '../../src/infrastructure/procedural-generation/features/caves';
import { lakes } from '../../src/infrastructure/procedural-generation/features/lakes';
import { oreVeins } from '../../src/infrastructure/procedural-generation/features/oreVeins';
import { vegetation } from '../../src/infrastructure/procedural-generation/features/vegetation';
import {
  TerrainGenerator,
  type ChunkFeature,
} from '../../src/infrastructure/procedural-generation/generators/TerrainGenerator';
import { content } from './session';

export const { dimensions, terrain } = WORLD_CONFIG;
export const size = dimensions.chunkSize;
export const block = (id: string): number => content.blocks.indexOf(id);
export const veins = WORLD_CONFIG.ores.map((ore) => ({ ...ore, block: block(ore.blockId) }));

/** Generador con el contenido real del juego y solo los pasos indicados. */
export function baseGenerator(
  seed: number,
  features: readonly ChunkFeature[] = [],
  biomes: readonly BiomeDefinition[] = content.biomes.all,
): TerrainGenerator {
  return new TerrainGenerator(
    seed,
    dimensions,
    terrain,
    createBiomeRegistry(biomes, content.blocks),
    content.blocks,
    features,
  );
}

/** Generador completo, igual que el del juego, con acceso a sus cuevas. */
export function fullGenerator(seed: number): { generator: TerrainGenerator; caves: Caves } {
  const caves = createCaves(seed, WORLD_CONFIG.caves);
  const generator = baseGenerator(seed, [
    caves.feature,
    oreVeins(seed, veins),
    lakes,
    vegetation(seed, caves.opensSurfaceNear),
  ]);
  return { generator, caves };
}

/** Recorre una franja de chunks y entrega cada bloque con su posición global. */
export function scan(
  generator: TerrainGenerator,
  chunksX: readonly number[],
  visit: (tile: number, tileX: number, tileY: number) => void,
): void {
  for (const chunkX of chunksX) {
    for (let chunkY = 0; chunkY < dimensions.heightChunks; chunkY++) {
      const tiles = generator.generateChunk(chunkX, chunkY);
      tiles.forEach((tile, index) => {
        visit(tile, chunkX * size + (index % size), chunkY * size + Math.floor(index / size));
      });
    }
  }
}

/** Bloques de una columna completa, de arriba abajo. */
export function column(generator: TerrainGenerator, tileX: number): number[] {
  const chunkX = Math.floor(tileX / size);
  const x = tileX - chunkX * size;
  return Array.from({ length: dimensions.heightChunks }, (_, cy) =>
    generator.generateChunk(chunkX, cy),
  ).flatMap((tiles) => Array.from({ length: size }, (_, y) => tiles[y * size + x] ?? 0));
}
