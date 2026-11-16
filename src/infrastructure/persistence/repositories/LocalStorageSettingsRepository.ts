import type { Settings, SettingsRepository } from '../../../domain/settings/Settings';

/**
 * Preferencias en `localStorage`: son pocas, del propio navegador y se leen al arrancar,
 * antes de abrir IndexedDB. Si el almacenamiento no está disponible (modo privado, cookies
 * bloqueadas), el juego sigue con los valores por defecto.
 */
export class LocalStorageSettingsRepository implements SettingsRepository {
  constructor(
    private readonly storage: () => Storage,
    private readonly key: string,
  ) {}

  load(): unknown {
    try {
      const text = this.storage().getItem(this.key);
      return text === null ? undefined : (JSON.parse(text) as unknown);
    } catch (error) {
      console.warn('No se pudieron leer las preferencias guardadas.', error);
      return undefined;
    }
  }

  save(settings: Settings): void {
    try {
      this.storage().setItem(this.key, JSON.stringify(settings));
    } catch (error) {
      console.warn('No se pudieron guardar las preferencias.', error);
    }
  }
}
