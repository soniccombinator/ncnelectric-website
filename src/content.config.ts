import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Team members: one Markdown file per person in src/content/team/. The text below the --- lines is the bio.
const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),        // job title; leave out until confirmed
    order: z.number().default(100),      // lower numbers show first
    photo: z.string().optional(),        // path inside src/assets/img, e.g. team/paul.png
    email: z.string().optional(),
    linkedin: z.string().optional(),
  }),
});

// Job openings: one Markdown file per opening in src/content/openings/. Delete the file when the job is filled.
const openings = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/openings' }),
  schema: z.object({
    title: z.string(),
    location: z.string().default('Venice, FL'),
    type: z.string().default('Full-time'),
    summary: z.string(),
    posted: z.coerce.date().optional(),
  }),
});

export const collections = { team, openings };
