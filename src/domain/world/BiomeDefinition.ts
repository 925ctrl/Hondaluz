import { ContentError } from '../../core/errors/ContentError';
import { Registry } from '../../core/registry/Registry';
import { AIR_ID, type BlockRegistry } from './BlockDefinition';

/** Vegetación que crece sobre la superficie: un tallo y, opcionalmente, una copa. */
export interface PlantDefinition {
  /** Bloque del tallo o tronco. */
  readonly stem: string;
  readonly crown?: {
    readonly block: string;
    /** `round`: copa redonda. `cone`: copa en punta, como un pino. */
    readonly shape: 'round' | 'cone';
    readonly radius: number;
  };
  /** Ancho de las franjas de columnas; en cada una crece como mucho una planta. */
  readonly cellSize: number;
  /** Probabilidad de que una franja tenga planta. */
  readonly chance: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

/** Veta de mineral propia de un bioma, que sustituye a su roca. */
export interface BiomeVein {
  readonly block: string;
  /** Tamaño aproximado de las vetas, en bloques. */
  readonly scale: number;
  /** Umbral de ruido (0-1): cuanto más alto, más escaso. */
  readonly threshold: number;
}

/** Bioma de superficie: ocupa franjas de columnas de lado a lado. */
export interface SurfacePlacement {
  readonly layer: 'surface';
  /** Frecuencia relativa con la que se elige frente a los demás biomas de superficie. */
  readonly weight: number;
  /** El bioma en el que aparece el jugador. Debe haber exactamente uno. */
  readonly spawn?: boolean;
}

/** Bioma de profundidad: sustituye la roca a partir de una fila del mundo. */
export interface DepthPlacement {
  readonly layer: 'depth';
  readonly fromRow: number;
}

/**
 * Un bioma como datos: dónde aparece, de qué está hecho y qué crece en él.
 * Añadir uno es añadir una definición; el generador no cambia.
 */
export interface BiomeDefinition {
  readonly id: string;
  readonly name: string;
  readonly placement: SurfacePlacement | DepthPlacement;
  readonly ground: {
    /** Bloque de la superficie (biomas de superficie). */
    readonly surface?: string;
    /** Capa bajo la superficie (biomas de superficie). */
    readonly soil?: string;
    /** Roca que forma el subsuelo. */
    readonly rock: string;
    /** Lo que llena los valles bajo el nivel del agua (biomas de superficie). */
    readonly lake?: string;
  };
  /** Multiplica la altura de las colinas: menos de 1 aplana, más de 1 escarpa. */
  readonly relief?: number;
  readonly plants?: readonly PlantDefinition[];
  readonly veins?: readonly BiomeVein[];
}

/** Radio máximo de una copa, en bloques: acota lo que un chunk mira de sus vecinos. */
export const MAX_CROWN_RADIUS = 4;

export type BiomeRegistry = Registry<BiomeDefinition>;

/** Registra los biomas y comprueba sus bloques y su colocación. */
export function createBiomeRegistry(
  definitions: readonly BiomeDefinition[],
  blocks: BlockRegistry,
): BiomeRegistry {
  const registry = new Registry('bioma', definitions);
  const requireBlock = (biome: BiomeDefinition, blockId: string | undefined): void => {
    if (blockId === undefined || blockId === AIR_ID || !blocks.has(blockId)) {
      throw new ContentError(
        `El bioma "${biome.id}" usa un bloque inexistente: "${blockId ?? '(ninguno)'}".`,
      );
    }
  };
  const surface = registry.all.filter((biome) => biome.placement.layer === 'surface');
  const spawns = surface.filter(
    (biome) => biome.placement.layer === 'surface' && biome.placement.spawn === true,
  );
  if (definitions.length > 0 && spawns.length !== 1) {
    throw new ContentError('Debe haber exactamente un bioma de superficie de aparición.');
  }
  for (const biome of registry.all) {
    const { ground, placement } = biome;
    requireBlock(biome, ground.rock);
    if (placement.layer === 'surface') {
      requireBlock(biome, ground.surface);
      requireBlock(biome, ground.soil);
      requireBlock(biome, ground.lake);
      if (placement.weight <= 0) {
        throw new ContentError(`El bioma "${biome.id}" necesita un peso positivo.`);
      }
    }
    if ((biome.relief ?? 1) < 0) {
      throw new ContentError(`El relieve del bioma "${biome.id}" no puede ser negativo.`);
    }
    for (const plant of biome.plants ?? []) {
      requireBlock(biome, plant.stem);
      if (plant.crown) requireBlock(biome, plant.crown.block);
      if (
        plant.cellSize < 1 ||
        plant.minHeight < 1 ||
        plant.maxHeight < plant.minHeight ||
        plant.chance <= 0 ||
        plant.chance > 1 ||
        (plant.crown !== undefined &&
          (plant.crown.radius < 1 || plant.crown.radius > MAX_CROWN_RADIUS))
      ) {
        throw new ContentError(`Una planta del bioma "${biome.id}" tiene valores inválidos.`);
      }
    }
    for (const vein of biome.veins ?? []) requireBlock(biome, vein.block);
  }
  return registry;
}
