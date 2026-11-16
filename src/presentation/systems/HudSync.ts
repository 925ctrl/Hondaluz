import type { GameEventBus } from '../../application/events/GameEvents';
import type { WorldSession } from '../../application/use-cases/world/WorldSession';

/**
 * Informa a la interfaz de lo que muestra (posición, bioma, vida, hora) solo cuando cambia lo que
 * se ve, no en cada frame.
 */
export class HudSync {
  private shown = { tile: '', biome: '', health: '', clock: '' };

  constructor(
    private readonly session: WorldSession,
    private readonly events: GameEventBus,
  ) {}

  /** Olvida lo último enviado para que la próxima actualización lo envíe todo. */
  invalidate(): void {
    this.shown = { tile: '', biome: '', health: '', clock: '' };
  }

  update(): void {
    const { player, clock, tileSize } = this.session;
    const x = Math.floor((player.x + player.width / 2) / tileSize);
    const y = Math.floor((player.y + player.height - 1) / tileSize);
    if (this.changed('tile', `${String(x)},${String(y)}`)) {
      this.events.emit('player:tile-changed', { x, y });
      const { name } = this.session.map.biomeAt(x, y);
      if (this.changed('biome', name)) this.events.emit('player:biome-changed', { name });
    }

    const current = Math.ceil(player.health.current);
    const { max } = player.health;
    if (this.changed('health', `${String(current)}/${String(max)}`)) {
      this.events.emit('player:health-changed', { current, max });
    }

    const { day, hour, phase } = clock;
    if (this.changed('clock', `${String(day)}:${String(hour)}:${phase}`)) {
      this.events.emit('clock:changed', { day, hour, phase });
    }
  }

  private changed(key: keyof HudSync['shown'], value: string): boolean {
    if (this.shown[key] === value) return false;
    this.shown[key] = value;
    return true;
  }
}
