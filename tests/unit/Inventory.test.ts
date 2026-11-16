import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Inventory } from '../../src/domain/inventory/Inventory';

const MAX: Record<string, number> = { dirt: 10, stone: 10, gem: 1 };

describe('Inventory', () => {
  let onChange: ReturnType<typeof vi.fn<() => void>>;
  let inventory: Inventory;

  beforeEach(() => {
    onChange = vi.fn<() => void>();
    inventory = new Inventory(6, 3, (id) => MAX[id] ?? 1, onChange);
  });

  it('apila hasta el máximo y continúa en la siguiente ranura', () => {
    expect(inventory.add('dirt', 14)).toBe(0);
    expect(inventory.slot(0)).toEqual({ itemId: 'dirt', count: 10 });
    expect(inventory.slot(1)).toEqual({ itemId: 'dirt', count: 4 });
    expect(inventory.count('dirt')).toBe(14);
  });

  it('completa montones existentes antes de ocupar ranuras vacías', () => {
    inventory.add('stone', 3);
    inventory.add('dirt', 4);
    inventory.clear(0);
    inventory.add('dirt', 2);
    expect(inventory.slot(0)).toBeNull();
    expect(inventory.slot(1)).toEqual({ itemId: 'dirt', count: 6 });
  });

  it('devuelve lo que no cabe e informa de la capacidad restante', () => {
    expect(inventory.capacityFor('gem')).toBe(6);
    expect(inventory.add('gem', 8)).toBe(2);
    expect(inventory.capacityFor('gem')).toBe(0);
    expect(inventory.capacityFor('dirt')).toBe(0);
    onChange.mockClear();
    expect(inventory.add('gem', 1)).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mueve a una ranura vacía, fusiona montones iguales e intercambia distintos', () => {
    inventory.add('dirt', 7);
    inventory.move(0, 4);
    expect(inventory.slot(0)).toBeNull();
    expect(inventory.slot(4)).toEqual({ itemId: 'dirt', count: 7 });

    inventory.add('dirt', 5);
    inventory.move(0, 4);
    expect(inventory.slot(4)).toEqual({ itemId: 'dirt', count: 10 });
    expect(inventory.slot(0)).toEqual({ itemId: 'dirt', count: 2 });

    inventory.add('stone', 1);
    inventory.move(0, 1);
    expect(inventory.slot(0)).toEqual({ itemId: 'stone', count: 1 });
    expect(inventory.slot(1)).toEqual({ itemId: 'dirt', count: 2 });
  });

  it('divide un montón por la mitad sin perder ni crear unidades', () => {
    inventory.add('dirt', 7);
    inventory.split(0, 2);
    expect(inventory.slot(0)).toEqual({ itemId: 'dirt', count: 3 });
    expect(inventory.slot(2)).toEqual({ itemId: 'dirt', count: 4 });

    inventory.add('stone', 1);
    inventory.split(0, 1);
    expect(inventory.slot(1)).toEqual({ itemId: 'stone', count: 1 });
    expect(inventory.count('dirt')).toBe(7);
  });

  it('ignora movimientos sin origen, sobre sí mismo o fuera de rango', () => {
    inventory.add('dirt', 3);
    onChange.mockClear();
    inventory.move(3, 0);
    inventory.move(0, 0);
    inventory.move(0, 99);
    inventory.split(0, -1);
    expect(inventory.slot(0)).toEqual({ itemId: 'dirt', count: 3 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('retira unidades de varias ranuras empezando por el final, o nada si no alcanzan', () => {
    inventory.add('dirt', 14);
    expect(inventory.remove('dirt', 20)).toBe(false);
    expect(inventory.count('dirt')).toBe(14);

    expect(inventory.remove('dirt', 6)).toBe(true);
    expect(inventory.slot(0)).toEqual({ itemId: 'dirt', count: 8 });
    expect(inventory.slot(1)).toBeNull();
  });

  it('elimina el contenido de una ranura', () => {
    inventory.add('dirt', 3);
    inventory.clear(0);
    expect(inventory.count('dirt')).toBe(0);
  });

  it('selecciona solo ranuras de la barra rápida y gasta el objeto en la mano', () => {
    inventory.add('dirt', 2);
    inventory.add('gem', 1);
    expect(inventory.held()).toEqual({ itemId: 'dirt', count: 2 });

    inventory.select(5);
    expect(inventory.selectedIndex).toBe(0);
    inventory.select(1);
    expect(inventory.held()).toEqual({ itemId: 'gem', count: 1 });

    expect(inventory.consumeHeld(2)).toBe(false);
    expect(inventory.consumeHeld(1)).toBe(true);
    expect(inventory.held()).toBeNull();
    expect(inventory.consumeHeld(1)).toBe(false);
  });

  it('avisa de cada cambio de contenido o de selección', () => {
    inventory.add('dirt', 1);
    inventory.select(2);
    inventory.select(2);
    inventory.move(0, 1);
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
