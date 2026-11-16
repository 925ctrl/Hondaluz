import { ContentError } from '../../core/errors/ContentError';

/**
 * Dibujo de pixel art como datos: cada carácter de `rows` es un píxel cuyo color
 * (`0xRRGGBB`) se busca en `palette`. El punto es transparente.
 */
export interface PixelSprite {
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, number>>;
}

export const TRANSPARENT_PIXEL = '.';

/** Comprueba que el dibujo es cuadrado y que solo usa colores de su paleta. */
export function validatePixelSprite(sprite: PixelSprite, owner: string): void {
  const size = sprite.rows.length;
  sprite.rows.forEach((row, y) => {
    if (row.length !== size) {
      throw new ContentError(
        `El dibujo de "${owner}" no es cuadrado: la fila ${String(y)} mide ${String(row.length)} y debería medir ${String(size)}.`,
      );
    }
    for (const symbol of row) {
      if (symbol !== TRANSPARENT_PIXEL && sprite.palette[symbol] === undefined) {
        throw new ContentError(`El dibujo de "${owner}" usa un color sin definir: "${symbol}".`);
      }
    }
  });
}
