/** Definición de contenido inválida. Se lanza al arrancar para que el error no llegue a la partida. */
export class ContentError extends Error {
  override readonly name = 'ContentError';
}
