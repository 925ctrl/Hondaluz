import { describe, expect, it } from 'vitest';
import { stepWorld } from '../../src/application/simulation/stepWorld';
import { WORLD_CONFIG } from '../../src/config/world.config';
import { HappeningLog } from '../../src/domain/events/Happenings';
import { content, openSession } from '../support/session';

const { tileSize } = WORLD_CONFIG;

describe('sucesos del mundo', () => {
  it('el buzón entrega lo pendiente una sola vez y no crece sin límite', () => {
    const log = new HappeningLog();
    log.push({ kind: 'swing' });
    expect(log.drain()).toEqual([{ kind: 'swing' }]);
    expect(log.drain()).toEqual([]);
    for (let i = 0; i < 1000; i++) log.push({ kind: 'crafted' });
    expect(log.drain().length).toBeLessThanOrEqual(256);
  });

  it('minar, recoger, colocar, atacar y matar quedan anotados', () => {
    const session = openSession(42);
    const { player, map, mining, building, combat, inventory, happenings } = session;
    const feetX = Math.floor((player.x + player.width / 2) / tileSize);
    const groundY = Math.floor((player.y + player.height) / tileSize);

    for (let i = 0; i < 60 && !mining.update(player, { x: feetX + 1, y: groundY }, 1 / 60); i++);
    for (let i = 0; i < 120; i++) stepWorld(session, 1 / 60);
    inventory.select(0);
    building.place(player, feetX + 1, groundY);

    inventory.add('iron_sword', 1);
    inventory.select(inventory.snapshot().findIndex((s) => s?.itemId === 'iron_sword'));
    const stump = session.enemies.add(content.enemies.get('stump'), player.x + 14, player.y + 12);
    for (let i = 0; i < 300 && session.enemies.all.includes(stump); i++) {
      combat.useHeld(player.x + 100);
      stepWorld(session, 1 / 60);
    }

    const kinds = new Set(happenings.drain().map((h) => h.kind));
    for (const kind of [
      'block-broken',
      'item-picked',
      'block-placed',
      'swing',
      'enemy-hit',
      'enemy-killed',
    ]) {
      expect(kinds).toContain(kind);
    }
    expect(map.tileAt(feetX + 1, groundY)).not.toBe(0);
  });
});
