import type { BiomeDefinition, BiomeRegistry } from '../../../domain/world/BiomeDefinition';
import { AIR, type BlockRegistry } from '../../../domain/world/BlockDefinition';
import {
  heightInTiles,
  widthInTiles,
  type WorldDimensions,
} from '../../../domain/world/WorldDimensions';
import type { WorldGenerator } from '../../../domain/world/WorldGenerator';
import { BiomeLayout, type BiomeLayoutSettings } from '../biomes/BiomeLayout';
import { valueNoise1D } from '../noise/valueNoise';

export interface TerrainSettings {
  /** Fila media de la superficie. */
  readonly surfaceLevel: number;
  /** Ondulaciones que se suman: longitud de onda y amplitud en bloques. */
  readonly hills: readonly { readonly wavelength: number; readonly amplitude: number }[];
  readonly soilDepthMin: number;
  readonly soilDepthMax: number;
  /** Bloques que se dejan libres junto al techo y al fondo del mundo. */
  readonly verticalMargin: number;
  /** Los valles cuya superficie queda por debajo de esta fila se llenan de agua. */
  readonly waterLevel: number;
  readonly biomes: BiomeLayoutSettings;
}

/** Planta de un bioma con sus bloques ya convertidos en índices. */
export interface GenerationPlant {
  readonly stem: number;
  readonly crown?: {
    readonly block: number;
    readonly shape: 'round' | 'cone';
    readonly radius: number;
  };
  readonly cellSize: number;
  readonly chance: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

/** Bioma con sus bloques ya convertidos en índices, listo para generar. */
export interface GenerationBiome {
  readonly definition: BiomeDefinition;
  readonly surface: number;
  readonly soil: number;
  readonly rock: number;
  /** Lo que llena los valles; `AIR` si el bioma no tiene lagos. */
  readonly lake: number;
  readonly relief: number;
  readonly weight: number;
  readonly plants: readonly GenerationPlant[];
  readonly veins: readonly {
    readonly block: number;
    readonly scale: number;
    readonly threshold: number;
  }[];
}

/** Chunk en construcción que reciben los pasos de generación. */
export interface ChunkDraft {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly size: number;
  readonly tiles: Uint16Array;
  readonly heightTiles: number;
  readonly verticalMargin: number;
  readonly waterLevel: number;
  readonly spawnTileX: number;
  readonly surfaceAt: (tileX: number) => number;
  /** Bioma de superficie de una columna. */
  readonly surfaceBiomeAt: (tileX: number) => GenerationBiome;
  /** Bioma de un bloque: el de profundidad si lo hay, si no el de superficie. */
  readonly biomeAt: (tileX: number, tileY: number) => GenerationBiome;
}

/**
 * Paso de generación que añade algo sobre el terreno base (minerales, árboles, cuevas...).
 * Debe ser determinista y depender solo de coordenadas globales, para que los chunks
 * vecinos encajen aunque se generen por separado.
 */
export type ChunkFeature = (draft: ChunkDraft) => void;

const SOIL_NOISE_SEED = 0x5011;
const SOIL_NOISE_WAVELENGTH = 9;
/** Columnas a cada lado del centro en las que se busca un punto de aparición seco. */
const SPAWN_SEARCH_TILES = 200;

/**
 * Terreno base por biomas (superficie ondulada, suelo y roca) más los pasos de generación
 * indicados. Los biomas solo aportan datos: añadir uno no cambia este código.
 */
export class TerrainGenerator implements WorldGenerator {
  readonly spawnTileX: number;
  private readonly layout: BiomeLayout<GenerationBiome>;
  private readonly heightTiles: number;

  constructor(
    private readonly seed: number,
    private readonly dimensions: WorldDimensions,
    private readonly settings: TerrainSettings,
    biomes: BiomeRegistry,
    blocks: BlockRegistry,
    private readonly features: readonly ChunkFeature[] = [],
  ) {
    this.heightTiles = heightInTiles(dimensions);
    const resolved = biomes.all.map((biome) => resolveBiome(biome, blocks));
    const surface = resolved.filter((biome) => biome.definition.placement.layer === 'surface');
    const spawnBiome = surface.find(
      (biome) => biome.definition.placement.layer === 'surface' && biome.definition.placement.spawn,
    );
    if (!spawnBiome) throw new Error('No hay bioma de aparición.');
    const depth = resolved.flatMap((biome) =>
      biome.definition.placement.layer === 'depth'
        ? [{ biome, fromRow: biome.definition.placement.fromRow }]
        : [],
    );
    const center = Math.floor(widthInTiles(dimensions) / 2);
    this.layout = new BiomeLayout(
      seed,
      widthInTiles(dimensions),
      center,
      spawnBiome,
      surface,
      depth,
      settings.biomes,
    );
    this.spawnTileX = this.findDrySpawn(center);
  }

  surfaceTileAt(tileX: number): number {
    const { surfaceLevel, hills, verticalMargin } = this.settings;
    const relief = this.layout.reliefAt(tileX);
    let height = surfaceLevel;
    hills.forEach((hill, octave) => {
      const sample = valueNoise1D(this.seed + octave * 7919, tileX / hill.wavelength);
      height += (sample * 2 - 1) * hill.amplitude * relief;
    });
    const lowest = this.heightTiles - verticalMargin;
    return Math.min(lowest, Math.max(verticalMargin, Math.round(height)));
  }

  biomeAt(tileX: number, tileY: number): BiomeDefinition {
    return this.resolvedBiomeAt(tileX, tileY).definition;
  }

  backgroundAt(tileX: number, tileY: number): number {
    const surface = this.surfaceTileAt(tileX);
    if (tileY < surface) return AIR;
    return tileY <= this.soilEndAt(tileX, surface)
      ? this.layout.surfaceBiomeAt(tileX).soil
      : this.resolvedBiomeAt(tileX, tileY).rock;
  }

  generateChunk(chunkX: number, chunkY: number): Uint16Array {
    const size = this.dimensions.chunkSize;
    const tiles = new Uint16Array(size * size);
    for (let x = 0; x < size; x++) {
      const tileX = chunkX * size + x;
      const surface = this.surfaceTileAt(tileX);
      const soilEnd = this.soilEndAt(tileX, surface);
      const biome = this.layout.surfaceBiomeAt(tileX);
      for (let y = 0; y < size; y++) {
        const tileY = chunkY * size + y;
        tiles[y * size + x] =
          tileY < surface
            ? AIR
            : tileY === surface
              ? biome.surface
              : tileY <= soilEnd
                ? biome.soil
                : this.resolvedBiomeAt(tileX, tileY).rock;
      }
    }
    const draft: ChunkDraft = {
      chunkX,
      chunkY,
      size,
      tiles,
      heightTiles: this.heightTiles,
      verticalMargin: this.settings.verticalMargin,
      waterLevel: this.settings.waterLevel,
      spawnTileX: this.spawnTileX,
      surfaceAt: (tileX) => this.surfaceTileAt(tileX),
      surfaceBiomeAt: (tileX) => this.layout.surfaceBiomeAt(tileX),
      biomeAt: (tileX, tileY) => this.resolvedBiomeAt(tileX, tileY),
    };
    for (const feature of this.features) feature(draft);
    return tiles;
  }

  private resolvedBiomeAt(tileX: number, tileY: number): GenerationBiome {
    return this.layout.depthBiomeAt(tileX, tileY) ?? this.layout.surfaceBiomeAt(tileX);
  }

  private soilEndAt(tileX: number, surface: number): number {
    const { soilDepthMin, soilDepthMax } = this.settings;
    const soilNoise = valueNoise1D(this.seed ^ SOIL_NOISE_SEED, tileX / SOIL_NOISE_WAVELENGTH);
    return surface + soilDepthMin + Math.round(soilNoise * (soilDepthMax - soilDepthMin));
  }

  /** La columna más cercana al centro que queda sobre el nivel del agua. */
  private findDrySpawn(center: number): number {
    for (let offset = 0; offset <= SPAWN_SEARCH_TILES; offset++) {
      for (const tileX of [center + offset, center - offset]) {
        if (this.surfaceTileAt(tileX) < this.settings.waterLevel) return tileX;
      }
    }
    return center;
  }
}

function resolveBiome(biome: BiomeDefinition, blocks: BlockRegistry): GenerationBiome {
  const { ground, placement } = biome;
  const rock = blocks.indexOf(ground.rock);
  return {
    definition: biome,
    surface: ground.surface === undefined ? rock : blocks.indexOf(ground.surface),
    soil: ground.soil === undefined ? rock : blocks.indexOf(ground.soil),
    rock,
    lake: ground.lake === undefined ? AIR : blocks.indexOf(ground.lake),
    relief: biome.relief ?? 1,
    weight: placement.layer === 'surface' ? placement.weight : 0,
    plants: (biome.plants ?? []).map((plant) => ({
      ...plant,
      stem: blocks.indexOf(plant.stem),
      crown: plant.crown && { ...plant.crown, block: blocks.indexOf(plant.crown.block) },
    })),
    veins: (biome.veins ?? []).map((vein) => ({ ...vein, block: blocks.indexOf(vein.block) })),
  };
}
