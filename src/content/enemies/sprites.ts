import type { PixelSprite } from '../../domain/catalog/PixelSprite';

const SIZE = 16;
const OUTLINE = 0x1c1633;

/** Completa con filas vacías por arriba para que el dibujo se apoye en el borde inferior. */
function sprite(rows: readonly string[], palette: Readonly<Record<string, number>>): PixelSprite {
  const padding = Array.from({ length: SIZE - rows.length }, () => '.'.repeat(SIZE));
  return { rows: [...padding, ...rows], palette };
}

const STUMP_PALETTE = {
  o: OUTLINE,
  t: 0xc8935c,
  T: 0x8a5a3c,
  b: 0x6b4a2f,
  B: 0x4f3521,
  y: 0xffc56b,
  l: 0x63b866,
  L: 0x3f8f4f,
};

const STUMP_BODY = [
  '........l.......',
  '.......lLl......',
  '........o.......',
  '...oooooooooo...',
  '..ottTTTTTTtto..',
  '..otTttttttTto..',
  '..oBbbbbbbbbBo..',
  '..oBbyybbyybBo..',
  '..oBbyybbyybBo..',
  '..oBbbbbbbbbBo..',
  '..oBbbBbbBbbBo..',
  '..oBBbbbbbbBBo..',
  '...oooooooooo...',
];

/** Tocón errante: un tocón con ojos de ascua que camina sobre raíces. */
export const STUMP_FRAMES: readonly PixelSprite[] = [
  sprite([...STUMP_BODY, '...oBo....oBo...', '...ooo....ooo...'], STUMP_PALETTE),
  sprite([...STUMP_BODY, '....oBo..oBo....', '....ooo..ooo....'], STUMP_PALETTE),
];

const MOTH_PALETTE = { o: OUTLINE, w: 0xb9b4d6, W: 0x7d76a3, b: 0x5b3f77, y: 0xffe08a };

/** Polilla de ceniza: acude a la luz del farol. Alas abiertas y plegadas. */
export const MOTH_FRAMES: readonly PixelSprite[] = [
  sprite(
    [
      '.oo..........oo.',
      'owwo........owwo',
      'owWwo......owWwo',
      'owWWwo.oo.owWWwo',
      '.owWWwobbowWWwo.',
      '..owwwobbowwwo..',
      '...oooybbyooo...',
      '...owwobbowwo...',
      '..owWwobbowWwo..',
      '..owwo.yy.owwo..',
      '...oo..oo..oo...',
      '................',
    ],
    MOTH_PALETTE,
  ),
  sprite(
    [
      '..oo...oo...oo..',
      '.owwo.obbo.owwo.',
      '.owWWwobbowWWwo.',
      'owWWWwobbowWWWwo',
      '.oooooybbyooooo.',
      '...owwobbowwo...',
      '..owWwobbowWwo..',
      '...oo..yy..oo...',
      '.......oo.......',
      '................',
    ],
    MOTH_PALETTE,
  ),
];

const MOLE_PALETTE = { o: OUTLINE, f: 0x9a8fa8, F: 0x6e6480, n: 0xf2a2b0, c: 0xfbeed3 };

const MOLE_BODY = [
  '....ooooooo.....',
  '...offfffffo....',
  '..offffffofffo..',
  '.offffffffffnno.',
  '.oFffffffffffno.',
  '.oFFffffffffffo.',
  '..oFFFffffffo...',
];

/** Topo de roca: excava la piedra con sus garras pálidas. */
export const MOLE_FRAMES: readonly PixelSprite[] = [
  sprite([...MOLE_BODY, '..occo.occo.....', '..oooo.oooo.....'], MOLE_PALETTE),
  sprite([...MOLE_BODY, '...occo.occo....', '...oooo.oooo....'], MOLE_PALETTE),
];
