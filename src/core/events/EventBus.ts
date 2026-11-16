export type Unsubscribe = () => void;

type Listener<T> = (payload: T) => void;
type PayloadArgs<T> = [T] extends [undefined] ? [] : [payload: T];

/**
 * Bus de eventos tipado. `E` asocia cada nombre de evento con su payload.
 * Quien se suscribe es responsable de llamar a la función devuelta al terminar.
 */
export class EventBus<E extends object> {
  private readonly listeners = new Map<keyof E, Set<Listener<never>>>();

  on<K extends keyof E>(type: K, listener: Listener<E[K]>): Unsubscribe {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    const registered = set;
    registered.add(listener);
    return () => {
      registered.delete(listener);
    };
  }

  emit<K extends keyof E>(type: K, ...args: PayloadArgs<E[K]>): void {
    const set = this.listeners.get(type);
    if (!set) return;
    // Copia: un listener puede darse de baja mientras se emite.
    for (const listener of [...set]) {
      (listener as Listener<E[K]>)(args[0] as E[K]);
    }
  }
}
