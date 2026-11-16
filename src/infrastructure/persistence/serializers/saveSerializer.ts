import { PersistenceError } from '../../../core/errors/AppError';
import type { ItemStack } from '../../../domain/items/ItemDefinition';
import type { SavedChunk, WorldState } from '../../../domain/repositories/WorldSaveRepository';
import { AIR, type BlockRegistry } from '../../../domain/world/BlockDefinition';

/** Estado de una partida tal como se guarda. Cambiarlo exige subir la versión y migrar. */
export interface StateRecord extends WorldState {
  readonly schemaVersion: number;
  readonly worldId: string;
}

/**
 * Chunk tal como se guarda: los bloques se refieren a `palette`, la lista de ids de bloque que
 * usa el chunk, y no al índice en memoria, que cambia al añadir o reordenar bloques.
 */
export interface ChunkRecord {
  readonly schemaVersion: number;
  readonly worldId: string;
  /** Clave del chunk dentro del mundo: `chunkY * anchoEnChunks + chunkX`. */
  readonly key: number;
  readonly chunkX: number;
  readonly chunkY: number;
  readonly palette: readonly string[];
  readonly tiles: Uint16Array;
}

export const STATE_SCHEMA_VERSION = 1;
export const CHUNK_SCHEMA_VERSION = 1;

type Migration = (record: Record<string, unknown>) => Record<string, unknown>;
/** Migraciones de estado y de chunk: la posición `n` lleva de la versión `n + 1` a la siguiente. */
const STATE_MIGRATIONS: readonly Migration[] = [];
const CHUNK_MIGRATIONS: readonly Migration[] = [];

export function toStateRecord(worldId: string, state: WorldState): StateRecord {
  return { schemaVersion: STATE_SCHEMA_VERSION, worldId, ...state };
}

/** Valida y migra un estado leído del disco, que se trata como dato no fiable. */
export function fromStateRecord(raw: unknown): WorldState {
  const record = migrate(raw, STATE_SCHEMA_VERSION, STATE_MIGRATIONS, 'estado');
  const player = readObject(record, 'player');
  const inventory = readObject(record, 'inventory');
  const clock = readObject(record, 'clock');
  const slots = inventory.slots;
  if (!Array.isArray(slots)) throw corrupt('inventory.slots');
  const day = readNumber(clock, 'day');
  const time = readNumber(clock, 'time');
  if (!Number.isInteger(day) || day < 1 || time < 0 || time >= 1) throw corrupt('clock');
  const selected = readNumber(inventory, 'selected');
  if (!Number.isInteger(selected)) throw corrupt('inventory.selected');
  return {
    player: {
      x: readNumber(player, 'x'),
      y: readNumber(player, 'y'),
      health: Math.max(0, readNumber(player, 'health')),
    },
    inventory: { slots: slots.map(readSlot), selected },
    clock: { day, time },
  };
}

export function toChunkRecord(
  worldId: string,
  key: number,
  chunk: SavedChunk,
  blocks: BlockRegistry,
): ChunkRecord {
  const palette: string[] = [];
  const paletteIndex = new Map<number, number>();
  const tiles = new Uint16Array(chunk.tiles.length);
  chunk.tiles.forEach((block, index) => {
    let entry = paletteIndex.get(block);
    if (entry === undefined) {
      entry = palette.length;
      paletteIndex.set(block, entry);
      palette.push(blocks.at(block).id);
    }
    tiles[index] = entry;
  });
  return {
    schemaVersion: CHUNK_SCHEMA_VERSION,
    worldId,
    key,
    chunkX: chunk.chunkX,
    chunkY: chunk.chunkY,
    palette,
    tiles,
  };
}

/**
 * Valida y migra un chunk leído del disco y traduce sus ids de bloque a los índices actuales.
 * Un bloque que el juego ya no tiene se convierte en aire, con un aviso.
 */
export function fromChunkRecord(
  raw: unknown,
  blocks: BlockRegistry,
  chunkSize: number,
): SavedChunk {
  const record = migrate(raw, CHUNK_SCHEMA_VERSION, CHUNK_MIGRATIONS, 'chunk');
  const chunkX = readNumber(record, 'chunkX');
  const chunkY = readNumber(record, 'chunkY');
  const { palette, tiles } = record;
  if (!Number.isInteger(chunkX) || !Number.isInteger(chunkY)) throw corrupt('chunkX/chunkY');
  if (!Array.isArray(palette) || !palette.every((id) => typeof id === 'string')) {
    throw corrupt('palette');
  }
  if (!(tiles instanceof Uint16Array) || tiles.length !== chunkSize * chunkSize) {
    throw corrupt('tiles');
  }
  const indices = palette.map((id: string) => {
    if (blocks.has(id)) return blocks.indexOf(id);
    console.warn(`Un chunk guardado usa un bloque que ya no existe: "${id}". Se cambia por aire.`);
    return AIR;
  });
  const resolved = new Uint16Array(tiles.length);
  tiles.forEach((entry, index) => {
    const block = indices[entry];
    if (block === undefined) throw corrupt('tiles');
    resolved[index] = block;
  });
  return { chunkX, chunkY, tiles: resolved };
}

function migrate(
  raw: unknown,
  current: number,
  migrations: readonly Migration[],
  kind: string,
): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    throw new PersistenceError(`Registro de ${kind} ilegible.`);
  }
  let record = raw as Record<string, unknown>;
  const version = record.schemaVersion;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > current
  ) {
    throw new PersistenceError(`Versión de ${kind} guardado no soportada: ${String(version)}.`);
  }
  for (const step of migrations.slice(version - 1)) record = step(record);
  return record;
}

function readSlot(raw: unknown): ItemStack | null {
  if (raw === null) return null;
  if (typeof raw !== 'object') throw corrupt('inventory.slots');
  const slot = raw as Record<string, unknown>;
  const { itemId, count } = slot;
  if (typeof itemId !== 'string' || itemId === '') throw corrupt('inventory.slots');
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    throw corrupt('inventory.slots');
  }
  return { itemId, count };
}

function readObject(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (typeof value !== 'object' || value === null) throw corrupt(key);
  return value as Record<string, unknown>;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw corrupt(key);
  return value;
}

const corrupt = (key: string): PersistenceError =>
  new PersistenceError(`Partida guardada corrupta: "${key}" no es válido.`);
