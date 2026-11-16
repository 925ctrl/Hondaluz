import type { WorldMeta } from '../../../domain/entities/World';
import type { WorldRepository } from '../../../domain/repositories/WorldRepository';
import { runTransaction, WORLDS_STORE } from '../IndexedDbDatabase';
import { fromWorldRecord, toWorldRecord } from '../serializers/worldSerializer';

export class IndexedDbWorldRepository implements WorldRepository {
  /** Recibe la promesa para que un fallo al abrir la base aparezca en la primera operación. */
  constructor(private readonly database: Promise<IDBDatabase>) {}

  async list(): Promise<WorldMeta[]> {
    const records = await this.run<unknown[]>('readonly', (store) => store.getAll());
    const worlds: WorldMeta[] = [];
    for (const record of records) {
      try {
        worlds.push(fromWorldRecord(record));
      } catch (error) {
        // Un registro corrupto no debe impedir cargar el resto de mundos.
        console.warn('Se omite un mundo guardado ilegible.', error);
      }
    }
    return worlds;
  }

  async get(id: string): Promise<WorldMeta | undefined> {
    const record = await this.run<unknown>('readonly', (store) => store.get(id));
    return record === undefined ? undefined : fromWorldRecord(record);
  }

  async save(world: WorldMeta): Promise<void> {
    await this.run('readwrite', (store) => store.put(toWorldRecord(world)));
  }

  async delete(id: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(id));
  }

  private async run<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return runTransaction(await this.database, WORLDS_STORE, mode, operation);
  }
}
