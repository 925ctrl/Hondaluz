import type { InputCode } from '../../config/controls.config';

const SPECIAL_LABELS: Readonly<Record<string, string>> = {
  Space: 'Espacio',
  Escape: 'ESC',
  Mouse0: 'Clic izquierdo',
  Mouse1: 'Clic central',
  Mouse2: 'Clic derecho',
};

/** Convierte un código de entrada (`KeyA`, `Digit1`, `Mouse0`) en texto legible. */
export function formatInputCode(code: InputCode): string {
  return SPECIAL_LABELS[code] ?? code.replace(/^(Key|Digit)/, '');
}
