import type { WorldMeta } from '../entities/World';

/** Puerto de persistencia de mundos. Las implementaciones viven en infraestructura. */
export interface WorldRepository {
  list(): Promise<WorldMeta[]>;
  get(id: string): Promise<WorldMeta | undefined>;
  save(world: WorldMeta): Promise<void>;
  delete(id: string): Promise<void>;
}
