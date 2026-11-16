import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas para que el build funcione bajo /Hondaluz/ en GitHub Pages.
  base: './',
  build: {
    // Phaser 3 se distribuye como un único bundle (~1,2 MB minificado).
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
});
