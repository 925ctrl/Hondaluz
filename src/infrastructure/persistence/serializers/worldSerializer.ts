import { PersistenceError } from '../../../core/errors/AppError';
import type { WorldMeta } from '../../../domain/entities/World';

/** Forma en la que un mundo se guarda en disco. Cambiarla exige subir la versión y migrar. */
export interface WorldRecord {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly seedText: string;
  readonly seedValue: number;
  readonly createdAt: number;
  readonly lastPlayedAt: number;
  readonly playedSeconds: number;
}

export const WORLD_SCHEMA_VERSION = 2;

/**
 * Migraciones de registro: la posición `n` convierte un registro de la versión `n + 1`
 * a la siguiente. Se añaden al final; nunca se editan las existentes.
 */
const MIGRATIONS: readonly ((record: Record<string, unknown>) => Record<string, unknown>)[] = [
  // v1 → v2: llega el tiempo jugado. Los mundos anteriores no lo contaban.
  (record) => ({ ...record, schemaVersion: 2, playedSeconds: 0 }),
];

export function toWorldRecord(world: WorldMeta): WorldRecord {
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    id: world.id,
    name: world.name,
    seedText: world.seed.text,
    seedValue: world.seed.value,
    createdAt: world.createdAt,
    lastPlayedAt: world.lastPlayedAt,
    playedSeconds: world.playedSeconds,
  };
}

/** Valida y migra un registro leído del disco, que se trata como dato no fiable. */
export function fromWorldRecord(raw: unknown): WorldMeta {
  if (typeof raw !== 'object' || raw === null) {
    throw new PersistenceError('Registro de mundo ilegible.');
  }
  let record = raw as Record<string, unknown>;
  const version = record.schemaVersion;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > WORLD_SCHEMA_VERSION
  ) {
    throw new PersistenceError(`Versión de guardado no soportada: ${String(version)}.`);
  }
  for (const migrate of MIGRATIONS.slice(version - 1)) {
    record = migrate(record);
  }
  return {
    id: readString(record, 'id'),
    name: readString(record, 'name'),
    seed: { text: readString(record, 'seedText'), value: readNumber(record, 'seedValue') },
    createdAt: readNumber(record, 'createdAt'),
    lastPlayedAt: readNumber(record, 'lastPlayedAt'),
    playedSeconds: readNumber(record, 'playedSeconds'),
  };
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value === '') {
    throw new PersistenceError(`Registro de mundo corrupto: falta "${key}".`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new PersistenceError(`Registro de mundo corrupto: falta "${key}".`);
  }
  return value;
}
