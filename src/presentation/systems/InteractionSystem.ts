import type { WorldSession } from '../../application/use-cases/world/WorldSession';
import type { InputSource } from '../input/InputSource';
import type { BlockCursor } from '../world/BlockCursor';

export interface InteractionSettings {
  readonly tileSize: number;
  readonly placeIntervalSeconds: number;
}

/**
 * Traduce el puntero y los botones en ataques, uso de objetos, minería y construcción,
 * y mantiene al día el cursor. Los bloques que cambian se repintan solos: `ChunkLayer`
 * escucha los cambios del mapa.
 */
export class InteractionSystem {
  private placeCooldown = 0;
  /** Último bloque por el que se avisó, para no repetir el aviso en cada frame. */
  private hintedTile = '';

  constructor(
    private readonly session: WorldSession,
    private readonly input: InputSource,
    private readonly cursor: BlockCursor,
    private readonly settings: InteractionSettings,
    private readonly onHint: (text: string) => void,
  ) {}

  /** `viewX`, `viewY`: esquina superior izquierda de la vista en píxeles del mundo. */
  update(deltaSeconds: number, viewX: number, viewY: number): void {
    const { player, mining, building } = this.session;
    const { tileSize, placeIntervalSeconds } = this.settings;
    this.placeCooldown = Math.max(0, this.placeCooldown - deltaSeconds);

    const pointer = this.input.pointer;
    if (!pointer) {
      mining.stop();
      this.cursor.hide();
      return;
    }
    const target = {
      x: Math.floor((viewX + pointer.x) / tileSize),
      y: Math.floor((viewY + pointer.y) / tileSize),
    };

    // Lo que se lleva en la mano decide el clic primario: atacar, usar o, si no, minar.
    const used = this.input.isActive('primaryUse')
      ? this.session.combat.useHeld(viewX + pointer.x)
      : 'none';
    if (used !== 'none') {
      mining.stop();
    } else if (this.input.isActive('primaryUse')) {
      mining.update(player, target, deltaSeconds);
      this.hintIfToolTooWeak(target.x, target.y);
    } else {
      mining.stop();
      this.hintedTile = '';
    }

    if (this.input.isActive('secondaryUse') && this.placeCooldown === 0) {
      if (building.place(player, target.x, target.y) === 'placed') {
        this.placeCooldown = placeIntervalSeconds;
      }
    }

    const progress = mining.current?.progress ?? 0;
    this.cursor.show(target.x, target.y, mining.canMine(player, target.x, target.y), progress);
  }

  private hintIfToolTooWeak(tileX: number, tileY: number): void {
    const key = `${String(tileX)},${String(tileY)}`;
    if (key === this.hintedTile) return;
    this.hintedTile = key;
    if (this.session.mining.needsBetterTool(this.session.player, tileX, tileY)) {
      this.onHint('Necesitas un pico mejor para romper esto');
    }
  }
}
