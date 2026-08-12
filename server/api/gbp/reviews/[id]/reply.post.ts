import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { replyToGbpReview, resolveGbpLocation, getGbpAutomationSettings } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/reviews/:id/reply
 * Publish a reply directly from the Reviews tab and sync gbp_review_actions.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const reviewId = getRouterParam(event, 'id')
  if (!reviewId) throw createError({ statusCode: 400, statusMessage: 'Review ID required' })

  const body = await readBody<{
    comment: string
    locationId?: string
    starRating?: number
    reviewerName?: string
    reviewComment?: string
  }>(event)
  if (!body?.comment?.trim()) throw createError({ statusCode: 400, statusMessage: 'Comment required' })

  const comment = body.comment.trim()
  const locationParam = getGbpLocationIdFromEvent(event, body)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationParam)
  const settings = await getGbpAutomationSettings(authUser.tenant_id, loc.id)

  try {
    const result = await replyToGbpReview(authUser.tenant_id, reviewId, comment, loc.id)

    const nowIso = new Date().toISOString()
    const supabase = getSupabaseAdmin()
    const { error: upsertError } = await supabase.from('gbp_review_actions').upsert(
      {
        tenant_id: authUser.tenant_id,
        location_id: loc.id,
        google_review_id: reviewId,
        star_rating: body.starRating ?? null,
        reviewer_name: body.reviewerName ?? null,
        review_comment: body.reviewComment ?? null,
        mode: settings.review_reply_mode || 'suggest',
        suggested_reply: comment,
        published_reply: comment,
        status: 'published',
        published_at: nowIso,
        error_message: null,
        updated_at: nowIso,
      },
      { onConflict: 'tenant_id,location_id,google_review_id' }
    )

    if (upsertError) {
      console.warn('[gbp/reviews/reply] action upsert failed:', upsertError.message)
    }

    return { success: true, reply: result }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err.message || 'Failed to reply to review' })
  }
})
