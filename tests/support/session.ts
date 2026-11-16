import type { WorldSession } from '../../src/application/use-cases/world/WorldSession';
import { createSessionFactory } from '../../src/bootstrap/sessionFactory';
import { BIOME_DEFINITIONS } from '../../src/content/biomes';
import { BLOCK_DEFINITIONS } from '../../src/content/blocks';
import { ENEMY_DEFINITIONS } from '../../src/content/enemies';
import { ITEM_DEFINITIONS } from '../../src/content/items';
import { RECIPE_DEFINITIONS } from '../../src/content/recipes';
import { mulberry32 } from '../../src/core/utils/random';
import { createGameContent } from '../../src/domain/catalog/GameContent';
import type { WorldSave } from '../../src/domain/repositories/WorldSaveRepository';

export const content = createGameContent({
  blocks: BLOCK_DEFINITIONS,
  items: ITEM_DEFINITIONS,
  recipes: RECIPE_DEFINITIONS,
  enemies: ENEMY_DEFINITIONS,
  biomes: BIOME_DEFINITIONS,
});

/** Abre un mundo real del juego, con su configuración y contenido, para una semilla dada. */
export function openSession(
  seed: number,
  onInventoryChange: () => void = () => undefined,
  save?: WorldSave,
): WorldSession {
  const meta = {
    id: 'w',
    name: 'Prueba',
    seed: { text: 't', value: seed },
    createdAt: 0,
    lastPlayedAt: 0,
    playedSeconds: 0,
  };
  return createSessionFactory(content, onInventoryChange, mulberry32(seed))(meta, save);
}
