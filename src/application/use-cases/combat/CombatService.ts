import type { RandomSource } from '../../../core/utils/random';
import type { ItemRegistry } from '../../../domain/catalog/GameContent';
import type { Enemy } from '../../../domain/enemies/Enemy';
import type { HappeningLog } from '../../../domain/events/Happenings';
import type { EnemyRoster } from '../../../domain/enemies/EnemyRoster';
import type { Player } from '../../../domain/entities/Player';
import type { HeldItemSource } from '../../../domain/inventory/InventoryPort';
import type { DroppedItems } from '../../../domain/items/DroppedItems';

export interface CombatSettings {
  readonly playerInvulnerableSeconds: number;
  readonly playerKnockbackSpeed: number;
  readonly playerKnockbackLift: number;
  readonly playerStunSeconds: number;
  /** Segundos sin recibir daño antes de empezar a recuperar vida. */
  readonly regenDelaySeconds: number;
  readonly regenPerSecond: number;
  readonly enemyInvulnerableSeconds: number;
  readonly enemyStunSeconds: number;
  /** Fracción del retroceso horizontal que se aplica hacia arriba. */
  readonly knockbackLiftRatio: number;
  readonly consumableCooldownSeconds: number;
}

export interface CombatDeps {
  readonly player: Player;
  readonly enemies: EnemyRoster;
  readonly held: HeldItemSource;
  readonly items: ItemRegistry;
  readonly drops: DroppedItems;
  readonly random: RandomSource;
  readonly settings: CombatSettings;
  readonly happenings: HappeningLog;
}

/** Golpe en curso, para que la vista pueda dibujarlo. */
export interface ActiveSwing {
  readonly itemId: string;
  readonly facing: -1 | 1;
  /** Avance de la animación del golpe (0-1). */
  readonly progress: number;
}

/**
 * - `swung`: se ha atacado con el arma de la mano.
 * - `consumed`: se ha usado el consumible de la mano.
 * - `busy`: lo de la mano es usable pero ahora no (recarga, vida llena).
 * - `none`: lo de la mano no se usa en combate; el clic puede servir para otra cosa.
 */
export type HeldUseResult = 'swung' | 'consumed' | 'busy' | 'none';

/**
 * Combate y estado vital: ataques del jugador, daño por contacto con criaturas, muertes y su
 * botín, uso de consumibles y regeneración de vida.
 */
export class CombatService {
  private cooldown = 0;
  private swingState: { itemId: string; facing: -1 | 1; elapsed: number; duration: number } | null =
    null;

  constructor(private readonly deps: CombatDeps) {}

  get swing(): ActiveSwing | null {
    const s = this.swingState;
    return s ? { itemId: s.itemId, facing: s.facing, progress: s.elapsed / s.duration } : null;
  }

  /** Usa lo que el jugador lleva en la mano, apuntando a la coordenada horizontal `aimX`. */
  useHeld(aimX: number): HeldUseResult {
    const { held, items, player, settings } = this.deps;
    const stack = held.held();
    if (!stack || player.health.isDead) return 'none';
    const item = items.get(stack.itemId);

    if (item.weapon) {
      if (this.cooldown > 0) return 'busy';
      const weapon = item.weapon;
      const facing: -1 | 1 = aimX >= player.x + player.width / 2 ? 1 : -1;
      player.facing = facing;
      this.cooldown = weapon.cooldownSeconds;
      this.swingState = {
        itemId: item.id,
        facing,
        elapsed: 0,
        duration: weapon.cooldownSeconds * 0.8,
      };

      const hitbox = {
        x: facing > 0 ? player.x + player.width / 2 : player.x + player.width / 2 - weapon.reach,
        y: player.y - 6,
        width: weapon.reach,
        height: player.height + 6,
      };
      this.deps.happenings.push({ kind: 'swing' });
      for (const enemy of this.deps.enemies.touching(hitbox)) {
        if (enemy.health.damage(weapon.damage, settings.enemyInvulnerableSeconds) === 0) continue;
        this.deps.happenings.push({
          kind: 'enemy-hit',
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
        });
        enemy.knockBack(
          facing * weapon.knockback,
          -weapon.knockback * settings.knockbackLiftRatio,
          settings.enemyStunSeconds,
        );
      }
      return 'swung';
    }

    if (item.consumable) {
      const { health } = player;
      if (this.cooldown > 0 || health.current >= health.max) return 'busy';
      if (!held.consumeHeld(1)) return 'none';
      health.heal(item.consumable.heal);
      this.cooldown = settings.consumableCooldownSeconds;
      this.deps.happenings.push({ kind: 'item-consumed' });
      return 'consumed';
    }
    return 'none';
  }

  /** Avanza un paso: recargas, regeneración, daño por contacto y muertes. */
  update(dt: number): void {
    const { player, enemies, settings } = this.deps;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.swingState) {
      this.swingState.elapsed += dt;
      if (this.swingState.elapsed >= this.swingState.duration) this.swingState = null;
    }

    const { health } = player;
    health.tick(dt);
    if (!health.isDead) {
      if (health.secondsSinceDamage >= settings.regenDelaySeconds) {
        health.heal(settings.regenPerSecond * dt);
      }
      for (const enemy of enemies.touching(player)) this.hurtPlayer(enemy);
    }

    for (const enemy of [...enemies.all]) {
      if (enemy.health.isDead) this.kill(enemy);
    }
  }

  /** Olvida golpes y recargas en curso, por ejemplo al reaparecer. */
  reset(): void {
    this.cooldown = 0;
    this.swingState = null;
  }

  private hurtPlayer(enemy: Enemy): void {
    const { player, settings } = this.deps;
    const applied = player.health.damage(
      enemy.definition.damage,
      settings.playerInvulnerableSeconds,
    );
    if (applied === 0) return;
    this.deps.happenings.push({
      kind: 'player-hurt',
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
    });
    const away = player.x + player.width / 2 >= enemy.x + enemy.width / 2 ? 1 : -1;
    player.knockBack(
      away * settings.playerKnockbackSpeed,
      -settings.playerKnockbackLift,
      settings.playerStunSeconds,
    );
  }

  private kill(enemy: Enemy): void {
    const { enemies, drops, random } = this.deps;
    enemies.remove(enemy);
    const centerX = enemy.x + enemy.width / 2;
    const centerY = enemy.y + enemy.height / 2;
    this.deps.happenings.push({ kind: 'enemy-killed', x: centerX, y: centerY });
    for (const drop of enemy.definition.drops) {
      if (random() < drop.chance) drops.spawn(drop.itemId, drop.count, centerX, centerY);
    }
  }
}
