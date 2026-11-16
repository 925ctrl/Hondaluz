import { expect, test } from '@playwright/test';
import { CENTER, hotbarSlot, readTile, TILE, trackErrors } from './support/world';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 1280, height: 720 } });

test('en pantalla táctil se camina con los botones y se mina tocando el mundo', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva partida' }).tap();
  await page.getByLabel('Semilla').fill('semilla-42');
  await page.getByRole('button', { name: 'Crear mundo' }).tap();
  await expect(page.getByTestId('touch-controls')).toBeVisible();

  // Mantener el botón derecho mueve al jugador.
  const right = page.getByTestId('touch-moveRight');
  const box = await right.boundingBox();
  if (!box) throw new Error('Sin botón derecho');
  const startX = await readTile(page, 'x');
  const cdp = await page.context().newCDPSession(page);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await expect.poll(() => readTile(page, 'x')).toBeGreaterThan(startX + 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  // Mantener el dedo sobre el bloque de al lado lo mina.
  await page.waitForTimeout(400);
  const block = { x: CENTER.x + TILE, y: CENTER.y + TILE / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [block] });
  await expect(hotbarSlot(page, 0)).toHaveAttribute('data-count', '1');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  // El botón de modo pasa a construir, y el de inventario lo abre.
  await page.getByTestId('touch-mode').tap();
  await expect(page.getByTestId('touch-mode')).toHaveText('Construir');
  await page.getByTestId('touch-inventory').tap();
  await expect(page.getByRole('dialog', { name: 'Inventario' })).toBeVisible();
  expect(errors).toEqual([]);
});
