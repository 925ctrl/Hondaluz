export interface PixelViewport {
  /** Tamaño interno del canvas en píxeles de juego. */
  readonly width: number;
  readonly height: number;
  /** Factor entero por el que se amplía el canvas en pantalla. */
  readonly zoom: number;
}

export interface PixelViewportOptions {
  readonly targetHeight: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

/**
 * Elige el zoom entero que deja la altura interna más cerca de la objetivo y ajusta
 * el tamaño interno para cubrir la ventana. El zoom entero mantiene nítido el pixel art.
 * El tamaño es siempre par: con un tamaño impar el centro de la cámara cae en medio píxel
 * y el redondeo desplaza los sprites una columna.
 */
export function computePixelViewport(
  windowWidth: number,
  windowHeight: number,
  options: PixelViewportOptions,
): PixelViewport {
  const ideal = Math.round(windowHeight / options.targetHeight);
  const zoom = Math.min(options.maxZoom, Math.max(options.minZoom, ideal));
  return {
    zoom,
    width: ceilToEven(windowWidth / zoom),
    height: ceilToEven(windowHeight / zoom),
  };
}

function ceilToEven(value: number): number {
  return Math.max(2, Math.ceil(value / 2) * 2);
}
