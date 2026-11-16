import { ContentError } from '../../core/errors/ContentError';
import { Registry } from '../../core/registry/Registry';
import type { ItemDefinition, ItemStack } from '../items/ItemDefinition';
import type { EnemyDefinition } from '../enemies/EnemyDefinition';
import type { RecipeDefinition } from '../items/RecipeDefinition';
import {
  createBiomeRegistry,
  type BiomeDefinition,
  type BiomeRegistry,
} from '../world/BiomeDefinition';
import {
  AIR_ID,
  createBlockRegistry,
  type BlockDefinition,
  type BlockRegistry,
} from '../world/BlockDefinition';
import { validatePixelSprite } from './PixelSprite';

export type ItemRegistry = Registry<ItemDefinition>;
export type RecipeRegistry = Registry<RecipeDefinition>;
export type EnemyRegistry = Registry<EnemyDefinition>;

/** Todo el contenido del juego, ya validado. */
export interface GameContent {
  readonly blocks: BlockRegistry;
  readonly items: ItemRegistry;
  readonly recipes: RecipeRegistry;
  readonly enemies: EnemyRegistry;
  readonly biomes: BiomeRegistry;
}

export interface ContentDefinitions {
  readonly blocks: readonly BlockDefinition[];
  readonly items: readonly ItemDefinition[];
  readonly recipes?: readonly RecipeDefinition[];
  readonly enemies?: readonly EnemyDefinition[];
  readonly biomes?: readonly BiomeDefinition[];
}

/**
 * Registra el contenido y comprueba las referencias cruzadas, para que un id mal escrito
 * falle al arrancar y no a mitad de partida.
 */
export function createGameContent(definitions: ContentDefinitions): GameContent {
  const blocks = createBlockRegistry(definitions.blocks);
  const items = new Registry('objeto', definitions.items);
  const recipes = new Registry('receta', definitions.recipes ?? []);
  const enemies = new Registry('enemigo', definitions.enemies ?? []);
  const biomes = createBiomeRegistry(definitions.biomes ?? [], blocks);
  const isPlaceable = (blockId: string): boolean => blockId !== AIR_ID && blocks.has(blockId);
  const isValidStack = (stack: ItemStack): boolean =>
    items.has(stack.itemId) && Number.isInteger(stack.count) && stack.count >= 1;

  for (const item of items.all) {
    if (!Number.isInteger(item.maxStack) || item.maxStack < 1) {
      throw new ContentError(`El objeto "${item.id}" necesita un maxStack entero y positivo.`);
    }
    if (item.placesBlock !== undefined && !isPlaceable(item.placesBlock)) {
      throw new ContentError(
        `El objeto "${item.id}" coloca un bloque inexistente: "${item.placesBlock}".`,
      );
    }
    if (item.icon) validatePixelSprite(item.icon, item.id);
    else if (item.placesBlock === undefined) {
      throw new ContentError(`El objeto "${item.id}" necesita un icono o un bloque que colocar.`);
    }
    if (item.tool && (item.tool.tier < 1 || item.tool.power <= 0)) {
      throw new ContentError(`La herramienta "${item.id}" necesita nivel y potencia positivos.`);
    }
    const { weapon, consumable } = item;
    if (
      weapon &&
      ![weapon.damage, weapon.cooldownSeconds, weapon.reach, weapon.knockback].every((v) => v > 0)
    ) {
      throw new ContentError(`El arma "${item.id}" necesita valores positivos.`);
    }
    if (consumable && consumable.heal <= 0) {
      throw new ContentError(`El consumible "${item.id}" debe curar una cantidad positiva.`);
    }
    const uses = [item.placesBlock, item.tool, weapon, consumable].filter((u) => u !== undefined);
    if (uses.length > 1) {
      throw new ContentError(`El objeto "${item.id}" solo puede tener un uso.`);
    }
  }

  for (const block of blocks.all) {
    for (const drop of block.drops ?? []) {
      if (!isValidStack(drop)) {
        throw new ContentError(
          `El bloque "${block.id}" suelta un objeto inválido: "${drop.itemId}".`,
        );
      }
    }
  }

  for (const recipe of recipes.all) {
    const ingredientIds = new Set(recipe.ingredients.map((ingredient) => ingredient.itemId));
    if (
      !isValidStack(recipe.result) ||
      recipe.ingredients.length === 0 ||
      !recipe.ingredients.every(isValidStack) ||
      ingredientIds.size !== recipe.ingredients.length
    ) {
      throw new ContentError(
        `La receta "${recipe.id}" tiene un resultado o ingredientes inválidos.`,
      );
    }
    if (recipe.station !== undefined && !isPlaceable(recipe.station)) {
      throw new ContentError(
        `La receta "${recipe.id}" requiere una estación inexistente: "${recipe.station}".`,
      );
    }
  }
  for (const enemy of enemies.all) {
    const stats = [enemy.maxHealth, enemy.damage, enemy.speed, enemy.detectionRange];
    if (!stats.every((value) => value > 0) || enemy.width <= 0 || enemy.height <= 0) {
      throw new ContentError(`El enemigo "${enemy.id}" necesita estadísticas positivas.`);
    }
    if (enemy.knockbackResistance < 0 || enemy.knockbackResistance > 1) {
      throw new ContentError(`La resistencia al retroceso de "${enemy.id}" debe estar en [0, 1].`);
    }
    if (enemy.spawn.weight <= 0) {
      throw new ContentError(`El enemigo "${enemy.id}" necesita un peso de aparición positivo.`);
    }
    for (const drop of enemy.drops) {
      if (!isValidStack(drop) || drop.chance <= 0 || drop.chance > 1) {
        throw new ContentError(
          `El enemigo "${enemy.id}" suelta un objeto inválido: "${drop.itemId}".`,
        );
      }
    }
    if (enemy.frames.length === 0) {
      throw new ContentError(`El enemigo "${enemy.id}" necesita al menos un fotograma.`);
    }
    enemy.frames.forEach((frame, index) => {
      validatePixelSprite(frame, `${enemy.id} (fotograma ${String(index)})`);
    });
  }
  return { blocks, items, recipes, enemies, biomes };
}
