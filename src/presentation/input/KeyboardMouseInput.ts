import type { SettingsStore } from '../../application/use-cases/settings/SettingsStore';
import type { GameAction, InputCode } from '../../config/controls.config';
import type { InputSource } from './InputSource';

/**
 * Teclado y ratón: mantiene los códigos pulsados y los traduce a acciones según las teclas que
 * el jugador tenga asignadas. Los botones del ratón solo cuentan si se pulsan sobre el canvas,
 * de modo que un clic en la interfaz no mina ni construye.
 */
export class KeyboardMouseInput implements InputSource {
  pointer: { x: number; y: number } | null = null;
  private readonly held = new Set<InputCode>();
  private readonly abort = new AbortController();

  constructor(
    target: Window,
    canvas: HTMLCanvasElement,
    private readonly settings: SettingsStore,
  ) {
    const options = { signal: this.abort.signal };
    target.addEventListener(
      'keydown',
      (event) => {
        if (event.target instanceof HTMLInputElement) return;
        if (settings.actionFor(event.code)) event.preventDefault();
        this.held.add(event.code);
      },
      options,
    );
    target.addEventListener('keyup', (event) => this.held.delete(event.code), options);
    canvas.addEventListener('mousedown', (event) => this.held.add(mouseCode(event)), options);
    target.addEventListener('mouseup', (event) => this.held.delete(mouseCode(event)), options);
    canvas.addEventListener(
      'mousemove',
      (event) => {
        this.pointer = toGamePixels(canvas, event.clientX, event.clientY);
      },
      options,
    );
    canvas.addEventListener(
      'mouseleave',
      () => {
        this.pointer = null;
      },
      options,
    );
    // Al perder el foco no llegan los `keyup`: se sueltan todas las entradas.
    target.addEventListener(
      'blur',
      () => {
        this.held.clear();
      },
      options,
    );
  }

  isActive(action: GameAction): boolean {
    return this.settings.codesFor(action).some((code) => this.held.has(code));
  }

  dispose(): void {
    this.abort.abort();
    this.held.clear();
    this.pointer = null;
  }
}

const mouseCode = (event: MouseEvent): InputCode => `Mouse${String(event.button)}`;

/** El canvas se muestra ampliado: se convierte de píxeles de pantalla a píxeles de juego. */
export function toGamePixels(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height,
  };
}
