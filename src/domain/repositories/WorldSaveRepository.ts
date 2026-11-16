import type { WorldMeta } from '../entities/World';
import type { ItemStack } from '../items/ItemDefinition';

/** Bloques de un chunk cambiado, con los índices del registro de bloques actual. */
export interface SavedChunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly tiles: Uint16Array;
}

/** Estado de una partida, aparte de los bloques. */
export interface WorldState {
  readonly player: { readonly x: number; readonly y: number; readonly health: number };
  readonly inventory: {
    readonly slots: readonly (ItemStack | null)[];
    readonly selected: number;
  };
  readonly clock: { readonly day: number; readonly time: number };
}

/** Lo guardado de un mundo: su estado y los chunks que difieren del mundo generado. */
export interface WorldSave {
  readonly state: WorldState;
  readonly chunks: readonly SavedChunk[];
}

/**
 * Puerto del guardado de partidas. Solo se escriben los chunks cambiados desde el último
 * guardado; el resto se regenera con la semilla. Las implementaciones viven en infraestructura.
 */
export interface WorldSaveRepository {
  /** Guardado de un mundo, o `undefined` si aún no se ha guardado nunca. */
  load(worldId: string): Promise<WorldSave | undefined>;
  /** Escribe de una vez la identidad del mundo, su estado y los chunks indicados. */
  save(world: WorldMeta, state: WorldState, chunks: readonly SavedChunk[]): Promise<void>;
  delete(worldId: string): Promise<void>;
}
