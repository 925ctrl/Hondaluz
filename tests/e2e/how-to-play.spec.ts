import { expect, test, type Locator, type Page } from '@playwright/test';
import { readTile, startWorld, trackErrors } from './support/world';

const TITLES = [
  'Moverse y saltar',
  'Minar y construir',
  'Inventario y barra rápida',
  'Fabricar',
  'Combate y vida',
  'Noche, antorchas y guardado automático',
];

const guideIn = (scope: Page | Locator): Locator =>
  scope.getByRole('region', { name: 'Cómo jugar' });

async function expectSlide(guide: Locator, number: number): Promise<void> {
  await expect(guide.getByText(`${String(number)} / 6`)).toBeVisible();
  await expect(guide.getByRole('heading', { level: 3 })).toHaveText(TITLES[number - 1] ?? '');
  await expect(
    guide.getByRole('button', { name: new RegExp(`^Diapositiva ${String(number)}:`) }),
  ).toHaveAttribute('aria-current', 'step');
}

const menuButtons = (page: Page): Promise<string[]> =>
  page.getByRole('navigation', { name: 'Menú principal' }).getByRole('button').allInnerTexts();

test('la guía se abre desde el menú principal y se navega con botones, flechas y puntos', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/');
  expect(await menuButtons(page)).toEqual([
    'Nueva partida',
    'Continuar',
    'Seleccionar mundo',
    'Cómo jugar',
    'Opciones',
    'Créditos',
  ]);

  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  const guide = guideIn(page);
  await expectSlide(guide, 1);
  await expect(guide.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await expect(guide.getByText('pantallas táctiles')).toBeVisible();
  const chips = guide.locator('kbd');
  await expect(chips).toHaveText(['A', 'D', 'Espacio']);

  // Botones: los seis títulos en orden.
  for (let number = 2; number <= 6; number++) {
    await guide.getByRole('button', { name: 'Siguiente' }).click();
    await expectSlide(guide, number);
  }
  await expect(guide.getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
  await expect(guide.getByRole('button', { name: 'Terminar' })).toBeVisible();

  // La flecha derecha en la última no hace nada.
  await page.keyboard.press('ArrowRight');
  await expectSlide(guide, 6);

  await guide.getByRole('button', { name: 'Anterior' }).click();
  await expectSlide(guide, 5);

  // Flechas del teclado, varias veces seguidas.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expectSlide(guide, 3);
  await page.keyboard.press('ArrowRight');
  await expectSlide(guide, 4);

  // Puntos.
  await guide.getByRole('button', { name: /^Diapositiva 2:/ }).click();
  await expectSlide(guide, 2);
  await guide.getByRole('button', { name: /^Diapositiva 6:/ }).click();
  await expectSlide(guide, 6);

  // «Terminar» vuelve al menú y reabrir empieza en la 1.
  await guide.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();
  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  await expectSlide(guideIn(page), 1);

  // «Volver» también vuelve al menú.
  await guideIn(page).getByRole('button', { name: 'Volver' }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('la guía muestra las teclas reasignadas por el jugador', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Opciones' }).click();
  await page.getByTestId('bind-jump').click();
  await page.keyboard.press('KeyW');
  await expect(page.getByTestId('bind-jump')).toHaveText('W');
  await page.getByRole('button', { name: 'Volver' }).click();

  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  const chips = guideIn(page).locator('kbd');
  await expect(chips).toHaveText(['A', 'D', 'W']);
  await expect(chips.filter({ hasText: 'Espacio' })).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('la guía se abre desde la pausa, mantiene el juego pausado y vuelve a la pausa', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await startWorld(page);

  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Pausa' });
  expect(await pause.getByRole('button').allInnerTexts()).toEqual([
    'Reanudar',
    'Cómo jugar',
    'Opciones',
    'Salir al menú',
  ]);

  // «Volver» regresa a la pausa con el foco en «Reanudar».
  await pause.getByRole('button', { name: 'Cómo jugar' }).click();
  const guide = guideIn(pause);
  await expectSlide(guide, 1);
  await page.keyboard.press('ArrowRight');
  await expectSlide(guide, 2);
  await guide.getByRole('button', { name: 'Volver' }).click();
  await expect(pause.getByRole('button', { name: 'Reanudar' })).toBeFocused();

  // «Terminar» también, y el jugador no se mueve mientras se lee: el mundo sigue pausado.
  await pause.getByRole('button', { name: 'Cómo jugar' }).click();
  const startX = await readTile(page, 'x');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyD');
  expect(await readTile(page, 'x')).toBe(startX);
  await guide.getByRole('button', { name: /^Diapositiva 6:/ }).click();
  await guide.getByRole('button', { name: 'Terminar' }).click();
  await expect(pause.getByRole('button', { name: 'Reanudar' })).toBeFocused();

  // ESC con la guía abierta reanuda la partida.
  await pause.getByRole('button', { name: 'Cómo jugar' }).click();
  await expect(guide).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();
  await expect(page.getByTestId('world-hud')).toBeVisible();

  expect(errors).toEqual([]);
});

/** Datos de la escena de la diapositiva visible, leídos del estilo calculado. */
const sceneInfo = (guide: Locator) =>
  guide.locator('.slide-scene').evaluate((element) => {
    const style = getComputedStyle(element);
    const previous = element.previousElementSibling;
    const next = element.nextElementSibling;
    return {
      role: element.getAttribute('role'),
      label: element.getAttribute('aria-label') ?? '',
      image: style.backgroundImage,
      frames: Number(style.getPropertyValue('--frames')),
      animation: style.animationName,
      rendering: style.imageRendering,
      betweenTitleAndText: previous?.tagName === 'H3' && next?.tagName === 'P',
    };
  });

test('cada diapositiva muestra su escena animada con texto alternativo', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  const guide = guideIn(page);

  const labels: string[] = [];
  for (let number = 1; number <= 6; number++) {
    if (number > 1) await guide.getByRole('button', { name: 'Siguiente' }).click();
    await expectSlide(guide, number);
    const scene = await sceneInfo(guide);
    expect(scene.role).toBe('img');
    expect(scene.label).not.toBe('');
    expect(scene.image).toMatch(/^url\("data:image\/png/);
    expect(scene.frames).toBeGreaterThanOrEqual(2);
    expect(scene.frames).toBeLessThanOrEqual(4);
    expect(scene.animation).not.toBe('none');
    expect(scene.rendering).toBe('pixelated');
    expect(scene.betweenTitleAndText).toBe(true);
    labels.push(scene.label);
  }
  expect(new Set(labels).size).toBe(6);

  expect(errors).toEqual([]);
});

test('con movimiento reducido la escena se queda en el primer fotograma', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  const scene = await sceneInfo(guideIn(page));
  expect(scene.animation).toBe('none');
});

test('la guía abierta desde la pausa también muestra la escena', async ({ page }) => {
  const errors = trackErrors(page);
  await startWorld(page);
  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Pausa' });
  await pause.getByRole('button', { name: 'Cómo jugar' }).click();
  const guide = guideIn(pause);
  await expectSlide(guide, 1);
  await expect(guide.getByRole('img', { name: /camina sobre la hierba/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('si una escena no se puede componer, su diapositiva se muestra sin ella', async ({ page }) => {
  // La tira de la noche (2 fotogramas de 96 × 48) falla al exportarse; el resto no se toca.
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype;
    const original = Object.getOwnPropertyDescriptor(prototype, 'toDataURL')?.value as (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) => string;
    prototype.toDataURL = function (this: HTMLCanvasElement, ...args: unknown[]) {
      if (this.width === 192 && this.height === 48) throw new Error('fallo simulado');
      return original.apply(this, args);
    };
  });
  const errors = trackErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Cómo jugar' }).click();
  const guide = guideIn(page);
  await expect(guide.locator('.slide-scene')).toHaveCount(1);

  await guide.getByRole('button', { name: /^Diapositiva 6:/ }).click();
  await expectSlide(guide, 6);
  await expect(guide.locator('.slide-scene')).toHaveCount(0);
  await expect(guide.getByText('coloca antorchas')).toBeVisible();

  expect(errors).toEqual([]);
});
