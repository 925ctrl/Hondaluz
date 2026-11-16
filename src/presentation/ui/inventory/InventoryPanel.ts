import type { Inventory } from '../../../domain/inventory/Inventory';
import { button, el } from '../dom';
import { renderSlot, type SlotContext } from './slotElement';

const HELP = 'Clic: coger o soltar un montón · Clic derecho: coger la mitad';

/**
 * Inventario completo. Se elige un montón de origen (entero con clic, la mitad con clic
 * derecho) y después su destino: otra ranura o el botón de eliminar.
 */
export function createInventoryPanel(
  inventory: Inventory,
  context: SlotContext,
  onClose: () => void,
): { element: HTMLElement; render(): void } {
  let source: { index: number; half: boolean } | null = null;

  const grid = el('div', { class: 'inventory-grid' });
  const info = el('p', { class: 'inventory-info', attrs: { 'data-testid': 'inventory-info' } });
  const discard = button(
    'Eliminar',
    () => {
      if (!source) return;
      const { index } = source;
      source = null;
      inventory.clear(index);
    },
    'btn btn-danger',
  );
  const element = el(
    'div',
    { class: 'panel inventory', attrs: { role: 'dialog', 'aria-label': 'Inventario' } },
    [
      el('h2', { text: 'Inventario' }),
      grid,
      info,
      el('p', { class: 'hint', text: HELP }),
      el('div', { class: 'row' }, [discard, button('Cerrar', onClose, 'btn btn-secondary')]),
    ],
  );

  const describe = (index: number): void => {
    const stack = inventory.slot(index);
    if (!stack) {
      info.textContent = '';
      return;
    }
    const item = context.items.get(stack.itemId);
    info.textContent = `${item.name} ×${String(stack.count)} — ${item.description}`;
  };

  const choose = (index: number, half: boolean): void => {
    if (source) {
      const from = source;
      source = null;
      if (from.index === index) {
        render();
      } else if (from.half) {
        inventory.split(from.index, index);
      } else {
        inventory.move(from.index, index);
      }
      // Si la operación no cambió nada no hubo aviso de cambio: se repinta para quitar la marca.
      render();
      return;
    }
    if (!inventory.slot(index)) return;
    source = { index, half };
    render();
  };

  function render(): void {
    discard.disabled = source === null;
    grid.replaceChildren(
      ...Array.from({ length: inventory.size }, (_, index) => {
        const classes = [
          index < inventory.hotbarSize ? 'hotbar-row' : '',
          source?.index === index ? 'selected' : '',
        ];
        const slot = renderSlot(context, index, inventory.slot(index), classes.join(' '));
        slot.addEventListener('click', () => {
          choose(index, false);
        });
        slot.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          choose(index, true);
        });
        slot.addEventListener('mouseenter', () => {
          describe(index);
        });
        slot.addEventListener('focus', () => {
          describe(index);
        });
        return slot;
      }),
    );
    if (source) describe(source.index);
  }
  render();
  return { element, render };
}
