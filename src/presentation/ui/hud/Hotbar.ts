import type { Inventory } from '../../../domain/inventory/Inventory';
import { el } from '../dom';
import { renderSlot, type SlotContext } from '../inventory/slotElement';

/** Barra rápida: las primeras ranuras del inventario y el nombre del objeto en la mano. */
export function createHotbar(
  inventory: Inventory,
  context: SlotContext,
): { element: HTMLElement; render(): void } {
  const label = el('p', { class: 'hotbar-label', attrs: { 'data-testid': 'held-item' } });
  const slots = el('div', { class: 'hotbar-slots' });
  const element = el('div', { class: 'hotbar', attrs: { 'aria-label': 'Barra rápida' } }, [
    label,
    slots,
  ]);

  const render = (): void => {
    const held = inventory.held();
    label.textContent = held ? context.items.get(held.itemId).name : '';
    slots.replaceChildren(
      ...Array.from({ length: inventory.hotbarSize }, (_, index) => {
        const selected = index === inventory.selectedIndex;
        const slot = renderSlot(context, index, inventory.slot(index), selected ? 'selected' : '');
        slot.setAttribute('aria-pressed', String(selected));
        slot.append(el('span', { class: 'slot-key', text: String(index + 1) }));
        slot.addEventListener('click', () => {
          inventory.select(index);
        });
        return slot;
      }),
    );
  };
  render();
  return { element, render };
}
