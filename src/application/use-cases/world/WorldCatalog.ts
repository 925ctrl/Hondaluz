import { NotFoundError } from '../../../core/errors/AppError';
import type { RandomSource } from '../../../core/utils/random';
import { normalizeWorldName, type WorldMeta } from '../../../domain/entities/World';
import type { WorldRepository } from '../../../domain/repositories/WorldRepository';
import type {
  WorldSave,
  WorldSaveRepository,
} from '../../../domain/repositories/WorldSaveRepository';
import { createSeed } from '../../../domain/value-objects/Seed';

export interface WorldCatalogDeps {
  readonly repository: WorldRepository;
  readonly saves: WorldSaveRepository;
  readonly now: () => number;
  readonly random: RandomSource;
  readonly createId: () => string;
}

/** Un mundo listo para jugarse: su identidad y lo guardado, si se ha jugado antes. */
export interface OpenedWorld {
  readonly world: WorldMeta;
  readonly save: WorldSave | undefined;
}

export interface CreateWorldInput {
  readonly name: string;
  readonly seed: string;
}

/** Casos de uso sobre la colección de mundos: crear, listar, abrir y borrar. */
export class WorldCatalog {
  constructor(private readonly deps: WorldCatalogDeps) {}

  async create(input: CreateWorldInput): Promise<WorldMeta> {
    const now = this.deps.now();
    const world: WorldMeta = {
      id: this.deps.createId(),
      name: normalizeWorldName(input.name),
      seed: createSeed(input.seed, this.deps.random),
      createdAt: now,
      lastPlayedAt: now,
      playedSeconds: 0,
    };
    await this.deps.repository.save(world);
    return world;
  }

  /** Mundos ordenados del jugado más recientemente al más antiguo. */
  async list(): Promise<WorldMeta[]> {
    const worlds = await this.deps.repository.list();
    return worlds.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  async lastPlayed(): Promise<WorldMeta | undefined> {
    return (await this.list())[0];
  }

  /**
   * Carga lo guardado del mundo y lo marca como jugado ahora. Si el guardado no se puede
   * leer, falla sin tocar nada: empezar de cero lo sobrescribiría al guardar.
   */
  async open(id: string): Promise<OpenedWorld> {
    const world = await this.deps.repository.get(id);
    if (!world) throw new NotFoundError('Ese mundo ya no existe.');
    const save = await this.deps.saves.load(id);
    const opened: WorldMeta = { ...world, lastPlayedAt: this.deps.now() };
    await this.deps.repository.save(opened);
    return { world: opened, save };
  }

  /** Borra el mundo y su partida guardada. */
  async remove(id: string): Promise<void> {
    await this.deps.saves.delete(id);
    await this.deps.repository.delete(id);
  }
}
