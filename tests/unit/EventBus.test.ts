import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events/EventBus';

interface TestEvents {
  scored: { points: number };
  reset: undefined;
}

describe('EventBus', () => {
  it('entrega el payload a todos los suscriptores del evento', () => {
    const bus = new EventBus<TestEvents>();
    const first = vi.fn();
    const second = vi.fn();
    const other = vi.fn();
    bus.on('scored', first);
    bus.on('scored', second);
    bus.on('reset', other);

    bus.emit('scored', { points: 3 });

    expect(first).toHaveBeenCalledWith({ points: 3 });
    expect(second).toHaveBeenCalledWith({ points: 3 });
    expect(other).not.toHaveBeenCalled();
  });

  it('deja de notificar tras darse de baja', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    const unsubscribe = bus.on('reset', listener);

    bus.emit('reset');
    unsubscribe();
    bus.emit('reset');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('permite darse de baja durante la emisión sin saltarse a otros suscriptores', () => {
    const bus = new EventBus<TestEvents>();
    const later = vi.fn();
    const unsubscribe = bus.on('reset', () => {
      unsubscribe();
    });
    bus.on('reset', later);

    bus.emit('reset');

    expect(later).toHaveBeenCalledTimes(1);
  });
});
