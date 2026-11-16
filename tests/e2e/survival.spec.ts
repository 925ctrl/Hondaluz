import { expect, test } from '@playwright/test';

test('la partida muestra la vida, el reloj, el bioma y las recetas de combate y de luz', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva partida' }).click();
  await page.getByRole('button', { name: 'Crear mundo' }).click();

  const health = page.getByTestId('health');
  await expect(health).toHaveAttribute('data-current', '100');
  await expect(health).toContainText('100 / 100');
  // Los mundos nuevos empiezan por la mañana.
  await expect(page.getByTestId('hud-clock')).toHaveText(/^Día 1 · 07:00 · De día$/);
  await expect(page.getByRole('dialog', { name: 'Has caído' })).toBeHidden();
  // Todo mundo empieza en el bosque.
  await expect(page.getByTestId('hud-biome')).toHaveText('Bosque');

  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('recipe-wood_sword')).toContainText('Espada de madera');
  await expect(page.getByTestId('recipe-balm')).toContainText('Polvo luminoso 0/2');
  await expect(page.getByTestId('recipe-torch')).toContainText('Antorcha');
  expect(errors).toEqual([]);
});
