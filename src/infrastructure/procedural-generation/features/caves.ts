import { AIR } from '../../../domain/world/BlockDefinition';
import type { ChunkDraft, ChunkFeature } from '../generators/TerrainGenerator';
import { hash01, valueNoise1D, valueNoise2D } from '../noise/valueNoise';

export interface CaveSettings {
  /** Bloques bajo la superficie a partir de los que empiezan los túneles. */
  readonly minDepth: number;
  /** Bloques que tardan los túneles en alcanzar su anchura completa tras `minDepth`. */
  readonly taperTiles: number;
  /** Túneles: bandas estrechas de un ruido 2D estirado en horizontal. */
  readonly tunnel: { readonly scaleX: number; readonly scaleY: number; readonly width: number };
  /** Cavernas: zonas amplias que se hacen más frecuentes con la profundidad. */
  readonly cavern: {
    readonly scale: number;
    readonly shallowThreshold: number;
    readonly deepThreshold: number;
    /** Profundidad bajo la superficie a la que se alcanza `deepThreshold`. */
    readonly fullDepth: number;
  };
  /** Bocas de cueva: pozos sinuosos que bajan desde la superficie. */
  readonly entrances: {
    readonly cellSize: number;
    readonly chance: number;
    readonly depth: number;
    readonly radius: number;
    readonly wobble: number;
    /** Distancia, en bloques, al punto de aparición dentro de la que no se abren. */
    readonly spawnClearance: number;
  };
}

/** Lo que las bocas de cueva necesitan saber del terreno. */
export type SurfaceContext = Pick<ChunkDraft, 'spawnTileX' | 'surfaceAt' | 'waterLevel'>;

/** Cuevas del mundo: el paso de generación y la consulta de dónde se abren a la superficie. */
export interface Caves {
  readonly feature: ChunkFeature;
  /** Indica si una boca de cueva abre la superficie cerca de esa columna. */
  readonly opensSurfaceNear: (tileX: number, context: SurfaceContext) => boolean;
}

const SEED_TUNNEL = 0x3c71;
const SEED_CAVERN = 0x9a05;
const SEED_ENTRANCE = 0x51e7;
const SEED_ENTRANCE_COLUMN = 0x0f2b;
const SEED_WOBBLE = 0x7d19;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Excava túneles, cavernas y bocas de cueva en el terreno base. Bajo la superficie deja
 * siempre `minDepth` bloques de techo, salvo en las bocas, que no se abren junto al punto
 * de aparición ni en los valles inundados (vaciarían el lago).
 */
export function createCaves(seed: number, settings: CaveSettings): Caves {
  const { tunnel, cavern, entrances } = settings;
  const reach = entrances.radius + entrances.wobble;

  /** Columna central de la boca de cueva de una franja, o `null` si no tiene. */
  const entranceIn = (cell: number, draft: SurfaceContext): number | null => {
    if (hash01(seed ^ SEED_ENTRANCE, cell) >= entrances.chance) return null;
    const column =
      cell * entrances.cellSize +
      reach +
      Math.floor(hash01(seed ^ SEED_ENTRANCE_COLUMN, cell) * (entrances.cellSize - 2 * reach));
    if (Math.abs(column - draft.spawnTileX) < entrances.spawnClearance) return null;
    for (let x = column - reach - 1; x <= column + reach + 1; x++) {
      if (draft.surfaceAt(x) >= draft.waterLevel - 1) return null;
    }
    return column;
  };

  const entranceNear = (tileX: number, draft: SurfaceContext): number | null => {
    const cell = Math.floor(tileX / entrances.cellSize);
    for (const candidate of [cell - 1, cell, cell + 1]) {
      const column = entranceIn(candidate, draft);
      if (column !== null && Math.abs(column - tileX) <= reach + 1) return column;
    }
    return null;
  };

  /** Indica si la boca de cueva centrada en `column` (cuya superficie es `top`) vacía el bloque. */
  const isEntrance = (column: number, top: number, tileX: number, tileY: number): boolean => {
    if (tileY < top - 1 || tileY > top + entrances.depth) return false;
    const wobble = (valueNoise1D(seed ^ SEED_WOBBLE, tileY / 6) * 2 - 1) * entrances.wobble;
    return Math.abs(tileX - (column + Math.round(wobble))) <= entrances.radius;
  };

  const isCave = (tileX: number, tileY: number, depth: number): boolean => {
    if (depth < settings.minDepth) return false;
    const taper = clamp01((depth - settings.minDepth) / settings.taperTiles);
    const band = valueNoise2D(seed ^ SEED_TUNNEL, tileX / tunnel.scaleX, tileY / tunnel.scaleY);
    if (Math.abs(band - 0.5) < tunnel.width * taper) return true;
    const threshold =
      cavern.shallowThreshold +
      (cavern.deepThreshold - cavern.shallowThreshold) * clamp01(depth / cavern.fullDepth);
    return (
      valueNoise2D(seed ^ SEED_CAVERN, tileX / cavern.scale, tileY / (cavern.scale * 0.6)) >
      threshold
    );
  };

  const feature: ChunkFeature = (draft) => {
    const { chunkX, chunkY, size, tiles, heightTiles, verticalMargin } = draft;
    for (let x = 0; x < size; x++) {
      const tileX = chunkX * size + x;
      const surface = draft.surfaceAt(tileX);
      const entrance = entranceNear(tileX, draft);
      const entranceTop = entrance === null ? 0 : draft.surfaceAt(entrance);
      for (let y = 0; y < size; y++) {
        const tileY = chunkY * size + y;
        const index = y * size + x;
        if (tiles[index] === AIR || tileY >= heightTiles - verticalMargin) continue;
        if (
          isCave(tileX, tileY, tileY - surface) ||
          (entrance !== null && isEntrance(entrance, entranceTop, tileX, tileY))
        ) {
          tiles[index] = AIR;
        }
      }
    }
  };

  return {
    feature,
    opensSurfaceNear: (tileX, context) => entranceNear(tileX, context) !== null,
  };
}
