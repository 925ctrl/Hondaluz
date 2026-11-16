export type HowToPlaySceneId = 'move' | 'mine' | 'hotbar' | 'craft' | 'combat' | 'night';

export interface HowToPlaySceneStrip {
  /** Tira horizontal de fotogramas, como data URL. */
  readonly url: string;
  /** Número de fotogramas de la tira (2–4). */
  readonly frames: number;
}

/**
 * Escenas de la guía «Cómo jugar» como imágenes para la interfaz HTML. Las genera la precarga
 * a partir de las mismas texturas del juego, igual que `ItemIcons`.
 */
export class HowToPlayScenes {
  private readonly strips = new Map<HowToPlaySceneId, HowToPlaySceneStrip>();

  set(id: HowToPlaySceneId, strip: HowToPlaySceneStrip): void {
    this.strips.set(id, strip);
  }

  get(id: HowToPlaySceneId): HowToPlaySceneStrip | undefined {
    return this.strips.get(id);
  }
}
