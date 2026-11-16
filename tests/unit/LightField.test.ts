import { describe, expect, it } from 'vitest';
import { MAX_LIGHT } from '../../src/domain/world/BlockDefinition';
import { LightField } from '../../src/domain/world/LightField';
import { TRAITS, worldFromRows } from '../support/worldFromRows';

const emission = TRAITS.map((block) => block.light ?? 0);
const solid = TRAITS.map((block) => block.solid);
const settings = { solidFalloff: 3 };

function lightOf(rows: readonly string[], skyRows: number): LightField {
  const map = worldFromRows(rows, skyRows);
  return LightField.compute(
    map,
    emission,
    solid,
    { x: 0, y: 0, width: rows[0]?.length ?? 0, height: rows.length },
    settings,
  );
}

describe('LightField', () => {
  it('el cielo ilumina por completo las columnas abiertas y baja por un pozo', () => {
    const field = lightOf(['.....', '##.##', '##.##', '##.##', '#####'], 1);
    expect(field.skyAt(0, 0)).toBe(MAX_LIGHT);
    expect(field.skyAt(2, 3)).toBe(MAX_LIGHT);
    // Al entrar en la roca la luz se pierde deprisa.
    expect(field.skyAt(1, 2)).toBe(MAX_LIGHT - settings.solidFalloff);
  });

  it('una cueva cerrada queda a oscuras', () => {
    const rows = [
      '.'.repeat(20),
      ...Array.from({ length: 18 }, (_, y) =>
        y > 10 && y < 14 ? '###....#############' : '#'.repeat(20),
      ),
    ];
    const field = lightOf(rows, 1);
    expect(field.skyAt(5, 12)).toBe(0);
  });

  it('una antorcha ilumina a su alrededor perdiendo un nivel por bloque de aire', () => {
    const field = lightOf(['#########', '#.......#', '#...*...#', '#.......#', '#########'], 0);
    expect(field.blockAt(4, 2)).toBe(14);
    expect(field.blockAt(6, 2)).toBe(12);
    expect(field.blockAt(1, 1)).toBe(10);
    expect(field.blockAt(0, 2)).toBe(10 - settings.solidFalloff + 1);
    expect(field.skyAt(4, 2)).toBe(0);
  });

  it('fuera de la zona calculada no hay luz', () => {
    const field = lightOf(['...', '...'], 2);
    expect(field.contains(3, 0)).toBe(false);
    expect(field.skyAt(3, 0)).toBe(0);
  });
});
