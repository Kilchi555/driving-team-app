import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { replyToGbpReview } from '~/server/utils/gbp'

/**
 * POST /api/gbp/review-actions/:id/publish
 * Publish a suggested review reply to Google.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{ comment?: string }>(event)
  const supabase = getSupabaseAdmin()

  const { data: action, error } = await supabase
    .from('gbp_review_actions')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!action) throw createError({ statusCode: 404, statusMessage: 'Action not found' })
  if (action.status === 'published') throw createError({ statusCode: 400, statusMessage: 'Already published' })

  const comment = (body?.comment || action.suggested_reply || '').trim()
  if (!comment) throw createError({ statusCode: 400, statusMessage: 'No reply text' })

  try {
    await replyToGbpReview(authUser.tenant_id, action.google_review_id, comment, action.location_id)

    const { data: updated } = await supabase
      .from('gbp_review_actions')
      .update({
        status: 'published',
        published_reply: comment,
        suggested_reply: comment,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    return { ok: true, action: updated }
  } catch (err: any) {
    await supabase
      .from('gbp_review_actions')
      .update({
        status: 'failed',
        error_message: err.message || 'publish failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to publish reply' })
  }
})
