import { describe, expect, it, vi } from 'vitest';
import { stepWorld } from '../../src/application/simulation/stepWorld';
import { WorldSaver } from '../../src/application/use-cases/world/WorldSaver';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { AIR } from '../../src/domain/world/BlockDefinition';
import { InMemoryWorldSaveRepository } from '../support/InMemoryWorldSaveRepository';
import { content, openSession } from '../support/session';

const { tileSize, dimensions } = WORLD_CONFIG;
const SEED = 42;

function play() {
  const session = openSession(SEED);
  const { map, player, inventory } = session;
  const feetX = Math.floor((player.x + player.width / 2) / tileSize);
  const groundY = Math.floor((player.y + player.height) / tileSize);
  // Cava junto al jugador, pone una antorcha lejos (otro chunk) y llena el inventario.
  map.setTile(feetX + 2, groundY, AIR);
  map.setTile(feetX + 40, groundY - 1, content.blocks.indexOf('torch'));
  inventory.add('dirt', 5);
  inventory.add('torch', 3);
  inventory.select(1);
  player.health.damage(30, 0);
  for (let step = 0; step < 60 * 3; step++) {
    player.step({ moveX: 1, jump: false }, 1 / 60, map, tileSize);
    stepWorld(session, 1 / 60);
  }
  return {
    session,
    cells: [
      [feetX + 2, groundY],
      [feetX + 40, groundY - 1],
    ] as const,
  };
}

describe('guardado de partidas', () => {
  it('al volver a abrir el mundo, todo está como se dejó', async () => {
    const { session, cells } = play();
    const saves = new InMemoryWorldSaveRepository();
    const saver = new WorldSaver(session, saves, { intervalSeconds: 60 }, () => undefined);
    saver.update(42);
    await saver.save();

    const save = await saves.load('w');
    expect(save).toBeDefined();
    const restored = openSession(SEED, () => undefined, save);
    for (const [x, y] of cells) expect(restored.map.tileAt(x, y)).toBe(session.map.tileAt(x, y));
    expect(restored.player.x).toBe(session.player.x);
    expect(restored.player.y).toBe(session.player.y);
    expect(restored.player.health.current).toBe(session.player.health.current);
    expect(restored.inventory.snapshot()).toEqual(session.inventory.snapshot());
    expect(restored.inventory.selectedIndex).toBe(1);
    expect(restored.clock.day).toBe(session.clock.day);
    expect(restored.clock.time).toBe(session.clock.time);
    expect(saves.worlds.get('w')?.playedSeconds).toBe(42);
  });

  it('solo escribe los chunks cambiados desde el último guardado', async () => {
    const { session, cells } = play();
    const saves = new InMemoryWorldSaveRepository();
    const saver = new WorldSaver(session, saves, { intervalSeconds: 60 }, () => undefined);
    await saver.save();
    await saver.save();
    const [x, y] = cells[0];
    session.map.setTile(x, y, content.blocks.indexOf('dirt'));
    await saver.save();
    expect(saves.writes).toEqual([2, 0, 1]);
  });

  it('guarda solo al cumplirse el intervalo', async () => {
    const { session } = play();
    const saves = new InMemoryWorldSaveRepository();
    const saver = new WorldSaver(session, saves, { intervalSeconds: 10 }, () => undefined);
    saver.update(9);
    await Promise.resolve();
    expect(saves.writes).toEqual([]);
    saver.update(1);
    await vi.waitFor(() => {
      expect(saves.writes).toHaveLength(1);
    });
  });

  it('si un guardado falla, avisa y el siguiente vuelve a incluir sus chunks', async () => {
    const { session } = play();
    const saves = new InMemoryWorldSaveRepository();
    const errors: unknown[] = [];
    const saver = new WorldSaver(session, saves, { intervalSeconds: 60 }, (e) => errors.push(e));
    saves.failNext = true;
    await saver.save();
    expect(errors).toHaveLength(1);
    await saver.save();
    expect(saves.writes).toEqual([2]);
  });

  it('quien guardó caído vuelve a empezar en el punto de aparición', async () => {
    const { session } = play();
    session.player.health.damage(1000, 0);
    const saves = new InMemoryWorldSaveRepository();
    await new WorldSaver(session, saves, { intervalSeconds: 60 }, () => undefined).save();
    const restored = openSession(SEED, () => undefined, await saves.load('w'));
    const fresh = openSession(SEED);
    expect(restored.player.x).toBe(fresh.player.x);
    expect(restored.player.health.current).toBe(restored.player.health.max);
  });

  it('copiar lo que se guarda no detiene el juego, aunque haya muchos chunks cambiados', () => {
    const session = openSession(SEED);
    const { map } = session;
    // Un bloque cambiado en cada uno de 200 chunks.
    for (let i = 0; i < 200; i++) {
      const chunkX = i % dimensions.widthChunks;
      const chunkY = 2 + Math.floor(i / dimensions.widthChunks);
      map.setTile(chunkX * dimensions.chunkSize, chunkY * dimensions.chunkSize, AIR);
    }
    const saver = new WorldSaver(
      session,
      new InMemoryWorldSaveRepository(),
      { intervalSeconds: 60 },
      () => undefined,
    );
    const start = performance.now();
    void saver.save();
    // La parte síncrona (la que ocupa el frame) es solo copiar: muy por debajo de un frame.
    expect(performance.now() - start).toBeLessThan(8);
    expect(map.unsavedChunkCount).toBe(0);
  });
});
