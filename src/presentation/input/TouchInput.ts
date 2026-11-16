import type { GameAction } from '../../config/controls.config';
import type { InputSource } from './InputSource';
import { toGamePixels } from './KeyboardMouseInput';

/** Qué hace un toque sobre el mundo: minar (y atacar) o construir. */
export type TouchMode = 'mine' | 'build';

/**
 * Botones en pantalla para jugar con el dedo. La interfaz los pulsa y suelta; `TouchInput`
 * los lee como acciones.
 */
export class VirtualControls {
  mode: TouchMode = 'mine';
  private readonly pressed = new Set<GameAction>();

  press(action: GameAction): void {
    this.pressed.add(action);
  }

  release(action: GameAction): void {
    this.pressed.delete(action);
  }

  isPressed(action: GameAction): boolean {
    return this.pressed.has(action);
  }

  releaseAll(): void {
    this.pressed.clear();
  }
}

/**
 * Pantalla táctil: mantener el dedo sobre el mundo apunta y usa (mina, ataca o construye
 * según el modo); moverse y saltar llegan de los botones en pantalla.
 */
export class TouchInput implements InputSource {
  pointer: { x: number; y: number } | null = null;
  private touching = false;
  private readonly abort = new AbortController();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly controls: VirtualControls,
  ) {
    const options = { signal: this.abort.signal, passive: false };
    const follow = (event: TouchEvent): void => {
      // Evita que el navegador desplace la página y que invente clics de ratón.
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;
      this.pointer = toGamePixels(canvas, touch.clientX, touch.clientY);
      this.touching = true;
    };
    const end = (event: TouchEvent): void => {
      event.preventDefault();
      if (event.touches.length > 0) return;
      this.touching = false;
      this.pointer = null;
    };
    canvas.addEventListener('touchstart', follow, options);
    canvas.addEventListener('touchmove', follow, options);
    canvas.addEventListener('touchend', end, options);
    canvas.addEventListener('touchcancel', end, options);
  }

  isActive(action: GameAction): boolean {
    if (this.controls.isPressed(action)) return true;
    if (!this.touching) return false;
    return action === (this.controls.mode === 'mine' ? 'primaryUse' : 'secondaryUse');
  }

  dispose(): void {
    this.abort.abort();
    this.controls.releaseAll();
    this.pointer = null;
  }
}

/** Varias fuentes a la vez: una acción está activa si lo está en cualquiera. */
export class CombinedInput implements InputSource {
  constructor(private readonly sources: readonly InputSource[]) {}

  get pointer(): { readonly x: number; readonly y: number } | null {
    for (const source of this.sources) if (source.pointer) return source.pointer;
    return null;
  }

  isActive(action: GameAction): boolean {
    return this.sources.some((source) => source.isActive(action));
  }

  dispose(): void {
    for (const source of this.sources) source.dispose();
  }
}
