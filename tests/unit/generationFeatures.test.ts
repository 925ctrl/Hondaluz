import { describe, expect, it } from 'vitest';
import { content } from '../support/session';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { AIR } from '../../src/domain/world/BlockDefinition';
import type { SurfaceContext } from '../../src/infrastructure/procedural-generation/features/caves';
import { lakes } from '../../src/infrastructure/procedural-generation/features/lakes';
import type { TerrainGenerator } from '../../src/infrastructure/procedural-generation/generators/TerrainGenerator';
import { oreVeins } from '../../src/infrastructure/procedural-generation/features/oreVeins';
import { vegetation } from '../../src/infrastructure/procedural-generation/features/vegetation';
import {
  baseGenerator,
  block,
  dimensions,
  fullGenerator,
  scan,
  size,
  terrain,
  veins,
} from '../support/generation';

const { caves: caveSettings } = WORLD_CONFIG;
const width = dimensions.widthChunks * size;
const allChunks = Array.from({ length: dimensions.widthChunks }, (_, x) => x);

const surfaceContext = (generator: TerrainGenerator): SurfaceContext => ({
  spawnTileX: generator.spawnTileX,
  surfaceAt: (tileX) => generator.surfaceTileAt(tileX),
  waterLevel: terrain.waterLevel,
});

describe('pasos de generación', () => {
  it('son deterministas', () => {
    for (const [cx, cy] of [
      [30, 2],
      [31, 3],
      [5, 8],
      [50, 10],
    ] as const) {
      expect(fullGenerator(77).generator.generateChunk(cx, cy)).toEqual(
        fullGenerator(77).generator.generateChunk(cx, cy),
      );
    }
  });

  it('excava cuevas bajo un techo de roca, salvo en las bocas, y en cantidad razonable', () => {
    const { generator, caves } = fullGenerator(2024);
    const context = surfaceContext(generator);
    let underground = 0;
    let carved = 0;
    scan(generator, allChunks, (tile, tileX, tileY) => {
      const depth = tileY - generator.surfaceTileAt(tileX);
      if (depth < 0) return;
      underground++;
      if (tile !== AIR) return;
      carved++;
      // Cerca de la superficie solo hay aire en las bocas de cueva.
      if (depth < caveSettings.minDepth) {
        expect(caves.opensSurfaceNear(tileX, context)).toBe(true);
      }
    });
    expect(carved / underground).toBeGreaterThan(0.12);
    expect(carved / underground).toBeLessThan(0.4);
  });

  it('abre bocas de cueva, pero lejos del punto de aparición', () => {
    const { generator, caves } = fullGenerator(2024);
    const context = surfaceContext(generator);
    const openings = [...Array(width).keys()].filter((x) => caves.opensSurfaceNear(x, context));
    expect(openings.length).toBeGreaterThan(0);
    for (const x of openings) {
      expect(Math.abs(x - generator.spawnTileX)).toBeGreaterThan(
        caveSettings.entrances.spawnClearance - 5,
      );
    }
  });

  it('pone mineral solo en la roca, a su profundidad, y cristales solo en lo hondo', () => {
    const gen = baseGenerator(2024, [oreVeins(2024, veins)]);
    const counts = { rock: 0, copper: 0, iron: 0, crystal: 0 };
    scan(gen, [10, 11, 12, 13], (tile, tileX, tileY) => {
      const depth = tileY - gen.surfaceTileAt(tileX);
      if (tile === block('stone') || tile === block('slate')) counts.rock++;
      if (tile === block('copper_ore')) {
        counts.copper++;
        expect(depth).toBeGreaterThanOrEqual(4);
      }
      if (tile === block('iron_ore')) {
        counts.iron++;
        expect(depth).toBeGreaterThanOrEqual(28);
      }
      if (tile === block('glow_crystal')) {
        counts.crystal++;
        expect(gen.biomeAt(tileX, tileY).id).toBe('deep_caves');
      }
    });
    const total = counts.rock + counts.copper + counts.iron + counts.crystal;
    for (const ore of [counts.copper, counts.iron, counts.crystal]) {
      expect(ore / total).toBeGreaterThan(0.005);
      expect(ore / total).toBeLessThan(0.12);
    }
  });

  it('llena los valles bajo el nivel del agua con el lago de su bioma, contenido por el terreno', () => {
    const gen = baseGenerator(3, [lakes]);
    let lakeTiles = 0;
    scan(gen, allChunks, (tile, tileX, tileY) => {
      const lake = block(gen.biomeAt(tileX, 0).ground.lake ?? 'water');
      const surface = gen.surfaceTileAt(tileX);
      const shouldFill = tileY >= terrain.waterLevel && tileY < surface;
      expect(tile === lake && tileY < surface).toBe(shouldFill);
      if (shouldFill) lakeTiles++;
    });
    expect(lakeTiles).toBeGreaterThan(0);
  });

  it('deja los lagos en reposo: a los lados del agua solo hay agua o terreno', () => {
    const gen = baseGenerator(3, [lakes]);
    const height = dimensions.heightChunks * size;
    const world = new Uint16Array(width * height);
    scan(gen, allChunks, (tile, tileX, tileY) => {
      world[tileY * width + tileX] = tile;
    });
    const water = block('water');
    let checked = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (world[y * width + x] !== water) continue;
        checked++;
        for (const side of [x - 1, x + 1]) expect(world[y * width + side]).not.toBe(AIR);
        expect(world[(y + 1) * width + x]).not.toBe(AIR);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('planta la vegetación de cada bioma sobre la superficie seca, con tallo continuo', () => {
    const gen = baseGenerator(2024, [vegetation(2024, () => false)]);
    const stemsByBiome = new Map<string, Set<number>>();
    const stems = new Map<number, number[]>();
    scan(gen, allChunks, (tile, tileX, tileY) => {
      const biome = gen.biomeAt(tileX, 0);
      const stemBlocks = (biome.plants ?? []).map((plant) => block(plant.stem));
      if (!stemBlocks.includes(tile)) return;
      stems.set(tileX, [...(stems.get(tileX) ?? []), tileY]);
      stemsByBiome.set(biome.id, (stemsByBiome.get(biome.id) ?? new Set()).add(tile));
    });
    expect([...stemsByBiome.keys()].sort()).toEqual(['desert', 'forest', 'jungle', 'tundra']);
    expect(stemsByBiome.get('desert')).toEqual(new Set([block('cactus')]));
    for (const [tileX, rows] of stems) {
      const surface = gen.surfaceTileAt(tileX);
      expect(surface).toBeLessThan(terrain.waterLevel);
      expect(Math.max(...rows)).toBe(surface - 1);
      expect(rows.length).toBe(Math.max(...rows) - Math.min(...rows) + 1);
    }
  });

  it('las copas continúan sin cortes al cruzar el borde entre chunks', () => {
    const gen = baseGenerator(2024, [vegetation(2024, () => false)]);
    const log = block('log');
    const crowns = new Set([block('leaves'), block('jungle_leaves'), block('pine_needles')]);
    const trunkColumns = new Set<number>();
    const crownColumns = new Set<number>();
    scan(gen, [20, 21, 22, 23, 24, 25], (tile, tileX) => {
      if (tile === log) trunkColumns.add(tileX);
      if (crowns.has(tile)) crownColumns.add(tileX);
    });
    const inner = [...trunkColumns].filter((x) => x > 20 * size + 4 && x < 26 * size - 5);
    expect(inner.length).toBeGreaterThan(5);
    for (const x of inner) {
      for (const dx of [-1, 0, 1]) expect(crownColumns).toContain(x + dx);
    }
  });

  it('solo las cuevas cambian el terreno sólido por el que camina el jugador', () => {
    const plain = baseGenerator(9);
    const withoutCaves = baseGenerator(9, [oreVeins(9, veins), lakes, vegetation(9, () => false)]);
    const solid = (tile: number | undefined): boolean => content.blocks.at(tile ?? 0).solid;
    for (const [cx, cy] of [
      [32, 2],
      [32, 3],
      [40, 5],
    ] as const) {
      const a = plain.generateChunk(cx, cy);
      const b = withoutCaves.generateChunk(cx, cy);
      a.forEach((tile, index) => {
        // Los lagos helados son sólidos: solo pueden aparecer donde había aire bajo el agua.
        if (b[index] === block('ice')) return;
        expect(solid(b[index])).toBe(solid(tile));
      });
    }
  });
});
