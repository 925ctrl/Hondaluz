import type { WorldMeta } from '../../src/domain/entities/World';
import type { WorldRepository } from '../../src/domain/repositories/WorldRepository';

export class InMemoryWorldRepository implements WorldRepository {
  private readonly worlds = new Map<string, WorldMeta>();

  list(): Promise<WorldMeta[]> {
    return Promise.resolve([...this.worlds.values()]);
  }

  get(id: string): Promise<WorldMeta | undefined> {
    return Promise.resolve(this.worlds.get(id));
  }

  save(world: WorldMeta): Promise<void> {
    this.worlds.set(world.id, world);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.worlds.delete(id);
    return Promise.resolve();
  }
}
