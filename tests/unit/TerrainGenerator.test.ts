import { describe, expect, it } from 'vitest';
import { AIR } from '../../src/domain/world/BlockDefinition';
import { valueNoise1D } from '../../src/infrastructure/procedural-generation/noise/valueNoise';
import { baseGenerator, block, column, dimensions, size, terrain } from '../support/generation';

const width = dimensions.widthChunks * size;

describe('valueNoise1D', () => {
  it('es determinista, continuo y está en [0, 1)', () => {
    for (let x = 0; x < 50; x += 0.37) {
      const value = valueNoise1D(7, x);
      expect(value).toBe(valueNoise1D(7, x));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(Math.abs(value - valueNoise1D(7, x + 0.001))).toBeLessThan(0.01);
    }
  });
});

describe('TerrainGenerator', () => {
  it('genera exactamente el mismo terreno con la misma semilla', () => {
    const a = baseGenerator(12345);
    const b = baseGenerator(12345);
    for (const [cx, cy] of [
      [0, 2],
      [31, 3],
      [63, 2],
      [10, 11],
    ] as const) {
      expect(a.generateChunk(cx, cy)).toEqual(b.generateChunk(cx, cy));
    }
  });

  it('genera terrenos distintos con semillas distintas', () => {
    const columns = Array.from({ length: 200 }, (_, x) => x * 10);
    const a = columns.map((x) => baseGenerator(1).surfaceTileAt(x));
    const b = columns.map((x) => baseGenerator(2).surfaceTileAt(x));
    expect(a).not.toEqual(b);
  });

  it('ordena cada columna en aire, superficie, suelo y roca, con los bloques de su bioma', () => {
    const gen = baseGenerator(99);
    for (let tileX = 0; tileX < width; tileX += 97) {
      const tiles = column(gen, tileX);
      const surface = gen.surfaceTileAt(tileX);
      const { ground } = gen.biomeAt(tileX, surface);
      expect(tiles.slice(0, surface).every((tile) => tile === AIR)).toBe(true);
      expect(tiles[surface]).toBe(block(ground.surface ?? ''));
      const firstRock = tiles.findIndex(
        (tile, y) => y > surface && tile !== block(ground.soil ?? ''),
      );
      const soilDepth = firstRock - surface - 1;
      expect(soilDepth).toBeGreaterThanOrEqual(terrain.soilDepthMin);
      expect(soilDepth).toBeLessThanOrEqual(terrain.soilDepthMax);
      // Bajo el suelo, la roca es la del bioma de cada bloque (la pizarra en lo hondo).
      tiles.slice(firstRock).forEach((tile, offset) => {
        expect(tile).toBe(block(gen.biomeAt(tileX, firstRock + offset).ground.rock));
      });
    }
  });

  it('mantiene la superficie dentro del mundo y sin saltos bruscos, también entre biomas', () => {
    const gen = baseGenerator(2024);
    const worldHeight = dimensions.heightChunks * size;
    let previous = gen.surfaceTileAt(0);
    for (let x = 1; x < width; x++) {
      const surface = gen.surfaceTileAt(x);
      expect(surface).toBeGreaterThanOrEqual(terrain.verticalMargin);
      expect(surface).toBeLessThanOrEqual(worldHeight - terrain.verticalMargin);
      expect(Math.abs(surface - previous)).toBeLessThanOrEqual(2);
      previous = surface;
    }
  });

  it('muestra el cielo sobre la superficie y la pared de tierra o roca bajo ella', () => {
    const gen = baseGenerator(5);
    for (let tileX = 0; tileX < width; tileX += 131) {
      const tiles = column(gen, tileX);
      const surface = gen.surfaceTileAt(tileX);
      expect(gen.backgroundAt(tileX, surface - 1)).toBe(AIR);
      for (let y = surface + 1; y < tiles.length; y++)
        expect(gen.backgroundAt(tileX, y)).toBe(tiles[y]);
    }
  });

  it('elige una aparición seca, cerca del centro y en el bioma de aparición', () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const gen = baseGenerator(seed);
      expect(gen.surfaceTileAt(gen.spawnTileX)).toBeLessThan(terrain.waterLevel);
      expect(Math.abs(gen.spawnTileX - width / 2)).toBeLessThan(200);
      expect(gen.biomeAt(gen.spawnTileX, 0).id).toBe('forest');
    }
  });
});
