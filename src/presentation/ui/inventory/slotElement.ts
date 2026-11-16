import type { ItemRegistry } from '../../../domain/catalog/GameContent';
import type { ItemStack } from '../../../domain/items/ItemDefinition';
import { el } from '../dom';
import type { ItemIcons } from '../ItemIcons';

export interface SlotContext {
  readonly items: ItemRegistry;
  readonly icons: ItemIcons;
}

/** Botón que representa una ranura: icono, cantidad y descripción accesible. */
export function renderSlot(
  context: SlotContext,
  index: number,
  stack: ItemStack | null,
  className = '',
): HTMLButtonElement {
  const slot = el('button', {
    class: `slot ${className}`.trim(),
    attrs: { type: 'button', 'data-testid': `slot-${String(index)}` },
  });
  if (!stack) {
    slot.setAttribute('aria-label', `Ranura ${String(index + 1)}: vacía`);
    slot.dataset.count = '0';
    return slot;
  }
  const item = context.items.get(stack.itemId);
  slot.dataset.item = stack.itemId;
  slot.dataset.count = String(stack.count);
  slot.setAttribute(
    'aria-label',
    `Ranura ${String(index + 1)}: ${item.name} ×${String(stack.count)}`,
  );
  slot.append(
    el('img', {
      attrs: { src: context.icons.get(stack.itemId) ?? '', alt: '', draggable: 'false' },
    }),
  );
  if (stack.count > 1) slot.append(el('span', { class: 'slot-count', text: String(stack.count) }));
  return slot;
}
