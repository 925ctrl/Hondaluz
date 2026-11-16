import { expect, test, type Page } from '@playwright/test';
import { CENTER, startWorld, TILE } from './support/world';

interface FrameStats {
  fps: number;
  p95: number;
  worst: number;
  longFrames: number;
}

/** Mide los frames que pinta el navegador durante `ms` milisegundos. */
async function measureFrames(page: Page, ms: number): Promise<FrameStats> {
  return page.evaluate(
    (duration) =>
      new Promise<FrameStats>((resolve) => {
        const times: number[] = [];
        let last = performance.now();
        const start = last;
        const tick = (now: number): void => {
          times.push(now - last);
          last = now;
          if (now - start < duration) {
            requestAnimationFrame(tick);
            return;
          }
          const sorted = [...times].sort((a, b) => a - b);
          resolve({
            fps: (times.length * 1000) / (now - start),
            p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
            worst: sorted.at(-1) ?? 0,
            longFrames: times.filter((t) => t > 50).length,
          });
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

// Medido en Chromium sin interfaz, 1280×720. Los valores se anotan en docs/ROADMAP.md.
test('mantiene la fluidez recorriendo el mundo, de día y de noche', async ({ page }) => {
  await startWorld(page, 'semilla-42', '/?e2e');
  await page.waitForTimeout(500);

  await page.keyboard.down('KeyD');
  const walking = await measureFrames(page, 5000);
  await page.keyboard.up('KeyD');

  await page.evaluate(() => window.hondaluz?.setTime(0.9));
  await page.keyboard.down('KeyA');
  const night = await measureFrames(page, 5000);
  await page.keyboard.up('KeyA');

  // Minar sin parar: partículas, repintado de bloques y recálculo de la luz.
  await page.mouse.move(CENTER.x, CENTER.y + TILE / 2);
  await page.mouse.down();
  const digging = await measureFrames(page, 3000);
  await page.mouse.up();

  console.log('RENDIMIENTO', JSON.stringify({ walking, night, digging }));
  for (const stats of [walking, night, digging]) {
    expect(stats.fps).toBeGreaterThan(50);
    expect(stats.longFrames).toBeLessThanOrEqual(3);
  }
});
