import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '../../src/config/gameplay.config';
import { WorldClock } from '../../src/domain/world/WorldClock';

const cycle = GAMEPLAY_CONFIG.dayCycle;
const at = (time: number): WorldClock => new WorldClock(cycle, time);

describe('WorldClock', () => {
  it('recorre noche, amanecer, día y atardecer según la configuración', () => {
    expect(at(0.1).phase).toBe('night');
    expect(at(cycle.dawnStart + 0.01).phase).toBe('dawn');
    expect(at(0.5).phase).toBe('day');
    expect(at(cycle.duskStart + 0.01).phase).toBe('dusk');
    expect(at(cycle.nightStart + 0.01).phase).toBe('night');
    expect(at(0.1).isNight).toBe(true);
    expect(at(cycle.duskStart + 0.01).isNight).toBe(false);
  });

  it('la luz sube al amanecer y baja al atardecer de forma continua', () => {
    expect(at(0.1).daylight).toBe(0);
    expect(at(0.5).daylight).toBe(1);
    const midDawn = (cycle.dawnStart + cycle.dayStart) / 2;
    const midDusk = (cycle.duskStart + cycle.nightStart) / 2;
    expect(at(midDawn).daylight).toBeCloseTo(0.5);
    expect(at(midDusk).daylight).toBeCloseTo(0.5);
    for (let t = 0; t < 1; t += 0.001) {
      expect(Math.abs(at(t).daylight - at(t + 0.001).daylight)).toBeLessThan(0.03);
    }
  });

  it('avanza con el tiempo real y cuenta los días al pasar la medianoche', () => {
    const clock = at(0.9);
    clock.advance(cycle.dayLengthSeconds * 0.2);
    expect(clock.day).toBe(2);
    expect(clock.time).toBeCloseTo(0.1);
    expect(clock.hour).toBe(2);
    clock.advance(cycle.dayLengthSeconds * 3);
    expect(clock.day).toBe(5);
  });

  it('rechaza fases desordenadas', () => {
    expect(() => new WorldClock({ ...cycle, dayStart: 0.1 }, 0)).toThrow();
  });
});
