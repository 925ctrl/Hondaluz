import type { ItemStore } from '../inventory/InventoryPort';
import { moveBox, type Box } from '../physics/tileCollision';
import type { TileQuery } from '../world/WorldMap';

/** Objeto suelto en el mundo. `x`, `y` son su esquina superior izquierda. */
export interface DroppedItem {
  readonly id: number;
  readonly itemId: string;
  count: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Parámetros de los objetos sueltos, en píxeles y segundos. */
export interface DropSettings {
  readonly size: number;
  readonly gravity: number;
  readonly maxFallSpeed: number;
  /** Velocidad del pequeño salto con el que aparecen. */
  readonly popSpeed: number;
  /** Distancia a la que empiezan a volar hacia quien los recoge. */
  readonly magnetRadius: number;
  readonly magnetSpeed: number;
  /** Distancia a la que pasan al inventario. */
  readonly pickupRadius: number;
}

/** Objetos caídos del mundo: caen, son atraídos por el jugador y se recogen solos. */
export class DroppedItems {
  private readonly drops: DroppedItem[] = [];
  private nextId = 1;

  constructor(private readonly settings: DropSettings) {}

  get items(): readonly DroppedItem[] {
    return this.drops;
  }

  /** Suelta un objeto centrado en un punto del mundo. */
  spawn(itemId: string, count: number, centerX: number, centerY: number): void {
    const { size, popSpeed } = this.settings;
    this.drops.push({
      id: this.nextId++,
      itemId,
      count,
      x: centerX - size / 2,
      y: centerY - size / 2,
      vx: 0,
      vy: -popSpeed,
    });
  }

  /** `onPickup` se invoca con cada objeto que el jugador recoge. */
  step(
    dt: number,
    tiles: TileQuery,
    tileSize: number,
    collector: Box,
    store: ItemStore,
    onPickup: (itemId: string) => void = () => undefined,
  ): void {
    const s = this.settings;
    const targetX = collector.x + collector.width / 2;
    const targetY = collector.y + collector.height / 2;

    for (let index = this.drops.length - 1; index >= 0; index--) {
      const drop = this.drops[index];
      if (!drop) continue;
      const dx = targetX - (drop.x + s.size / 2);
      const dy = targetY - (drop.y + s.size / 2);
      const distance = Math.hypot(dx, dy);

      // Si no cabe en el inventario, el objeto se queda en el suelo sin perseguir al jugador.
      if (distance <= s.magnetRadius && store.capacityFor(drop.itemId) > 0) {
        if (distance <= s.pickupRadius) {
          const before = drop.count;
          drop.count = store.add(drop.itemId, drop.count);
          if (drop.count < before) onPickup(drop.itemId);
          if (drop.count === 0) this.drops.splice(index, 1);
          continue;
        }
        const travel = Math.min(distance, s.magnetSpeed * dt);
        drop.x += (dx / distance) * travel;
        drop.y += (dy / distance) * travel;
        drop.vx = 0;
        drop.vy = 0;
        continue;
      }

      drop.vy = Math.min(s.maxFallSpeed, drop.vy + s.gravity * dt);
      const box = { x: drop.x, y: drop.y, width: s.size, height: s.size };
      const moved = moveBox(box, drop.vx * dt, drop.vy * dt, tiles, tileSize);
      drop.x = moved.x;
      drop.y = moved.y;
      if (moved.blockedY) drop.vy = 0;
    }
  }
}
