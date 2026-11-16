import { expect, type Locator, type Page } from '@playwright/test';

// Con la ventana de 1280×720 el zoom es 3: un bloque de 16 px ocupa 48 px de pantalla y la
// cámara mantiene los pies del jugador en el centro.
export const TILE = 48;
export const CENTER = { x: 640, y: 360 };

/** Recoge errores de consola y excepciones para exigir que no haya ninguno. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

/** Crea un mundo y espera a que el HUD muestre la posición. `path` admite `/?e2e`. */
export async function startWorld(page: Page, seed = 'semilla-42', path = '/'): Promise<void> {
  await page.goto(path);
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByLabel('Semilla').fill(seed);
  await page.getByRole('button', { name: 'Crear mundo' }).click();
  await expect(page.getByTestId('hud-position')).toHaveText(/X \d+/);
}

export const hotbarSlot = (page: Page, index: number): Locator =>
  page.getByLabel('Barra rápida').getByTestId(`slot-${String(index)}`);

export const readTile = async (page: Page, axis: 'x' | 'y'): Promise<number> =>
  Number(await page.getByTestId('hud-position').getAttribute(`data-${axis}`));
