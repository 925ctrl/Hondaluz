import type { TileQuery } from '../world/WorldMap';

/** Caja alineada con los ejes, en píxeles, con origen en su esquina superior izquierda. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MoveResult {
  readonly x: number;
  readonly y: number;
  readonly blockedX: boolean;
  readonly blockedY: boolean;
}

/** Última fila o columna de bloques que ocupa un borde situado en `edge`. */
const lastTile = (edge: number, tileSize: number): number => Math.ceil(edge / tileSize) - 1;

function anySolid(
  tiles: TileQuery,
  fixed: number,
  from: number,
  to: number,
  fixedIsColumn: boolean,
): boolean {
  for (let i = from; i <= to; i++) {
    if (fixedIsColumn ? tiles.isSolid(fixed, i) : tiles.isSolid(i, fixed)) return true;
  }
  return false;
}

/**
 * Mueve una caja primero en horizontal y luego en vertical, deteniéndola contra los
 * bloques sólidos. Recorre todas las columnas o filas que cruza, así que no atraviesa
 * paredes aunque el desplazamiento supere un bloque.
 */
export function moveBox(
  box: Box,
  deltaX: number,
  deltaY: number,
  tiles: TileQuery,
  tileSize: number,
): MoveResult {
  let x = box.x + deltaX;
  let blockedX = false;
  if (deltaX !== 0) {
    const top = Math.floor(box.y / tileSize);
    const bottom = lastTile(box.y + box.height, tileSize);
    if (deltaX > 0) {
      const target = lastTile(x + box.width, tileSize);
      for (let column = lastTile(box.x + box.width, tileSize) + 1; column <= target; column++) {
        if (anySolid(tiles, column, top, bottom, true)) {
          x = column * tileSize - box.width;
          blockedX = true;
          break;
        }
      }
    } else {
      const target = Math.floor(x / tileSize);
      for (let column = Math.floor(box.x / tileSize) - 1; column >= target; column--) {
        if (anySolid(tiles, column, top, bottom, true)) {
          x = (column + 1) * tileSize;
          blockedX = true;
          break;
        }
      }
    }
  }

  let y = box.y + deltaY;
  let blockedY = false;
  if (deltaY !== 0) {
    const left = Math.floor(x / tileSize);
    const right = lastTile(x + box.width, tileSize);
    if (deltaY > 0) {
      const target = lastTile(y + box.height, tileSize);
      for (let row = lastTile(box.y + box.height, tileSize) + 1; row <= target; row++) {
        if (anySolid(tiles, row, left, right, false)) {
          y = row * tileSize - box.height;
          blockedY = true;
          break;
        }
      }
    } else {
      const target = Math.floor(y / tileSize);
      for (let row = Math.floor(box.y / tileSize) - 1; row >= target; row--) {
        if (anySolid(tiles, row, left, right, false)) {
          y = (row + 1) * tileSize;
          blockedY = true;
          break;
        }
      }
    }
  }
  return { x, y, blockedX, blockedY };
}

/** Indica si la caja solapa algún bloque sólido. */
export function overlapsSolid(box: Box, tiles: TileQuery, tileSize: number): boolean {
  const right = lastTile(box.x + box.width, tileSize);
  const bottom = lastTile(box.y + box.height, tileSize);
  for (let row = Math.floor(box.y / tileSize); row <= bottom; row++) {
    if (anySolid(tiles, row, Math.floor(box.x / tileSize), right, false)) return true;
  }
  return false;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Indica si la caja toca algún bloque líquido. */
export function overlapsLiquid(box: Box, tiles: TileQuery, tileSize: number): boolean {
  const right = lastTile(box.x + box.width, tileSize);
  const bottom = lastTile(box.y + box.height, tileSize);
  for (let row = Math.floor(box.y / tileSize); row <= bottom; row++) {
    for (let column = Math.floor(box.x / tileSize); column <= right; column++) {
      if (tiles.isLiquid(column, row)) return true;
    }
  }
  return false;
}
