import { AIR, MAX_LIGHT } from './BlockDefinition';
import type { WorldMap } from './WorldMap';

export interface LightSettings {
  /** Luz que se pierde al atravesar un bloque sólido; en el resto se pierde 1 por bloque. */
  readonly solidFalloff: number;
}

/** Zona de la rejilla, en bloques. */
export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Luz de una zona del mundo en dos canales, de 0 a `MAX_LIGHT`:
 * - **cielo**: baja en vertical, sin perderse, por las columnas abiertas al cielo y se
 *   reparte desde ahí. La hora del día decide después cuánto ilumina.
 * - **bloques**: sale de los bloques que emiten luz, como antorchas y cristales.
 *
 * Fuera de la zona no se conoce la luz: quien la calcula debe pedir un margen de al menos
 * `MAX_LIGHT` bloques alrededor de lo que quiera mostrar.
 */
export class LightField {
  readonly sky: Uint8Array;
  readonly block: Uint8Array;

  private constructor(readonly rect: TileRect) {
    this.sky = new Uint8Array(rect.width * rect.height);
    this.block = new Uint8Array(rect.width * rect.height);
  }

  static compute(
    map: WorldMap,
    /** Luz que emite cada bloque, por índice (0 si no emite). */
    emission: readonly number[],
    solid: readonly boolean[],
    rect: TileRect,
    settings: LightSettings,
  ): LightField {
    const field = new LightField(rect);
    const { width, height } = rect;
    const falloff = new Uint8Array(width * height);
    const opaque = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = map.tileAt(rect.x + x, rect.y + y);
        const index = y * width + x;
        opaque[index] = solid[tile] ? 1 : 0;
        falloff[index] = solid[tile] ? settings.solidFalloff : 1;
        const light = emission[tile] ?? 0;
        if (light > 0) field.block[index] = light;
      }
    }

    for (let x = 0; x < width; x++) {
      // La columna está abierta si lo más alto de la zona deja ver el cielo.
      if (map.backgroundAt(rect.x + x, rect.y) !== AIR) continue;
      for (let y = 0; y < height; y++) {
        const index = y * width + x;
        if (opaque[index] === 1) break;
        field.sky[index] = MAX_LIGHT;
      }
    }

    spread(field.sky, falloff, width, height);
    spread(field.block, falloff, width, height);
    return field;
  }

  /** Indica si el bloque está dentro de la zona calculada. */
  contains(tileX: number, tileY: number): boolean {
    const { x, y, width, height } = this.rect;
    return tileX >= x && tileY >= y && tileX < x + width && tileY < y + height;
  }

  skyAt(tileX: number, tileY: number): number {
    return this.contains(tileX, tileY) ? (this.sky[this.indexOf(tileX, tileY)] ?? 0) : 0;
  }

  blockAt(tileX: number, tileY: number): number {
    return this.contains(tileX, tileY) ? (this.block[this.indexOf(tileX, tileY)] ?? 0) : 0;
  }

  private indexOf(tileX: number, tileY: number): number {
    return (tileY - this.rect.y) * this.rect.width + (tileX - this.rect.x);
  }
}

/**
 * Reparte la luz desde las celdas encendidas por niveles, de la más intensa a la más débil:
 * cada vecino recibe la luz menos lo que se pierde al entrar en él.
 */
function spread(levels: Uint8Array, falloff: Uint8Array, width: number, height: number): void {
  const buckets: number[][] = Array.from({ length: MAX_LIGHT + 1 }, () => []);
  levels.forEach((level, index) => {
    if (level > 0) buckets[level]?.push(index);
  });
  for (let level = MAX_LIGHT; level > 1; level--) {
    const bucket = buckets[level] ?? [];
    for (const index of bucket) {
      if (levels[index] !== level) continue;
      const x = index % width;
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        index >= width ? index - width : -1,
        index < width * (height - 1) ? index + width : -1,
      ];
      for (const next of neighbors) {
        if (next < 0) continue;
        const lit = level - (falloff[next] ?? 1);
        if (lit > (levels[next] ?? 0)) {
          levels[next] = lit;
          if (lit > 1) buckets[lit]?.push(next);
        }
      }
    }
  }
}
