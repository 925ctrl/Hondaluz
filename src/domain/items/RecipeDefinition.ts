import type { ItemStack } from './ItemDefinition';

export interface RecipeDefinition {
  readonly id: string;
  readonly result: ItemStack;
  readonly ingredients: readonly ItemStack[];
  /** Id del bloque junto al que hay que estar para fabricarla; sin valor, se hace a mano. */
  readonly station?: string;
}
