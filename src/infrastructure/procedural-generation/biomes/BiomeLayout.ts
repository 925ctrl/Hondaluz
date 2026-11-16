import { hash01, valueNoise2D } from '../noise/valueNoise';

export interface BiomeLayoutSettings {
  /** Ancho mínimo y máximo de una franja de bioma de superficie, en bloques. */
  readonly minRegionTiles: number;
  readonly maxRegionTiles: number;
  /** Ancho de la transición de relieve entre dos franjas, en bloques. */
  readonly blendTiles: number;
  /** Irregularidad, en bloques, del límite superior de los biomas de profundidad. */
  readonly depthDither: number;
}

/** Lo que la disposición necesita de cada bioma. */
export interface LayoutBiome {
  readonly weight: number;
  readonly relief: number;
}

interface Region<T> {
  readonly start: number;
  /** Primera columna que ya no pertenece a la franja. */
  readonly end: number;
  readonly biome: T;
}

const SEED_WIDTH = 0x2b1d;
const SEED_PICK = 0x6c8e;
const SEED_DEPTH = 0x0d3f;

/**
 * Reparte los biomas de superficie en franjas de columnas y sitúa los de profundidad.
 * El bioma de aparición ocupa la franja central; a cada lado se eligen los demás por peso,
 * sin repetir el de la franja vecina. Todo se deduce de la semilla.
 */
export class BiomeLayout<T extends LayoutBiome> {
  private readonly regions: Region<T>[];

  constructor(
    private readonly seed: number,
    widthTiles: number,
    centerTileX: number,
    spawnBiome: T,
    surfaceBiomes: readonly T[],
    /** Biomas de profundidad con la fila en la que empiezan. */
    private readonly depthBiomes: readonly { readonly biome: T; readonly fromRow: number }[],
    private readonly settings: BiomeLayoutSettings,
  ) {
    const width = (n: number): number =>
      settings.minRegionTiles +
      Math.floor(
        hash01(seed ^ SEED_WIDTH, n) * (settings.maxRegionTiles - settings.minRegionTiles),
      );
    const pick = (n: number, previous: T): T => {
      const options = surfaceBiomes.filter((biome) => biome !== previous);
      if (options.length === 0) return previous;
      const total = options.reduce((sum, biome) => sum + biome.weight, 0);
      let roll = hash01(seed ^ SEED_PICK, n) * total;
      for (const biome of options) {
        roll -= biome.weight;
        if (roll < 0) return biome;
      }
      return options[options.length - 1] ?? previous;
    };

    const first = width(0);
    const center: Region<T> = {
      start: centerTileX - Math.floor(first / 2),
      end: centerTileX + Math.ceil(first / 2),
      biome: spawnBiome,
    };
    const left: Region<T>[] = [];
    for (let n = -1, edge = center; edge.start > 0; n--) {
      const size = width(n);
      edge = { start: edge.start - size, end: edge.start, biome: pick(n, edge.biome) };
      left.unshift(edge);
    }
    const right: Region<T>[] = [];
    for (let n = 1, edge = center; edge.end < widthTiles; n++) {
      const size = width(n);
      edge = { start: edge.end, end: edge.end + size, biome: pick(n, edge.biome) };
      right.push(edge);
    }
    this.regions = [...left, center, ...right];
  }

  surfaceBiomeAt(tileX: number): T {
    return this.regionAt(tileX).biome;
  }

  /** Bioma de profundidad que corresponde a un bloque, si lo hay. */
  depthBiomeAt(tileX: number, tileY: number): T | undefined {
    if (this.depthBiomes.length === 0) return undefined;
    const dither =
      (valueNoise2D(this.seed ^ SEED_DEPTH, tileX / 8, tileY / 8) * 2 - 1) *
      this.settings.depthDither;
    let found: { biome: T; fromRow: number } | undefined;
    for (const entry of this.depthBiomes) {
      if (tileY + dither >= entry.fromRow && (!found || entry.fromRow > found.fromRow)) {
        found = entry;
      }
    }
    return found?.biome;
  }

  /** Relieve de una columna, mezclado con el de la franja vecina cerca de los límites. */
  reliefAt(tileX: number): number {
    const index = this.regionIndexAt(tileX);
    const region = this.regions[index];
    if (!region) return 1;
    const half = this.settings.blendTiles / 2;
    const own = region.biome.relief;
    const previous = this.regions[index - 1];
    const next = this.regions[index + 1];
    const fromStart = tileX - region.start;
    const toEnd = region.end - 1 - tileX;
    if (previous && fromStart < half) {
      return mix(previous.biome.relief, own, 0.5 + fromStart / (2 * half));
    }
    if (next && toEnd < half) return mix(next.biome.relief, own, 0.5 + toEnd / (2 * half));
    return own;
  }

  private regionAt(tileX: number): Region<T> {
    const region = this.regions[this.regionIndexAt(tileX)];
    if (!region) throw new Error('La disposición de biomas está vacía.');
    return region;
  }

  private regionIndexAt(tileX: number): number {
    let low = 0;
    let high = this.regions.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if ((this.regions[middle]?.start ?? 0) <= tileX) low = middle;
      else high = middle - 1;
    }
    return low;
  }
}

const mix = (from: number, to: number, t: number): number => {
  const eased = t * t * (3 - 2 * t);
  return from + (to - from) * eased;
};
