import { expect, test } from '@playwright/test';
import { readTile, startWorld, trackErrors } from './support/world';

test('se reasigna una tecla en Opciones, se usa en la partida y se recuerda', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Opciones' }).click();
  const moveRight = page.getByTestId('bind-moveRight');
  await expect(moveRight).toHaveText('D');
  await moveRight.click();
  await expect(moveRight).toHaveText('Pulsa una tecla…');
  await page.keyboard.press('KeyL');
  await expect(moveRight).toHaveText('L');

  // Los volúmenes también se guardan.
  await page.getByLabel('Música').fill('0');

  await page.reload();
  await page.getByRole('button', { name: 'Opciones' }).click();
  await expect(page.getByTestId('bind-moveRight')).toHaveText('L');
  await expect(page.getByLabel('Música')).toHaveValue('0');
  await page.getByRole('button', { name: 'Volver' }).click();

  await startWorld(page);
  const startX = await readTile(page, 'x');
  await page.keyboard.down('KeyL');
  await expect.poll(() => readTile(page, 'x')).toBeGreaterThan(startX + 2);
  await page.keyboard.up('KeyL');
  await expect(page.getByTestId('world-hud')).toContainText('E · Inventario');
  expect(errors).toEqual([]);
});

test('restablecer devuelve las teclas por defecto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Opciones' }).click();
  await page.getByTestId('bind-jump').click();
  await page.keyboard.press('KeyW');
  await expect(page.getByTestId('bind-jump')).toHaveText('W');
  await page.getByRole('button', { name: 'Restablecer teclas' }).click();
  await expect(page.getByTestId('bind-jump')).toHaveText('Espacio');
});
