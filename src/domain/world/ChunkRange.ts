import type { WorldDimensions } from './WorldDimensions';

export interface ChunkCoord {
  readonly x: number;
  readonly y: number;
}

/** Rectángulo de chunks con ambos extremos incluidos. */
export interface ChunkRange {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Chunks que toca un rectángulo en píxeles, ampliado por un margen y limitado al mundo. */
export function chunkRangeForRect(
  rect: Rect,
  chunkPixels: number,
  marginPixels: number,
  dimensions: WorldDimensions,
): ChunkRange {
  const lastX = dimensions.widthChunks - 1;
  const lastY = dimensions.heightChunks - 1;
  return {
    minX: clamp(Math.floor((rect.x - marginPixels) / chunkPixels), 0, lastX),
    minY: clamp(Math.floor((rect.y - marginPixels) / chunkPixels), 0, lastY),
    maxX: clamp(Math.floor((rect.x + rect.width + marginPixels) / chunkPixels), 0, lastX),
    maxY: clamp(Math.floor((rect.y + rect.height + marginPixels) / chunkPixels), 0, lastY),
  };
}

export function expandRange(
  range: ChunkRange,
  chunks: number,
  dimensions: WorldDimensions,
): ChunkRange {
  return {
    minX: Math.max(0, range.minX - chunks),
    minY: Math.max(0, range.minY - chunks),
    maxX: Math.min(dimensions.widthChunks - 1, range.maxX + chunks),
    maxY: Math.min(dimensions.heightChunks - 1, range.maxY + chunks),
  };
}

export function rangeContains(range: ChunkRange, x: number, y: number): boolean {
  return x >= range.minX && x <= range.maxX && y >= range.minY && y <= range.maxY;
}

export function sameRange(a: ChunkRange, b: ChunkRange): boolean {
  return a.minX === b.minX && a.minY === b.minY && a.maxX === b.maxX && a.maxY === b.maxY;
}

function coordsOutside(range: ChunkRange, other: ChunkRange | undefined): ChunkCoord[] {
  const coords: ChunkCoord[] = [];
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (!other || !rangeContains(other, x, y)) coords.push({ x, y });
    }
  }
  return coords;
}

/** Chunks que entran y salen al pasar de un rango al siguiente. */
export function diffRanges(
  previous: ChunkRange | undefined,
  next: ChunkRange,
): { entered: ChunkCoord[]; left: ChunkCoord[] } {
  return {
    entered: coordsOutside(next, previous),
    left: previous ? coordsOutside(previous, next) : [],
  };
}
