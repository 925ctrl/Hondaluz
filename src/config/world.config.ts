/** Geometría del mundo, terreno base y política de carga de chunks. */
export const WORLD_CONFIG = {
  /** Lado de un bloque en píxeles de juego. */
  tileSize: 16,
  dimensions: { chunkSize: 32, widthChunks: 64, heightChunks: 12 },
  terrain: {
    surfaceLevel: 96,
    hills: [
      { wavelength: 140, amplitude: 18 },
      { wavelength: 46, amplitude: 6 },
      { wavelength: 14, amplitude: 1.6 },
    ],
    soilDepthMin: 4,
    soilDepthMax: 8,
    verticalMargin: 8,
    /** Los valles más hondos que esta fila se llenan con el lago de su bioma. */
    waterLevel: 108,
    /** Reparto de los biomas: las franjas de superficie y el borde de los de profundidad. */
    biomes: { minRegionTiles: 180, maxRegionTiles: 320, blendTiles: 40, depthDither: 6 },
  },
  caves: {
    minDepth: 12,
    taperTiles: 10,
    tunnel: { scaleX: 30, scaleY: 13, width: 0.05 },
    cavern: { scale: 22, shallowThreshold: 0.84, deepThreshold: 0.68, fullDepth: 200 },
    entrances: {
      cellSize: 90,
      chance: 0.45,
      depth: 28,
      radius: 1,
      wobble: 2,
      spawnClearance: 40,
    },
  },
  /** Vetas de mineral en la roca, de la más superficial a la más profunda. */
  ores: [
    { blockId: 'copper_ore', minDepth: 4, scale: 5, threshold: 0.8 },
    { blockId: 'iron_ore', minDepth: 28, scale: 4.5, threshold: 0.82 },
  ],
  chunks: {
    /** Margen alrededor de la vista en el que los chunks ya están dibujados, en bloques. */
    viewMarginTiles: 8,
    /** Máximo de chunks que se dibujan por frame al desplazarse. */
    buildsPerFrame: 1,
    /** Chunks extra, alrededor de los visibles, cuyos datos se mantienen en memoria. */
    dataRetainMargin: 2,
  },
  simulation: { stepSeconds: 1 / 60, maxStepsPerFrame: 5 },
  /** Agua y arena: cada cuánto se mueven y cuántos bloques como mucho en cada paso. */
  tiles: { stepSeconds: 0.06, maxUpdatesPerStep: 400 },
  /** Luz por bloques: lo que se pierde al atravesar un bloque sólido. */
  light: { solidFalloff: 3 },
} as const;

/** Movimiento del jugador, en píxeles y segundos. */
export const PLAYER_TUNING = {
  width: 10,
  height: 25,
  moveSpeed: 110,
  groundAcceleration: 900,
  airAcceleration: 600,
  gravity: 900,
  jumpSpeed: 305,
  maxFallSpeed: 480,
  jumpCutFactor: 0.45,
  coyoteTime: 0.08,
  jumpBufferTime: 0.1,
  swim: {
    gravityFactor: 0.3,
    moveFactor: 0.6,
    maxSinkSpeed: 70,
    riseSpeed: 90,
    riseAcceleration: 700,
    strokeFactor: 0.75,
  },
} as const;
