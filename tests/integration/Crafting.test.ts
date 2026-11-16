import { describe, expect, it } from 'vitest';
import type { RecipeStatus } from '../../src/application/use-cases/crafting/CraftingService';
import type { WorldSession } from '../../src/application/use-cases/world/WorldSession';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { content, openSession } from '../support/session';

const { tileSize } = WORLD_CONFIG;

const statusOf = (session: WorldSession, recipeId: string): RecipeStatus => {
  const status = session.crafting.options(session.player).find((o) => o.recipe.id === recipeId);
  if (!status) throw new Error(`Receta desconocida: ${recipeId}`);
  return status;
};

/** Coloca un bloque de estación junto a la cabeza del jugador. */
function putStation(session: WorldSession, blockId: string, offsetTiles = 1): void {
  const { player, map } = session;
  const tileX = Math.floor(player.x / tileSize) + offsetTiles;
  const tileY = Math.floor(player.y / tileSize);
  map.setTile(tileX, tileY, content.blocks.indexOf(blockId));
}

describe('fabricación', () => {
  it('lista todas las recetas con lo que falta en cada una', () => {
    const session = openSession(42);
    session.inventory.add('wood', 3);
    expect(session.crafting.options(session.player)).toHaveLength(content.recipes.all.length);
    expect(statusOf(session, 'workbench')).toMatchObject({
      hasStation: true,
      craftable: false,
      missing: [{ itemId: 'wood', count: 7 }],
    });
  });

  it('consume los ingredientes y entrega el resultado', () => {
    const session = openSession(42);
    session.inventory.add('wood', 12);
    expect(statusOf(session, 'workbench').craftable).toBe(true);

    expect(session.crafting.craft('workbench', session.player)).toBe(true);
    expect(session.inventory.count('wood')).toBe(2);
    expect(session.inventory.count('workbench')).toBe(1);
  });

  it('no cambia nada si faltan ingredientes o la receta no existe', () => {
    const session = openSession(42);
    session.inventory.add('wood', 9);
    expect(session.crafting.craft('workbench', session.player)).toBe(false);
    expect(session.crafting.craft('nope', session.player)).toBe(false);
    expect(session.inventory.count('wood')).toBe(9);
    expect(session.inventory.count('workbench')).toBe(0);
  });

  it('las recetas de estación solo se pueden hacer con la estación cerca', () => {
    const session = openSession(42);
    session.inventory.add('wood', 8);
    expect(statusOf(session, 'wood_pickaxe')).toMatchObject({
      hasStation: false,
      craftable: false,
    });
    expect(session.crafting.craft('wood_pickaxe', session.player)).toBe(false);

    putStation(session, 'workbench', 30);
    expect(statusOf(session, 'wood_pickaxe').hasStation).toBe(false);

    putStation(session, 'workbench');
    expect(statusOf(session, 'wood_pickaxe')).toMatchObject({ hasStation: true, craftable: true });
    expect(session.crafting.craft('wood_pickaxe', session.player)).toBe(true);
    expect(session.inventory.count('wood_pickaxe')).toBe(1);
  });

  it('una estación no sirve para las recetas de otra', () => {
    const session = openSession(42);
    session.inventory.add('copper_ore', 3);
    putStation(session, 'workbench');
    expect(statusOf(session, 'copper_bar').hasStation).toBe(false);
    putStation(session, 'furnace', -1);
    expect(session.crafting.craft('copper_bar', session.player)).toBe(true);
    expect(session.inventory.count('copper_bar')).toBe(1);
  });

  it('lo que no cabe en el inventario cae al suelo en vez de perderse', () => {
    const session = openSession(42);
    const { inventory } = session;
    // Madera justa en una ranura y el resto lleno de otra cosa a tope: al gastar la madera
    // queda una ranura libre, que basta para la mesa.
    inventory.add('wood', 10);
    inventory.add('dirt', 99 * (inventory.size - 1));
    expect(session.crafting.craft('workbench', session.player)).toBe(true);
    expect(inventory.count('workbench')).toBe(1);

    // Con la madera repartida de modo que no se libera ninguna ranura, el resultado no cabe.
    const full = openSession(42);
    full.inventory.add('wood', 99);
    full.inventory.add('dirt', 99 * (full.inventory.size - 1));
    expect(full.crafting.craft('workbench', full.player)).toBe(true);
    expect(full.inventory.count('workbench')).toBe(0);
    expect(full.drops.items).toMatchObject([{ itemId: 'workbench', count: 1 }]);
  });
});

describe('progresión de herramientas', () => {
  /** Coloca un bloque junto al jugador, expuesto al aire, y devuelve su posición. */
  function putBlock(session: WorldSession, blockId: string): { x: number; y: number } {
    const { player, map } = session;
    const target = {
      x: Math.floor(player.x / tileSize) + 1,
      y: Math.floor(player.y / tileSize) - 1,
    };
    map.setTile(target.x, target.y, content.blocks.indexOf(blockId));
    return target;
  }

  it.each([
    ['stone', undefined, false],
    ['stone', 'wood_pickaxe', true],
    ['copper_ore', 'wood_pickaxe', true],
    ['iron_ore', 'wood_pickaxe', false],
    ['iron_ore', 'copper_pickaxe', true],
    ['iron_ore', 'iron_pickaxe', true],
    ['log', undefined, true],
  ] as const)('%s con %s en la mano: se puede minar = %s', (blockId, toolId, expected) => {
    const session = openSession(42);
    if (toolId) session.inventory.add(toolId, 1);
    const target = putBlock(session, blockId);
    expect(session.mining.canMine(session.player, target.x, target.y)).toBe(expected);
    expect(session.mining.needsBetterTool(session.player, target.x, target.y)).toBe(!expected);
  });

  it('la herramienta solo cuenta mientras está en la ranura seleccionada', () => {
    const session = openSession(42);
    session.inventory.add('dirt', 1);
    session.inventory.add('wood_pickaxe', 1);
    const target = putBlock(session, 'stone');
    expect(session.mining.canMine(session.player, target.x, target.y)).toBe(false);
    session.inventory.select(1);
    expect(session.mining.canMine(session.player, target.x, target.y)).toBe(true);
  });

  it('cada pico mejor rompe el mismo bloque en menos tiempo', () => {
    const times = ['wood_pickaxe', 'copper_pickaxe', 'iron_pickaxe'].map((toolId) => {
      const session = openSession(42);
      session.inventory.add(toolId, 1);
      const target = putBlock(session, 'stone');
      let steps = 1;
      while (!session.mining.update(session.player, target, 1 / 60)) steps++;
      expect(session.drops.items).toMatchObject([{ itemId: 'stone', count: 1 }]);
      return steps;
    });
    expect(times[0]).toBeGreaterThan(times[1] ?? 0);
    expect(times[1]).toBeGreaterThan(times[2] ?? 0);
  });
});
