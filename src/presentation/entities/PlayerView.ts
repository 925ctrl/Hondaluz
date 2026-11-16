import type Phaser from 'phaser';
import type { Player } from '../../domain/entities/Player';
import { PLAYER_FRAMES, PLAYER_TEXTURE_KEY } from './playerTextures';

const RUN_ANIMATION = 'player-run';
/** Por debajo de esta velocidad horizontal (px/s) el jugador se considera quieto. */
const RUN_THRESHOLD = 12;

/** Sprite del jugador: traduce su estado a posición, orientación y animación. */
export class PlayerView {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, depth: number) {
    if (!scene.anims.exists(RUN_ANIMATION)) {
      const { pass, half, apart } = PLAYER_FRAMES;
      scene.anims.create({
        key: RUN_ANIMATION,
        frames: [pass, half, apart, half].map((frame) => ({ key: PLAYER_TEXTURE_KEY, frame })),
        frameRate: 11,
        repeat: -1,
      });
    }
    this.sprite = scene.add.sprite(0, 0, PLAYER_TEXTURE_KEY, PLAYER_FRAMES.idle);
    this.sprite.setOrigin(0.5, 1).setDepth(depth);
  }

  /** `feetX`, `feetY`: punto central de los pies en píxeles del mundo. */
  sync(player: Player, feetX: number, feetY: number): void {
    this.sprite.setPosition(feetX, feetY).setFlipX(player.facing < 0);
    if (!player.grounded) {
      this.sprite.anims.stop();
      this.sprite.setFrame(player.vy < 0 ? PLAYER_FRAMES.jump : PLAYER_FRAMES.apart);
    } else if (Math.abs(player.vx) > RUN_THRESHOLD) {
      this.sprite.anims.play(RUN_ANIMATION, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(PLAYER_FRAMES.idle);
    }
  }
}
