import { describe, expect, it } from 'vitest';
import { ContentError } from '../../src/core/errors/ContentError';
import { createGameContent } from '../../src/domain/catalog/GameContent';
import type { ItemDefinition } from '../../src/domain/items/ItemDefinition';
import type { RecipeDefinition } from '../../src/domain/items/RecipeDefinition';
import type { BlockDefinition } from '../../src/domain/world/BlockDefinition';
import { content } from '../support/session';

const air: BlockDefinition = { id: 'air', name: 'Aire', solid: false };
const visual = { base: 0, shade: 0, highlight: 0, grain: 'fine' } as const;
const item = (overrides: Partial<ItemDefinition>): ItemDefinition => ({
  id: 'thing',
  name: 'Cosa',
  description: '',
  maxStack: 10,
  ...overrides,
});

describe('createGameContent', () => {
  it('acepta el contenido real del juego', () => {
    expect(content.items.get('dirt').placesBlock).toBe('dirt');
    expect(content.blocks.get('grass').drops).toEqual([{ itemId: 'dirt', count: 1 }]);
  });

  it('rechaza objetos que colocan bloques inexistentes o aire', () => {
    for (const placesBlock of ['nope', 'air']) {
      expect(() => createGameContent({ blocks: [air], items: [item({ placesBlock })] })).toThrow(
        ContentError,
      );
    }
  });

  it('rechaza montones con tamaño inválido', () => {
    expect(() => createGameContent({ blocks: [air], items: [item({ maxStack: 0 })] })).toThrow(
      /maxStack/,
    );
  });

  it('rechaza bloques con botín inexistente o dureza no positiva', () => {
    const rock = (extra: Partial<BlockDefinition>): BlockDefinition => ({
      id: 'rock',
      name: 'Roca',
      solid: true,
      visual,
      ...extra,
    });
    expect(() =>
      createGameContent({
        blocks: [air, rock({ drops: [{ itemId: 'nope', count: 1 }] })],
        items: [],
      }),
    ).toThrow(/suelta/);
    expect(() => createGameContent({ blocks: [air, rock({ hardness: 0 })], items: [] })).toThrow(
      /dureza/,
    );
    expect(() => createGameContent({ blocks: [air, rock({ light: 20 })], items: [] })).toThrow(
      /luz/,
    );
    expect(() =>
      createGameContent({ blocks: [air, rock({ physics: 'liquid' })], items: [] }),
    ).toThrow(/líquido/);
    expect(() =>
      createGameContent({ blocks: [air, rock({ solid: false, physics: 'falling' })], items: [] }),
    ).toThrow(/cae/);
  });

  it('exige icono o bloque en cada objeto, y dibujos cuadrados con colores definidos', () => {
    expect(() => createGameContent({ blocks: [air], items: [item({})] })).toThrow(/icono/);
    const sprite = (rows: string[]): ItemDefinition =>
      item({ icon: { rows, palette: { a: 0xffffff } } });
    expect(() => createGameContent({ blocks: [air], items: [sprite(['aa', 'a'])] })).toThrow(
      /cuadrado/,
    );
    expect(() => createGameContent({ blocks: [air], items: [sprite(['a.', 'az'])] })).toThrow(
      /sin definir/,
    );
    expect(() => createGameContent({ blocks: [air], items: [sprite(['a.', '.a'])] })).not.toThrow();
  });

  it('rechaza recetas con referencias rotas, vacías o con ingredientes repetidos', () => {
    const icon = { rows: ['a'], palette: { a: 0 } };
    const items = [item({ id: 'a', icon }), item({ id: 'b', icon })];
    const recipe = (extra: Partial<RecipeDefinition>): RecipeDefinition => ({
      id: 'r',
      result: { itemId: 'b', count: 1 },
      ingredients: [{ itemId: 'a', count: 1 }],
      ...extra,
    });
    const build =
      (extra: Partial<RecipeDefinition>): (() => unknown) =>
      () =>
        createGameContent({ blocks: [air], items, recipes: [recipe(extra)] });

    expect(build({})).not.toThrow();
    expect(build({ result: { itemId: 'nope', count: 1 } })).toThrow(ContentError);
    expect(build({ ingredients: [] })).toThrow(ContentError);
    expect(build({ ingredients: [{ itemId: 'a', count: 0 }] })).toThrow(ContentError);
    expect(
      build({
        ingredients: [
          { itemId: 'a', count: 1 },
          { itemId: 'a', count: 2 },
        ],
      }),
    ).toThrow(ContentError);
    expect(build({ station: 'nope' })).toThrow(/estación/);
  });

  it('toda receta del juego se puede completar con objetos que sueltan bloques o enemigos', () => {
    const obtainable = new Set([
      ...content.blocks.all.flatMap((block) => (block.drops ?? []).map((drop) => drop.itemId)),
      ...content.enemies.all.flatMap((enemy) => enemy.drops.map((drop) => drop.itemId)),
    ]);
    // Se repite hasta que no aparezcan objetos nuevos fabricables.
    for (let added = true; added;) {
      added = false;
      for (const recipe of content.recipes.all) {
        const stationOk =
          recipe.station === undefined ||
          content.items.all.some(
            (candidate) => candidate.placesBlock === recipe.station && obtainable.has(candidate.id),
          );
        const ready = recipe.ingredients.every((ingredient) => obtainable.has(ingredient.itemId));
        if (ready && stationOk && !obtainable.has(recipe.result.itemId)) {
          obtainable.add(recipe.result.itemId);
          added = true;
        }
      }
    }
    for (const recipe of content.recipes.all) {
      expect(obtainable, `receta ${recipe.id}`).toContain(recipe.result.itemId);
    }
  });

  it('rechaza objetos con más de un uso y enemigos con datos inválidos', () => {
    const icon = { rows: ['a'], palette: { a: 0 } };
    const weapon = { damage: 1, cooldownSeconds: 1, reach: 1, knockback: 1 };
    expect(() =>
      createGameContent({
        blocks: [air],
        items: [item({ icon, weapon, consumable: { heal: 5 } })],
      }),
    ).toThrow(/un uso/);
    expect(() =>
      createGameContent({
        blocks: [air],
        items: [item({ icon, weapon: { ...weapon, damage: 0 } })],
      }),
    ).toThrow(/arma/);

    const enemy = content.enemies.get('stump');
    const withEnemy =
      (extra: object): (() => unknown) =>
      () =>
        createGameContent({
          blocks: content.blocks.all,
          items: content.items.all,
          enemies: [{ ...enemy, ...extra }],
        });
    expect(withEnemy({})).not.toThrow();
    expect(withEnemy({ speed: 0 })).toThrow(/estadísticas/);
    expect(withEnemy({ knockbackResistance: 2 })).toThrow(/retroceso/);
    expect(withEnemy({ drops: [{ itemId: 'nope', count: 1, chance: 1 }] })).toThrow(/suelta/);
    expect(withEnemy({ frames: [] })).toThrow(/fotograma/);
  });
});
