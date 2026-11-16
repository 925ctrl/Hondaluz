import type { WorldSession } from '../../application/use-cases/world/WorldSession';
import type { VirtualControls } from '../input/TouchInput';

/** Lo único que las escenas conocen de la interfaz: qué pantalla debe verse. */
export interface GameUi {
  showMainMenu(): void;
  /** `touch`: botones en pantalla que leerá la entrada táctil. */
  showWorldHud(session: WorldSession, touch: VirtualControls): void;
  setPauseVisible(visible: boolean): void;
  clear(): void;
}
