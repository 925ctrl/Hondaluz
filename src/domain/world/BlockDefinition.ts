import { ContentError } from '../../core/errors/ContentError';
import { Registry } from '../../core/registry/Registry';
import { validatePixelSprite, type PixelSprite } from '../catalog/PixelSprite';
import type { ToolKind } from '../items/ItemDefinition';

/** Aspecto generado a partir de colores y una textura de grano. */
export interface GrainVisual {
  readonly base: number;
  readonly shade: number;
  readonly highlight: number;
  /** `fine`: motas (tierra). `coarse`: manchas (roca, hojas). `bark`: vetas verticales (tronco). */
  readonly grain: 'fine' | 'coarse' | 'bark';
  /** Capa superior de otro material, como la hierba sobre la tierra. */
  readonly cap?: {
    readonly base: number;
    readonly highlight: number;
    readonly depth: number;
  };
  /** Pepitas incrustadas, como el mineral en la roca. */
  readonly flecks?: { readonly color: number; readonly highlight: number };
  /** Opacidad (0-1) para materiales translúcidos como el agua. Sin valor, opaco. */
  readonly alpha?: number;
}

/** Aspecto dibujado a mano, píxel a píxel. */
export interface SpriteVisual {
  readonly sprite: PixelSprite;
}

/** Aspecto de un bloque como datos: el dibujo lo genera la capa de presentación. */
export type BlockVisual = GrainVisual | SpriteVisual;

export interface BlockDefinition {
  /** Identificador estable: no debe cambiar aunque cambien el nombre o el aspecto. */
  readonly id: string;
  readonly name: string;
  readonly solid: boolean;
  /** Ausente en bloques que no se dibujan, como el aire. */
  readonly visual?: BlockVisual;
  /** Segundos que tarda en romperse con potencia de minado 1. Ausente: no se puede minar. */
  readonly hardness?: number;
  /** Herramienta que lo trabaja: con ella se aplica la potencia de la herramienta. */
  readonly tool?: ToolKind;
  /** Nivel mínimo de esa herramienta para poder romperlo. Sin valor, se rompe también a mano. */
  readonly minToolTier?: number;
  /** Objetos que suelta al romperse. */
  readonly drops?: readonly BlockDrop[];
  /** Luz que emite, de 1 a `MAX_LIGHT`. Sin valor, no emite. */
  readonly light?: number;
  /**
   * `liquid`: fluye hacia abajo y a los lados, no es sólido y se puede construir encima.
   * `falling`: cae cuando queda sin apoyo, como la arena.
   */
  readonly physics?: 'liquid' | 'falling';
}

export interface BlockDrop {
  readonly itemId: string;
  readonly count: number;
}

/** Índice del bloque vacío. El registro de bloques garantiza que sea siempre el primero. */
export const AIR = 0;
export const AIR_ID = 'air';

/** Nivel máximo de luz, el del sol a cielo abierto. */
export const MAX_LIGHT = 15;

export type BlockRegistry = Registry<BlockDefinition>;

export function createBlockRegistry(definitions: readonly BlockDefinition[]): BlockRegistry {
  const registry = new Registry('bloque', definitions);
  if (definitions[AIR]?.id !== AIR_ID) {
    throw new ContentError(`El primer bloque registrado debe ser "${AIR_ID}".`);
  }
  for (const block of definitions) {
    if (block.solid && !block.visual) {
      throw new ContentError(`El bloque sólido "${block.id}" necesita un aspecto.`);
    }
    if (block.visual && 'sprite' in block.visual)
      validatePixelSprite(block.visual.sprite, block.id);
    if (block.minToolTier !== undefined && block.tool === undefined) {
      throw new ContentError(
        `El bloque "${block.id}" exige un nivel de herramienta sin decir cuál.`,
      );
    }
    if (
      block.light !== undefined &&
      (!Number.isInteger(block.light) || block.light < 1 || block.light > MAX_LIGHT)
    ) {
      throw new ContentError(
        `La luz del bloque "${block.id}" debe ser un entero entre 1 y ${String(MAX_LIGHT)}.`,
      );
    }
    if (block.physics === 'liquid' && (block.solid || block.hardness !== undefined)) {
      throw new ContentError(`El líquido "${block.id}" no puede ser sólido ni minable.`);
    }
    if (block.physics === 'falling' && !block.solid) {
      throw new ContentError(`El bloque que cae "${block.id}" debe ser sólido.`);
    }
    if (block.hardness !== undefined && block.hardness <= 0) {
      throw new ContentError(`La dureza del bloque "${block.id}" debe ser mayor que cero.`);
    }
  }
  return registry;
}
