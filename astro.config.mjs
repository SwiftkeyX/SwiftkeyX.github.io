// @ts-check
import { defineConfig } from 'astro/config';

const ms3 = '/projects/magic-school-3';
const ms4 = '/projects/magic-school-4';

export default defineConfig({
  site: 'https://swiftkeyx.github.io',
  // The Magic School 3 page became the Magic School 4 page; keep old links working.
  redirects: {
    [ms3]: `${ms4}/`,
    [`${ms3}/skill-system`]: `${ms4}/skill-system/`,
    [`${ms3}/skills`]: `${ms4}/skills/`,
    [`${ms3}/pathfinding`]: `${ms4}/pathfinding/`,
    [`${ms3}/problem`]: `${ms4}/`,
    [`${ms3}/code/skill`]: `${ms4}/skills/#dwarf-onstart--onhit-plus-oncast`,
    [`${ms3}/code/dwarf-skill`]: `${ms4}/skills/#dwarf-onstart--onhit-plus-oncast`,
    [`${ms3}/code/troll-skill`]: `${ms4}/skills/#troll-onherodied`,
    [`${ms3}/code/hero-skill`]: `${ms4}/skills/#heroskillcs`,
    [`${ms3}/code/skill-definition`]: `${ms4}/skill-system/`,
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
