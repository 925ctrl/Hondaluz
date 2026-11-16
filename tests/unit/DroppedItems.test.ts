import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '../../src/config/gameplay.config';
import { Inventory } from '../../src/domain/inventory/Inventory';
import { DroppedItems } from '../../src/domain/items/DroppedItems';
import { tilesFrom } from '../support/tiles';

const TILE = 16;
const DT = 1 / 60;
const settings = GAMEPLAY_CONFIG.drops;
const floor = tilesFrom([...Array<string>(5).fill(''), '#'.repeat(40)]);
const FLOOR_Y = 5 * TILE;
const collectorAt = (x: number): { x: number; y: number; width: number; height: number } => ({
  x,
  y: FLOOR_Y - 25,
  width: 10,
  height: 25,
});

function simulate(
  drops: DroppedItems,
  collectorX: number,
  store: Inventory,
  seconds: number,
): void {
  for (let i = 0; i < seconds * 60; i++)
    drops.step(DT, floor, TILE, collectorAt(collectorX), store);
}

describe('DroppedItems', () => {
  it('cae y se queda apoyado en el suelo cuando no hay nadie cerca', () => {
    const drops = new DroppedItems(settings);
    drops.spawn('dirt', 1, 300, 20);
    simulate(drops, 0, new Inventory(4, 4, () => 99), 2);
    expect(drops.items[0]).toMatchObject({ y: FLOOR_Y - settings.size, vy: 0 });
  });

  it('vuela hacia el jugador cercano y pasa a su inventario', () => {
    const drops = new DroppedItems(settings);
    const inventory = new Inventory(4, 4, () => 99);
    drops.spawn('dirt', 3, 130, FLOOR_Y - 8);
    simulate(drops, 100, inventory, 1);
    expect(drops.items).toHaveLength(0);
    expect(inventory.count('dirt')).toBe(3);
  });

  it('se queda en el suelo si el inventario está lleno y deja el resto si cabe solo una parte', () => {
    const full = new Inventory(1, 1, () => 5);
    full.add('stone', 5);
    const drops = new DroppedItems(settings);
    drops.spawn('dirt', 2, 110, FLOOR_Y - 8);
    simulate(drops, 100, full, 1);
    expect(drops.items[0]?.count).toBe(2);

    const almostFull = new Inventory(1, 1, () => 5);
    almostFull.add('dirt', 4);
    simulate(drops, 100, almostFull, 1);
    expect(almostFull.count('dirt')).toBe(5);
    expect(drops.items[0]?.count).toBe(1);
  });
});
