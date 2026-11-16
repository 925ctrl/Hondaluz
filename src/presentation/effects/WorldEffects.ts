import type { Player } from '../../domain/entities/Player';
import type { Happening } from '../../domain/events/Happenings';
import type { BlockRegistry } from '../../domain/world/BlockDefinition';
import type { AudioEngine } from '../audio/AudioEngine';
import { breakCue } from '../audio/soundBank';
import type { ParticleView } from './ParticleView';

const SPARK = [0xfff6d0, 0xffe08a, 0xf08a5d];
const DUST = [0x9a9cb0, 0x7d7f93, 0x5e6078];
const SPLASH = [0x6f9fe0, 0xbedcff];

/**
 * Cuenta con sonido, partículas y sacudidas de cámara lo que pasa en el mundo. No decide
 * nada del juego: solo traduce los sucesos que anotan las reglas.
 */
export class WorldEffects {
  private readonly blockColors: readonly (readonly number[])[];
  private wasSubmerged = false;

  constructor(
    private readonly blocks: BlockRegistry,
    private readonly audio: AudioEngine,
    private readonly particles: ParticleView,
    private readonly shake: () => void,
  ) {
    this.blockColors = blocks.all.map((block) => {
      const visual = block.visual;
      if (!visual) return [];
      if ('sprite' in visual) return Object.values(visual.sprite.palette).slice(0, 4);
      return [visual.base, visual.shade, visual.highlight];
    });
  }

  handle(happening: Happening): void {
    const { audio, particles } = this;
    switch (happening.kind) {
      case 'block-broken': {
        const cue = breakCue(this.blocks.at(happening.block));
        if (cue) audio.play(cue);
        particles.burst({
          x: happening.x,
          y: happening.y,
          colors: this.blockColors[happening.block] ?? DUST,
          count: 10,
          speed: 70,
          gravity: 420,
          life: 0.5,
        });
        return;
      }
      case 'block-placed':
        audio.play('place');
        particles.burst({
          x: happening.x,
          y: happening.y + 7,
          colors: DUST,
          count: 4,
          speed: 30,
          gravity: 0,
          life: 0.25,
          size: 1,
        });
        return;
      case 'item-picked':
        audio.play('pickup');
        return;
      case 'swing':
        audio.play('swing');
        return;
      case 'enemy-hit':
        audio.play('hit');
        particles.burst({
          ...happening,
          colors: SPARK,
          count: 6,
          speed: 90,
          gravity: 200,
          life: 0.25,
          size: 1,
        });
        return;
      case 'enemy-killed':
        audio.play('kill');
        particles.burst({
          ...happening,
          colors: DUST,
          count: 16,
          speed: 50,
          gravity: -20,
          life: 0.7,
        });
        return;
      case 'player-hurt':
        audio.play('hurt');
        this.shake();
        return;
      case 'item-consumed':
        audio.play('heal');
        return;
      case 'crafted':
        audio.play('craft');
        return;
    }
  }

  /** Efectos que dependen del estado del jugador, como chapotear al entrar en el agua. */
  follow(player: Player): void {
    if (player.submerged && !this.wasSubmerged && player.vy > 60) {
      this.audio.play('splash');
      this.particles.burst({
        x: player.x + player.width / 2,
        y: player.y + player.height,
        colors: SPLASH,
        count: 12,
        speed: 80,
        gravity: 500,
        life: 0.5,
      });
    }
    this.wasSubmerged = player.submerged;
  }
}
