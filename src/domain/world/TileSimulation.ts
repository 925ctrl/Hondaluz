import { AIR } from './BlockDefinition';
import type { BlockTraits, WorldMap } from './WorldMap';

export interface TileSimulationSettings {
  /** Segundos entre dos pasos de la simulación: marca la velocidad del agua y la arena. */
  readonly stepSeconds: number;
  /** Bloques activos que se procesan como mucho en un paso; el resto espera al siguiente. */
  readonly maxUpdatesPerStep: number;
}

/**
 * Bloques que se mueven solos: los líquidos caen y se reparten, y la arena cae.
 * Solo se simulan los bloques activos, que despiertan cuando algo cambia a su lado; un lago
 * en reposo no cuesta nada. El agua se conserva: se mueve, nunca se copia.
 */
export class TileSimulation {
  private active = new Set<number>();
  private timer = 0;
  private tick = 0;
  private readonly liquid: readonly boolean[];
  private readonly falling: readonly boolean[];
  private readonly width: number;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly map: WorldMap,
    blocks: readonly BlockTraits[],
    private readonly settings: TileSimulationSettings,
  ) {
    this.liquid = blocks.map((block) => block.physics === 'liquid');
    this.falling = blocks.map((block) => block.physics === 'falling');
    this.width = map.dimensions.widthChunks * map.dimensions.chunkSize;
    this.unsubscribe = map.onTileChange((x, y) => {
      this.wakeAround(x, y);
    });
  }

  /** Bloques pendientes de simular. */
  get activeCount(): number {
    return this.active.size;
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < this.settings.stepSeconds) return;
    this.timer -= this.settings.stepSeconds;
    this.step();
  }

  /** Despierta un bloque y sus cuatro vecinos. */
  wakeAround(tileX: number, tileY: number): void {
    for (const [dx, dy] of NEIGHBORHOOD) {
      const x = tileX + dx;
      const y = tileY + dy;
      if (this.map.isInBounds(x, y)) this.active.add(y * this.width + x);
    }
  }

  dispose(): void {
    this.unsubscribe();
  }

  /** Un paso: de abajo arriba, para que una columna caiga en orden. */
  step(): void {
    const batch = [...this.active].sort((a, b) => b - a);
    this.active = new Set();
    this.tick++;
    const moved = new Set<number>();
    let updates = 0;
    for (const key of batch) {
      if (updates >= this.settings.maxUpdatesPerStep) {
        this.active.add(key);
        continue;
      }
      if (moved.has(key)) continue;
      const x = key % this.width;
      const y = Math.floor(key / this.width);
      const tile = this.map.tileAt(x, y);
      const target = this.liquid[tile]
        ? this.flowTarget(x, y)
        : this.falling[tile]
          ? this.fallTarget(x, y)
          : null;
      if (!target) continue;
      updates++;
      const displaced = this.map.tileAt(target.x, target.y);
      moved.add(target.y * this.width + target.x);
      this.map.setTile(target.x, target.y, tile);
      this.map.setTile(x, y, displaced);
    }
  }

  /** La arena cae a través del aire y se hunde en los líquidos, que suben a su sitio. */
  private fallTarget(x: number, y: number): { x: number; y: number } | null {
    if (!this.map.isInBounds(x, y + 1)) return null;
    const below = this.map.tileAt(x, y + 1);
    return below === AIR || this.liquid[below] ? { x, y: y + 1 } : null;
  }

  /**
   * El líquido cae si tiene aire debajo. Si no, se desliza hacia un lado cuando allí puede
   * seguir cayendo, o cuando lo empuja otro líquido desde arriba. Así un lago se nivela y
   * después se queda quieto, sin ir y venir.
   */
  private flowTarget(x: number, y: number): { x: number; y: number } | null {
    if (this.isEmpty(x, y + 1)) return { x, y: y + 1 };
    const pressed = this.liquid[this.map.tileAt(x, y - 1)] ?? false;
    const first = (this.tick + x) % 2 === 0 ? 1 : -1;
    for (const dir of [first, -first]) {
      if (!this.isEmpty(x + dir, y)) continue;
      if (this.isEmpty(x + dir, y + 1) || pressed) return { x: x + dir, y };
    }
    return null;
  }

  private isEmpty(x: number, y: number): boolean {
    return this.map.isInBounds(x, y) && this.map.tileAt(x, y) === AIR;
  }
}

const NEIGHBORHOOD = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
