export default defineEventHandler(async (event) => {
  try {
    const all = await queryCollection(event, 'blog').select('title', 'slug', 'path').all()
    const byPath = await queryCollection(event, 'blog').path('/blog/pruefungsangst-fahrpruefung').first()
    const bySlug = await queryCollection(event, 'blog').where('slug', '=', 'pruefungsangst-fahrpruefung').first()
    return {
      count: all.length,
      slugs: all.map(a => ({ slug: a.slug, path: a.path })),
      byPath,
      bySlug,
      cwd: process.cwd(),
    }
  } catch (err: any) {
    return { error: err.message, stack: err.stack?.slice(0, 500), cwd: process.cwd() }
  }
})
