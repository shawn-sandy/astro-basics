import { docsSchema } from '@astrojs/starlight/schema'
import { defineCollection, z } from 'astro:content'

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
    publish: z.boolean().default(false),
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
})

// Use Starlight schema for docs collection
const docs = defineCollection({
  schema: docsSchema({
    extend: z.object({
      // Add custom fields if needed
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      featured: z.boolean().default(false),
    }),
  }),
})

const content = defineCollection({
  ...postsCollection,
})

export const collections = {
  posts: postsCollection,
  docs: docs, // Use Starlight docs schema
  content: content,
}
