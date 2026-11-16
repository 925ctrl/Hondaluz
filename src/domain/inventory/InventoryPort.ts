import type { ItemStack } from '../items/ItemDefinition';

/**
 * Contratos con los que el resto del juego usa el inventario sin conocerlo.
 * Minería y recogida solo necesitan guardar; construcción solo necesita gastar lo que se lleva
 * en la mano.
 */
export interface ItemStore {
  /** Unidades de ese objeto que todavía caben. */
  capacityFor(itemId: string): number;
  /** Guarda lo que quepa y devuelve las unidades que no han cabido. */
  add(itemId: string, count: number): number;
}

export interface HeldItemSource {
  held(): ItemStack | null;
  /** Gasta unidades del objeto en la mano. Devuelve `false` si no hay suficientes. */
  consumeHeld(count: number): boolean;
}

/** Almacén del que además se puede contar y retirar, como exige la fabricación. */
export interface ItemPouch extends ItemStore {
  count(itemId: string): number;
  /** Retira unidades de ese objeto. Devuelve `false`, sin retirar nada, si no hay suficientes. */
  remove(itemId: string, count: number): boolean;
}
