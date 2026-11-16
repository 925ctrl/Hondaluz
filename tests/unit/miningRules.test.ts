import { describe, expect, it } from 'vitest';
import { blocksNear } from '../../src/domain/rules/nearbyBlocks';
import { miningPower } from '../../src/domain/rules/mining';
import type { BlockDefinition } from '../../src/domain/world/BlockDefinition';

const block = (extra: Partial<BlockDefinition>): BlockDefinition => ({
  id: 'b',
  name: 'B',
  solid: true,
  hardness: 1,
  ...extra,
});
const pickaxe = (tier: number, power: number) => ({ kind: 'pickaxe', tier, power }) as const;
const HAND = 1;

describe('miningPower', () => {
  it('usa la potencia de la mano si no hay herramienta o no es la adecuada', () => {
    expect(miningPower(block({ tool: 'pickaxe' }), undefined, HAND)).toBe(HAND);
    expect(miningPower(block({}), pickaxe(3, 9), HAND)).toBe(HAND);
  });

  it('usa la potencia de la herramienta cuando es del tipo que trabaja el bloque', () => {
    expect(miningPower(block({ tool: 'pickaxe' }), pickaxe(1, 2), HAND)).toBe(2);
  });

  it('no permite minar si no se alcanza el nivel exigido', () => {
    const ore = block({ tool: 'pickaxe', minToolTier: 2 });
    expect(miningPower(ore, undefined, HAND)).toBe(0);
    expect(miningPower(ore, pickaxe(1, 2), HAND)).toBe(0);
    expect(miningPower(ore, pickaxe(2, 3.5), HAND)).toBe(3.5);
    expect(miningPower(ore, pickaxe(3, 5), HAND)).toBe(5);
  });
});

describe('blocksNear', () => {
  const map = {
    tileAt: (x: number, y: number): number => (x === 3 && y === 0 ? 7 : x === 30 ? 8 : 0),
  };
  const box = { x: 0, y: 0, width: 10, height: 25 };

  it('encuentra solo los bloques buscados que están al alcance', () => {
    expect([...blocksNear(map, box, 16, 5, new Set([7, 8]))]).toEqual([7]);
    expect(blocksNear(map, box, 16, 5, new Set([9])).size).toBe(0);
    expect(blocksNear(map, { ...box, x: 30 * 16 }, 16, 5, new Set([7, 8]))).toEqual(new Set([8]));
  });
});
