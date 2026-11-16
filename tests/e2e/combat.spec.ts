import { expect, test } from '@playwright/test';
import { CENTER, hotbarSlot, startWorld, TILE, trackErrors } from './support/world';

test('se derrota a una criatura con la espada y se recoge su botín', async ({ page }) => {
  const errors = trackErrors(page);
  await startWorld(page, 'semilla-42', '/?e2e');
  await page.evaluate(() => {
    window.hondaluz?.give('wood_sword', 1);
    window.hondaluz?.spawn('stump', 2);
  });
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-item', 'wood_sword');
  await page.keyboard.press('Digit1');

  // Golpea hacia la derecha hasta que la criatura cae.
  await page.mouse.move(CENTER.x + 2 * TILE, CENTER.y - TILE / 2);
  await expect
    .poll(
      async () => {
        await page.mouse.down();
        await page.waitForTimeout(80);
        await page.mouse.up();
        return page.evaluate(() => window.hondaluz?.enemyIds().includes('stump'));
      },
      { timeout: 15_000, intervals: [300] },
    )
    .toBe(false);

  // El tocón suelta madera, que vuela hacia el jugador.
  await expect(page.getByLabel('Barra rápida').locator('[data-item="wood"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('al caer la noche el HUD lo indica y salen las criaturas nocturnas', async ({ page }) => {
  const errors = trackErrors(page);
  await startWorld(page, 'semilla-42', '/?e2e');
  await expect(page.getByTestId('hud-clock')).toContainText('De día');
  await page.evaluate(() => window.hondaluz?.setTime(0.9));
  await expect(page.getByTestId('hud-clock')).toContainText('Noche');
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window.hondaluz?.enemyIds() ?? []).some((id) => id === 'stump' || id === 'ash_moth'),
        ),
      { timeout: 20_000 },
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
