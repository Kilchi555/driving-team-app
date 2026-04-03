export default defineEventHandler(async () => {
  const articles = await queryCollection('blog')
    .select('path', 'slug', 'title')
    .all()
  return { count: articles.length, articles }
})
