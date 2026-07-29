import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { createGbpQuestion } from '~/server/utils/gbp-qanda'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/questions
 * Seeds a new FAQ-style question as the business owner (to then be answered).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ locationId?: string | null; text: string }>(event)
  if (!body?.text?.trim()) throw createError({ statusCode: 400, statusMessage: 'text required' })

  const locationId = getGbpLocationIdFromEvent(event, body)
  try {
    const question = await createGbpQuestion(authUser.tenant_id, body.text.trim(), locationId)
    return { success: true, question }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Frage konnte nicht erstellt werden' })
  }
})
