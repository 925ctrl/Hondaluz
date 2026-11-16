import { ContentError } from '../errors/ContentError';

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Colección inmutable de definiciones de contenido con id estable.
 * El índice numérico depende del orden de registro y solo vale en memoria;
 * lo que se guarda en disco debe referirse siempre al id.
 */
export class Registry<T extends { readonly id: string }> {
  private readonly indexById = new Map<string, number>();

  constructor(
    private readonly kind: string,
    private readonly definitions: readonly T[],
  ) {
    definitions.forEach((definition, index) => {
      if (!ID_PATTERN.test(definition.id)) {
        throw new ContentError(
          `Id de ${kind} inválido: "${definition.id}". Usa minúsculas, cifras y "_".`,
        );
      }
      if (this.indexById.has(definition.id)) {
        throw new ContentError(`Id de ${kind} duplicado: "${definition.id}".`);
      }
      this.indexById.set(definition.id, index);
    });
  }

  get all(): readonly T[] {
    return this.definitions;
  }

  has(id: string): boolean {
    return this.indexById.has(id);
  }

  indexOf(id: string): number {
    const index = this.indexById.get(id);
    if (index === undefined) throw new ContentError(`No existe ${this.kind} con id "${id}".`);
    return index;
  }

  get(id: string): T {
    return this.at(this.indexOf(id));
  }

  at(index: number): T {
    const definition = this.definitions[index];
    if (!definition) throw new ContentError(`No existe ${this.kind} con índice ${String(index)}.`);
    return definition;
  }
}
