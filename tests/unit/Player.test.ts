import { describe, expect, it } from 'vitest';
import { PLAYER_TUNING } from '../../src/config/world.config';
import { Player, type PlayerIntent } from '../../src/domain/entities/Player';
import type { TileQuery } from '../../src/domain/world/WorldMap';
import { tilesFrom } from '../support/tiles';

const TILE = 16;
const DT = 1 / 60;
const IDLE: PlayerIntent = { moveX: 0, jump: false };
const RIGHT: PlayerIntent = { moveX: 1, jump: false };

const flat = tilesFrom([...Array<string>(9).fill(''), '#'.repeat(40)]);
const FLOOR_Y = 9 * TILE;

function playerOn(tiles: TileQuery, tileX = 2): Player {
  const player = new Player(PLAYER_TUNING, tileX * TILE, FLOOR_Y - PLAYER_TUNING.height, 100);
  player.step(IDLE, DT, tiles, TILE);
  return player;
}

function run(player: Player, tiles: TileQuery, intent: PlayerIntent, steps: number): void {
  for (let i = 0; i < steps; i++) player.step(intent, DT, tiles, TILE);
}

describe('Player', () => {
  it('cae por gravedad y queda apoyado en el suelo', () => {
    const player = new Player(PLAYER_TUNING, 32, 0, 100);
    expect(player.grounded).toBe(false);
    run(player, flat, IDLE, 120);
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(FLOOR_Y - PLAYER_TUNING.height);
    expect(player.vy).toBe(0);
  });

  it('acelera hasta la velocidad máxima y mira hacia donde camina', () => {
    const player = playerOn(flat);
    run(player, flat, RIGHT, 30);
    expect(player.vx).toBe(PLAYER_TUNING.moveSpeed);
    expect(player.facing).toBe(1);
    run(player, flat, { moveX: -1, jump: false }, 1);
    expect(player.facing).toBe(-1);
    run(player, flat, IDLE, 30);
    expect(player.vx).toBe(0);
  });

  it('salta más de tres bloques manteniendo el salto y menos si se suelta pronto', () => {
    const peak = (holdSteps: number): number => {
      const player = playerOn(flat);
      let highest = player.y;
      for (let i = 0; i < 90; i++) {
        player.step({ moveX: 0, jump: i < holdSteps }, DT, flat, TILE);
        highest = Math.min(highest, player.y);
      }
      expect(player.grounded).toBe(true);
      return FLOOR_Y - PLAYER_TUNING.height - highest;
    };
    const full = peak(90);
    expect(full).toBeGreaterThan(3 * TILE);
    expect(full).toBeLessThan(4 * TILE);
    expect(peak(4)).toBeLessThan(full * 0.6);
  });

  it('no vuelve a saltar en el aire por mantener pulsado', () => {
    const player = playerOn(flat);
    run(player, flat, { moveX: 0, jump: true }, 200);
    expect(player.grounded).toBe(true);
  });

  it('permite saltar justo después de salirse de un borde', () => {
    const ledge = tilesFrom([...Array<string>(9).fill(''), '####']);
    const player = playerOn(ledge, 3);
    while (player.grounded) player.step(RIGHT, DT, ledge, TILE);
    player.step({ moveX: 1, jump: true }, DT, ledge, TILE);
    expect(player.vy).toBeLessThan(0);
  });

  it('sube solo un escalón de un bloque', () => {
    const stairs = tilesFrom([
      ...Array<string>(8).fill(''),
      '.....' + '#'.repeat(35),
      '#'.repeat(40),
    ]);
    const player = playerOn(stairs);
    let lifted = 0;
    for (let i = 0; i < 90; i++) lifted += player.step(RIGHT, DT, stairs, TILE);
    expect(lifted).toBe(TILE);
    expect(player.y).toBe(FLOOR_Y - TILE - PLAYER_TUNING.height);
    expect(player.x).toBeGreaterThan(6 * TILE);
    expect(player.grounded).toBe(true);
  });

  it('se detiene ante un muro de dos bloques', () => {
    const wall = tilesFrom([...Array<string>(7).fill(''), '.....#', '.....#', '######']);
    const player = playerOn(wall);
    run(player, wall, RIGHT, 90);
    expect(player.x).toBe(5 * TILE - PLAYER_TUNING.width);
    expect(player.vx).toBe(0);
  });

  it('no sube un escalón si no hay altura libre encima', () => {
    const lowCeiling = tilesFrom([
      ...Array<string>(6).fill(''),
      '....####',
      '........',
      '.....###',
      '########',
    ]);
    const player = playerOn(lowCeiling);
    run(player, lowCeiling, RIGHT, 90);
    expect(player.x).toBe(5 * TILE - PLAYER_TUNING.width);
  });
});

describe('Player en el agua', () => {
  // Un lago de 6 bloques de hondo sobre el suelo.
  const lake = tilesFrom([
    ...Array<string>(3).fill(''),
    ...Array<string>(6).fill('~'.repeat(40)),
    '#'.repeat(40),
  ]);

  it('se hunde más despacio que en el aire y camina más lento', () => {
    const inAir = new Player(PLAYER_TUNING, 32, 3 * TILE, 100);
    const inWater = new Player(PLAYER_TUNING, 32, 3 * TILE, 100);
    run(inAir, flat, RIGHT, 20);
    run(inWater, lake, RIGHT, 20);
    expect(inWater.submerged).toBe(true);
    expect(inWater.y).toBeLessThan(inAir.y);
    expect(inWater.vy).toBeLessThanOrEqual(PLAYER_TUNING.swim.maxSinkSpeed);
    expect(inWater.vx).toBeLessThan(inAir.vx);
  });

  it('sube manteniendo el salto y puede salir por la superficie', () => {
    const player = new Player(PLAYER_TUNING, 32, 9 * TILE - PLAYER_TUNING.height, 100);
    run(player, lake, IDLE, 30);
    const bottom = player.y;
    run(player, lake, { moveX: 0, jump: true }, 120);
    expect(player.y).toBeLessThan(bottom - 3 * TILE);
  });
});
