import type { RecipeDefinition } from '../../domain/items/RecipeDefinition';

/** Recetas del juego. Añadir una es añadir una entrada aquí. */
export const RECIPE_DEFINITIONS: readonly RecipeDefinition[] = [
  {
    id: 'workbench',
    result: { itemId: 'workbench', count: 1 },
    ingredients: [{ itemId: 'wood', count: 10 }],
  },
  {
    id: 'wood_pickaxe',
    result: { itemId: 'wood_pickaxe', count: 1 },
    ingredients: [{ itemId: 'wood', count: 8 }],
    station: 'workbench',
  },
  {
    id: 'furnace',
    result: { itemId: 'furnace', count: 1 },
    ingredients: [{ itemId: 'stone', count: 20 }],
    station: 'workbench',
  },
  {
    id: 'copper_bar',
    result: { itemId: 'copper_bar', count: 1 },
    ingredients: [{ itemId: 'copper_ore', count: 3 }],
    station: 'furnace',
  },
  {
    id: 'anvil',
    result: { itemId: 'anvil', count: 1 },
    ingredients: [{ itemId: 'copper_bar', count: 5 }],
    station: 'workbench',
  },
  {
    id: 'copper_pickaxe',
    result: { itemId: 'copper_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'copper_bar', count: 8 },
      { itemId: 'wood', count: 4 },
    ],
    station: 'anvil',
  },
  {
    id: 'iron_bar',
    result: { itemId: 'iron_bar', count: 1 },
    ingredients: [{ itemId: 'iron_ore', count: 3 }],
    station: 'furnace',
  },
  {
    id: 'iron_pickaxe',
    result: { itemId: 'iron_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'iron_bar', count: 8 },
      { itemId: 'wood', count: 4 },
    ],
    station: 'anvil',
  },
  {
    id: 'wood_sword',
    result: { itemId: 'wood_sword', count: 1 },
    ingredients: [{ itemId: 'wood', count: 7 }],
    station: 'workbench',
  },
  {
    id: 'copper_sword',
    result: { itemId: 'copper_sword', count: 1 },
    ingredients: [{ itemId: 'copper_bar', count: 7 }],
    station: 'anvil',
  },
  {
    id: 'iron_sword',
    result: { itemId: 'iron_sword', count: 1 },
    ingredients: [{ itemId: 'iron_bar', count: 7 }],
    station: 'anvil',
  },
  {
    id: 'balm',
    result: { itemId: 'balm', count: 1 },
    ingredients: [
      { itemId: 'glow_dust', count: 2 },
      { itemId: 'wood', count: 1 },
    ],
    station: 'workbench',
  },
  {
    id: 'torch',
    result: { itemId: 'torch', count: 3 },
    ingredients: [{ itemId: 'wood', count: 1 }],
  },
];
