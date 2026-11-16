/**
 * Duración del día y momentos en que empieza cada fase, como fracción del día (0-1),
 * donde 0 es medianoche.
 */
export interface DayCycleSettings {
  readonly dayLengthSeconds: number;
  readonly dawnStart: number;
  readonly dayStart: number;
  readonly duskStart: number;
  readonly nightStart: number;
}

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

/** Reloj del mundo. Es la única fuente de la hora: nadie más cuenta el tiempo del día. */
export class WorldClock {
  constructor(
    private readonly settings: DayCycleSettings,
    /** Hora como fracción del día, en [0, 1). */
    private timeOfDay: number,
    private dayNumber = 1,
  ) {
    if (!(
      settings.dawnStart < settings.dayStart &&
      settings.dayStart < settings.duskStart &&
      settings.duskStart < settings.nightStart &&
      settings.nightStart < 1
    )) {
      throw new Error('Las fases del día deben estar ordenadas dentro de [0, 1).');
    }
  }

  get time(): number {
    return this.timeOfDay;
  }

  get day(): number {
    return this.dayNumber;
  }

  get hour(): number {
    return Math.floor(this.timeOfDay * 24);
  }

  get phase(): DayPhase {
    const t = this.timeOfDay;
    const s = this.settings;
    if (t < s.dawnStart || t >= s.nightStart) return 'night';
    if (t < s.dayStart) return 'dawn';
    if (t < s.duskStart) return 'day';
    return 'dusk';
  }

  get isNight(): boolean {
    return this.phase === 'night';
  }

  /** Luz del sol: 0 de noche, 1 de día, con transiciones lineales al amanecer y al atardecer. */
  get daylight(): number {
    const t = this.timeOfDay;
    const s = this.settings;
    switch (this.phase) {
      case 'night':
        return 0;
      case 'day':
        return 1;
      case 'dawn':
        return (t - s.dawnStart) / (s.dayStart - s.dawnStart);
      case 'dusk':
        return 1 - (t - s.duskStart) / (s.nightStart - s.duskStart);
    }
  }

  advance(seconds: number): void {
    const total = this.timeOfDay + seconds / this.settings.dayLengthSeconds;
    this.dayNumber += Math.floor(total);
    this.timeOfDay = total - Math.floor(total);
  }
}
