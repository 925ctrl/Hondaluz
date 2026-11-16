import type { GameAction } from '../../config/controls.config';

/**
 * Fuente de entrada expresada en acciones del juego. Teclado, ratón, mando o pantalla
 * táctil son implementaciones distintas; los sistemas solo conocen esta interfaz.
 */
export interface InputSource {
  isActive(action: GameAction): boolean;
  /** Punto al que se apunta, en píxeles de juego desde la esquina de la vista; `null` si no hay. */
  readonly pointer: { readonly x: number; readonly y: number } | null;
  dispose(): void;
}
