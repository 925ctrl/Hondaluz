import type { RandomSource } from '../../../core/utils/random';
import type { GameContent } from '../../../domain/catalog/GameContent';
import { EnemyRoster } from '../../../domain/enemies/EnemyRoster';
import { Player, type PlayerTuning } from '../../../domain/entities/Player';
import type { WorldMeta } from '../../../domain/entities/World';
import { overlapsSolid } from '../../../domain/physics/tileCollision';
import type { WorldSave, WorldState } from '../../../domain/repositories/WorldSaveRepository';
import { HappeningLog } from '../../../domain/events/Happenings';
import { Inventory } from '../../../domain/inventory/Inventory';
import { DroppedItems, type DropSettings } from '../../../domain/items/DroppedItems';
import { WorldClock, type DayCycleSettings } from '../../../domain/world/WorldClock';
import type { WorldDimensions } from '../../../domain/world/WorldDimensions';
import type { WorldGenerator } from '../../../domain/world/WorldGenerator';
import { WorldMap } from '../../../domain/world/WorldMap';
import { TileSimulation, type TileSimulationSettings } from '../../../domain/world/TileSimulation';
import { BlockPlacer } from '../building/BlockPlacer';
import { CombatService, type CombatSettings } from '../combat/CombatService';
import { EnemySpawner, type SpawnSettings } from '../combat/EnemySpawner';
import { CraftingService } from '../crafting/CraftingService';
import { MiningService } from '../mining/MiningService';

/** Estado vivo de una partida y los casos de uso que actúan sobre él. */
export interface WorldSession {
  readonly meta: WorldMeta;
  readonly tileSize: number;
  readonly random: RandomSource;
  readonly map: WorldMap;
  /** Lo que acaba de pasar, para que la presentación lo cuente con sonido y partículas. */
  readonly happenings: HappeningLog;
  /** Agua que fluye y arena que cae. */
  readonly tiles: TileSimulation;
  readonly clock: WorldClock;
  readonly player: Player;
  readonly inventory: Inventory;
  readonly drops: DroppedItems;
  readonly enemies: EnemyRoster;
  readonly mining: MiningService;
  readonly building: BlockPlacer;
  readonly crafting: CraftingService;
  readonly combat: CombatService;
  readonly spawner: EnemySpawner;
  /** Devuelve al jugador, con la vida completa, al punto de aparición del mundo. */
  respawnPlayer(): void;
  /** Estado actual para guardarlo (los bloques se guardan aparte, por chunks). */
  captureState(): WorldState;
}

export type WorldSessionFactory = (meta: WorldMeta, save?: WorldSave) => WorldSession;

export interface WorldSessionDeps {
  readonly content: GameContent;
  readonly dimensions: WorldDimensions;
  readonly tileSize: number;
  readonly playerTuning: PlayerTuning;
  readonly playerMaxHealth: number;
  readonly generator: WorldGenerator;
  readonly tileSimulation: TileSimulationSettings;
  readonly inventory: { readonly size: number; readonly hotbarSize: number };
  readonly drops: DropSettings;
  readonly reachTiles: number;
  readonly handMiningPower: number;
  readonly combat: CombatSettings;
  readonly spawning: SpawnSettings;
  readonly dayCycle: DayCycleSettings & { readonly startTime: number };
  readonly random: RandomSource;
  readonly onInventoryChange: () => void;
}

/**
 * Abre un mundo. Sin guardado, el jugador empieza de pie en su punto de aparición; con él,
 * se restauran los bloques cambiados, el jugador, el inventario y la hora.
 */
export function createWorldSession(
  meta: WorldMeta,
  deps: WorldSessionDeps,
  save?: WorldSave,
): WorldSession {
  const { content, dimensions, tileSize, playerTuning, generator, reachTiles, random } = deps;
  const { blocks, items, recipes } = content;
  const spawnTileX = generator.spawnTileX;
  const spawnPoint = {
    x: spawnTileX * tileSize + (tileSize - playerTuning.width) / 2,
    y: generator.surfaceTileAt(spawnTileX) * tileSize - playerTuning.height,
  };
  const player = new Player(playerTuning, spawnPoint.x, spawnPoint.y, deps.playerMaxHealth);
  const map = new WorldMap(dimensions, generator, blocks.all);
  const saved = save?.state;
  const clock = saved
    ? new WorldClock(deps.dayCycle, saved.clock.time, saved.clock.day)
    : new WorldClock(deps.dayCycle, deps.dayCycle.startTime);
  const inventory = new Inventory(
    deps.inventory.size,
    deps.inventory.hotbarSize,
    (itemId) => items.get(itemId).maxStack,
    deps.onInventoryChange,
  );
  if (save) {
    for (const chunk of save.chunks) map.restoreChunk(chunk.chunkX, chunk.chunkY, chunk.tiles);
  }
  if (saved) {
    // Lo que el juego ya no reconoce se descarta en lugar de impedir cargar la partida.
    const slots = saved.inventory.slots.map((stack) =>
      stack && items.has(stack.itemId) ? stack : null,
    );
    inventory.restore(slots, saved.inventory.selected);
    const box = {
      x: saved.player.x,
      y: saved.player.y,
      width: player.width,
      height: player.height,
    };
    // Quien guardó caído, o en un sitio que ya no es válido, vuelve al punto de aparición.
    if (
      saved.player.health > 0 &&
      map.isInBounds(Math.floor(box.x / tileSize), Math.floor(box.y / tileSize)) &&
      !overlapsSolid(box, map, tileSize)
    ) {
      player.x = box.x;
      player.y = box.y;
      player.health.setCurrent(saved.player.health);
    }
  }
  const drops = new DroppedItems(deps.drops);
  const enemies = new EnemyRoster();
  const happenings = new HappeningLog();
  const combat = new CombatService({
    player,
    enemies,
    held: inventory,
    items,
    drops,
    random,
    settings: deps.combat,
    happenings,
  });
  return {
    meta,
    tileSize,
    random,
    map,
    happenings,
    tiles: new TileSimulation(map, blocks.all, deps.tileSimulation),
    clock,
    player,
    inventory,
    drops,
    enemies,
    mining: new MiningService({
      map,
      blocks,
      items,
      tool: inventory,
      handPower: deps.handMiningPower,
      drops,
      tileSize,
      reachTiles,
      happenings,
    }),
    building: new BlockPlacer({
      map,
      blocks,
      items,
      source: inventory,
      tileSize,
      reachTiles,
      happenings,
    }),
    crafting: new CraftingService({
      recipes,
      blocks,
      map,
      pouch: inventory,
      tileSize,
      reachTiles,
      // Lo que no cabe en el inventario cae a los pies del jugador.
      overflow: (itemId, count) => {
        drops.spawn(itemId, count, player.x + player.width / 2, player.y + player.height / 2);
      },
      happenings,
    }),
    combat,
    spawner: new EnemySpawner({
      definitions: content.enemies,
      roster: enemies,
      map,
      clock,
      player,
      tileSize,
      random,
      settings: deps.spawning,
    }),
    respawnPlayer: () => {
      player.respawn(spawnPoint.x, spawnPoint.y);
      combat.reset();
    },
    captureState: () => ({
      player: { x: player.x, y: player.y, health: player.health.current },
      inventory: { slots: inventory.snapshot(), selected: inventory.selectedIndex },
      clock: { day: clock.day, time: clock.time },
    }),
  };
}
