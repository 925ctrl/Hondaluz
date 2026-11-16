import { describe, expect, it, vi } from 'vitest';
import { chunkRangeForRect, diffRanges, expandRange } from '../../src/domain/world/ChunkRange';
import type { WorldGenerator } from '../../src/domain/world/WorldGenerator';
import { WorldMap } from '../../src/domain/world/WorldMap';

const dimensions = { chunkSize: 4, widthChunks: 8, heightChunks: 4 };
const SOLID = 1;

/** Mundo de prueba: aire en las dos filas superiores de bloques y sólido debajo. */
function createMap(): { map: WorldMap; generateChunk: ReturnType<typeof vi.fn> } {
  const generateChunk = vi.fn((_cx: number, cy: number) =>
    Uint16Array.from({ length: 16 }, (_, i) => (cy * 4 + Math.floor(i / 4) >= 2 ? SOLID : 0)),
  );
  const generator: WorldGenerator = {
    spawnTileX: 0,
    generateChunk,
    surfaceTileAt: () => 2,
    backgroundAt: (_x, y) => (y >= 2 ? SOLID : 0),
    biomeAt: () => ({
      id: 'test',
      name: 'Prueba',
      placement: { layer: 'surface', weight: 1 },
      ground: { rock: 'r' },
    }),
  };
  return {
    map: new WorldMap(dimensions, generator, [
      { solid: false },
      { solid: true },
      { solid: false, physics: 'liquid' },
    ]),
    generateChunk,
  };
}

describe('WorldMap', () => {
  it('lee bloques por coordenada global a través de los chunks', () => {
    const { map } = createMap();
    expect(map.tileAt(5, 1)).toBe(0);
    expect(map.tileAt(5, 2)).toBe(SOLID);
    expect(map.isSolid(31, 15)).toBe(true);
    expect(map.isSolid(0, 0)).toBe(false);
  });

  it('genera cada chunk una sola vez y solo cuando se consulta', () => {
    const { map, generateChunk } = createMap();
    expect(map.loadedChunkCount).toBe(0);
    map.tileAt(0, 0);
    map.tileAt(3, 3);
    map.tileAt(4, 0);
    expect(generateChunk).toHaveBeenCalledTimes(2);
    expect(map.loadedChunkCount).toBe(2);
  });

  it('trata los lados y el fondo como paredes y el cielo como vacío', () => {
    const { map, generateChunk } = createMap();
    expect(map.isSolid(-1, 0)).toBe(true);
    expect(map.isSolid(32, 0)).toBe(true);
    expect(map.isSolid(0, 16)).toBe(true);
    expect(map.isSolid(0, -1)).toBe(false);
    expect(generateChunk).not.toHaveBeenCalled();
  });

  it('descarta los chunks fuera del rango y los regenera idénticos', () => {
    const { map, generateChunk } = createMap();
    map.tileAt(0, 2);
    map.tileAt(30, 2);
    map.evictOutside({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
    expect(map.loadedChunkCount).toBe(1);
    expect(map.tileAt(30, 2)).toBe(SOLID);
    expect(generateChunk).toHaveBeenCalledTimes(3);
  });
});

describe('WorldMap: edición', () => {
  it('cambia bloques y avisa de si hubo cambio', () => {
    const { map } = createMap();
    expect(map.setTile(5, 2, 0)).toBe(true);
    expect(map.setTile(5, 2, 0)).toBe(false);
    expect(map.setTile(-1, 2, 0)).toBe(false);
    expect(map.isSolid(5, 2)).toBe(false);
    expect(map.isSolid(4, 2)).toBe(true);
  });

  it('avisa a quien escucha de cada bloque que cambia, hasta que se da de baja', () => {
    const { map } = createMap();
    const changes: string[] = [];
    const stop = map.onTileChange((x, y) => changes.push(`${String(x)},${String(y)}`));
    map.setTile(5, 2, 0);
    map.setTile(5, 2, 0);
    stop();
    map.setTile(6, 2, 0);
    expect(changes).toEqual(['5,2']);
  });

  it('distingue los líquidos y entrega la pared de fondo del generador', () => {
    const { map } = createMap();
    map.setTile(1, 1, 2);
    expect(map.isLiquid(1, 1)).toBe(true);
    expect(map.isSolid(1, 1)).toBe(false);
    expect(map.backgroundAt(1, 1)).toBe(0);
    expect(map.backgroundAt(1, 3)).toBe(SOLID);
    expect(map.backgroundAt(-1, 3)).toBe(0);
  });

  it('conserva los chunks modificados aunque queden lejos', () => {
    const { map } = createMap();
    map.setTile(30, 2, 0);
    map.tileAt(20, 2);
    map.evictOutside({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
    expect(map.loadedChunkCount).toBe(1);
    expect(map.tileAt(30, 2)).toBe(0);
  });
});

describe('ChunkRange', () => {
  it('calcula los chunks que toca la vista con margen y los limita al mundo', () => {
    const view = { x: 100, y: 20, width: 60, height: 30 };
    expect(chunkRangeForRect(view, 64, 0, dimensions)).toEqual({
      minX: 1,
      minY: 0,
      maxX: 2,
      maxY: 0,
    });
    expect(chunkRangeForRect(view, 64, 40, dimensions)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 3,
      maxY: 1,
    });
    expect(chunkRangeForRect({ ...view, x: 5000 }, 64, 0, dimensions).maxX).toBe(7);
  });

  it('amplía un rango sin salirse del mundo', () => {
    expect(expandRange({ minX: 0, minY: 1, maxX: 6, maxY: 2 }, 2, dimensions)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 7,
      maxY: 3,
    });
  });

  it('indica qué chunks entran y salen al desplazarse', () => {
    const before = { minX: 0, minY: 0, maxX: 1, maxY: 0 };
    const after = { minX: 1, minY: 0, maxX: 2, maxY: 0 };
    expect(diffRanges(undefined, before).entered).toHaveLength(2);
    expect(diffRanges(before, after)).toEqual({
      entered: [{ x: 2, y: 0 }],
      left: [{ x: 0, y: 0 }],
    });
  });
});
