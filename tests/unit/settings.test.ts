import { describe, expect, it } from 'vitest';
import { SettingsStore } from '../../src/application/use-cases/settings/SettingsStore';
import { GAME_ACTIONS } from '../../src/config/controls.config';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  rebind,
  type Settings,
  type SettingsRepository,
} from '../../src/domain/settings/Settings';

class MemoryRepository implements SettingsRepository {
  saved: Settings | undefined;
  constructor(private readonly stored: unknown) {}
  load(): unknown {
    return this.stored;
  }
  save(settings: Settings): void {
    this.saved = settings;
  }
}

describe('Settings', () => {
  it('usa los valores por defecto para lo que falta o no se entiende', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('basura')).toEqual(DEFAULT_SETTINGS);
    const partial = normalizeSettings({ musicVolume: 7, sfxVolume: 'x', bindings: { jump: [42] } });
    expect(partial.musicVolume).toBe(1);
    expect(partial.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(partial.bindings.jump).toEqual(DEFAULT_SETTINGS.bindings.jump);
  });

  it('nunca deja un código en dos acciones ni usa las teclas de la barra rápida', () => {
    const settings = normalizeSettings({
      bindings: { moveLeft: ['KeyW'], moveRight: ['KeyW'], jump: ['Digit1'] },
    });
    expect(settings.bindings.moveLeft).toEqual(['KeyW']);
    expect(settings.bindings.moveRight).toEqual(DEFAULT_SETTINGS.bindings.moveRight);
    expect(settings.bindings.jump).toEqual(DEFAULT_SETTINGS.bindings.jump);
    const all = GAME_ACTIONS.flatMap((action) => settings.bindings[action]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('al reasignar una tecla en uso, la otra acción recibe la que se libera', () => {
    const next = rebind(DEFAULT_SETTINGS, 'jump', 'KeyD');
    expect(next.bindings.jump).toEqual(['KeyD']);
    expect(next.bindings.moveRight).toEqual(['Space']);
    expect(rebind(DEFAULT_SETTINGS, 'jump', 'Digit3')).toBe(DEFAULT_SETTINGS);
  });
});

describe('SettingsStore', () => {
  it('carga lo guardado, guarda cada cambio y avisa a quien escucha', () => {
    const repository = new MemoryRepository({ sfxVolume: 0.2 });
    const store = new SettingsStore(repository);
    expect(store.current.sfxVolume).toBe(0.2);
    const seen: number[] = [];
    const stop = store.subscribe((settings) => seen.push(settings.musicVolume));
    store.setVolumes({ musicVolume: 0.9 });
    store.rebind('jump', 'KeyW');
    stop();
    store.resetControls();
    expect(seen).toEqual([0.9, 0.9]);
    expect(store.actionFor('KeyW')).toBeUndefined();
    expect(store.actionFor('Space')).toBe('jump');
    expect(repository.saved?.bindings.jump).toEqual(['Space']);
    expect(repository.saved?.musicVolume).toBe(0.9);
  });
});
