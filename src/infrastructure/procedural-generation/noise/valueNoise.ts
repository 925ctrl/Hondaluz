/** Valor pseudoaleatorio en [0, 1) para un entero, sin estado: misma entrada, misma salida. */
export function hash01(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor suave en una dimensión, en [0, 1). */
export function valueNoise1D(seed: number, x: number): number {
  const cell = Math.floor(x);
  const t = x - cell;
  const eased = t * t * (3 - 2 * t);
  const a = hash01(seed, cell);
  return a + (hash01(seed, cell + 1) - a) * eased;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Ruido de valor suave en dos dimensiones, en [0, 1). */
export function valueNoise2D(seed: number, x: number, y: number): number {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const tx = smooth(x - cellX);
  const ty = smooth(y - cellY);
  const corner = (dx: number, dy: number): number =>
    hash01(seed ^ Math.imul(cellY + dy, 0x27d4eb2d), cellX + dx);
  const top = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * tx;
  const bottom = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * tx;
  return top + (bottom - top) * ty;
}
