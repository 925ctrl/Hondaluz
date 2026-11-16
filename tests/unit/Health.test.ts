import { describe, expect, it } from 'vitest';
import { Health } from '../../src/domain/combat/Health';

describe('Health', () => {
  it('aplica daño, abre invulnerabilidad y la cierra con el tiempo', () => {
    const health = new Health(100);
    expect(health.damage(30, 0.5)).toBe(30);
    expect(health.current).toBe(70);
    expect(health.isInvulnerable).toBe(true);
    expect(health.damage(30, 0.5)).toBe(0);
    health.tick(0.5);
    expect(health.damage(30, 0.5)).toBe(30);
    expect(health.current).toBe(40);
  });

  it('no baja de cero ni cura más allá del máximo, ni cura a los muertos', () => {
    const health = new Health(50);
    expect(health.damage(80, 0)).toBe(50);
    expect(health.isDead).toBe(true);
    expect(health.heal(10)).toBe(0);
    health.restore();
    expect(health.current).toBe(50);
    health.damage(5, 0);
    expect(health.heal(20)).toBe(5);
  });

  it('cuenta el tiempo desde el último daño', () => {
    const health = new Health(10);
    expect(health.secondsSinceDamage).toBe(Infinity);
    health.damage(1, 0);
    health.tick(2);
    expect(health.secondsSinceDamage).toBe(2);
  });
});
