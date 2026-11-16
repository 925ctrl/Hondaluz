import { PersistenceError } from '../../core/errors/AppError';

export const WORLDS_STORE = 'worlds';
/** Estado de cada partida (jugador, inventario, hora), por id de mundo. */
export const STATES_STORE = 'world_states';
/** Chunks cambiados de cada mundo, con clave `[worldId, chunkKey]`. */
export const CHUNKS_STORE = 'world_chunks';

/**
 * Migraciones de estructura: la posición `n` lleva la base de datos de la versión `n` a `n + 1`.
 * Añadir un almacén o índice es añadir una función al final; nunca editar las existentes.
 */
const SCHEMA_MIGRATIONS: readonly ((db: IDBDatabase) => void)[] = [
  (db) => {
    db.createObjectStore(WORLDS_STORE, { keyPath: 'id' });
  },
  (db) => {
    db.createObjectStore(STATES_STORE, { keyPath: 'worldId' });
    db.createObjectStore(CHUNKS_STORE, { keyPath: ['worldId', 'key'] });
  },
];

export function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, SCHEMA_MIGRATIONS.length);
    request.onupgradeneeded = (event) => {
      for (const migrate of SCHEMA_MIGRATIONS.slice(event.oldVersion)) {
        migrate(request.result);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new PersistenceError('No se pudo abrir el almacenamiento del navegador.'));
    };
    request.onblocked = () => {
      reject(
        new PersistenceError('El juego está abierto en otra pestaña con una versión antigua.'),
      );
    };
  });
}

/** Ejecuta una operación en una transacción y resuelve cuando esta se ha confirmado. */
export function runTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      resolve(request.result);
    };
    const fail = (): void => {
      reject(
        new PersistenceError('Falló una operación de guardado.', {
          cause: transaction.error ?? request.error,
        }),
      );
    };
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

/**
 * Ejecuta varias operaciones sobre varios almacenes en una sola transacción: o se guardan
 * todas o ninguna. Resuelve con lo que devuelva `operation` cuando la transacción se confirma.
 */
export function runMultiTransaction<T>(
  db: IDBDatabase,
  storeNames: readonly string[],
  mode: IDBTransactionMode,
  operation: (stores: Record<string, IDBObjectStore>) => () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([...storeNames], mode);
    const stores = Object.fromEntries(
      storeNames.map((name) => [name, transaction.objectStore(name)]),
    );
    const result = operation(stores);
    transaction.oncomplete = () => {
      resolve(result());
    };
    const fail = (): void => {
      reject(
        new PersistenceError('Falló una operación de guardado.', { cause: transaction.error }),
      );
    };
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}
