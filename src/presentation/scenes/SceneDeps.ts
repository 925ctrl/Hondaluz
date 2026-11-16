import type { GameEventBus } from '../../application/events/GameEvents';
import type { WorldSaver } from '../../application/use-cases/world/WorldSaver';
import type {
  WorldSession,
  WorldSessionFactory,
} from '../../application/use-cases/world/WorldSession';
import type { SettingsStore } from '../../application/use-cases/settings/SettingsStore';
import type { GameContent } from '../../domain/catalog/GameContent';
import type { AudioEngine } from '../audio/AudioEngine';
import type { GameUi } from '../ui/GameUi';
import type { HowToPlayScenes } from '../ui/HowToPlayScenes';
import type { ItemIcons } from '../ui/ItemIcons';

export const SCENE_KEYS = {
  preload: 'preload',
  mainMenu: 'main-menu',
  world: 'world',
} as const;

/** Dependencias que la raíz de composición inyecta en las escenas. */
export interface SceneDeps {
  readonly events: GameEventBus;
  readonly ui: GameUi;
  readonly content: GameContent;
  readonly icons: ItemIcons;
  readonly scenes: HowToPlayScenes;
  readonly createSession: WorldSessionFactory;
  readonly settings: SettingsStore;
  readonly audio: AudioEngine;
  /** Expone ganchos de prueba en `window` (solo con `?e2e` en la dirección). */
  readonly debug: boolean;
  readonly createSaver: (session: WorldSession, onError: (error: unknown) => void) => WorldSaver;
}
