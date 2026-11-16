import { expect, test, type Page } from '@playwright/test';

/** Recoge errores de consola y excepciones para exigir que no haya ninguno. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function createWorld(page: Page, name: string, seed: string): Promise<void> {
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByLabel('Nombre del mundo').fill(name);
  await page.getByLabel('Semilla').fill(seed);
  await page.getByRole('button', { name: 'Crear mundo' }).click();
  await expect(page.getByTestId('world-hud')).toContainText(name);
}

test('el juego inicia y muestra el menú principal sin errores', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Hondaluz' })).toBeVisible();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();

  await page.getByRole('button', { name: 'Opciones' }).click();
  await expect(page.getByRole('button', { name: 'Saltar: Espacio. Cambiar' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await page.getByRole('button', { name: 'Créditos' }).click();
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('se crea un mundo con semilla, se pausa y se vuelve al menú', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await createWorld(page, 'Valle de prueba', 'semilla-42');
  await expect(page.getByTestId('world-hud')).toContainText('Semilla semilla-42');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeHidden();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salir al menú' }).click();
  await expect(page.getByRole('heading', { name: 'Hondaluz' })).toBeVisible();
  await expect(page.getByTestId('world-hud')).toBeHidden();

  expect(errors).toEqual([]);
});

test('los mundos sobreviven a recargar la página y se pueden continuar y borrar', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await createWorld(page, 'Persistente', 'abc');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByTestId('world-hud')).toContainText('Persistente');
  await expect(page.getByTestId('world-hud')).toContainText('Semilla abc');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salir al menú' }).click();
  await page.getByRole('button', { name: 'Seleccionar mundo' }).click();
  await expect(page.getByText('Persistente')).toBeVisible();
  await page.getByRole('button', { name: 'Borrar' }).click();
  await page.getByRole('button', { name: '¿Seguro?' }).click();
  await expect(page.getByText('Todavía no has creado ningún mundo.')).toBeVisible();

  expect(errors).toEqual([]);
});

test('el jugador aparece sobre el terreno, camina y salta', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await createWorld(page, 'Paseo', 'semilla-42');

  const position = page.getByTestId('hud-position');
  const read = async (axis: 'x' | 'y'): Promise<number> =>
    Number(await position.getAttribute(`data-${axis}`));
  await expect(position).toHaveText(/X \d+ · Y \d+/);
  const startX = await read('x');

  await page.keyboard.down('KeyD');
  await expect.poll(() => read('x')).toBeGreaterThan(startX + 3);
  await page.keyboard.up('KeyD');

  await page.keyboard.down('KeyA');
  await expect.poll(() => read('x')).toBeLessThan(startX);
  await page.keyboard.up('KeyA');

  // Quieto en el suelo, la altura es estable; al saltar, los pies suben al menos un bloque.
  await page.waitForTimeout(600);
  const groundY = await read('y');
  await page.keyboard.down('Space');
  await expect.poll(() => read('y'), { intervals: [20] }).toBeLessThan(groundY);
  await page.keyboard.up('Space');
  await expect.poll(() => read('y')).toBe(groundY);

  expect(errors).toEqual([]);
});

test('la misma semilla coloca al jugador en el mismo punto del mismo mundo', async ({ page }) => {
  await page.goto('/');
  await createWorld(page, 'Uno', 'gemela');
  const first = await page.getByTestId('hud-position').textContent();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salir al menú' }).click();
  await createWorld(page, 'Dos', 'gemela');

  await expect(page.getByTestId('hud-position')).toHaveText(first ?? '');
});
