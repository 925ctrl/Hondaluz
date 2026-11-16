/**
 * Reglas de juego ajustables: inventario, alcance, objetos sueltos, combate, aparición de
 * criaturas y duración del día. Es el único lugar donde se definen estos valores.
 */
export const GAMEPLAY_CONFIG = {
  inventory: { size: 36, hotbarSize: 9 },
  interaction: {
    /** Distancia máxima, en bloques, a la que se puede minar o construir. */
    reachTiles: 5,
    /** Potencia de minado sin herramienta; las herramientas la multiplicarán. */
    handMiningPower: 1,
    /** Tiempo mínimo entre dos bloques colocados manteniendo el botón. */
    placeIntervalSeconds: 0.16,
  },
  drops: {
    size: 8,
    gravity: 900,
    maxFallSpeed: 420,
    popSpeed: 70,
    magnetRadius: 44,
    magnetSpeed: 170,
    pickupRadius: 9,
  },
  player: { maxHealth: 100 },
  /** Segundos de partida entre dos guardados automáticos. También se guarda al pausar y salir. */
  saving: { intervalSeconds: 15 },
  combat: {
    playerInvulnerableSeconds: 0.8,
    playerKnockbackSpeed: 170,
    playerKnockbackLift: 160,
    playerStunSeconds: 0.25,
    regenDelaySeconds: 6,
    regenPerSecond: 3,
    enemyInvulnerableSeconds: 0.25,
    enemyStunSeconds: 0.3,
    knockbackLiftRatio: 0.6,
    consumableCooldownSeconds: 1,
  },
  spawning: {
    intervalSeconds: 1.5,
    maxDay: 2,
    maxNight: 6,
    minDistanceTiles: 26,
    maxDistanceTiles: 40,
    despawnDistanceTiles: 70,
    skyHeightMin: 6,
    skyHeightMax: 12,
    undergroundSpreadTiles: 12,
    attemptsPerSpawn: 6,
  },
  /**
   * Un día completo dura `dayLengthSeconds`. Las fases empiezan en la fracción del día
   * indicada (0 es medianoche); `startTime` es la hora a la que empieza un mundo nuevo.
   */
  dayCycle: {
    dayLengthSeconds: 720,
    startTime: 0.3,
    dawnStart: 0.2,
    dayStart: 0.28,
    duskStart: 0.72,
    nightStart: 0.8,
  },
} as const;
