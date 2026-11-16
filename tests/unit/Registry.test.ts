import { describe, expect, it } from 'vitest';
import { BLOCK_DEFINITIONS } from '../../src/content/blocks';
import { ContentError } from '../../src/core/errors/ContentError';
import { Registry } from '../../src/core/registry/Registry';
import { AIR, createBlockRegistry } from '../../src/domain/world/BlockDefinition';

describe('Registry', () => {
  const registry = new Registry('cosa', [{ id: 'a' }, { id: 'b_2' }]);

  it('resuelve definiciones por id e índice', () => {
    expect(registry.get('b_2')).toEqual({ id: 'b_2' });
    expect(registry.indexOf('b_2')).toBe(1);
    expect(registry.at(0)).toEqual({ id: 'a' });
    expect(registry.has('zzz')).toBe(false);
  });

  it('falla con ids desconocidos, duplicados o mal formados', () => {
    expect(() => registry.get('zzz')).toThrow(ContentError);
    expect(() => new Registry('cosa', [{ id: 'a' }, { id: 'a' }])).toThrow(/duplicado/);
    expect(() => new Registry('cosa', [{ id: 'Nombre Visual' }])).toThrow(/inválido/);
  });
});

describe('createBlockRegistry', () => {
  it('acepta el contenido del juego con el aire en el índice 0', () => {
    const blocks = createBlockRegistry(BLOCK_DEFINITIONS);
    expect(blocks.indexOf('air')).toBe(AIR);
    expect(blocks.get('stone').solid).toBe(true);
  });

  it('exige que el aire vaya primero y que los sólidos tengan aspecto', () => {
    expect(() => createBlockRegistry([{ id: 'dirt', name: 'Tierra', solid: false }])).toThrow(
      ContentError,
    );
    expect(() =>
      createBlockRegistry([
        { id: 'air', name: 'Aire', solid: false },
        { id: 'ghost', name: 'Fantasma', solid: true },
      ]),
    ).toThrow(/aspecto/);
  });
});
