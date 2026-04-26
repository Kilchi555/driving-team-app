import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  // ✅ Security: disabled in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  try {
    const all = await queryCollection(event, 'blog').select('title', 'slug', 'path').all()
    const byPath = await queryCollection(event, 'blog').path('/blog/pruefungsangst-fahrpruefung').first()
    const bySlug = await queryCollection(event, 'blog').where('slug', '=', 'pruefungsangst-fahrpruefung').first()
    return {
      count: all.length,
      slugs: all.map(a => ({ slug: a.slug, path: a.path })),
      byPath,
      bySlug,
    }
  } catch (err: any) {
    return { error: err.message }
  }
})
