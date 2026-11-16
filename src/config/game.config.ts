/** Configuración global del juego. Los valores viven aquí y no repartidos por las clases. */
export const GAME_CONFIG = {
  title: 'Hondaluz',
  tagline: 'Cuanto más hondo, más vale la luz',
  version: '0.1.0',
  display: {
    /** Altura interna objetivo en píxeles de juego; el zoom entero se deriva de la ventana. */
    targetHeight: 270,
    minZoom: 1,
    maxZoom: 8,
    backgroundColor: '#0b1020',
  },
  camera: {
    /** Fracción de la distancia al jugador que la cámara recorre en cada frame (0-1). */
    followLerp: 0.15,
    zoom: 1,
  },
  lighting: {
    /** Color de la oscuridad y opacidad en un lugar sin ninguna luz, como una cueva. */
    color: 0x070a1e,
    maxDarkness: 0.95,
    /**
     * Fracción de la luz del cielo que queda en plena noche. Con 0,24 la superficie de noche
     * queda a una oscuridad de 0,72.
     */
    nightSkyBrightness: 0.24,
    /** Radio de la luz del farol del jugador, en píxeles de juego. */
    lanternRadius: 64,
    /** Pasos en que se cuantiza la luz del día para no repintar la sombra en cada frame. */
    daylightSteps: 48,
    /** Segundos mínimos entre dos recálculos de la luz por cambios de bloques. */
    refreshSeconds: 0.1,
  },
  persistence: {
    databaseName: 'hondaluz',
    /** Clave de `localStorage` de las preferencias (teclas y volumen). */
    settingsKey: 'hondaluz.settings',
  },
} as const;

export type DisplayConfig = typeof GAME_CONFIG.display;
