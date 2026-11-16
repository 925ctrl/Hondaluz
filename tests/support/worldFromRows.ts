import type { BiomeDefinition } from '../../src/domain/world/BiomeDefinition';
import type { BlockTraits } from '../../src/domain/world/WorldMap';
import { WorldMap } from '../../src/domain/world/WorldMap';

/** Bloques de los mapas de prueba: aire, piedra, agua, arena y antorcha. */
export const T = { air: 0, stone: 1, water: 2, sand: 3, torch: 4 } as const;
export const TRAITS: readonly (BlockTraits & { light?: number })[] = [
  { solid: false },
  { solid: true },
  { solid: false, physics: 'liquid' },
  { solid: true, physics: 'falling' },
  { solid: false, light: 14 },
];
const SYMBOLS: Record<string, number> = {
  '.': T.air,
  '#': T.stone,
  '~': T.water,
  ':': T.sand,
  '*': T.torch,
};

/**
 * Mundo de prueba de un solo chunk dibujado con filas de texto: `.` aire, `#` piedra,
 * `~` agua, `:` arena y `*` antorcha. Las filas `skyRows` superiores dejan ver el cielo; por
 * debajo, la pared de fondo es piedra.
 */
export function worldFromRows(rows: readonly string[], skyRows = 0): WorldMap {
  const size = Math.max(rows.length, ...rows.map((row) => row.length));
  const tiles = new Uint16Array(size * size);
  rows.forEach((row, y) => {
    row.split('').forEach((symbol, x) => {
      tiles[y * size + x] = SYMBOLS[symbol] ?? T.air;
    });
  });
  return new WorldMap(
    { chunkSize: size, widthChunks: 1, heightChunks: 1 },
    {
      spawnTileX: 0,
      generateChunk: () => tiles.slice(),
      surfaceTileAt: () => skyRows,
      backgroundAt: (_x, y) => (y < skyRows ? T.air : T.stone),
      biomeAt: () => ({}) as BiomeDefinition,
    },
    TRAITS,
  );
}

/** Dibuja el mundo como filas de texto, para comparar con lo esperado. */
export function rowsOf(map: WorldMap, height: number, width: number): string[] {
  const symbols = Object.fromEntries(Object.entries(SYMBOLS).map(([k, v]) => [v, k]));
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => symbols[map.tileAt(x, y)] ?? '?').join(''),
  );
}
