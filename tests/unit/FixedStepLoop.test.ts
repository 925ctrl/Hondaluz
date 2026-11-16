import { describe, expect, it, vi } from 'vitest';
import { FixedStepLoop } from '../../src/application/simulation/FixedStepLoop';

describe('FixedStepLoop', () => {
  it('ejecuta tantos pasos como tiempo acumulado y devuelve la fracción sobrante', () => {
    const loop = new FixedStepLoop(0.25, 10);
    const step = vi.fn();
    expect(loop.advance(0.6, step)).toBeCloseTo(0.4);
    expect(step).toHaveBeenCalledTimes(2);
    expect(step).toHaveBeenCalledWith(0.25);
    loop.advance(0.2, step);
    expect(step).toHaveBeenCalledTimes(3);
  });

  it('limita los pasos tras un parón largo', () => {
    const loop = new FixedStepLoop(0.25, 3);
    const step = vi.fn();
    loop.advance(100, step);
    expect(step).toHaveBeenCalledTimes(3);
  });
});
