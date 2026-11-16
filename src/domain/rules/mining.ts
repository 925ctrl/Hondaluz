import type { ToolStats } from '../items/ItemDefinition';
import type { BlockDefinition } from '../world/BlockDefinition';

/**
 * Potencia con la que se mina un bloque según lo que se lleva en la mano.
 * La herramienta solo cuenta si es del tipo que trabaja ese bloque. Devuelve 0 cuando
 * el bloque exige un nivel de herramienta que no se alcanza.
 */
export function miningPower(
  block: BlockDefinition,
  tool: ToolStats | undefined,
  handPower: number,
): number {
  const suited = tool !== undefined && tool.kind === block.tool ? tool : undefined;
  if ((block.minToolTier ?? 0) > (suited?.tier ?? 0)) return 0;
  return suited?.power ?? handPower;
}
