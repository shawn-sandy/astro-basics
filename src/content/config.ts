import { defineCollection, z } from "astro:content";

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
      })
      .optional(),
    tags: z.array(z.string()),
    isDraft: z.boolean().default(false),
    youtubeId: z
      .object({
        id: z.string(),
        title: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  posts: postsCollection,
};
