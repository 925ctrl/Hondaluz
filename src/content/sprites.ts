import type { PixelSprite } from '../domain/catalog/PixelSprite';

/** Dibujos de 16×16 del contenido. Varios objetos comparten forma y cambian de paleta. */

const OUTLINE = 0x1c1633;
const WOOD = 0xb07a48;
const WOOD_DARK = 0x7c5230;

const PICKAXE_ROWS = [
  '................',
  '....oooooooo....',
  '..oommmmmmmmoo..',
  '.ommmmmmmmmmmmo.',
  '.ommooowwooommo.',
  '.omo..owwo..omo.',
  '.oo...owwo...oo.',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......owwo......',
  '......oooo......',
];

const BAR_ROWS = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '....oooooooooo..',
  '...obbbbbbbbbBo.',
  '..obbbbbbbbbBBo.',
  '.ooooooooooBBBo.',
  '.oBBBBBBBBoBBo..',
  '.oBBBBBBBBoBo...',
  '.ooooooooooo....',
  '................',
  '................',
  '................',
  '................',
];

/** Pico con la cabeza del color indicado. */
export const pickaxeSprite = (head: number): PixelSprite => ({
  rows: PICKAXE_ROWS,
  palette: { o: OUTLINE, w: WOOD, m: head },
});

/** Lingote con los colores de cara clara y cara oscura indicados. */
export const barSprite = (light: number, dark: number): PixelSprite => ({
  rows: BAR_ROWS,
  palette: { o: OUTLINE, b: light, B: dark },
});

export const WOOD_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, w: WOOD, W: WOOD_DARK },
  rows: [
    '................',
    '................',
    '................',
    '..oooooooooooo..',
    '.owwwwwwwwwwwwo.',
    '.owWWwwwwWWwwwo.',
    '.owwwwwwwwwwwwo.',
    '.oooooooooooooo.',
    '.owwwwwwwwwwwwo.',
    '.owwwWWwwwwWWwo.',
    '.owwwwwwwwwwwwo.',
    '..oooooooooooo..',
    '................',
    '................',
    '................',
    '................',
  ],
};

export const WORKBENCH_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, w: WOOD, W: WOOD_DARK },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '................',
    'oooooooooooooooo',
    'owwwwwwwwwwwwwwo',
    'oWWWWWWWWWWWWWWo',
    'oooooooooooooooo',
    '.owo........owo.',
    '.owo........owo.',
    '.owoooooooooowo.',
    '.owWWWWWWWWWWwo.',
    '.owoooooooooowo.',
    '.owo........owo.',
    '.owo........owo.',
  ],
};

export const FURNACE_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, s: 0x7d7f93, S: 0x5e6078, f: 0x8a2f1f, F: 0xf08a5d, y: 0xffe08a },
  rows: [
    '.oooooooooooooo.',
    'osssssssssssssso',
    'osSssssSsssssSso',
    'osssssssssssssso',
    'ossooooooooooSso',
    'ossoffFFFFffoSso',
    'ossofFFyyFFfosso',
    'ossoFFyyyyFFosso',
    'ossoFyyyyyyFosso',
    'ossooooooooooSso',
    'osssssssssssssso',
    'osSsssssSsssssso',
    'osssssssssssssso',
    'ossssSssssssSsso',
    'osssssssssssssso',
    'oooooooooooooooo',
  ],
};

export const ANVIL_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, a: 0x8f93a8, A: 0x5a5d73 },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.oooooooooooooo.',
    'oaaaaaaaaaaaaaao',
    'oAAAAAAAAAAAAAo.',
    '.oooAAAAAAAooo..',
    '....oaAAAAo.....',
    '....oaAAAAo.....',
    '...ooaAAAAoo....',
    '..oaaaaaaaaao...',
    '.oAAAAAAAAAAAo..',
    '.ooooooooooooo..',
  ],
};

const SWORD_ROWS = [
  '.............ooo',
  '............obBo',
  '...........obBo.',
  '..........obBo..',
  '.........obBo...',
  '........obBo....',
  '.......obBo.....',
  '......obBo......',
  '..oo.obBo.......',
  '..ogoobo........',
  '...oggo.........',
  '...ogggo........',
  '..ohoogo........',
  '.oho..oo........',
  'oho.............',
  'oo..............',
];

/** Espada con la hoja de los colores indicados; la empuñadura apunta abajo a la izquierda. */
export const swordSprite = (light: number, dark: number): PixelSprite => ({
  rows: SWORD_ROWS,
  palette: { o: OUTLINE, b: light, B: dark, g: 0xffc56b, h: WOOD_DARK },
});

export const GLOW_DUST_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, y: 0xffe08a, Y: 0xfff3b0 },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......y........',
    '...Y.......y....',
    '..........Y.....',
    '.y..............',
    '......Y.....y...',
    '.....ooooo......',
    '....oyYyyYo.....',
    '...oyyYyyyYo....',
    '..oYyyyyYyyyo...',
    '..ooooooooooo...',
  ],
};

export const BALM_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, c: WOOD, g: 0xb9d8e0, r: 0xf08a5d, R: 0xc4553f, w: 0xfbeed3 },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '.....occcco.....',
    '.....oooooo.....',
    '....oggggggo....',
    '...ogrrrrrrgo...',
    '...ogwrrrrrgo...',
    '...ogrrrrrRgo...',
    '...ogrrrrRRgo...',
    '...ogRRRRRRgo...',
    '....oggggggo....',
    '.....oooooo.....',
    '................',
  ],
};

export const TORCH_SPRITE: PixelSprite = {
  palette: { o: OUTLINE, w: WOOD, W: WOOD_DARK, f: 0xf08a5d, y: 0xffe08a, Y: 0xfff6d0 },
  rows: [
    '................',
    '................',
    '.......f........',
    '......fyf.......',
    '......yYyf......',
    '.....fyYYf......',
    '.....fyYyf......',
    '......oyo.......',
    '......owo.......',
    '......owo.......',
    '......oWo.......',
    '......owo.......',
    '......oWo.......',
    '......owo.......',
    '......oWo.......',
    '......ooo.......',
  ],
};

export const CACTUS_SPRITE: PixelSprite = {
  palette: { o: 0x1f4a2e, g: 0x4f9a52, G: 0x3a7a44, l: 0x8fd07a },
  rows: [
    '...oggggGGGo....',
    '...oglgggGGo....',
    '...oggggGGGo....',
    '...oggglgGGo....',
    '...oggggGGGo....',
    '...oglgggGGo....',
    '...oggggGGGo....',
    '...ogggglGGo....',
    '...oggggGGGo....',
    '...oglgggGGo....',
    '...oggggGGGo....',
    '...oggglgGGo....',
    '...oggggGGGo....',
    '...oglgggGGo....',
    '...oggggGGGo....',
    '...ogggglGGo....',
  ],
};
