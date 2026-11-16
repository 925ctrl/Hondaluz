import type { BlockDefinition } from '../../domain/world/BlockDefinition';

/**
 * Una capa de un sonido sintetizado: un oscilador o ruido con un barrido de frecuencia y una
 * envolvente corta. Todos los sonidos se generan en el momento, sin archivos de audio.
 */
export interface SoundLayer {
  readonly source: OscillatorType | 'noise';
  /** Frecuencia al empezar y al terminar (Hz); en el ruido, la del filtro paso banda. */
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  readonly gain: number;
  /** Retraso desde el inicio del sonido, en segundos. */
  readonly delay?: number;
}

export type SoundCue =
  | 'break-soft'
  | 'break-stone'
  | 'break-wood'
  | 'place'
  | 'pickup'
  | 'swing'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'heal'
  | 'craft'
  | 'splash'
  | 'death';

export const SOUND_BANK: Readonly<Record<SoundCue, readonly SoundLayer[]>> = {
  'break-soft': [{ source: 'noise', from: 900, to: 300, duration: 0.12, gain: 0.5 }],
  'break-stone': [
    { source: 'noise', from: 2400, to: 1200, duration: 0.09, gain: 0.45 },
    { source: 'square', from: 220, to: 140, duration: 0.07, gain: 0.08 },
  ],
  'break-wood': [
    { source: 'triangle', from: 320, to: 180, duration: 0.11, gain: 0.35 },
    { source: 'noise', from: 1400, to: 700, duration: 0.06, gain: 0.2 },
  ],
  place: [{ source: 'triangle', from: 200, to: 120, duration: 0.08, gain: 0.35 }],
  pickup: [
    { source: 'sine', from: 660, to: 880, duration: 0.07, gain: 0.25 },
    { source: 'sine', from: 990, to: 1320, duration: 0.08, gain: 0.18, delay: 0.05 },
  ],
  swing: [{ source: 'noise', from: 600, to: 2600, duration: 0.14, gain: 0.25 }],
  hit: [
    { source: 'square', from: 300, to: 90, duration: 0.1, gain: 0.18 },
    { source: 'noise', from: 1800, to: 600, duration: 0.07, gain: 0.3 },
  ],
  kill: [
    { source: 'triangle', from: 520, to: 130, duration: 0.3, gain: 0.3 },
    { source: 'noise', from: 900, to: 200, duration: 0.25, gain: 0.2 },
  ],
  hurt: [{ source: 'sawtooth', from: 240, to: 110, duration: 0.18, gain: 0.2 }],
  heal: [
    { source: 'sine', from: 440, to: 440, duration: 0.12, gain: 0.2 },
    { source: 'sine', from: 554, to: 554, duration: 0.12, gain: 0.2, delay: 0.09 },
    { source: 'sine', from: 659, to: 659, duration: 0.2, gain: 0.2, delay: 0.18 },
  ],
  craft: [
    { source: 'triangle', from: 392, to: 392, duration: 0.09, gain: 0.25 },
    { source: 'triangle', from: 587, to: 587, duration: 0.14, gain: 0.25, delay: 0.08 },
  ],
  splash: [{ source: 'noise', from: 700, to: 250, duration: 0.3, gain: 0.35 }],
  death: [
    { source: 'triangle', from: 330, to: 82, duration: 0.9, gain: 0.3 },
    { source: 'sine', from: 165, to: 55, duration: 1.1, gain: 0.25, delay: 0.1 },
  ],
};

/** Sonido de romper un bloque según su material: tierra y arena, roca, o madera y objetos. */
export function breakCue(block: BlockDefinition): SoundCue | null {
  const visual = block.visual;
  if (!visual || block.physics === 'liquid') return null;
  if ('sprite' in visual || visual.grain === 'bark') return 'break-wood';
  return visual.grain === 'coarse' ? 'break-stone' : 'break-soft';
}
