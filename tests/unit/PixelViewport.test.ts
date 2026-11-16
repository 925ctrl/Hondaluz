import { describe, expect, it } from 'vitest';
import { computePixelViewport } from '../../src/presentation/display/PixelViewport';

const options = { targetHeight: 270, minZoom: 1, maxZoom: 8 };

describe('computePixelViewport', () => {
  it('usa un zoom entero exacto cuando la ventana es múltiplo de la altura objetivo', () => {
    expect(computePixelViewport(1920, 1080, options)).toEqual({ width: 480, height: 270, zoom: 4 });
  });

  it('cubre la ventana completa aunque no sea múltiplo del zoom', () => {
    const viewport = computePixelViewport(1441, 901, options);
    expect(viewport.zoom).toBe(3);
    expect(viewport.width * viewport.zoom).toBeGreaterThanOrEqual(1441);
    expect(viewport.height * viewport.zoom).toBeGreaterThanOrEqual(901);
  });

  it('respeta los límites de zoom', () => {
    expect(computePixelViewport(300, 100, options).zoom).toBe(1);
    expect(computePixelViewport(8000, 4500, options).zoom).toBe(8);
  });

  it('devuelve siempre un tamaño par y no nulo', () => {
    expect(computePixelViewport(1280, 720, options)).toEqual({ width: 428, height: 240, zoom: 3 });
    expect(computePixelViewport(0, 0, options)).toEqual({ width: 2, height: 2, zoom: 1 });
  });
});
