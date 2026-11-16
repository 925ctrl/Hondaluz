import type { WorldSession } from '../../application/use-cases/world/WorldSession';
import { GAMEPLAY_CONFIG } from '../../config/gameplay.config';
import type { GameContent } from '../../domain/catalog/GameContent';

/** Ganchos para que las pruebas de navegador preparen situaciones sin jugar minutos enteros. */
export interface DebugHooks {
  /** Avanza el reloj hasta la hora indicada, como fracción del día (0 es medianoche). */
  setTime(fraction: number): void;
  give(itemId: string, count: number): void;
  /** Hace aparecer una criatura sobre el suelo, a `dxTiles` bloques del jugador. */
  spawn(enemyId: string, dxTiles: number): void;
  /** Ids de las criaturas vivas. */
  enemyIds(): string[];
}

declare global {
  interface Window {
    hondaluz?: DebugHooks;
  }
}

/**
 * Instala los ganchos en `window.hondaluz`. Solo se usa con `?e2e` en la dirección, y nada del
 * juego depende de ellos. Devuelve la función que los retira.
 */
export function installDebugHooks(session: WorldSession, content: GameContent): () => void {
  const { clock, inventory, enemies, player, map, tileSize } = session;
  window.hondaluz = {
    setTime: (fraction) => {
      const ahead = (((fraction - clock.time) % 1) + 1) % 1;
      clock.advance(ahead * GAMEPLAY_CONFIG.dayCycle.dayLengthSeconds);
    },
    give: (itemId, count) => {
      inventory.add(itemId, count);
    },
    spawn: (enemyId, dxTiles) => {
      const definition = content.enemies.get(enemyId);
      const tileX = Math.floor((player.x + player.width / 2) / tileSize) + dxTiles;
      let tileY = Math.floor(player.y / tileSize) - 4;
      while (!map.isSolid(tileX, tileY + 1)) tileY++;
      const x = tileX * tileSize + (tileSize - definition.width) / 2;
      enemies.add(definition, x, (tileY + 1) * tileSize - definition.height);
    },
    enemyIds: () => enemies.all.map((enemy) => enemy.definition.id),
  };
  return () => {
    delete window.hondaluz;
  };
}
