import { describe, expect, it } from 'vitest';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { overlapsSolid } from '../../src/domain/physics/tileCollision';
import { chunkRangeForRect, expandRange } from '../../src/domain/world/ChunkRange';
import { stepWorld } from '../../src/application/simulation/stepWorld';
import { content, openSession } from '../support/session';

const { tileSize, dimensions } = WORLD_CONFIG;

describe('WorldSession', () => {
  it('coloca al jugador de pie sobre la superficie, en seco y en el bioma de aparición', () => {
    for (const seed of [1, 42, 987654321]) {
      const { player, map } = openSession(seed);
      expect(overlapsSolid(player, map, tileSize)).toBe(false);
      player.step({ moveX: 0, jump: false }, 1 / 60, map, tileSize);
      expect(player.grounded).toBe(true);
      expect(player.submerged).toBe(false);
      const tileX = Math.floor((player.x + player.width / 2) / tileSize);
      expect(map.biomeAt(tileX, Math.floor(player.y / tileSize)).id).toBe('forest');
    }
  });

  it('el agua fluye hacia un hueco abierto junto a un lago y se puede construir dentro', () => {
    const session = openSession(42);
    const { map, building, player, inventory } = session;
    const water = content.blocks.indexOf('water');
    // Un estanque de 3×2 en un hoyo de piedra, con un canal abierto a su derecha.
    const baseX = Math.floor(player.x / tileSize) + 2;
    const baseY = Math.floor((player.y + player.height) / tileSize);
    for (let x = baseX - 1; x <= baseX + 5; x++) {
      for (let y = baseY - 3; y <= baseY + 3; y++)
        map.setTile(x, y, content.blocks.indexOf('stone'));
    }
    for (let x = baseX; x < baseX + 3; x++) {
      for (let y = baseY; y < baseY + 2; y++) map.setTile(x, y, water);
    }
    map.setTile(baseX + 3, baseY + 1, 0);
    map.setTile(baseX + 4, baseY + 1, 0);
    const volume = (): number => {
      let count = 0;
      for (let x = baseX - 1; x <= baseX + 5; x++) {
        for (let y = baseY - 3; y <= baseY + 3; y++) if (map.tileAt(x, y) === water) count++;
      }
      return count;
    };
    for (let step = 0; step < 60 * 5; step++) stepWorld(session, 1 / 60);
    // El agua se conserva, entra en el canal empujada por la de arriba y se queda quieta.
    expect(volume()).toBe(6);
    expect(map.tileAt(baseX + 3, baseY + 1)).toBe(water);
    expect(session.tiles.activeCount).toBe(0);

    inventory.add('dirt', 1);
    inventory.select(0);
    const target = { x: baseX + 1, y: baseY };
    player.x = (target.x - 2) * tileSize;
    player.y = (baseY - 3) * tileSize - player.height;
    expect(building.place(player, target.x, target.y)).toBe('placed');
    expect(map.tileAt(target.x, target.y)).toBe(content.blocks.indexOf('dirt'));
  });

  it.each([1, 42, 987654321])(
    'el jugador recorre el terreno de la semilla %i sin atravesar bloques',
    (seed) => {
      const { player, map } = openSession(seed);
      const startX = player.x;
      for (let step = 0; step < 60 * 40; step++) {
        // Camina a la derecha y salta siempre que algo le corta el paso.
        const stuck = player.grounded && player.vx === 0;
        player.step({ moveX: 1, jump: stuck }, 1 / 60, map, tileSize);
        expect(overlapsSolid(player, map, tileSize)).toBe(false);
      }
      // Avanza un buen trecho aunque acabe cayendo por una boca de cueva, de la que este
      // caminante sencillo no sabe salir.
      expect(player.x - startX).toBeGreaterThan(100 * tileSize);
    },
  );

  it('mantiene acotados los chunks en memoria al descartar los lejanos', () => {
    const { player, map } = openSession(7);
    const chunkPixels = dimensions.chunkSize * tileSize;
    for (let step = 0; step < 60 * 40; step++) {
      player.step({ moveX: 1, jump: player.vx === 0 }, 1 / 60, map, tileSize);
      const view = { x: player.x - 240, y: player.y - 135, width: 480, height: 270 };
      const visible = chunkRangeForRect(view, chunkPixels, 128, dimensions);
      map.evictOutside(expandRange(visible, 2, dimensions));
      expect(map.loadedChunkCount).toBeLessThanOrEqual(42);
    }
  });
});
