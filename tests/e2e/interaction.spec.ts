import { expect, test, type Locator, type Page } from '@playwright/test';

// Con la ventana de 1280×720 el zoom es 3: un bloque de 16 px ocupa 48 px de pantalla,
// y la cámara mantiene los pies del jugador en el centro.
const TILE = 48;
const CENTER = { x: 640, y: 360 };
/** Punto de pantalla del bloque situado a `dx`, `dy` bloques del que pisa el jugador. */
const tilePoint = (dx: number, dy: number): { x: number; y: number } => ({
  x: CENTER.x + dx * TILE,
  y: CENTER.y + (dy + 0.5) * TILE,
});

async function startWorld(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByLabel('Semilla').fill('semilla-42');
  await page.getByRole('button', { name: 'Crear mundo' }).click();
  await expect(page.getByTestId('hud-position')).toHaveText(/X \d+/);
  return errors;
}

const hotbarSlot = (page: Page, index: number): Locator =>
  page.getByLabel('Barra rápida').getByTestId(`slot-${String(index)}`);

/** Mina el bloque contiguo al jugador, a su derecha y a la altura del suelo. */
async function mineBlockBeside(page: Page, expectedCount: number): Promise<void> {
  const target = tilePoint(1, 0);
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', String(expectedCount));
  await page.mouse.up();
}

test('se mina un bloque, se recoge el material y se vuelve a colocar', async ({ page }) => {
  const errors = await startWorld(page);
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '0');

  await mineBlockBeside(page, 1);
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-item', 'dirt');
  await expect(page.getByTestId('held-item')).toHaveText('Tierra');

  // El hueco recién abierto es aire con apoyo y no lo ocupa el jugador: admite un bloque.
  await page.mouse.click(tilePoint(1, 0).x, tilePoint(1, 0).y, { button: 'right', delay: 80 });
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '0');

  // El bloque colocado es sólido de nuevo: se puede minar otra vez.
  await mineBlockBeside(page, 1);
  expect(errors).toEqual([]);
});

test('un clic sobre la interfaz no mina el bloque que hay detrás', async ({ page }) => {
  await startWorld(page);
  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name: 'Inventario' });
  await dialog.getByRole('heading').hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '0');
});

test('el inventario se abre, mueve, divide y elimina montones', async ({ page }) => {
  const errors = await startWorld(page);
  await mineBlockBeside(page, 1);
  await page.mouse.move(tilePoint(2, 0).x, tilePoint(2, 0).y);
  await page.mouse.down();
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '2');
  await page.mouse.up();

  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name: 'Inventario' });
  const slot = (index: number): Locator => dialog.getByTestId(`slot-${String(index)}`);
  await expect(dialog).toBeVisible();

  await slot(0).hover();
  await expect(page.getByTestId('inventory-info')).toContainText('Tierra ×2');

  await slot(0).click({ button: 'right' });
  await slot(12).click();
  await expect(slot(0)).toHaveAttribute('data-count', '1');
  await expect(slot(12)).toHaveAttribute('data-count', '1');

  await slot(12).click();
  await slot(1).click();
  await expect(slot(12)).toHaveAttribute('data-count', '0');
  await expect(hotbarSlot(page, 1)).toHaveAttribute('data-count', '1');

  await slot(1).click();
  await dialog.getByRole('button', { name: 'Eliminar' }).click();
  await expect(slot(1)).toHaveAttribute('data-count', '0');

  // ESC cierra el inventario sin pausar la partida.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeHidden();
  expect(errors).toEqual([]);
});

test('las teclas numéricas seleccionan la ranura de la barra rápida', async ({ page }) => {
  await startWorld(page);
  await expect(hotbarSlot(page, 0)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Digit3');
  await expect(hotbarSlot(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(hotbarSlot(page, 0)).toHaveAttribute('aria-pressed', 'false');
  await hotbarSlot(page, 5).click();
  await expect(hotbarSlot(page, 5)).toHaveAttribute('aria-pressed', 'true');
});
