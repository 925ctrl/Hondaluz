import type { WorldMeta } from '../../../domain/entities/World';
import type {
  SavedChunk,
  WorldSave,
  WorldSaveRepository,
  WorldState,
} from '../../../domain/repositories/WorldSaveRepository';
import type { BlockRegistry } from '../../../domain/world/BlockDefinition';
import type { WorldDimensions } from '../../../domain/world/WorldDimensions';
import {
  CHUNKS_STORE,
  runMultiTransaction,
  STATES_STORE,
  WORLDS_STORE,
} from '../IndexedDbDatabase';
import {
  fromChunkRecord,
  fromStateRecord,
  toChunkRecord,
  toStateRecord,
} from '../serializers/saveSerializer';
import { toWorldRecord } from '../serializers/worldSerializer';

/** Todos los chunks de un mundo: las claves `[worldId, chunkKey]` de ese mundo. */
const chunksOf = (worldId: string): IDBKeyRange =>
  IDBKeyRange.bound([worldId, -Infinity], [worldId, Infinity]);

/**
 * Partidas guardadas en IndexedDB. Cada guardado escribe la identidad del mundo, su estado y
 * los chunks cambiados en una sola transacción: o queda todo o no queda nada.
 */
export class IndexedDbWorldSaveRepository implements WorldSaveRepository {
  constructor(
    private readonly database: Promise<IDBDatabase>,
    private readonly blocks: BlockRegistry,
    private readonly dimensions: WorldDimensions,
  ) {}

  async load(worldId: string): Promise<WorldSave | undefined> {
    const { state, chunks } = await runMultiTransaction(
      await this.database,
      [STATES_STORE, CHUNKS_STORE],
      'readonly',
      (stores) => {
        const state = stores[STATES_STORE]?.get(worldId);
        const chunks = stores[CHUNKS_STORE]?.getAll(chunksOf(worldId));
        return () => ({
          state: state?.result as unknown,
          chunks: (chunks?.result ?? []) as unknown[],
        });
      },
    );
    if (state === undefined) return undefined;
    return {
      state: fromStateRecord(state),
      chunks: chunks.map((raw) => fromChunkRecord(raw, this.blocks, this.dimensions.chunkSize)),
    };
  }

  async save(world: WorldMeta, state: WorldState, chunks: readonly SavedChunk[]): Promise<void> {
    const { widthChunks } = this.dimensions;
    const chunkRecords = chunks.map((chunk) =>
      toChunkRecord(world.id, chunk.chunkY * widthChunks + chunk.chunkX, chunk, this.blocks),
    );
    await runMultiTransaction(
      await this.database,
      [WORLDS_STORE, STATES_STORE, CHUNKS_STORE],
      'readwrite',
      (stores) => {
        stores[WORLDS_STORE]?.put(toWorldRecord(world));
        stores[STATES_STORE]?.put(toStateRecord(world.id, state));
        for (const record of chunkRecords) stores[CHUNKS_STORE]?.put(record);
        return () => undefined;
      },
    );
  }

  async delete(worldId: string): Promise<void> {
    await runMultiTransaction(
      await this.database,
      [STATES_STORE, CHUNKS_STORE],
      'readwrite',
      (stores) => {
        stores[STATES_STORE]?.delete(worldId);
        stores[CHUNKS_STORE]?.delete(chunksOf(worldId));
        return () => undefined;
      },
    );
  }
}
