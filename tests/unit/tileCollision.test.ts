import { describe, expect, it } from 'vitest';
import { moveBox, overlapsSolid } from '../../src/domain/physics/tileCollision';
import { tilesFrom } from '../support/tiles';

const TILE = 16;
const tiles = tilesFrom(['........', '.....#..', '.....#..', '########']);
const box = { x: 20, y: 20, width: 10, height: 25 };

describe('moveBox', () => {
  it('se mueve libremente por el aire', () => {
    expect(moveBox(box, 5, -3, tiles, TILE)).toEqual({
      x: 25,
      y: 17,
      blockedX: false,
      blockedY: false,
    });
  });

  it('aterriza justo encima del suelo', () => {
    const result = moveBox(box, 0, 9, tiles, TILE);
    expect(result).toMatchObject({ y: 3 * TILE - box.height, blockedY: true });
  });

  it('se detiene pegado a una pared a la derecha y a la izquierda', () => {
    const right = moveBox({ ...box, x: 60 }, 14, 0, tiles, TILE);
    expect(right).toMatchObject({ x: 5 * TILE - box.width, blockedX: true });

    const left = moveBox({ ...box, x: 100 }, -14, 0, tiles, TILE);
    expect(left).toMatchObject({ x: 6 * TILE, blockedX: true });
  });

  it('choca con el techo al subir', () => {
    const under = tilesFrom(['###', '...', '...']);
    expect(moveBox({ ...box, x: 4, y: 20 }, 0, -10, under, TILE)).toMatchObject({
      y: TILE,
      blockedY: true,
    });
  });

  it('no atraviesa paredes aunque el desplazamiento supere un bloque', () => {
    expect(moveBox(box, 200, 0, tiles, TILE)).toMatchObject({ x: 70, blockedX: true });
    expect(moveBox(box, 0, 500, tiles, TILE)).toMatchObject({ y: 23, blockedY: true });
  });

  it('puede deslizarse a ras de una pared o del suelo sin engancharse', () => {
    const onFloor = { ...box, y: 3 * TILE - box.height };
    expect(moveBox(onFloor, 12, 0, tiles, TILE)).toMatchObject({ x: 32, blockedX: false });
    const againstWall = { ...box, x: 5 * TILE - box.width };
    expect(moveBox(againstWall, 0, 2, tiles, TILE)).toMatchObject({ y: 22, blockedY: false });
  });
});

describe('overlapsSolid', () => {
  it('distingue tocar un bloque de solaparlo', () => {
    expect(overlapsSolid({ ...box, y: 3 * TILE - box.height }, tiles, TILE)).toBe(false);
    expect(overlapsSolid({ ...box, y: 3 * TILE - box.height + 1 }, tiles, TILE)).toBe(true);
  });
});
