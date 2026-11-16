import type Phaser from 'phaser';
import { mulberry32 } from '../../core/utils/random';

const OUTLINE_COLOR = 0xfbeed3;
const CRACK_COLOR = 0x0b1020;
const CRACK_SEED = 0xc2ac;

/** Marca el bloque apuntado y muestra el avance de su rotura con grietas que se acumulan. */
export class BlockCursor {
  private readonly graphics: Phaser.GameObjects.Graphics;
  /** Píxeles de grieta en orden fijo: a más progreso, más píxeles se dibujan. */
  private readonly cracks: readonly { x: number; y: number }[];

  constructor(
    scene: Phaser.Scene,
    private readonly tileSize: number,
    depth: number,
  ) {
    this.graphics = scene.add.graphics().setDepth(depth);
    const random = mulberry32(CRACK_SEED);
    const inner = tileSize - 2;
    this.cracks = Array.from({ length: Math.round(inner * inner * 0.45) }, () => ({
      x: 1 + Math.floor(random() * inner),
      y: 1 + Math.floor(random() * inner),
    }));
  }

  /** `active` indica si el bloque admite una acción; `progress` es la rotura acumulada (0-1). */
  show(tileX: number, tileY: number, active: boolean, progress: number): void {
    const size = this.tileSize;
    const x = tileX * size;
    const y = tileY * size;
    const g = this.graphics;
    g.clear();
    g.fillStyle(CRACK_COLOR, 0.8);
    const visible = Math.round(progress * this.cracks.length);
    for (let i = 0; i < visible; i++) {
      const crack = this.cracks[i];
      if (crack) g.fillRect(x + crack.x, y + crack.y, 1, 1);
    }
    g.fillStyle(OUTLINE_COLOR, active ? 0.9 : 0.25);
    g.fillRect(x, y, size, 1);
    g.fillRect(x, y + size - 1, size, 1);
    g.fillRect(x, y + 1, 1, size - 2);
    g.fillRect(x + size - 1, y + 1, 1, size - 2);
  }

  hide(): void {
    this.graphics.clear();
  }
}
