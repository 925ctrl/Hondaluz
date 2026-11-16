import type { GameEventBus } from '../../../application/events/GameEvents';
import type { SettingsStore } from '../../../application/use-cases/settings/SettingsStore';
import type { WorldCatalog } from '../../../application/use-cases/world/WorldCatalog';

export type MenuRoute =
  'main' | 'new-world' | 'select-world' | 'options' | 'credits' | 'how-to-play';

/** Lo que cada pantalla del menú necesita para funcionar. */
export interface MenuContext {
  readonly catalog: WorldCatalog;
  readonly events: GameEventBus;
  readonly settings: SettingsStore;
  navigate(route: MenuRoute): void;
}
