import {
  createWorldSession,
  type WorldSessionFactory,
} from '../application/use-cases/world/WorldSession';
import { GAMEPLAY_CONFIG } from '../config/gameplay.config';
import { PLAYER_TUNING, WORLD_CONFIG } from '../config/world.config';
import type { RandomSource } from '../core/utils/random';
import type { GameContent } from '../domain/catalog/GameContent';
import { createCaves } from '../infrastructure/procedural-generation/features/caves';
import { lakes } from '../infrastructure/procedural-generation/features/lakes';
import { oreVeins } from '../infrastructure/procedural-generation/features/oreVeins';
import { vegetation } from '../infrastructure/procedural-generation/features/vegetation';
import { TerrainGenerator } from '../infrastructure/procedural-generation/generators/TerrainGenerator';

/**
 * Une configuración, contenido y generador para abrir mundos. Forma parte de la raíz de
 * composición, separada de `game.ts` para poder usarla sin Phaser (por ejemplo, en pruebas).
 */
export function createSessionFactory(
  content: GameContent,
  onInventoryChange: () => void,
  /** Azar de la partida (aparición de criaturas, botín); la generación usa la semilla. */
  random: RandomSource,
): WorldSessionFactory {
  const { dimensions, tileSize, terrain } = WORLD_CONFIG;
  const { blocks, biomes } = content;
  const veins = WORLD_CONFIG.ores.map((ore) => ({ ...ore, block: blocks.indexOf(ore.blockId) }));

  return (meta, save) => {
    const seed = meta.seed.value;
    const caves = createCaves(seed, WORLD_CONFIG.caves);
    // Orden: primero se excava, después el mineral (solo en la roca que queda), los lagos
    // en los valles y, por último, la vegetación sobre la superficie seca.
    const features = [
      caves.feature,
      oreVeins(seed, veins),
      lakes,
      vegetation(seed, caves.opensSurfaceNear),
    ];
    return createWorldSession(
      meta,
      {
        content,
        dimensions,
        tileSize,
        playerTuning: PLAYER_TUNING,
        playerMaxHealth: GAMEPLAY_CONFIG.player.maxHealth,
        generator: new TerrainGenerator(seed, dimensions, terrain, biomes, blocks, features),
        tileSimulation: WORLD_CONFIG.tiles,
        inventory: GAMEPLAY_CONFIG.inventory,
        drops: GAMEPLAY_CONFIG.drops,
        reachTiles: GAMEPLAY_CONFIG.interaction.reachTiles,
        handMiningPower: GAMEPLAY_CONFIG.interaction.handMiningPower,
        combat: GAMEPLAY_CONFIG.combat,
        spawning: GAMEPLAY_CONFIG.spawning,
        dayCycle: GAMEPLAY_CONFIG.dayCycle,
        random,
        onInventoryChange,
      },
      save,
    );
  };
}
