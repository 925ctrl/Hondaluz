/**
 * Algo que acaba de pasar en el mundo y que la presentación puede querer contar con sonido o
 * partículas. Las reglas no dependen de ello: solo lo anotan. Posiciones en píxeles del mundo.
 */
export type Happening =
  | {
      readonly kind: 'block-broken';
      readonly x: number;
      readonly y: number;
      readonly block: number;
    }
  | {
      readonly kind: 'block-placed';
      readonly x: number;
      readonly y: number;
      readonly block: number;
    }
  | { readonly kind: 'item-picked'; readonly itemId: string }
  | { readonly kind: 'swing' }
  | { readonly kind: 'enemy-hit'; readonly x: number; readonly y: number }
  | { readonly kind: 'enemy-killed'; readonly x: number; readonly y: number }
  | { readonly kind: 'player-hurt'; readonly x: number; readonly y: number }
  | { readonly kind: 'item-consumed' }
  | { readonly kind: 'crafted' };

/** Sucesos más antiguos que esto se descartan si nadie los recoge (por ejemplo, en pruebas). */
const CAPACITY = 256;

/** Buzón de sucesos: los casos de uso anotan y la presentación recoge una vez por frame. */
export class HappeningLog {
  private entries: Happening[] = [];

  push(happening: Happening): void {
    this.entries.push(happening);
    if (this.entries.length > CAPACITY) this.entries.shift();
  }

  /** Devuelve los sucesos pendientes y vacía el buzón. */
  drain(): Happening[] {
    const drained = this.entries;
    this.entries = [];
    return drained;
  }
}
