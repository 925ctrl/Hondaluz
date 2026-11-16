import { describe, expect, it } from 'vitest';
import { hashString, mulberry32 } from '../../src/core/utils/random';

describe('random', () => {
  it('produce la misma secuencia con la misma semilla', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b));
  });

  it('produce secuencias distintas con semillas distintas', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('genera valores en [0, 1)', () => {
    const random = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('calcula un hash estable de 32 bits sin signo', () => {
    // Valor fijado: si cambia, las semillas de texto generarían mundos distintos.
    expect(hashString('hondaluz')).toBe(hashString('hondaluz'));
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('hondaluz')).not.toBe(hashString('hondaluZ'));
  });
});
