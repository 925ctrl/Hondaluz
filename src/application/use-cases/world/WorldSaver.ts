import type { WorldSaveRepository } from '../../../domain/repositories/WorldSaveRepository';
import type { WorldSession } from './WorldSession';

export interface WorldSaverSettings {
  /** Segundos de partida entre dos guardados automáticos. */
  readonly intervalSeconds: number;
}

/**
 * Guarda la partida en segundo plano: cada cierto tiempo y cuando se le pide (al pausar,
 * salir u ocultar la página). Copia el estado y los chunks cambiados al instante, sin
 * esperar al disco, y escribe los guardados uno tras otro y en orden. Si uno falla, sus
 * chunks vuelven a quedar pendientes para el siguiente.
 */
export class WorldSaver {
  private sinceSave = 0;
  private played: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly session: WorldSession,
    private readonly saves: WorldSaveRepository,
    private readonly settings: WorldSaverSettings,
    private readonly onError: (error: unknown) => void,
  ) {
    this.played = session.meta.playedSeconds;
  }

  /** Cuenta el tiempo jugado y guarda cuando toca. */
  update(dt: number): void {
    this.played += dt;
    this.sinceSave += dt;
    if (this.sinceSave >= this.settings.intervalSeconds) void this.save();
  }

  /** Guarda ahora. La promesa se resuelve cuando este guardado ha llegado al disco. */
  save(): Promise<void> {
    this.sinceSave = 0;
    const { session } = this;
    const world = { ...session.meta, playedSeconds: Math.floor(this.played) };
    const state = session.captureState();
    const chunks = session.map.takeUnsavedChunks();
    this.queue = this.queue.then(async () => {
      try {
        await this.saves.save(world, state, chunks);
      } catch (error) {
        session.map.markUnsaved(chunks);
        this.onError(error);
      }
    });
    return this.queue;
  }
}
