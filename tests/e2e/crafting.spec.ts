import { expect, test } from '@playwright/test';
import { reachableFromSpawn } from '../support/reachableBlocks';

// Mundo elegido porque nace con dos árboles al alcance del punto de aparición.
const SEED = 'bosque-17';
// Con la ventana de 1280×720 el zoom es 3: un bloque ocupa 48 px y el jugador está centrado.
const TILE = 48;
const CENTER = { x: 640, y: 360 };

test('se tala madera, se fabrica una mesa de trabajo y las recetas reflejan lo que falta', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByLabel('Semilla').fill(SEED);
  await page.getByRole('button', { name: 'Crear mundo' }).click();
  await expect(page.getByTestId('hud-position')).toHaveText(/X \d+/);

  await page.keyboard.press('KeyE');
  const workbench = page.getByTestId('recipe-workbench');
  const pickaxe = page.getByTestId('recipe-wood_pickaxe');
  await expect(workbench).toHaveAttribute('data-craftable', 'false');
  await expect(workbench).toContainText('Madera 0/10');
  await expect(workbench.getByRole('button')).toBeDisabled();
  await page.getByLabel('Solo disponibles').check();
  await expect(page.getByText('Ahora mismo no puedes fabricar nada.')).toBeVisible();
  await page.getByLabel('Solo disponibles').uncheck();
  await page.keyboard.press('KeyE');

  // El generador real dice dónde están los troncos respecto al bloque que pisa el jugador.
  const logs = reachableFromSpawn(SEED, 'log');
  expect(logs.length).toBeGreaterThanOrEqual(10);
  for (const { dx, dy } of logs) {
    await page.mouse.move(CENTER.x + dx * TILE, CENTER.y + (dy + 0.5) * TILE);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
  }

  // Parte de la madera cae lejos: se recoge caminando hacia el otro árbol.
  const wood = page.getByLabel('Barra rápida').getByTestId('slot-0');
  await page.keyboard.down('KeyA');
  await expect
    .poll(async () => Number(await wood.getAttribute('data-count')), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await page.keyboard.up('KeyA');
  await expect(wood).toHaveAttribute('data-item', 'wood');
  const gathered = Number(await wood.getAttribute('data-count'));

  await page.keyboard.press('KeyE');
  await expect(workbench).toHaveAttribute('data-craftable', 'true');
  await page.getByRole('button', { name: 'Fabricar Mesa de trabajo' }).click();

  const inventory = page.getByRole('dialog', { name: 'Inventario' });
  await expect(inventory.locator('[data-item="workbench"]')).toHaveAttribute('data-count', '1');
  await expect(workbench).toContainText(`Madera ${String(gathered - 10)}/10`);
  await expect(workbench).toHaveAttribute('data-craftable', 'false');

  // El pico necesita la mesa colocada cerca, además de la madera.
  await expect(pickaxe).toHaveAttribute('data-craftable', 'false');
  await expect(pickaxe).toContainText('Junto a: Mesa de trabajo');
  expect(errors).toEqual([]);
});
