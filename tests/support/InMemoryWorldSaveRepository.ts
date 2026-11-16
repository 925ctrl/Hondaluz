import type { WorldMeta } from '../../src/domain/entities/World';
import type {
  SavedChunk,
  WorldSave,
  WorldSaveRepository,
  WorldState,
} from '../../src/domain/repositories/WorldSaveRepository';

/** Guardado en memoria para pruebas. Copia lo que recibe, como haría el disco. */
export class InMemoryWorldSaveRepository implements WorldSaveRepository {
  readonly worlds = new Map<string, WorldMeta>();
  private readonly states = new Map<string, WorldState>();
  private readonly chunks = new Map<string, Map<string, SavedChunk>>();
  /** Chunks escritos en cada llamada a `save`, para comprobar que el guardado es incremental. */
  readonly writes: number[] = [];
  failNext = false;

  load(worldId: string): Promise<WorldSave | undefined> {
    const state = this.states.get(worldId);
    if (!state) return Promise.resolve(undefined);
    const chunks = [...(this.chunks.get(worldId)?.values() ?? [])].map((chunk) => ({
      ...chunk,
      tiles: chunk.tiles.slice(),
    }));
    return Promise.resolve({ state: structuredClone(state), chunks });
  }

  save(world: WorldMeta, state: WorldState, chunks: readonly SavedChunk[]): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('Disco lleno'));
    }
    this.writes.push(chunks.length);
    this.worlds.set(world.id, world);
    this.states.set(world.id, structuredClone(state));
    const stored = this.chunks.get(world.id) ?? new Map<string, SavedChunk>();
    for (const chunk of chunks) {
      stored.set(`${String(chunk.chunkX)},${String(chunk.chunkY)}`, {
        ...chunk,
        tiles: chunk.tiles.slice(),
      });
    }
    this.chunks.set(world.id, stored);
    return Promise.resolve();
  }

  delete(worldId: string): Promise<void> {
    this.states.delete(worldId);
    this.chunks.delete(worldId);
    return Promise.resolve();
  }
}
