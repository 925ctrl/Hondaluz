import { describe, expect, it } from 'vitest';
import { TileSimulation } from '../../src/domain/world/TileSimulation';
import { rowsOf, T, TRAITS, worldFromRows } from '../support/worldFromRows';

const settings = { stepSeconds: 0.05, maxUpdatesPerStep: 500 };

/** Avanza la simulación hasta que se queda quieta, con un límite de pasos. */
function settle(simulation: TileSimulation, maxSteps = 500): number {
  let steps = 0;
  while (simulation.activeCount > 0 && steps < maxSteps) {
    simulation.step();
    steps++;
  }
  return steps;
}

describe('TileSimulation', () => {
  it('no hace nada mientras nada cambia: un lago generado no cuesta', () => {
    const map = worldFromRows(['#~~#', '#~~#', '####', '....']);
    const simulation = new TileSimulation(map, TRAITS, settings);
    simulation.update(1);
    expect(simulation.activeCount).toBe(0);
    expect(rowsOf(map, 2, 4)).toEqual(['#~~#', '#~~#']);
  });

  it('el agua cae por un hueco, conserva su volumen y se queda quieta', () => {
    const map = worldFromRows(['#~~~#...', '#~~~#...', '#####...', '........', '########']);
    const simulation = new TileSimulation(map, TRAITS, settings);
    // Se abre la pared derecha del estanque.
    map.setTile(4, 1, T.air);
    expect(settle(simulation)).toBeLessThan(500);
    const rows = rowsOf(map, 5, 8);
    const water = rows
      .join('')
      .split('')
      .filter((symbol) => symbol === '~').length;
    expect(water).toBe(6);
    // Ha caído al suelo de abajo y se ha extendido por él.
    expect(rows[3]?.includes('~')).toBe(true);
    expect(simulation.activeCount).toBe(0);
  });

  it('una columna de agua se reparte por el fondo de un pozo ancho', () => {
    const map = worldFromRows(['#..~..#', '#..~..#', '#..~..#', '#######']);
    const simulation = new TileSimulation(map, TRAITS, settings);
    simulation.wakeAround(3, 0);
    simulation.wakeAround(3, 1);
    simulation.wakeAround(3, 2);
    settle(simulation);
    expect(rowsOf(map, 3, 7)[2]?.split('~').length).toBe(4);
  });

  it('la arena cae sin apoyo y se hunde en el agua, que sube a su sitio', () => {
    const map = worldFromRows(['#:#', '#.#', '#~#', '###']);
    const simulation = new TileSimulation(map, TRAITS, settings);
    simulation.wakeAround(1, 0);
    settle(simulation);
    expect(rowsOf(map, 3, 3)).toEqual(['#.#', '#~#', '#:#']);
  });

  it('reparte el trabajo entre pasos cuando hay muchos bloques activos', () => {
    const map = worldFromRows(['::::', '....', '....', '####']);
    const simulation = new TileSimulation(map, TRAITS, { ...settings, maxUpdatesPerStep: 2 });
    for (let x = 0; x < 4; x++) simulation.wakeAround(x, 0);
    simulation.step();
    expect(rowsOf(map, 2, 4).join('').split(':').length - 1).toBe(4);
    expect(rowsOf(map, 1, 4)[0]?.split(':').length).toBe(3);
    settle(simulation);
    expect(rowsOf(map, 3, 4)[2]).toBe('::::');
  });
});
