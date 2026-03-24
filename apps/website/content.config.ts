import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        slug: z.string(),
        date: z.string(),
        dateModified: z.string().optional(),
        author: z.string().optional(),
        category: z.string().optional(),
        image: z.string().optional(),
        ogImage: z.string().optional(),
        keywords: z.string().optional(),
        readingTime: z.number().optional(),
        lang: z.string().optional(),
      }),
    }),
  },
})
