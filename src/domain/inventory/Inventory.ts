import type { ItemStack } from '../items/ItemDefinition';
import type { HeldItemSource, ItemPouch } from './InventoryPort';

/**
 * Ranuras de objetos del jugador. Las primeras `hotbarSize` forman la barra rápida,
 * y una de ellas es la seleccionada: el objeto que se lleva en la mano.
 */
export class Inventory implements ItemPouch, HeldItemSource {
  private readonly slots: (ItemStack | null)[];
  private selected = 0;

  constructor(
    readonly size: number,
    readonly hotbarSize: number,
    private readonly maxStackOf: (itemId: string) => number,
    /** Se invoca tras cualquier cambio de contenido o de selección. */
    private readonly onChange: () => void = () => undefined,
  ) {
    this.slots = Array.from({ length: size }, () => null);
  }

  get selectedIndex(): number {
    return this.selected;
  }

  slot(index: number): ItemStack | null {
    return this.slots[index] ?? null;
  }

  select(index: number): void {
    if (index < 0 || index >= this.hotbarSize || index === this.selected) return;
    this.selected = index;
    this.onChange();
  }

  held(): ItemStack | null {
    return this.slot(this.selected);
  }

  consumeHeld(count: number): boolean {
    const stack = this.held();
    if (!stack || stack.count < count) return false;
    this.setSlot(this.selected, stack.itemId, stack.count - count);
    this.onChange();
    return true;
  }

  count(itemId: string): number {
    return this.slots.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.count : 0), 0);
  }

  capacityFor(itemId: string): number {
    const max = this.maxStackOf(itemId);
    return this.slots.reduce(
      (sum, stack) => sum + (!stack ? max : stack.itemId === itemId ? max - stack.count : 0),
      0,
    );
  }

  /** Completa primero los montones existentes y después ocupa ranuras vacías. */
  add(itemId: string, count: number): number {
    const max = this.maxStackOf(itemId);
    let remaining = count;
    for (const fillExisting of [true, false]) {
      for (let index = 0; index < this.size && remaining > 0; index++) {
        const stack = this.slot(index);
        if (fillExisting ? stack?.itemId !== itemId : stack !== null) continue;
        const current = stack?.count ?? 0;
        const moved = Math.min(max - current, remaining);
        if (moved <= 0) continue;
        this.setSlot(index, itemId, current + moved);
        remaining -= moved;
      }
    }
    if (remaining !== count) this.onChange();
    return remaining;
  }

  /** Retira unidades empezando por las últimas ranuras, para conservar la barra rápida. */
  remove(itemId: string, count: number): boolean {
    if (this.count(itemId) < count) return false;
    let remaining = count;
    for (let index = this.size - 1; index >= 0 && remaining > 0; index--) {
      const stack = this.slot(index);
      if (stack?.itemId !== itemId) continue;
      const taken = Math.min(stack.count, remaining);
      this.setSlot(index, itemId, stack.count - taken);
      remaining -= taken;
    }
    if (count > 0) this.onChange();
    return true;
  }

  /** Mueve un montón: lo deja en una ranura vacía, lo fusiona con uno igual o los intercambia. */
  move(from: number, to: number): void {
    const source = this.slot(from);
    if (!source || from === to || !this.isSlot(to)) return;
    const target = this.slot(to);
    if (target && target.itemId !== source.itemId) {
      this.slots[from] = target;
      this.slots[to] = source;
      this.onChange();
      return;
    }
    this.transfer(from, to, source.count);
  }

  /** Pasa la mitad del montón (redondeada hacia arriba) a una ranura vacía o con el mismo objeto. */
  split(from: number, to: number): void {
    const source = this.slot(from);
    if (!source || from === to || !this.isSlot(to)) return;
    const target = this.slot(to);
    if (target && target.itemId !== source.itemId) return;
    this.transfer(from, to, Math.ceil(source.count / 2));
  }

  /** Copia de todas las ranuras, para guardarlas. */
  snapshot(): (ItemStack | null)[] {
    return this.slots.map((stack) => (stack ? { ...stack } : null));
  }

  /**
   * Sustituye el contenido por uno guardado. Las ranuras que sobran se ignoran y los montones
   * se recortan a su máximo; los objetos que el juego ya no reconoce deben filtrarse antes.
   */
  restore(slots: readonly (ItemStack | null)[], selected: number): void {
    for (let index = 0; index < this.size; index++) {
      const stack = slots[index] ?? null;
      const count = stack ? Math.min(Math.floor(stack.count), this.maxStackOf(stack.itemId)) : 0;
      this.slots[index] = stack && count > 0 ? { itemId: stack.itemId, count } : null;
    }
    this.selected =
      Number.isInteger(selected) && selected >= 0 && selected < this.hotbarSize ? selected : 0;
    this.onChange();
  }

  /** Elimina el contenido de una ranura. */
  clear(index: number): void {
    if (!this.slot(index)) return;
    this.slots[index] = null;
    this.onChange();
  }

  private transfer(from: number, to: number, wanted: number): void {
    const source = this.slot(from);
    if (!source) return;
    const current = this.slot(to)?.count ?? 0;
    const moved = Math.min(wanted, this.maxStackOf(source.itemId) - current);
    if (moved <= 0) return;
    this.setSlot(to, source.itemId, current + moved);
    this.setSlot(from, source.itemId, source.count - moved);
    this.onChange();
  }

  private isSlot(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.size;
  }

  private setSlot(index: number, itemId: string, count: number): void {
    this.slots[index] = count > 0 ? { itemId, count } : null;
  }
}
