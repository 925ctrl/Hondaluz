import { beforeEach, describe, expect, it } from 'vitest';
import { WorldCatalog } from '../../src/application/use-cases/world/WorldCatalog';
import { NotFoundError, ValidationError } from '../../src/core/errors/AppError';
import { DEFAULT_WORLD_NAME, WORLD_NAME_MAX_LENGTH } from '../../src/domain/entities/World';
import { InMemoryWorldRepository } from '../support/InMemoryWorldRepository';
import { InMemoryWorldSaveRepository } from '../support/InMemoryWorldSaveRepository';

describe('WorldCatalog', () => {
  let clock: number;
  let catalog: WorldCatalog;
  let saves: InMemoryWorldSaveRepository;

  beforeEach(() => {
    clock = 1000;
    let nextId = 1;
    saves = new InMemoryWorldSaveRepository();
    catalog = new WorldCatalog({
      repository: new InMemoryWorldRepository(),
      saves,
      now: () => clock,
      random: () => 0.5,
      createId: () => `world-${String(nextId++)}`,
    });
  });

  it('crea un mundo con nombre, semilla y fechas, y lo guarda', async () => {
    const world = await catalog.create({ name: ' Valle ', seed: 'abc' });

    expect(world).toMatchObject({
      id: 'world-1',
      name: 'Valle',
      createdAt: 1000,
      lastPlayedAt: 1000,
    });
    expect(world.seed.text).toBe('abc');
    expect(await catalog.list()).toEqual([world]);
  });

  it('usa valores por defecto cuando nombre y semilla están vacíos', async () => {
    const world = await catalog.create({ name: '', seed: '' });

    expect(world.name).toBe(DEFAULT_WORLD_NAME);
    expect(world.seed.text).toBe('500000000');
  });

  it('no guarda nada si el nombre es inválido', async () => {
    const tooLong = 'x'.repeat(WORLD_NAME_MAX_LENGTH + 1);

    await expect(catalog.create({ name: tooLong, seed: '' })).rejects.toThrow(ValidationError);
    expect(await catalog.list()).toEqual([]);
  });

  it('ordena por última partida y abrir un mundo lo pone primero', async () => {
    const first = await catalog.create({ name: 'Primero', seed: '1' });
    clock = 2000;
    const second = await catalog.create({ name: 'Segundo', seed: '2' });
    expect((await catalog.lastPlayed())?.id).toBe(second.id);

    clock = 3000;
    const opened = await catalog.open(first.id);

    expect(opened.world.lastPlayedAt).toBe(3000);
    expect(opened.save).toBeUndefined();
    expect((await catalog.list()).map((world) => world.id)).toEqual([first.id, second.id]);
  });

  it('falla al abrir un mundo inexistente', async () => {
    await expect(catalog.open('nope')).rejects.toThrow(NotFoundError);
  });

  it('abre un mundo con su partida guardada', async () => {
    const world = await catalog.create({ name: 'Guardado', seed: '' });
    const state = {
      player: { x: 1, y: 2, health: 50 },
      inventory: { slots: [{ itemId: 'dirt', count: 3 }], selected: 0 },
      clock: { day: 2, time: 0.5 },
    };
    await saves.save(world, state, []);
    expect((await catalog.open(world.id)).save?.state).toEqual(state);
  });

  it('borra un mundo junto con su partida guardada', async () => {
    const world = await catalog.create({ name: 'Efímero', seed: '' });
    await saves.save(
      world,
      {
        player: { x: 0, y: 0, health: 1 },
        inventory: { slots: [], selected: 0 },
        clock: { day: 1, time: 0 },
      },
      [],
    );
    await catalog.remove(world.id);

    expect(await catalog.list()).toEqual([]);
    expect(await catalog.lastPlayed()).toBeUndefined();
    expect(await saves.load(world.id)).toBeUndefined();
  });
});
