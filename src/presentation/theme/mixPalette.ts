import type { BackdropPalette } from './palette';

function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** Mezcla dos paletas de fondo; `t` = 0 devuelve la primera y `t` = 1 la segunda. */
export function mixPalette(from: BackdropPalette, to: BackdropPalette, t: number): BackdropPalette {
  return {
    skyTop: mixColor(from.skyTop, to.skyTop, t),
    skyBottom: mixColor(from.skyBottom, to.skyBottom, t),
    hills: [
      mixColor(from.hills[0], to.hills[0], t),
      mixColor(from.hills[1], to.hills[1], t),
      mixColor(from.hills[2], to.hills[2], t),
    ],
    starAlpha: from.starAlpha + (to.starAlpha - from.starAlpha) * t,
  };
}
