// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://swiftkeyx.github.io',
  // Magic School 4 was merged into the Magic School 3 page; keep old links working.
  redirects: {
    '/projects/magic-school-4': '/projects/magic-school-3/#problems-and-fixes',
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
