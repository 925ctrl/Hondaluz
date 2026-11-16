import { ValidationError } from '../../core/errors/AppError';
import { hashString, type RandomSource } from '../../core/utils/random';

export const SEED_MAX_LENGTH = 32;

/** Semilla de un mundo: el texto que ve el jugador y el entero que alimenta la generación. */
export interface Seed {
  readonly text: string;
  readonly value: number;
}

/** Crea una semilla a partir del texto introducido; si está vacío, genera una aleatoria. */
export function createSeed(input: string, random: RandomSource): Seed {
  const trimmed = input.trim();
  if (trimmed.length > SEED_MAX_LENGTH) {
    throw new ValidationError(
      `La semilla no puede superar los ${String(SEED_MAX_LENGTH)} caracteres.`,
    );
  }
  const text = trimmed === '' ? String(Math.floor(random() * 1_000_000_000)) : trimmed;
  return { text, value: hashString(text) };
}
