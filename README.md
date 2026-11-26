# swiftkeyx.github.io

Portfolio site, built with [Astro](https://astro.build) and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

```powershell
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Where things live

| What | Where |
| --- | --- |
| Name, email, links, LinkedIn | `src/site.ts` |
| Home page (hero, experience, skills) | `src/pages/index.astro` |
| Project pages (text, diagram, code excerpt) | `src/content/projects/*.md` |
| Clips, posters, GIFs | `public/media/` (see `SHOT-LIST.md`) |
| Résumé PDF | `public/resume-pasit-pisanucaraleadkul.pdf` |
| Colours, fonts, dark mode | `src/styles/global.css` |

To add a project, copy one of the `.md` files and change its frontmatter. `order` sets its position on the home page.
