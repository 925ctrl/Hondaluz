import type { RandomSource } from '../../../core/utils/random';
import type { EnemyRegistry } from '../../../domain/catalog/GameContent';
import type { EnemyDefinition } from '../../../domain/enemies/EnemyDefinition';
import type { EnemyRoster } from '../../../domain/enemies/EnemyRoster';
import { overlapsSolid, type Box } from '../../../domain/physics/tileCollision';
import type { WorldClock } from '../../../domain/world/WorldClock';
import type { WorldMap } from '../../../domain/world/WorldMap';

export interface SpawnSettings {
  readonly intervalSeconds: number;
  /** Criaturas como máximo alrededor del jugador, de día y de noche. */
  readonly maxDay: number;
  readonly maxNight: number;
  /** Distancia horizontal, en bloques, a la que aparecen: fuera de la vista pero no muy lejos. */
  readonly minDistanceTiles: number;
  readonly maxDistanceTiles: number;
  /** Las criaturas más lejanas que esto, en bloques, desaparecen. */
  readonly despawnDistanceTiles: number;
  /** Altura, en bloques, a la que vuelan las criaturas aéreas sobre la superficie. */
  readonly skyHeightMin: number;
  readonly skyHeightMax: number;
  /** Margen vertical, en bloques, alrededor del jugador en el que aparecen las subterráneas. */
  readonly undergroundSpreadTiles: number;
  readonly attemptsPerSpawn: number;
}

export interface SpawnerDeps {
  readonly definitions: EnemyRegistry;
  readonly roster: EnemyRoster;
  readonly map: WorldMap;
  readonly clock: WorldClock;
  readonly player: Box;
  readonly tileSize: number;
  readonly random: RandomSource;
  readonly settings: SpawnSettings;
}

/**
 * Aparición y retirada de criaturas alrededor del jugador, según la hora, la zona de cada
 * criatura y un límite de población.
 */
export class EnemySpawner {
  private timer = 0;

  constructor(private readonly deps: SpawnerDeps) {}

  update(dt: number): void {
    this.despawnFar();
    this.timer += dt;
    if (this.timer < this.deps.settings.intervalSeconds) return;
    this.timer = 0;
    const { clock, roster, settings } = this.deps;
    if (roster.all.length >= (clock.isNight ? settings.maxNight : settings.maxDay)) return;
    this.trySpawn();
  }

  /** Intenta colocar una criatura elegida según su peso. Devuelve si lo ha conseguido. */
  trySpawn(): boolean {
    const { roster, settings, random } = this.deps;
    const candidates = this.deps.definitions.all.filter(
      (definition) => !definition.spawn.nightOnly || this.deps.clock.isNight,
    );
    const definition = pickWeighted(candidates, random);
    if (!definition) return false;
    for (let attempt = 0; attempt < settings.attemptsPerSpawn; attempt++) {
      const spot = this.findSpot(definition);
      if (spot) {
        roster.add(definition, spot.x, spot.y);
        return true;
      }
    }
    return false;
  }

  private findSpot(definition: EnemyDefinition): { x: number; y: number } | null {
    const { map, player, tileSize, random, settings } = this.deps;
    const side = random() < 0.5 ? -1 : 1;
    const distance =
      settings.minDistanceTiles +
      random() * (settings.maxDistanceTiles - settings.minDistanceTiles);
    const tileX = Math.floor((player.x + player.width / 2) / tileSize + side * distance);
    if (!map.isInBounds(tileX, 0)) return null;
    const surface = this.surfaceAt(tileX);
    if (surface === null) return null;
    const { width, height } = definition;
    const x = tileX * tileSize + (tileSize - width) / 2;

    switch (definition.spawn.zone) {
      case 'surface':
        return this.freeSpot({ x, y: surface * tileSize - height, width, height });
      case 'sky': {
        const lift =
          settings.skyHeightMin + random() * (settings.skyHeightMax - settings.skyHeightMin);
        return this.freeSpot({ x, y: (surface - lift) * tileSize, width, height });
      }
      case 'underground': {
        const playerTileY = Math.floor((player.y + player.height / 2) / tileSize);
        const spread = settings.undergroundSpreadTiles;
        const tileY = playerTileY + Math.round((random() * 2 - 1) * spread);
        if (tileY - surface < (definition.spawn.minDepth ?? 0)) return null;
        if (!map.isInBounds(tileX, tileY) || !map.isSolid(tileX, tileY)) return null;
        return { x, y: tileY * tileSize };
      }
    }
  }

  private freeSpot(box: Box): { x: number; y: number } | null {
    if (box.y < 0 || overlapsSolid(box, this.deps.map, this.deps.tileSize)) return null;
    return { x: box.x, y: box.y };
  }

  /** Fila del primer bloque sólido de una columna, contando las modificaciones del jugador. */
  private surfaceAt(tileX: number): number | null {
    const { map } = this.deps;
    const height = map.dimensions.heightChunks * map.dimensions.chunkSize;
    for (let tileY = 0; tileY < height; tileY++) {
      if (map.isSolid(tileX, tileY)) return tileY;
    }
    return null;
  }

  private despawnFar(): void {
    const { roster, player, tileSize, settings } = this.deps;
    const limit = settings.despawnDistanceTiles * tileSize;
    for (const enemy of [...roster.all]) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      if (Math.hypot(dx, dy) > limit) roster.remove(enemy);
    }
  }
}

function pickWeighted<T extends { readonly spawn: { readonly weight: number } }>(
  options: readonly T[],
  random: RandomSource,
): T | undefined {
  const total = options.reduce((sum, option) => sum + option.spawn.weight, 0);
  let roll = random() * total;
  for (const option of options) {
    roll -= option.spawn.weight;
    if (roll < 0) return option;
  }
  return options.at(-1);
}
