import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Capas internas: no conocen Phaser, el DOM de presentación ni la infraestructura. */
const forbidOuterLayers = (...layers) => ({
  'no-restricted-imports': [
    'error',
    {
      paths: [{ name: 'phaser', message: 'Phaser solo puede usarse en src/presentation.' }],
      patterns: layers.map((layer) => ({
        group: [`**/${layer}/**`],
        message: `Esta capa no puede depender de "${layer}".`,
      })),
    },
  ],
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['src/core/**'],
    rules: forbidOuterLayers('domain', 'application', 'infrastructure', 'presentation', 'content'),
  },
  {
    files: ['src/domain/**'],
    rules: forbidOuterLayers('application', 'infrastructure', 'presentation', 'content'),
  },
  {
    files: ['src/application/**'],
    rules: forbidOuterLayers('infrastructure', 'presentation'),
  },
  {
    files: ['src/content/**'],
    rules: forbidOuterLayers('application', 'infrastructure', 'presentation'),
  },
  {
    files: ['src/infrastructure/**'],
    rules: forbidOuterLayers('presentation'),
  },
);
