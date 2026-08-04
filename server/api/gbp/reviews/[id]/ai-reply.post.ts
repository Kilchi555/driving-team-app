import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateGbpReviewSuggestion } from '~/server/utils/gbp-automation'
import { getTerminologyDefaults } from '~/composables/useTerminology'

/**
 * POST /api/gbp/reviews/:id/ai-reply
 * Generates an AI reply suggestion for a GBP review.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const reviewId = getRouterParam(event, 'id')
  const { reviewText, reviewerName, starRating, businessName } = await readBody<{
    reviewText: string
    reviewerName: string
    starRating: number
    businessName?: string
  }>(event)

  if (!reviewText && !starRating) throw createError({ statusCode: 400, statusMessage: 'Review content required' })

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('name, business_type')
    .eq('id', authUser.tenant_id)
    .single()

  const terms = getTerminologyDefaults(tenant?.business_type)
  const tenantName = businessName || tenant?.name || terms.businessNoun

  const reply = await generateGbpReviewSuggestion({
    tenantName,
    businessNoun: terms.businessNoun,
    reviewerName,
    starRating: starRating ?? 0,
    reviewText,
  })

  return { success: true, suggestedReply: reply, reviewId }
})
