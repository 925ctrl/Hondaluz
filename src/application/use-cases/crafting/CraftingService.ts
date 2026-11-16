import type { HappeningLog } from '../../../domain/events/Happenings';
import type { RecipeRegistry } from '../../../domain/catalog/GameContent';
import type { ItemPouch } from '../../../domain/inventory/InventoryPort';
import type { ItemStack } from '../../../domain/items/ItemDefinition';
import type { RecipeDefinition } from '../../../domain/items/RecipeDefinition';
import type { Box } from '../../../domain/physics/tileCollision';
import { blocksNear } from '../../../domain/rules/nearbyBlocks';
import type { BlockRegistry } from '../../../domain/world/BlockDefinition';
import type { WorldMap } from '../../../domain/world/WorldMap';

export interface CraftingDeps {
  readonly recipes: RecipeRegistry;
  readonly blocks: BlockRegistry;
  readonly map: WorldMap;
  readonly pouch: ItemPouch;
  readonly tileSize: number;
  /** Distancia, en bloques, a la que una estación cuenta como cercana. */
  readonly reachTiles: number;
  /** Qué hacer con el resultado que no cabe en el inventario. */
  readonly overflow: (itemId: string, count: number) => void;
  readonly happenings: HappeningLog;
}

/** Estado de una receta para quien quiere fabricarla ahora. */
export interface RecipeStatus {
  readonly recipe: RecipeDefinition;
  readonly hasStation: boolean;
  /** Unidades que faltan de cada ingrediente; vacío si están todos. */
  readonly missing: readonly ItemStack[];
  readonly craftable: boolean;
}

/** Fabricación: comprueba requisitos, consume los ingredientes y entrega el resultado. */
export class CraftingService {
  private readonly stationBlocks: ReadonlySet<number>;

  constructor(private readonly deps: CraftingDeps) {
    this.stationBlocks = new Set(
      deps.recipes.all.flatMap((recipe) =>
        recipe.station === undefined ? [] : [deps.blocks.indexOf(recipe.station)],
      ),
    );
  }

  /** Todas las recetas con su estado, en el orden en que están definidas. */
  options(crafter: Box): RecipeStatus[] {
    const stations = this.stationsNear(crafter);
    return this.deps.recipes.all.map((recipe) => this.status(recipe, stations));
  }

  /** Fabrica una receta. Devuelve `false`, sin cambiar nada, si no se cumplen los requisitos. */
  craft(recipeId: string, crafter: Box): boolean {
    const { recipes, pouch, overflow } = this.deps;
    if (!recipes.has(recipeId)) return false;
    const recipe = recipes.get(recipeId);
    if (!this.status(recipe, this.stationsNear(crafter)).craftable) return false;

    for (const ingredient of recipe.ingredients) pouch.remove(ingredient.itemId, ingredient.count);
    const leftover = pouch.add(recipe.result.itemId, recipe.result.count);
    if (leftover > 0) overflow(recipe.result.itemId, leftover);
    this.deps.happenings.push({ kind: 'crafted' });
    return true;
  }

  private stationsNear(crafter: Box): Set<number> {
    const { map, tileSize, reachTiles } = this.deps;
    return blocksNear(map, crafter, tileSize, reachTiles, this.stationBlocks);
  }

  private status(recipe: RecipeDefinition, stations: ReadonlySet<number>): RecipeStatus {
    const { blocks, pouch } = this.deps;
    const hasStation = recipe.station === undefined || stations.has(blocks.indexOf(recipe.station));
    const missing = recipe.ingredients
      .map(({ itemId, count }) => ({ itemId, count: count - pouch.count(itemId) }))
      .filter((lack) => lack.count > 0);
    return { recipe, hasStation, missing, craftable: hasStation && missing.length === 0 };
  }
}
