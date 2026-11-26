// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://swiftkeyx.github.io',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
