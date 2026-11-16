import { describe, expect, it } from 'vitest';
import { PersistenceError } from '../../src/core/errors/AppError';
import type { WorldMeta } from '../../src/domain/entities/World';
import {
  fromWorldRecord,
  toWorldRecord,
  WORLD_SCHEMA_VERSION,
} from '../../src/infrastructure/persistence/serializers/worldSerializer';

const world: WorldMeta = {
  id: 'w-1',
  name: 'Valle',
  seed: { text: 'abc', value: 42 },
  createdAt: 1000,
  lastPlayedAt: 2000,
  playedSeconds: 75,
};

describe('worldSerializer', () => {
  it('recupera el mismo mundo tras serializar y deserializar', () => {
    expect(fromWorldRecord(toWorldRecord(world))).toEqual(world);
  });

  it('marca los registros con la versión actual del formato', () => {
    expect(toWorldRecord(world).schemaVersion).toBe(WORLD_SCHEMA_VERSION);
  });

  it('migra un registro de la versión 1, de antes de contar el tiempo jugado', () => {
    const v1 = {
      schemaVersion: 1,
      id: 'w-1',
      name: 'Valle',
      seedText: 'abc',
      seedValue: 42,
      createdAt: 1000,
      lastPlayedAt: 2000,
    };
    expect(fromWorldRecord(v1)).toEqual({ ...world, playedSeconds: 0 });
  });

  it('rechaza registros de una versión futura', () => {
    const record = { ...toWorldRecord(world), schemaVersion: WORLD_SCHEMA_VERSION + 1 };
    expect(() => fromWorldRecord(record)).toThrow(PersistenceError);
  });

  it.each([
    null,
    'texto',
    {},
    { ...toWorldRecord(world), name: 7 },
    { ...toWorldRecord(world), seedValue: 'x' },
  ])('rechaza registros corruptos: %j', (record) => {
    expect(() => fromWorldRecord(record)).toThrow(PersistenceError);
  });
});
