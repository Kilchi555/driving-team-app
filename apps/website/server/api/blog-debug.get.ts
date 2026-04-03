import { queryCollection } from '#content/server'

export default defineEventHandler(async (event) => {
  const articles = await queryCollection(event, 'blog')
    .select('path', 'slug', 'title')
    .all()
  return { count: articles.length, articles }
})
