import { describe, expect, it } from 'vitest';
import { DEEP_TILES, MOOD_THEMES, moodFor, nextNote } from '../../src/presentation/audio/music';
import { breakCue, SOUND_BANK } from '../../src/presentation/audio/soundBank';
import { content } from '../support/session';

describe('música', () => {
  it('elige el ambiente por la hora y la profundidad', () => {
    expect(moodFor(1, 0)).toBe('day');
    expect(moodFor(0.1, 0)).toBe('night');
    expect(moodFor(1, DEEP_TILES)).toBe('deep');
  });

  it('la melodía avanza a pasos cortos sin salirse de la escala', () => {
    for (const theme of Object.values(MOOD_THEMES)) {
      let note = 0;
      for (let i = 0; i < 200; i++) {
        const next = nextNote(theme, note, (i * 0.37) % 1);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(theme.scale.length);
        expect(Math.abs(next - note)).toBeLessThanOrEqual(2);
        note = next;
      }
    }
  });
});

describe('sonidos', () => {
  it('cada bloque que se puede romper tiene un sonido de su material', () => {
    expect(breakCue(content.blocks.get('dirt'))).toBe('break-soft');
    expect(breakCue(content.blocks.get('stone'))).toBe('break-stone');
    expect(breakCue(content.blocks.get('log'))).toBe('break-wood');
    expect(breakCue(content.blocks.get('workbench'))).toBe('break-wood');
    expect(breakCue(content.blocks.get('water'))).toBeNull();
    for (const block of content.blocks.all) {
      if (block.hardness !== undefined) expect(breakCue(block)).not.toBeNull();
    }
  });

  it('todas las capas de sonido son audibles y breves', () => {
    for (const layers of Object.values(SOUND_BANK)) {
      for (const layer of layers) {
        expect(layer.from).toBeGreaterThan(0);
        expect(layer.to).toBeGreaterThan(0);
        expect(layer.duration).toBeGreaterThan(0);
        expect(layer.duration).toBeLessThanOrEqual(1.5);
        expect(layer.gain).toBeGreaterThan(0);
      }
    }
  });
});
