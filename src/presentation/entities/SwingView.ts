import type Phaser from 'phaser';
import type { ActiveSwing } from '../../application/use-cases/combat/CombatService';
import { ITEM_ATLAS_KEY } from '../world/itemTextures';

/** Ángulos inicial y final del arco del golpe, en grados, mirando a la derecha. */
const ARC_START = -100;
const ARC_END = 70;

/** Dibuja el arma describiendo un arco por delante del jugador mientras dura el golpe. */
export class SwingView {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, depth: number) {
    // La empuñadura del dibujo está abajo a la izquierda: el arma gira alrededor de ella.
    this.image = scene.add
      .image(0, 0, ITEM_ATLAS_KEY)
      .setOrigin(0.12, 0.88)
      .setDepth(depth)
      .setVisible(false);
  }

  /** `handX`, `handY`: punto de la mano del jugador en píxeles del mundo. */
  sync(swing: ActiveSwing | null, handX: number, handY: number): void {
    if (!swing) {
      this.image.setVisible(false);
      return;
    }
    const angle = ARC_START + (ARC_END - ARC_START) * Math.min(1, swing.progress);
    this.image
      .setFrame(swing.itemId)
      .setVisible(true)
      .setPosition(Math.round(handX), Math.round(handY))
      .setFlipX(swing.facing < 0)
      .setOrigin(swing.facing > 0 ? 0.12 : 0.88, 0.88)
      .setAngle(swing.facing > 0 ? angle : -angle);
  }
}
