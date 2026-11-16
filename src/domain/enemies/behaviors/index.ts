import type { EnemyBehaviorId } from '../EnemyDefinition';
import { burrower } from './burrower';
import type { EnemyBehavior } from './EnemyBehavior';
import { flyer } from './flyer';
import { walker } from './walker';

/**
 * Comportamientos por id. Un enemigo nuevo que reutiliza uno existente solo necesita su
 * definición; un comportamiento nuevo es un archivo más y una entrada aquí.
 */
export const ENEMY_BEHAVIORS: Readonly<Record<EnemyBehaviorId, EnemyBehavior>> = {
  walker,
  flyer,
  burrower,
};
