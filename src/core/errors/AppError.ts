/** Entrada inválida del usuario o de datos externos. Su mensaje puede mostrarse en la interfaz. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}

/** Fallo al leer o escribir datos guardados. */
export class PersistenceError extends Error {
  override readonly name = 'PersistenceError';
}

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
}
