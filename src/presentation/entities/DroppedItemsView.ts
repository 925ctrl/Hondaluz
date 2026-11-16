import type Phaser from 'phaser';
import type { DroppedItem } from '../../domain/items/DroppedItems';
import { ITEM_ATLAS_KEY } from '../world/itemTextures';

/** Dibuja los objetos sueltos del mundo, manteniendo una imagen por objeto. */
export class DroppedItemsView {
  private readonly images = new Map<number, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly size: number,
    private readonly depth: number,
  ) {}

  sync(drops: readonly DroppedItem[]): void {
    const alive = new Set<number>();
    for (const drop of drops) {
      alive.add(drop.id);
      let image = this.images.get(drop.id);
      if (!image) {
        image = this.scene.add
          .image(0, 0, ITEM_ATLAS_KEY, drop.itemId)
          .setOrigin(0, 0)
          .setDisplaySize(this.size, this.size)
          .setDepth(this.depth);
        this.images.set(drop.id, image);
      }
      image.setPosition(drop.x, drop.y);
    }
    for (const [id, image] of this.images) {
      if (alive.has(id)) continue;
      image.destroy();
      this.images.delete(id);
    }
  }
}
