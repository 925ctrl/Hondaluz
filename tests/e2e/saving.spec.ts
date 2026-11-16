import { expect, test, type Locator, type Page } from '@playwright/test';

// Con la ventana de 1280×720 el zoom es 3: un bloque ocupa 48 px y los pies del jugador
// quedan en el centro de la pantalla.
const TILE = 48;
const CENTER = { x: 640, y: 360 };

const hotbarSlot = (page: Page, index: number): Locator =>
  page.getByLabel('Barra rápida').getByTestId(`slot-${String(index)}`);

test('la partida se guarda al salir y sigue igual tras recargar la página', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByLabel('Nombre').fill('Memoria');
  await page.getByLabel('Semilla').fill('semilla-42');
  await page.getByRole('button', { name: 'Crear mundo' }).click();
  const position = page.getByTestId('hud-position');
  await expect(position).toHaveText(/X \d+/);

  // Mina el bloque de al lado y camina un poco.
  await page.mouse.move(CENTER.x + TILE, CENTER.y + TILE / 2);
  await page.mouse.down();
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '1');
  await page.mouse.up();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(500);
  const before = await position.textContent();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salir al menú' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Seleccionar mundo' }).click();
  await expect(page.getByText(/Semilla semilla-42 · \d+ min/)).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByTestId('world-hud')).toContainText('Memoria');
  await expect(position).toHaveText(before ?? '');
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-item', 'dirt');
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '1');
  expect(errors).toEqual([]);
});
