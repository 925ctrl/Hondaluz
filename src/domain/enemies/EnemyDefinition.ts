import type { PixelSprite } from '../catalog/PixelSprite';

/** Comportamientos disponibles. Cada uno vive en su propio archivo en `behaviors/`. */
export type EnemyBehaviorId = 'walker' | 'flyer' | 'burrower';

/** Dónde aparece: sobre el suelo, en el aire sobre la superficie o dentro de la roca. */
export type SpawnZone = 'surface' | 'sky' | 'underground';

export interface EnemyDrop {
  readonly itemId: string;
  readonly count: number;
  /** Probabilidad de soltarlo (0-1). */
  readonly chance: number;
}

export interface EnemySpawnRule {
  readonly zone: SpawnZone;
  /** Solo aparece de noche. */
  readonly nightOnly: boolean;
  /** Peso relativo frente a los demás enemigos que pueden aparecer en ese momento. */
  readonly weight: number;
  /** Bloques bajo la superficie a partir de los que aparece (zona subterránea). */
  readonly minDepth?: number;
}

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly maxHealth: number;
  /** Daño que hace al tocar al jugador. */
  readonly damage: number;
  /** Velocidad máxima, en píxeles por segundo. */
  readonly speed: number;
  /** Distancia, en bloques, a la que detecta al jugador. */
  readonly detectionRange: number;
  /** Caja de colisión en píxeles. El dibujo se apoya en su borde inferior. */
  readonly width: number;
  readonly height: number;
  readonly behavior: EnemyBehaviorId;
  /** Fracción del retroceso que ignora al recibir un golpe (0-1). */
  readonly knockbackResistance: number;
  readonly drops: readonly EnemyDrop[];
  readonly spawn: EnemySpawnRule;
  /** Fotogramas de su animación, mirando a la derecha. */
  readonly frames: readonly PixelSprite[];
}
