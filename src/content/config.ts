import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string(),
    breadcrumbSlug: z.string().optional(), // should match the slug
    image: z
      .object({
        url: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    youtube: z
      .object({
        id: z.string(),
        title: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .optional(),
  }),
});

const astroKitDocs = defineCollection({
  ...postsCollection,
});
const content = defineCollection({
  ...postsCollection,
});

export const collections = {
  posts: postsCollection,
  content: content,
  docs: defineCollection({ schema: docsSchema() }),
};
