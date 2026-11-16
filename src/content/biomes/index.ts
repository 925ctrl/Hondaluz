import type { BiomeDefinition } from '../../domain/world/BiomeDefinition';

/**
 * Biomas del juego. Añadir uno es añadir una entrada aquí: el generador reparte los de
 * superficie por peso y sitúa los de profundidad por su fila.
 */
export const BIOME_DEFINITIONS: readonly BiomeDefinition[] = [
  {
    id: 'forest',
    name: 'Bosque',
    placement: { layer: 'surface', weight: 3, spawn: true },
    ground: { surface: 'grass', soil: 'dirt', rock: 'stone', lake: 'water' },
    plants: [
      {
        stem: 'log',
        crown: { block: 'leaves', shape: 'round', radius: 2 },
        cellSize: 7,
        chance: 0.6,
        minHeight: 4,
        maxHeight: 7,
      },
    ],
  },
  {
    id: 'desert',
    name: 'Desierto',
    placement: { layer: 'surface', weight: 2 },
    ground: { surface: 'sand', soil: 'sand', rock: 'stone', lake: 'water' },
    relief: 0.55,
    plants: [{ stem: 'cactus', cellSize: 9, chance: 0.45, minHeight: 2, maxHeight: 4 }],
  },
  {
    id: 'jungle',
    name: 'Jungla',
    placement: { layer: 'surface', weight: 2 },
    ground: { surface: 'jungle_grass', soil: 'mud', rock: 'stone', lake: 'water' },
    relief: 1.35,
    plants: [
      {
        stem: 'log',
        crown: { block: 'jungle_leaves', shape: 'round', radius: 3 },
        cellSize: 6,
        chance: 0.8,
        minHeight: 7,
        maxHeight: 11,
      },
    ],
  },
  {
    id: 'tundra',
    name: 'Tundra',
    placement: { layer: 'surface', weight: 2 },
    ground: { surface: 'snow', soil: 'dirt', rock: 'stone', lake: 'ice' },
    relief: 1.1,
    plants: [
      {
        stem: 'log',
        crown: { block: 'pine_needles', shape: 'cone', radius: 2 },
        cellSize: 6,
        chance: 0.55,
        minHeight: 5,
        maxHeight: 8,
      },
    ],
  },
  {
    id: 'deep_caves',
    name: 'Cuevas profundas',
    placement: { layer: 'depth', fromRow: 250 },
    ground: { rock: 'slate' },
    veins: [{ block: 'glow_crystal', scale: 3, threshold: 0.86 }],
  },
];
