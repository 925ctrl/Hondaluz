import { describe, expect, it } from 'vitest';
import { HowToPlayScenes } from '../../src/presentation/ui/HowToPlayScenes';
import { HOW_TO_PLAY_SLIDES } from '../../src/presentation/ui/menus/howToPlaySlides';

describe('HowToPlayScenes', () => {
  it('devuelve la tira guardada y nada para una escena que falta', () => {
    const scenes = new HowToPlayScenes();
    scenes.set('move', { url: 'data:image/png;base64,AAAA', frames: 4 });
    expect(scenes.get('move')).toEqual({ url: 'data:image/png;base64,AAAA', frames: 4 });
    expect(scenes.get('night')).toBeUndefined();
  });

  it('cada diapositiva tiene su propia escena y un texto alternativo distinto', () => {
    const ids = HOW_TO_PLAY_SLIDES.map((slide) => slide.scene);
    const alts = HOW_TO_PLAY_SLIDES.map((slide) => slide.sceneAlt);
    expect(ids).toEqual(['move', 'mine', 'hotbar', 'craft', 'combat', 'night']);
    expect(alts.every((alt) => alt.trim().length > 0)).toBe(true);
    expect(new Set(alts).size).toBe(alts.length);
  });
});
