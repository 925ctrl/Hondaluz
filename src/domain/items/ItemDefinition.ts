import type { PixelSprite } from '../catalog/PixelSprite';

/** Familias de herramienta. Un bloque indica cuál lo trabaja. */
export type ToolKind = 'pickaxe';

export interface ToolStats {
  readonly kind: ToolKind;
  /** Nivel de la herramienta: decide qué bloques puede romper. */
  readonly tier: number;
  /** Potencia de minado: divide el tiempo que marca la dureza del bloque. */
  readonly power: number;
}

export interface WeaponStats {
  readonly damage: number;
  /** Segundos entre dos golpes. */
  readonly cooldownSeconds: number;
  /** Alcance del golpe por delante del jugador, en píxeles. */
  readonly reach: number;
  /** Velocidad con la que empuja al enemigo, en píxeles por segundo. */
  readonly knockback: number;
}

export interface ConsumableStats {
  /** Vida que recupera al usarlo. */
  readonly heal: number;
}

export interface ItemDefinition {
  /** Identificador estable: es lo que se guarda en inventarios y partidas. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Unidades que caben en una ranura. */
  readonly maxStack: number;
  /** Id del bloque que coloca en el mundo, si es un objeto colocable. */
  readonly placesBlock?: string;
  /** Icono propio. Si falta, se usa el dibujo del bloque que coloca. */
  readonly icon?: PixelSprite;
  readonly tool?: ToolStats;
  readonly weapon?: WeaponStats;
  readonly consumable?: ConsumableStats;
}

/** Cantidad de un mismo objeto en una ranura o en el suelo. */
export interface ItemStack {
  readonly itemId: string;
  readonly count: number;
}
