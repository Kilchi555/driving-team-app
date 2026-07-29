import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { searchGbpCategories } from '~/server/utils/gbp'

/**
 * GET /api/gbp/categories?q=<search term>
 * Searches Google's canonical business categories (CH/de).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const { q } = getQuery(event) as { q?: string }
  try {
    const categories = await searchGbpCategories(authUser.tenant_id, q || '')
    return { success: true, categories }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Kategorien konnten nicht geladen werden' })
  }
})
