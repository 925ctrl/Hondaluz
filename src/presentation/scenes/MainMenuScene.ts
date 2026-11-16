import Phaser from 'phaser';
import { ParallaxBackdrop } from '../effects/ParallaxBackdrop';
import { DUSK_BACKDROP } from '../theme/palette';
import { SCENE_KEYS, type SceneDeps } from './SceneDeps';

/** Velocidad a la que se desliza el paisaje del menú, en píxeles por segundo. */
const MENU_DRIFT_SPEED = 10;

/** Fondo animado del menú. Los menús en sí son DOM y llegan aquí como eventos. */
export class MainMenuScene extends Phaser.Scene {
  private backdrop: ParallaxBackdrop | undefined;
  private elapsedSeconds = 0;

  constructor(private readonly deps: SceneDeps) {
    super(SCENE_KEYS.mainMenu);
  }

  create(): void {
    const backdrop = new ParallaxBackdrop(this, DUSK_BACKDROP);
    this.backdrop = backdrop;
    this.deps.ui.showMainMenu();

    const onResize = (size: Phaser.Structs.Size): void => {
      backdrop.layout(size.width, size.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    const stopListening = this.deps.events.on('world:play-requested', (request) => {
      this.scene.start(SCENE_KEYS.world, request);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      stopListening();
      this.deps.ui.clear();
    });
  }

  override update(_time: number, delta: number): void {
    this.elapsedSeconds += delta / 1000;
    this.backdrop?.scrollTo(this.elapsedSeconds * MENU_DRIFT_SPEED);
    // El menú tiene de fondo la música tranquila de la noche.
    this.deps.audio.updateMusic('night');
  }
}
