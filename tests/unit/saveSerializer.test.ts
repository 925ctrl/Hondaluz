import { describe, expect, it, vi } from 'vitest';
import { PersistenceError } from '../../src/core/errors/AppError';
import { createBlockRegistry } from '../../src/domain/world/BlockDefinition';
import {
  CHUNK_SCHEMA_VERSION,
  fromChunkRecord,
  fromStateRecord,
  STATE_SCHEMA_VERSION,
  toChunkRecord,
  toStateRecord,
} from '../../src/infrastructure/persistence/serializers/saveSerializer';

const visual = { base: 0, shade: 0, highlight: 0, grain: 'fine' } as const;
const air = { id: 'air', name: 'Aire', solid: false };
const dirt = { id: 'dirt', name: 'Tierra', solid: true, visual };
const stone = { id: 'stone', name: 'Piedra', solid: true, visual };
const blocks = createBlockRegistry([air, dirt, stone]);
const SIZE = 4;

const state = {
  player: { x: 120.5, y: 64, health: 73 },
  inventory: {
    slots: [{ itemId: 'dirt', count: 12 }, null, { itemId: 'torch', count: 3 }],
    selected: 2,
  },
  clock: { day: 3, time: 0.75 },
};

describe('saveSerializer: estado', () => {
  it('recupera el mismo estado tras guardarlo', () => {
    const record = toStateRecord('w', state);
    expect(record.schemaVersion).toBe(STATE_SCHEMA_VERSION);
    expect(fromStateRecord(structuredClone(record))).toEqual(state);
  });

  it.each([
    null,
    { ...toStateRecord('w', state), schemaVersion: STATE_SCHEMA_VERSION + 1 },
    { ...toStateRecord('w', state), player: { x: 'a', y: 0, health: 1 } },
    { ...toStateRecord('w', state), clock: { day: 0, time: 0.2 } },
    { ...toStateRecord('w', state), clock: { day: 1, time: 1 } },
    {
      ...toStateRecord('w', state),
      inventory: { slots: [{ itemId: 'dirt', count: 0 }], selected: 0 },
    },
    { ...toStateRecord('w', state), inventory: { slots: 'x', selected: 0 } },
  ])('rechaza estados corruptos o de una versión futura: %j', (record) => {
    expect(() => fromStateRecord(record)).toThrow(PersistenceError);
  });
});

describe('saveSerializer: chunks', () => {
  const tiles = Uint16Array.from({ length: SIZE * SIZE }, (_, i) => (i < 4 ? 0 : i < 10 ? 1 : 2));

  it('guarda los bloques por id y los recupera con los índices actuales', () => {
    const record = toChunkRecord('w', 9, { chunkX: 1, chunkY: 2, tiles }, blocks);
    expect(record.schemaVersion).toBe(CHUNK_SCHEMA_VERSION);
    expect(record.palette).toEqual(['air', 'dirt', 'stone']);
    // Un registro de bloques reordenado sigue leyendo los mismos bloques.
    const reordered = createBlockRegistry([air, stone, dirt]);
    const loaded = fromChunkRecord(structuredClone(record), reordered, SIZE);
    expect(loaded.chunkX).toBe(1);
    expect(loaded.chunkY).toBe(2);
    expect([...loaded.tiles].map((index) => reordered.at(index).id)).toEqual(
      [...tiles].map((index) => blocks.at(index).id),
    );
  });

  it('cambia por aire los bloques que el juego ya no tiene', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const record = toChunkRecord('w', 0, { chunkX: 0, chunkY: 0, tiles }, blocks);
    const withoutStone = createBlockRegistry([air, dirt]);
    const loaded = fromChunkRecord(record, withoutStone, SIZE);
    expect(loaded.tiles.filter((tile) => tile === 0).length).toBe(4 + 6);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it.each([
    { chunkX: 0, chunkY: 0, palette: ['air'], tiles: new Uint16Array(3) },
    { chunkX: 0, chunkY: 0, palette: ['air'], tiles: Uint16Array.from({ length: 16 }, () => 5) },
    { chunkX: 0, chunkY: 0, palette: [7], tiles: new Uint16Array(16) },
    { chunkX: 0.5, chunkY: 0, palette: ['air'], tiles: new Uint16Array(16) },
  ])('rechaza chunks corruptos', (fields) => {
    expect(() =>
      fromChunkRecord({ schemaVersion: 1, worldId: 'w', key: 0, ...fields }, blocks, SIZE),
    ).toThrow(PersistenceError);
  });
});
