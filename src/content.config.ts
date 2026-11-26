import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    kind: z.string(),            // "Personal project · Auto-chess"
    tagline: z.string(),         // one line for the card + page hero
    tech: z.array(z.string()),
    highlights: z.array(z.string()).max(4),
    itch: z.string().url(),
    github: z.string().url(),
    itchUploadId: z.string(),    // id from itch's HTML5 build, used for the click-to-play embed
    clip: z.string().optional(),   // /media/xxx.mp4 — drop in once recorded
    poster: z.string().optional(), // /media/xxx.jpg
    accent: z.string(),
  }),
});

export const collections = { projects };
