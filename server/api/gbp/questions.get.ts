import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { listGbpQuestions } from '~/server/utils/gbp-qanda'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/questions
 * Lists Q&A for a location (customer questions + owner answers).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  try {
    const questions = await listGbpQuestions(authUser.tenant_id, locationId)
    return { success: true, questions }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Fragen konnten nicht geladen werden' })
  }
})
