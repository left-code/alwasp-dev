import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

export const docGroups = ["Start", "Guides", "Reference", "Project"] as const;

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    group: z.enum(docGroups),
    order: z.number()
  })
});

export const collections = { docs };
