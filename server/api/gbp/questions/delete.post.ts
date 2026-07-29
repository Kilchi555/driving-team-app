import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { deleteGbpQuestion } from '~/server/utils/gbp-qanda'

/**
 * POST /api/gbp/questions/delete
 * Deletes a question the business owner created (e.g. a seeded FAQ entry).
 * Body: { questionName: "locations/123/questions/456" }
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ questionName: string }>(event)
  if (!body?.questionName) throw createError({ statusCode: 400, statusMessage: 'questionName required' })

  try {
    await deleteGbpQuestion(authUser.tenant_id, body.questionName)
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Frage konnte nicht gelöscht werden' })
  }
})
