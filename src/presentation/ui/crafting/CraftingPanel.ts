import type { RecipeStatus } from '../../../application/use-cases/crafting/CraftingService';
import type { WorldSession } from '../../../application/use-cases/world/WorldSession';
import type { GameContent } from '../../../domain/catalog/GameContent';
import { button, el } from '../dom';
import type { ItemIcons } from '../ItemIcons';

export interface CraftingPanelDeps {
  readonly content: GameContent;
  readonly icons: ItemIcons;
}

/**
 * Lista de recetas con su estado. Las que no se pueden fabricar se muestran bloqueadas,
 * indicando qué falta; un filtro permite ver solo las disponibles.
 */
export function createCraftingPanel(
  session: WorldSession,
  deps: CraftingPanelDeps,
): { element: HTMLElement; render(): void } {
  const { items, blocks } = deps.content;
  const list = el('ul', { class: 'recipe-list' });
  const onlyAvailable = el('input', { attrs: { type: 'checkbox', id: 'recipes-available' } });
  const element = el(
    'div',
    { class: 'panel crafting', attrs: { role: 'region', 'aria-label': 'Fabricación' } },
    [
      el('h2', { text: 'Fabricación' }),
      el('label', { class: 'check', attrs: { for: 'recipes-available' } }, [
        onlyAvailable,
        'Solo disponibles',
      ]),
      list,
    ],
  );

  const icon = (itemId: string): HTMLImageElement =>
    el('img', { attrs: { src: deps.icons.get(itemId) ?? '', alt: '', draggable: 'false' } });

  const renderRecipe = ({ recipe, hasStation, missing, craftable }: RecipeStatus): HTMLElement => {
    const result = items.get(recipe.result.itemId);
    const amount = recipe.result.count > 1 ? ` ×${String(recipe.result.count)}` : '';
    const requirements = recipe.ingredients.map(({ itemId, count }) => {
      const lacking = missing.some((lack) => lack.itemId === itemId);
      return el('span', { class: lacking ? 'requirement lacking' : 'requirement' }, [
        icon(itemId),
        `${items.get(itemId).name} ${String(session.inventory.count(itemId))}/${String(count)}`,
      ]);
    });
    if (recipe.station !== undefined) {
      requirements.push(
        el('span', {
          class: hasStation ? 'requirement' : 'requirement lacking',
          text: `Junto a: ${blocks.get(recipe.station).name}`,
        }),
      );
    }
    const craft = button('Fabricar', () => {
      // El resultado cambia el inventario, y ese aviso repinta la lista.
      session.crafting.craft(recipe.id, session.player);
    });
    craft.disabled = !craftable;
    craft.setAttribute('aria-label', `Fabricar ${result.name}`);

    return el(
      'li',
      {
        class: craftable ? 'recipe' : 'recipe locked',
        attrs: { 'data-testid': `recipe-${recipe.id}`, 'data-craftable': String(craftable) },
      },
      [
        el('div', { class: 'recipe-result' }, [icon(result.id)]),
        el('div', { class: 'recipe-body' }, [
          el('strong', { text: `${result.name}${amount}` }),
          el('div', { class: 'requirements' }, requirements),
        ]),
        craft,
      ],
    );
  };

  const render = (): void => {
    const options = session.crafting
      .options(session.player)
      .filter((option) => option.craftable || !onlyAvailable.checked);
    list.replaceChildren(
      ...(options.length > 0
        ? options.map(renderRecipe)
        : [el('li', { class: 'hint', text: 'Ahora mismo no puedes fabricar nada.' })]),
    );
  };
  onlyAvailable.addEventListener('change', render);
  render();
  return { element, render };
}
