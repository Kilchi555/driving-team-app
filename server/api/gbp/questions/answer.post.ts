import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { answerGbpQuestion } from '~/server/utils/gbp-qanda'

/**
 * POST /api/gbp/questions/answer
 * Creates or updates the owner's answer for a question.
 * Body: { questionName: "locations/123/questions/456", text }
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ questionName: string; text: string }>(event)
  if (!body?.questionName || !body?.text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'questionName and text required' })
  }

  try {
    const answer = await answerGbpQuestion(authUser.tenant_id, body.questionName, body.text.trim())
    return { success: true, answer }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Antwort konnte nicht gespeichert werden' })
  }
})
