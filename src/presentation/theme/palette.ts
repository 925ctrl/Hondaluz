/** Colores de un fondo con parallax. Las capas de colinas van de la más lejana a la más cercana. */
export interface BackdropPalette {
  readonly skyTop: number;
  readonly skyBottom: number;
  readonly hills: readonly [far: number, mid: number, near: number];
  readonly starAlpha: number;
  /** Color de las ascuas flotantes; sin valor, no se emiten. */
  readonly emberTint?: number;
}

export const DUSK_BACKDROP: BackdropPalette = {
  skyTop: 0x1a1b4b,
  skyBottom: 0xf08a5d,
  hills: [0x6d4a86, 0x3f2d63, 0x1c1633],
  starAlpha: 0.9,
  emberTint: 0xffc56b,
};

export const DAY_BACKDROP: BackdropPalette = {
  skyTop: 0x3f8fd6,
  skyBottom: 0xc7ecf2,
  hills: [0x9fcdd2, 0x62a98f, 0x2f6f5a],
  starAlpha: 0,
};

export const NIGHT_BACKDROP: BackdropPalette = {
  skyTop: 0x070a18,
  skyBottom: 0x232a52,
  hills: [0x2a3157, 0x1d2644, 0x131b33],
  starAlpha: 1,
};
