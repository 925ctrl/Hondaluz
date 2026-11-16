import type { GameEventBus } from '../../application/events/GameEvents';
import type { SettingsStore } from '../../application/use-cases/settings/SettingsStore';
import type { WorldCatalog } from '../../application/use-cases/world/WorldCatalog';
import type { WorldSession } from '../../application/use-cases/world/WorldSession';
import type { GameContent } from '../../domain/catalog/GameContent';
import type { VirtualControls } from '../input/TouchInput';
import type { View } from './dom';
import type { GameUi } from './GameUi';
import { createWorldHud } from './hud/WorldHud';
import type { ItemIcons } from './ItemIcons';
import { createMenuView } from './menus/MenuView';
import { createPauseMenu } from './menus/PauseMenu';

export interface DomGameUiDeps {
  readonly events: GameEventBus;
  readonly catalog: WorldCatalog;
  readonly content: GameContent;
  readonly icons: ItemIcons;
  readonly settings: SettingsStore;
}

/** Interfaz HTML superpuesta al canvas: una pantalla base y, encima, la pausa. */
export class DomGameUi implements GameUi {
  private screen: View | undefined;
  private pause: View | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly deps: DomGameUiDeps,
  ) {}

  showMainMenu(): void {
    this.setScreen(createMenuView(this.deps));
  }

  showWorldHud(session: WorldSession, touch: VirtualControls): void {
    const { events, content, icons, settings } = this.deps;
    this.setScreen(
      createWorldHud({ session, events, content, items: content.items, icons, settings, touch }),
    );
  }

  setPauseVisible(visible: boolean): void {
    if (visible === (this.pause !== undefined)) return;
    if (visible) {
      this.pause = this.mount(createPauseMenu(this.deps.events));
    } else {
      this.unmount(this.pause);
      this.pause = undefined;
    }
  }

  clear(): void {
    this.setPauseVisible(false);
    this.unmount(this.screen);
    this.screen = undefined;
  }

  private setScreen(view: View): void {
    this.clear();
    this.screen = this.mount(view);
  }

  private mount(view: View): View {
    this.root.append(view.element);
    view.element.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return view;
  }

  private unmount(view: View | undefined): void {
    view?.dispose?.();
    view?.element.remove();
  }
}
