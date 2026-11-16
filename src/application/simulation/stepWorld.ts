import type { WorldSession } from '../use-cases/world/WorldSession';

/**
 * Avanza un paso todo lo que vive en el mundo además del jugador, en un orden fijo:
 * bloques que se mueven (agua y arena), objetos sueltos, criaturas, combate, aparición de
 * criaturas y reloj.
 * El jugador se mueve antes, con su entrada, en la capa de presentación.
 */
export function stepWorld(session: WorldSession, dt: number): void {
  const { map, player, drops, enemies, combat, spawner, clock, tileSize } = session;
  session.tiles.update(dt);
  drops.step(dt, map, tileSize, player, session.inventory, (itemId) => {
    session.happenings.push({ kind: 'item-picked', itemId });
  });
  enemies.step({
    dt,
    tiles: map,
    tileSize,
    target: player.health.isDead ? null : player,
    random: session.random,
    worldWidth: map.dimensions.widthChunks * map.dimensions.chunkSize * tileSize,
    worldHeight: map.dimensions.heightChunks * map.dimensions.chunkSize * tileSize,
  });
  combat.update(dt);
  spawner.update(dt);
  clock.advance(dt);
}
