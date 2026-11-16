import { ValidationError } from '../../core/errors/AppError';
import type { Seed } from '../value-objects/Seed';

export const WORLD_NAME_MAX_LENGTH = 24;
export const DEFAULT_WORLD_NAME = 'Mundo nuevo';

/** Datos de identidad de un mundo. El terreno y el jugador se guardan aparte (`WorldSave`). */
export interface WorldMeta {
  readonly id: string;
  readonly name: string;
  readonly seed: Seed;
  readonly createdAt: number;
  readonly lastPlayedAt: number;
  /** Segundos de partida acumulados, para mostrarlos en la lista de mundos. */
  readonly playedSeconds: number;
}

export function normalizeWorldName(input: string): string {
  const name = input.trim() === '' ? DEFAULT_WORLD_NAME : input.trim();
  if (name.length > WORLD_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `El nombre no puede superar los ${String(WORLD_NAME_MAX_LENGTH)} caracteres.`,
    );
  }
  return name;
}
