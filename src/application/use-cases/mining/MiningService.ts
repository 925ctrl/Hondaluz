import type { ItemRegistry } from '../../../domain/catalog/GameContent';
import type { HeldItemSource } from '../../../domain/inventory/InventoryPort';
import type { HappeningLog } from '../../../domain/events/Happenings';
import type { DroppedItems } from '../../../domain/items/DroppedItems';
import type { Box } from '../../../domain/physics/tileCollision';
import { miningPower } from '../../../domain/rules/mining';
import { solidNeighbors, tileWithinReach } from '../../../domain/rules/reach';
import { AIR, type BlockRegistry } from '../../../domain/world/BlockDefinition';
import type { ChunkCoord } from '../../../domain/world/ChunkRange';
import type { WorldMap } from '../../../domain/world/WorldMap';

export interface MiningDeps {
  readonly map: WorldMap;
  readonly blocks: BlockRegistry;
  readonly items: ItemRegistry;
  /** De dónde sale la herramienta con la que se mina. */
  readonly tool: HeldItemSource;
  /** Potencia de minado sin herramienta adecuada. */
  readonly handPower: number;
  readonly drops: DroppedItems;
  readonly tileSize: number;
  readonly reachTiles: number;
  readonly happenings: HappeningLog;
}

/** Bloque que se está minando y fracción completada (0-1). */
export interface MiningProgress {
  readonly x: number;
  readonly y: number;
  readonly progress: number;
}

const NEIGHBOR_COUNT = 4;

/**
 * Minería: acumula daño sobre el bloque apuntado y, al romperlo, lo quita del mundo
 * y suelta su botín. El progreso se pierde al cambiar de bloque o dejar de minar.
 */
export class MiningService {
  private state: MiningProgress | null = null;

  constructor(private readonly deps: MiningDeps) {}

  get current(): MiningProgress | null {
    return this.state;
  }

  /**
   * Potencia con la que se minaría ese bloque con lo que se lleva en la mano;
   * 0 si no es rompible o exige una herramienta mejor.
   */
  powerFor(tileX: number, tileY: number): number {
    const { map, blocks, items, tool, handPower } = this.deps;
    const block = blocks.at(map.tileAt(tileX, tileY));
    if (block.hardness === undefined) return 0;
    const held = tool.held();
    return miningPower(block, held ? items.get(held.itemId).tool : undefined, handPower);
  }

  /** El bloque es rompible y está a mano, pero la herramienta actual no basta. */
  needsBetterTool(miner: Box, tileX: number, tileY: number): boolean {
    const { map, blocks } = this.deps;
    return (
      this.isAccessible(miner, tileX, tileY) &&
      blocks.at(map.tileAt(tileX, tileY)).hardness !== undefined &&
      this.powerFor(tileX, tileY) === 0
    );
  }

  /**
   * Un bloque se puede minar si es rompible con la herramienta actual, está al alcance y
   * tiene al menos una cara al aire: no se pueden romper bloques enterrados tras otros.
   */
  canMine(miner: Box, tileX: number, tileY: number): boolean {
    return this.isAccessible(miner, tileX, tileY) && this.powerFor(tileX, tileY) > 0;
  }

  /** Mina durante `dt` segundos. Devuelve el bloque roto en esta llamada, si lo hay. */
  update(miner: Box, target: ChunkCoord | null, dt: number): ChunkCoord | null {
    if (!target || !this.canMine(miner, target.x, target.y)) {
      this.state = null;
      return null;
    }
    const { map, blocks, drops, tileSize } = this.deps;
    const block = blocks.at(map.tileAt(target.x, target.y));
    const previous =
      this.state?.x === target.x && this.state.y === target.y ? this.state.progress : 0;
    const power = this.powerFor(target.x, target.y);
    const progress = previous + (dt * power) / (block.hardness ?? Infinity);
    if (progress < 1) {
      this.state = { x: target.x, y: target.y, progress };
      return null;
    }

    this.state = null;
    const brokenBlock = map.tileAt(target.x, target.y);
    map.setTile(target.x, target.y, AIR);
    this.deps.happenings.push({
      kind: 'block-broken',
      x: (target.x + 0.5) * tileSize,
      y: (target.y + 0.5) * tileSize,
      block: brokenBlock,
    });
    for (const drop of block.drops ?? []) {
      drops.spawn(
        drop.itemId,
        drop.count,
        (target.x + 0.5) * tileSize,
        (target.y + 0.5) * tileSize,
      );
    }
    return target;
  }

  private isAccessible(miner: Box, tileX: number, tileY: number): boolean {
    const { map, tileSize, reachTiles } = this.deps;
    return (
      map.isInBounds(tileX, tileY) &&
      tileWithinReach(miner, tileX, tileY, tileSize, reachTiles) &&
      solidNeighbors(map, tileX, tileY) < NEIGHBOR_COUNT
    );
  }

  stop(): void {
    this.state = null;
  }
}
