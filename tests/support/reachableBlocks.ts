import { GAMEPLAY_CONFIG } from '../../src/config/gameplay.config';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { hashString } from '../../src/core/utils/random';
import { tileWithinReach } from '../../src/domain/rules/reach';
import { content, openSession } from './session';

/**
 * Bloques de un tipo que el jugador alcanza desde el punto de aparición de un mundo,
 * como desplazamientos en bloques respecto al bloque que pisa. Usa el generador real,
 * así las pruebas de navegador saben dónde apuntar sin depender de capturas.
 */
export function reachableFromSpawn(
  seedText: string,
  blockId: string,
): { dx: number; dy: number }[] {
  const { tileSize } = WORLD_CONFIG;
  const reach = GAMEPLAY_CONFIG.interaction.reachTiles;
  const { player, map } = openSession(hashString(seedText));
  const block = content.blocks.indexOf(blockId);
  const feetX = Math.floor((player.x + player.width / 2) / tileSize);
  const groundY = Math.floor((player.y + player.height) / tileSize);
  const found: { dx: number; dy: number }[] = [];
  for (let dy = -reach - 2; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const x = feetX + dx;
      const y = groundY + dy;
      if (map.tileAt(x, y) === block && tileWithinReach(player, x, y, tileSize, reach)) {
        found.push({ dx, dy });
      }
    }
  }
  return found;
}
