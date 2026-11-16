import { describe, expect, it } from 'vitest';
import { BIOME_DEFINITIONS } from '../../src/content/biomes';
import { createBiomeRegistry, type BiomeDefinition } from '../../src/domain/world/BiomeDefinition';
import { BiomeLayout } from '../../src/infrastructure/procedural-generation/biomes/BiomeLayout';
import { baseGenerator, block, column, dimensions, size, terrain } from '../support/generation';
import { content } from '../support/session';

const width = dimensions.widthChunks * size;
const layoutSettings = terrain.biomes;

/** Franjas de bioma de superficie de un mundo, de izquierda a derecha. */
function regions(seed: number, biomes = content.biomes.all): { id: string; start: number }[] {
  const gen = baseGenerator(seed, [], biomes);
  const found: { id: string; start: number }[] = [];
  for (let x = 0; x < width; x++) {
    const { id } = gen.biomeAt(x, 0);
    if (found.at(-1)?.id !== id) found.push({ id, start: x });
  }
  return found;
}

describe('biomas', () => {
  it('reparte los cuatro biomas de superficie y pone el de aparición en el centro', () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5]) {
      const list = regions(seed);
      list.forEach((region) => seen.add(region.id));
      const center = list.filter((region) => region.start <= width / 2).at(-1);
      expect(center?.id).toBe('forest');
      // Dos franjas vecinas nunca son del mismo bioma.
      list.slice(1).forEach((region, i) => {
        expect(region.id).not.toBe(list[i]?.id);
      });
    }
    expect([...seen].sort()).toEqual(['desert', 'forest', 'jungle', 'tundra']);
  });

  it('hace las franjas del ancho configurado, salvo las cortadas por los bordes', () => {
    const list = regions(77);
    for (let i = 1; i < list.length - 1; i++) {
      const length = (list[i + 1]?.start ?? 0) - (list[i]?.start ?? 0);
      expect(length).toBeGreaterThanOrEqual(layoutSettings.minRegionTiles);
      expect(length).toBeLessThanOrEqual(layoutSettings.maxRegionTiles);
    }
  });

  it('sitúa las cuevas profundas en lo hondo, con un borde irregular', () => {
    const gen = baseGenerator(8);
    const fromRow = 250;
    const rows = new Set<number>();
    for (let x = 0; x < width; x += 13) {
      expect(gen.biomeAt(x, fromRow - layoutSettings.depthDither - 1).id).not.toBe('deep_caves');
      expect(gen.biomeAt(x, fromRow + layoutSettings.depthDither + 1).id).toBe('deep_caves');
      const tiles = column(gen, x);
      rows.add(tiles.indexOf(block('slate')));
    }
    expect(rows.size).toBeGreaterThan(3);
  });

  it('suaviza el relieve entre franjas vecinas', () => {
    const flat = { weight: 1, relief: 0 };
    const steep = { weight: 1, relief: 2 };
    const layout = new BiomeLayout(3, width, width / 2, flat, [flat, steep], [], layoutSettings);
    for (let x = 1; x < width; x++) {
      expect(Math.abs(layout.reliefAt(x) - layout.reliefAt(x - 1))).toBeLessThan(0.1);
    }
  });

  it('admite un bioma nuevo con solo añadir su definición', () => {
    const meadow: BiomeDefinition = {
      id: 'meadow',
      name: 'Pradera',
      placement: { layer: 'surface', weight: 50 },
      ground: { surface: 'grass', soil: 'dirt', rock: 'stone', lake: 'water' },
      relief: 0.3,
      plants: [{ stem: 'planks', cellSize: 5, chance: 1, minHeight: 1, maxHeight: 1 }],
    };
    expect(regions(11, [...BIOME_DEFINITIONS, meadow]).some((r) => r.id === 'meadow')).toBe(true);
  });

  it('rechaza biomas con bloques inexistentes o sin un único bioma de aparición', () => {
    const forest = content.biomes.get('forest');
    expect(() =>
      createBiomeRegistry(
        [{ ...forest, ground: { ...forest.ground, rock: 'marmol' } }],
        content.blocks,
      ),
    ).toThrow(/marmol/);
    expect(() =>
      createBiomeRegistry([forest, { ...forest, id: 'other_forest' }], content.blocks),
    ).toThrow(/aparición/);
    expect(() =>
      createBiomeRegistry(
        [
          forest,
          {
            ...forest,
            id: 'tall',
            placement: { layer: 'surface', weight: 1 },
            plants: [
              {
                stem: 'log',
                crown: { block: 'leaves', shape: 'round', radius: 9 },
                cellSize: 5,
                chance: 1,
                minHeight: 2,
                maxHeight: 3,
              },
            ],
          },
        ],
        content.blocks,
      ),
    ).toThrow(/planta/);
  });
});
