import type { GameAction, InputCode } from '../../../config/controls.config';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  rebind,
  type Settings,
  type SettingsRepository,
} from '../../../domain/settings/Settings';

/**
 * Preferencias en uso. Las lee una vez al arrancar, guarda cada cambio y avisa a quien
 * escucha (entrada, interfaz, audio) para que se apliquen al momento.
 */
export class SettingsStore {
  private value: Settings;
  private readonly listeners = new Set<(settings: Settings) => void>();

  constructor(private readonly repository: SettingsRepository) {
    this.value = normalizeSettings(repository.load());
  }

  get current(): Settings {
    return this.value;
  }

  codesFor(action: GameAction): readonly InputCode[] {
    return this.value.bindings[action];
  }

  /** La acción a la que corresponde un código, si alguna lo usa. */
  actionFor(code: InputCode): GameAction | undefined {
    const entries = Object.entries(this.value.bindings) as [GameAction, readonly InputCode[]][];
    return entries.find(([, codes]) => codes.includes(code))?.[0];
  }

  rebind(action: GameAction, code: InputCode): void {
    this.set(rebind(this.value, action, code));
  }

  setVolumes(volumes: { musicVolume?: number; sfxVolume?: number }): void {
    this.set(normalizeSettings({ ...this.value, ...volumes }));
  }

  resetControls(): void {
    this.set({ ...this.value, bindings: DEFAULT_SETTINGS.bindings });
  }

  /** Avisa de cada cambio. Devuelve la función para darse de baja. */
  subscribe(listener: (settings: Settings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private set(next: Settings): void {
    if (next === this.value) return;
    this.value = next;
    this.repository.save(next);
    for (const listener of this.listeners) listener(next);
  }
}
