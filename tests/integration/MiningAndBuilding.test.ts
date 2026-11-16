import { describe, expect, it } from 'vitest';
import type { WorldSession } from '../../src/application/use-cases/world/WorldSession';
import { GAMEPLAY_CONFIG } from '../../src/config/gameplay.config';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { AIR } from '../../src/domain/world/BlockDefinition';
import { content, openSession } from '../support/session';

const { tileSize } = WORLD_CONFIG;
const DT = 1 / 60;
const IDLE = { moveX: 0, jump: false } as const;

/** Bloque sobre el que está de pie el jugador. */
function groundTile(session: WorldSession): { x: number; y: number } {
  const { player } = session;
  return {
    x: Math.floor((player.x + player.width / 2) / tileSize),
    y: Math.floor((player.y + player.height) / tileSize),
  };
}

/** Avanza el mundo: física del jugador y objetos sueltos. */
function settle(session: WorldSession, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) {
    session.player.step(IDLE, DT, session.map, tileSize);
    session.drops.step(DT, session.map, tileSize, session.player, session.inventory);
  }
}

function mineUntilBroken(session: WorldSession, target: { x: number; y: number }): number {
  for (let steps = 1; steps <= 600; steps++) {
    if (session.mining.update(session.player, target, DT)) return steps;
  }
  throw new Error('El bloque no se rompió.');
}

describe('minería', () => {
  it('rompe el bloque tras el tiempo que marca su dureza y muestra el progreso', () => {
    const session = openSession(42);
    const target = groundTile(session);
    const hardness = content.blocks.get('grass').hardness ?? 0;

    session.mining.update(session.player, target, hardness / 2);
    expect(session.mining.current).toMatchObject({ ...target });
    expect(session.mining.current?.progress).toBeCloseTo(0.5);

    const steps = mineUntilBroken(session, target);
    expect(steps * DT).toBeCloseTo(hardness / 2, 1);
    expect(session.map.tileAt(target.x, target.y)).toBe(AIR);
    expect(session.mining.current).toBeNull();
  });

  it('con un pico se mina proporcionalmente más rápido que a mano', () => {
    const byHand = openSession(42);
    const withPickaxe = openSession(42);
    withPickaxe.inventory.add('wood_pickaxe', 1);
    const target = groundTile(byHand);
    const power = content.items.get('wood_pickaxe').tool?.power ?? 0;

    const handSteps = mineUntilBroken(byHand, target);
    const pickaxeSteps = mineUntilBroken(withPickaxe, target);
    expect(handSteps / pickaxeSteps).toBeCloseTo(power, 0);
  });

  it('pierde el progreso al cambiar de bloque o dejar de minar', () => {
    const session = openSession(42);
    const target = groundTile(session);
    session.mining.update(session.player, target, 0.1);
    session.mining.update(session.player, { x: target.x + 1, y: target.y }, 0.01);
    expect(session.mining.current?.x).toBe(target.x + 1);
    session.mining.stop();
    expect(session.mining.current).toBeNull();
  });

  it('no mina bloques lejanos, enterrados, vacíos ni fuera del mundo', () => {
    const session = openSession(42);
    const { x, y } = groundTile(session);
    const reach = GAMEPLAY_CONFIG.interaction.reachTiles;
    expect(session.mining.canMine(session.player, x, y)).toBe(true);
    expect(session.mining.canMine(session.player, x, y + 2)).toBe(false);
    expect(session.mining.canMine(session.player, x, y - 3)).toBe(false);
    expect(session.mining.canMine(session.player, x + reach + 3, y)).toBe(false);
    expect(session.mining.canMine(session.player, x, -1)).toBe(false);
    expect(session.mining.update(session.player, { x, y: y + 2 }, 10)).toBeNull();
    expect(session.map.tileAt(x, y + 2)).not.toBe(AIR);
  });

  it('el botín cae, se recoge solo y se apila en el inventario', () => {
    const session = openSession(42);
    const first = groundTile(session);
    mineUntilBroken(session, first);
    expect(session.drops.items).toHaveLength(1);
    settle(session, 2);
    mineUntilBroken(session, groundTile(session));
    settle(session, 2);

    expect(session.drops.items).toHaveLength(0);
    expect(session.inventory.slot(0)).toEqual({ itemId: 'dirt', count: 2 });
  });
});

describe('construcción', () => {
  /** Sesión con un bloque de tierra en la mano y el jugador dentro de un hoyo de un bloque. */
  function sessionWithDirt(): { session: WorldSession; hole: { x: number; y: number } } {
    const session = openSession(42);
    const hole = groundTile(session);
    mineUntilBroken(session, hole);
    settle(session, 2);
    expect(session.inventory.held()).toEqual({ itemId: 'dirt', count: 1 });
    return { session, hole };
  }

  it('coloca el bloque de la mano, lo gasta y vuelve sólida la casilla', () => {
    const { session, hole } = sessionWithDirt();
    // A la altura de la cabeza, junto al borde del hoyo: aire apoyado en el suelo vecino.
    const spot = { x: hole.x + 1, y: hole.y - 1 };
    expect(session.map.isSolid(spot.x, spot.y)).toBe(false);

    expect(session.building.place(session.player, spot.x, spot.y)).toBe('placed');
    expect(session.map.tileAt(spot.x, spot.y)).toBe(content.blocks.indexOf('dirt'));
    expect(session.map.isSolid(spot.x, spot.y)).toBe(true);
    expect(session.inventory.held()).toBeNull();
  });

  it('rechaza cada colocación inválida sin gastar el objeto', () => {
    const { session, hole } = sessionWithDirt();
    const { player, building } = session;
    const reach = GAMEPLAY_CONFIG.interaction.reachTiles;

    expect(building.place(player, hole.x, hole.y)).toBe('blocked-by-builder');
    expect(building.place(player, hole.x + 1, hole.y)).toBe('occupied');
    expect(building.place(player, hole.x, hole.y - 4)).toBe('no-support');
    expect(building.place(player, hole.x + reach + 3, hole.y - 1)).not.toBe('placed');
    expect(building.place(player, hole.x, -1)).toBe('occupied');
    expect(session.inventory.held()).toEqual({ itemId: 'dirt', count: 1 });

    session.inventory.clear(0);
    expect(building.place(player, hole.x + 1, hole.y - 1)).toBe('nothing-to-place');
  });

  it('el ciclo minar, recoger y colocar deja el mundo como estaba', () => {
    const { session, hole } = sessionWithDirt();
    session.player.y -= tileSize;
    expect(session.building.place(session.player, hole.x, hole.y)).toBe('placed');
    settle(session, 1);
    expect(groundTile(session)).toEqual(hole);
    expect(session.player.grounded).toBe(true);
  });
});
