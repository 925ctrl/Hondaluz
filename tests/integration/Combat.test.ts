import { describe, expect, it } from 'vitest';
import { stepWorld } from '../../src/application/simulation/stepWorld';
import type { WorldSession } from '../../src/application/use-cases/world/WorldSession';
import { GAMEPLAY_CONFIG } from '../../src/config/gameplay.config';
import { content, openSession } from '../support/session';

const DT = 1 / 60;
const settings = GAMEPLAY_CONFIG.combat;

/** Coloca un enemigo de pie a `dx` píxeles del jugador. */
function enemyNextTo(session: WorldSession, id: string, dx: number) {
  const { player } = session;
  const definition = content.enemies.get(id);
  return session.enemies.add(
    definition,
    player.x + player.width / 2 + dx - definition.width / 2,
    player.y + player.height - definition.height,
  );
}

function run(session: WorldSession, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) {
    session.player.step({ moveX: 0, jump: false }, DT, session.map, session.tileSize);
    stepWorld(session, DT);
  }
}

describe('combate', () => {
  it('el contacto con un enemigo hiere y empuja al jugador, con invulnerabilidad', () => {
    const session = openSession(42);
    const { player } = session;
    const stump = enemyNextTo(session, 'stump', 4);
    session.combat.update(DT);

    expect(player.health.current).toBe(100 - stump.definition.damage);
    expect(player.vx).toBeLessThan(0);
    // Mientras dura la invulnerabilidad, seguir en contacto no hace más daño.
    session.combat.update(DT);
    expect(player.health.current).toBe(100 - stump.definition.damage);
  });

  it('un golpe de espada daña y empuja solo a los enemigos que tiene delante', () => {
    const session = openSession(42);
    session.inventory.add('wood_sword', 1);
    const ahead = enemyNextTo(session, 'stump', 18);
    const behind = enemyNextTo(session, 'stump', -18);
    const damage = content.items.get('wood_sword').weapon?.damage ?? 0;
    const aimRight = session.player.x + 100;

    expect(session.combat.useHeld(aimRight)).toBe('swung');
    expect(ahead.health.current).toBe(ahead.definition.maxHealth - damage);
    expect(ahead.vx).toBeGreaterThan(0);
    expect(behind.health.current).toBe(behind.definition.maxHealth);
    expect(session.combat.swing).toMatchObject({ itemId: 'wood_sword', facing: 1 });
    expect(session.player.facing).toBe(1);
  });

  it('respeta la recarga del arma', () => {
    const session = openSession(42);
    session.inventory.add('wood_sword', 1);
    const aim = session.player.x + 100;
    expect(session.combat.useHeld(aim)).toBe('swung');
    expect(session.combat.useHeld(aim)).toBe('busy');
    for (let i = 0; i < 60; i++) session.combat.update(DT);
    expect(session.combat.useHeld(aim)).toBe('swung');
  });

  it('sin arma ni consumible en la mano, el clic queda libre para minar', () => {
    const session = openSession(42);
    expect(session.combat.useHeld(0)).toBe('none');
    session.inventory.add('dirt', 1);
    expect(session.combat.useHeld(0)).toBe('none');
  });

  it('un enemigo muerto desaparece y suelta su botín', () => {
    const session = openSession(42);
    session.inventory.add('iron_sword', 1);
    const stump = enemyNextTo(session, 'stump', 18);
    const aim = session.player.x + 100;
    // Cada golpe lo aleja; se le devuelve delante del jugador antes del siguiente.
    for (let swing = 0; swing < 10 && !stump.health.isDead; swing++) {
      stump.x = session.player.x + 12;
      session.combat.useHeld(aim);
      run(session, 0.5);
    }
    expect(session.enemies.all).not.toContain(stump);
    // El botín cae junto al jugador, que puede haberlo recogido ya.
    const onGround = session.drops.items.reduce(
      (sum, drop) => sum + (drop.itemId === 'wood' ? drop.count : 0),
      0,
    );
    expect(onGround + session.inventory.count('wood')).toBe(3);
  });

  it('la vida se regenera tras un rato sin recibir daño', () => {
    const session = openSession(42);
    const { health } = session.player;
    health.damage(50, 0);
    run(session, settings.regenDelaySeconds - 1);
    expect(health.current).toBe(50);
    run(session, 3);
    expect(health.current).toBeGreaterThan(55);
  });

  it('el bálsamo cura, se gasta y no se malgasta con la vida llena', () => {
    const session = openSession(42);
    session.inventory.add('balm', 2);
    expect(session.combat.useHeld(0)).toBe('busy');
    expect(session.inventory.count('balm')).toBe(2);

    session.player.health.damage(60, 0);
    expect(session.combat.useHeld(0)).toBe('consumed');
    expect(session.player.health.current).toBe(80);
    expect(session.inventory.count('balm')).toBe(1);
    expect(session.combat.useHeld(0)).toBe('busy');
  });

  it('el jugador muere al perder toda la vida y reaparece con ella completa', () => {
    const session = openSession(42);
    const { player } = session;
    const start = { x: player.x, y: player.y };
    session.inventory.add('dirt', 5);
    player.x += 200;
    player.health.damage(1000, 0);
    expect(player.health.isDead).toBe(true);
    // Ya no se puede atacar ni usar objetos.
    expect(session.combat.useHeld(0)).toBe('none');

    session.respawnPlayer();
    expect(player.health.current).toBe(player.health.max);
    expect({ x: player.x, y: player.y }).toEqual(start);
    expect(session.inventory.count('dirt')).toBe(5);
  });
});

describe('aparición de enemigos', () => {
  function sessionAt(time: number): WorldSession {
    const session = openSession(42);
    session.clock.advance((time - session.clock.time) * GAMEPLAY_CONFIG.dayCycle.dayLengthSeconds);
    return session;
  }

  it('de día no aparecen criaturas de superficie junto a un jugador en la superficie', () => {
    const session = sessionAt(0.5);
    for (let i = 0; i < 40; i++) session.spawner.trySpawn();
    expect(session.enemies.all).toHaveLength(0);
  });

  it('de noche aparecen criaturas de superficie y del aire, fuera de la vista y sin solapar bloques', () => {
    const session = sessionAt(0.9);
    const { player, map, tileSize } = session;
    for (let i = 0; i < 40; i++) session.spawner.trySpawn();
    const kinds = new Set(session.enemies.all.map((enemy) => enemy.definition.id));
    expect(kinds).toEqual(new Set(['stump', 'ash_moth']));
    for (const enemy of session.enemies.all) {
      const distance = Math.abs(enemy.x - player.x) / tileSize;
      expect(distance).toBeGreaterThan(GAMEPLAY_CONFIG.spawning.minDistanceTiles - 2);
      expect(distance).toBeLessThan(GAMEPLAY_CONFIG.spawning.maxDistanceTiles + 2);
      const overlaps = Array.from({ length: 3 }, (_, i) =>
        map.isSolid(
          Math.floor((enemy.x + (i * enemy.width) / 2) / tileSize),
          Math.floor(enemy.y / tileSize),
        ),
      );
      expect(overlaps.every((solid) => !solid)).toBe(true);
    }
  });

  it('bajo tierra aparecen topos dentro de la roca a cualquier hora', () => {
    const session = sessionAt(0.5);
    session.player.y += 40 * session.tileSize;
    for (let i = 0; i < 60; i++) session.spawner.trySpawn();
    expect(session.enemies.all.length).toBeGreaterThan(0);
    for (const enemy of session.enemies.all) {
      expect(enemy.definition.id).toBe('rock_mole');
      const tileX = Math.floor(enemy.x / session.tileSize);
      const tileY = Math.floor(enemy.y / session.tileSize);
      expect(session.map.isSolid(tileX, tileY)).toBe(true);
    }
  });

  it('respeta el límite de población y retira a las criaturas lejanas', () => {
    const session = sessionAt(0.9);
    run(session, 60);
    expect(session.enemies.all.length).toBeLessThanOrEqual(GAMEPLAY_CONFIG.spawning.maxNight);
    expect(session.enemies.all.length).toBeGreaterThan(0);

    const far = session.enemies.add(content.enemies.get('ash_moth'), 0, 0);
    session.spawner.update(DT);
    expect(session.enemies.all).not.toContain(far);
  });
});
