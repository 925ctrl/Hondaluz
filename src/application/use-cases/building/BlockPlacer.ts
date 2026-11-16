import type { ItemRegistry } from '../../../domain/catalog/GameContent';
import type { HappeningLog } from '../../../domain/events/Happenings';
import type { HeldItemSource } from '../../../domain/inventory/InventoryPort';
import { boxesOverlap, type Box } from '../../../domain/physics/tileCollision';
import { solidNeighbors, tileWithinReach } from '../../../domain/rules/reach';
import { AIR, type BlockRegistry } from '../../../domain/world/BlockDefinition';
import type { WorldMap } from '../../../domain/world/WorldMap';

export interface BlockPlacerDeps {
  readonly map: WorldMap;
  readonly blocks: BlockRegistry;
  readonly items: ItemRegistry;
  readonly source: HeldItemSource;
  readonly tileSize: number;
  readonly reachTiles: number;
  readonly happenings: HappeningLog;
}

export type PlaceResult =
  'placed' | 'nothing-to-place' | 'occupied' | 'out-of-reach' | 'blocked-by-builder' | 'no-support';

/** Construcción: coloca en el mundo el bloque del objeto que se lleva en la mano. */
export class BlockPlacer {
  constructor(private readonly deps: BlockPlacerDeps) {}

  place(builder: Box, tileX: number, tileY: number): PlaceResult {
    const { map, blocks, items, source, tileSize, reachTiles } = this.deps;
    const held = source.held();
    const blockId = held ? items.get(held.itemId).placesBlock : undefined;
    if (blockId === undefined) return 'nothing-to-place';
    // Se construye sobre el aire y también dentro del agua, que el bloque desplaza.
    if (!map.isInBounds(tileX, tileY)) return 'occupied';
    if (map.tileAt(tileX, tileY) !== AIR && !map.isLiquid(tileX, tileY)) return 'occupied';
    if (!tileWithinReach(builder, tileX, tileY, tileSize, reachTiles)) return 'out-of-reach';

    const tileBox = { x: tileX * tileSize, y: tileY * tileSize, width: tileSize, height: tileSize };
    if (boxesOverlap(builder, tileBox)) return 'blocked-by-builder';
    // Un bloque nuevo debe apoyarse en otro: no se construye flotando en el aire.
    if (solidNeighbors(map, tileX, tileY) === 0) return 'no-support';

    const block = blocks.indexOf(blockId);
    map.setTile(tileX, tileY, block);
    source.consumeHeld(1);
    this.deps.happenings.push({
      kind: 'block-placed',
      x: (tileX + 0.5) * tileSize,
      y: (tileY + 0.5) * tileSize,
      block,
    });
    return 'placed';
  }
}
