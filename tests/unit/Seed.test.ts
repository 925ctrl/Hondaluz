import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors/AppError';
import { hashString } from '../../src/core/utils/random';
import { createSeed, SEED_MAX_LENGTH } from '../../src/domain/value-objects/Seed';

const neverRandom = (): number => {
  throw new Error('No debería pedirse un valor aleatorio.');
};

describe('createSeed', () => {
  it('conserva el texto recortado y deriva de él el valor numérico', () => {
    const seed = createSeed('  cueva azul ', neverRandom);
    expect(seed).toEqual({ text: 'cueva azul', value: hashString('cueva azul') });
  });

  it('genera una semilla numérica cuando el texto está vacío', () => {
    const seed = createSeed('   ', () => 0.123456789);
    expect(seed.text).toBe('123456789');
    expect(seed.value).toBe(hashString('123456789'));
  });

  it('rechaza semillas demasiado largas', () => {
    expect(() => createSeed('x'.repeat(SEED_MAX_LENGTH + 1), neverRandom)).toThrow(ValidationError);
  });
});
