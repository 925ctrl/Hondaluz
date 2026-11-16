import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from '../../src/content/enemies';
import { mulberry32 } from '../../src/core/utils/random';
import type { BehaviorContext } from '../../src/domain/enemies/behaviors/EnemyBehavior';
import { EnemyRoster } from '../../src/domain/enemies/EnemyRoster';
import { overlapsSolid, type Box } from '../../src/domain/physics/tileCollision';
import type { TileQuery } from '../../src/domain/world/WorldMap';
import { tilesFrom } from '../support/tiles';

const TILE = 16;
const DT = 1 / 60;
const definition = (id: string) => {
  const found = ENEMY_DEFINITIONS.find((enemy) => enemy.id === id);
  if (!found) throw new Error(id);
  return found;
};

/** Suelo plano en la fila 20, con roca maciza debajo. */
const ground = tilesFrom([
  ...Array<string>(20).fill(''),
  ...Array<string>(20).fill('#'.repeat(80)),
]);
const GROUND_Y = 20 * TILE;

function simulate(
  roster: EnemyRoster,
  tiles: TileQuery,
  target: Box | null,
  seconds: number,
  onStep: () => void = () => undefined,
): void {
  const context: BehaviorContext = {
    dt: DT,
    tiles,
    tileSize: TILE,
    target,
    random: mulberry32(3),
    worldWidth: 80 * TILE,
    worldHeight: 40 * TILE,
  };
  for (let i = 0; i < seconds * 60; i++) {
    roster.step(context);
    onStep();
  }
}

const playerAt = (x: number, y = GROUND_Y - 25): Box => ({ x, y, width: 10, height: 25 });

describe('comportamientos de enemigos', () => {
  it('el caminante cae al suelo, persigue al jugador y salta los escalones', () => {
    const step = tilesFrom([
      ...Array<string>(19).fill(''),
      '.'.repeat(20) + '#'.repeat(60),
      ...Array<string>(20).fill('#'.repeat(80)),
    ]);
    const roster = new EnemyRoster();
    const stump = roster.add(definition('stump'), 5 * TILE, 10 * TILE);
    // El jugador está sobre el escalón, dentro del rango de detección del tocón.
    simulate(roster, step, playerAt(22 * TILE, 19 * TILE - 25), 8, () => {
      expect(overlapsSolid(stump, step, TILE)).toBe(false);
    });
    expect(stump.x).toBeGreaterThan(20 * TILE);
    expect(stump.y + stump.height).toBe(19 * TILE);
    expect(stump.facing).toBe(1);
  });

  it('el caminante deambula sin rumbo si no ve al jugador', () => {
    const roster = new EnemyRoster();
    const stump = roster.add(definition('stump'), 40 * TILE, GROUND_Y - 13);
    simulate(roster, ground, null, 10);
    expect(Math.abs(stump.x - 40 * TILE)).toBeLessThan(15 * TILE);
    expect(stump.grounded).toBe(true);
  });

  it('el volador se acerca por el aire sin atravesar bloques', () => {
    const roster = new EnemyRoster();
    const moth = roster.add(definition('ash_moth'), 10 * TILE, 8 * TILE);
    const target = playerAt(25 * TILE);
    simulate(roster, ground, target, 6, () => {
      expect(overlapsSolid(moth, ground, TILE)).toBe(false);
    });
    expect(Math.abs(moth.x - target.x)).toBeLessThan(3 * TILE);
  });

  it('el excavador atraviesa la roca hacia el jugador y cae al salir al aire', () => {
    const roster = new EnemyRoster();
    const mole = roster.add(definition('rock_mole'), 30 * TILE, 32 * TILE);
    const target = playerAt(36 * TILE);
    let surfaced = false;
    simulate(roster, ground, target, 15, () => {
      if (mole.y + mole.height <= GROUND_Y) surfaced = true;
    });
    expect(surfaced).toBe(true);
    expect(Math.abs(mole.x - target.x)).toBeLessThan(3 * TILE);
  });

  it('un enemigo aturdido por un golpe no dirige su movimiento', () => {
    const roster = new EnemyRoster();
    const stump = roster.add(definition('stump'), 40 * TILE, GROUND_Y - 13);
    simulate(roster, ground, playerAt(50 * TILE), 1);
    stump.knockBack(-200, -100, 0.3);
    roster.step({
      dt: DT,
      tiles: ground,
      tileSize: TILE,
      target: playerAt(50 * TILE),
      random: mulberry32(1),
      worldWidth: 80 * TILE,
      worldHeight: 40 * TILE,
    });
    expect(stump.vx).toBeLessThan(0);
  });
});
