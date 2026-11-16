/** Ambiente musical según dónde y cuándo está el jugador. */
export type MusicMood = 'day' | 'night' | 'deep';

/** Escala y carácter de cada ambiente. Las notas son semitonos sobre `root` (Hz). */
export interface MoodTheme {
  readonly root: number;
  readonly scale: readonly number[];
  /** Segundos entre notas, mínimo y máximo. */
  readonly gapMin: number;
  readonly gapMax: number;
  readonly wave: OscillatorType;
  /** Nota grave que suena de fondo, en semitonos sobre `root`. */
  readonly drone: number;
}

export const MOOD_THEMES: Readonly<Record<MusicMood, MoodTheme>> = {
  // Pentatónica mayor, luminosa y tranquila.
  day: {
    root: 261.63,
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    gapMin: 0.45,
    gapMax: 1.1,
    wave: 'triangle',
    drone: -12,
  },
  // Pentatónica menor, más lenta y grave.
  night: {
    root: 220,
    scale: [0, 3, 5, 7, 10, 12, 15],
    gapMin: 0.8,
    gapMax: 1.8,
    wave: 'sine',
    drone: -24,
  },
  // Modo frigio en el registro grave, con notas sueltas.
  deep: {
    root: 146.83,
    scale: [0, 1, 5, 7, 8, 12],
    gapMin: 1.4,
    gapMax: 3.2,
    wave: 'sine',
    drone: -12,
  },
};

/** Bloques bajo la superficie a partir de los que suena el ambiente de las profundidades. */
export const DEEP_TILES = 18;

/** Ambiente que corresponde a la luz del día y a la profundidad del jugador. */
export function moodFor(daylight: number, depthTiles: number): MusicMood {
  if (depthTiles >= DEEP_TILES) return 'deep';
  return daylight < 0.35 ? 'night' : 'day';
}

/** Frecuencia de una nota de la escala, con `semitones` sobre la raíz del ambiente. */
export const noteFrequency = (theme: MoodTheme, semitones: number): number =>
  theme.root * 2 ** (semitones / 12);

/**
 * Elige la siguiente nota: un paso corto por la escala desde la anterior, para que la melodía
 * camine en lugar de saltar al azar.
 */
export function nextNote(theme: MoodTheme, previous: number, roll: number): number {
  const steps = [-2, -1, 1, 2];
  const step = steps[Math.min(steps.length - 1, Math.floor(roll * steps.length))] ?? 1;
  const max = theme.scale.length - 1;
  const index = previous + step;
  return index < 0 ? 1 : index > max ? max - 1 : index;
}
