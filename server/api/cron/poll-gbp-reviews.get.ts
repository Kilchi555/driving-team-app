import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpReviews, getGbpAutomationSettings, listTenantGbpLocations, replyToGbpReview } from '~/server/utils/gbp'
import { assertCronAuth, gbpStarToNumber, generateGbpReviewSuggestion, isGbpReviewHours, shouldAutoPublishReview } from '~/server/utils/gbp-automation'

/**
 * GET /api/cron/poll-gbp-reviews
 * Polls unreplied reviews, writes an AI reply, and publishes when
 * review_reply_mode is auto_all or auto_ge_4 (4–5 stars).
 * Schedule: :07/:37 from 05–17 UTC; skipped outside 07:00–19:00 Europe/Zurich.
 */
export default defineEventHandler(async (event) => {
  assertCronAuth(getHeader(event, 'authorization') || undefined)

  if (!isGbpReviewHours()) {
    return { ok: true, skipped: 'outside_review_hours', timezone: 'Europe/Zurich', window: '07:00-19:00' }
  }

  const supabase = getSupabaseAdmin()

  // Tenants with GBP feature + connection
  const { data: connections } = await supabase
    .from('tenant_google_connections')
    .select('tenant_id')

  const tenantIds = [...new Set((connections ?? []).map(c => c.tenant_id))]
  let suggested = 0
  let published = 0
  let skipped = 0
  let errors = 0

  for (const tenantId of tenantIds) {
    // Feature flag
    const { data: flag } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .eq('setting_key', 'gbp_enabled')
      .maybeSingle()

    let enabled = false
    if (flag?.setting_value != null) {
      try {
        const parsed = typeof flag.setting_value === 'string'
          ? JSON.parse(flag.setting_value)
          : flag.setting_value
        enabled = parsed === true || parsed?.enabled === true || flag.setting_value === 'true'
      } catch {
        enabled = flag.setting_value === 'true'
      }
    }
    if (!enabled) continue

    const { data: tenant } = await supabase.from('tenants').select('name').eq('id', tenantId).single()
    const locations = await listTenantGbpLocations(tenantId)

    for (const loc of locations) {
      try {
        const settings = await getGbpAutomationSettings(tenantId, loc.id)
        if (settings.review_reply_mode === 'off') {
          skipped++
          continue
        }

        const data = await getGbpReviews(tenantId, loc.id)
        const reviews = data.reviews ?? []
        const MAX_SUGGESTIONS_PER_LOCATION = 5
        let createdForLoc = 0

        for (const review of reviews) {
          if (createdForLoc >= MAX_SUGGESTIONS_PER_LOCATION) break
          if (review.reviewReply) continue
          if (!review.reviewId) continue

          const { data: existing } = await supabase
            .from('gbp_review_actions')
            .select('id, status')
            .eq('tenant_id', tenantId)
            .eq('location_id', loc.id)
            .eq('google_review_id', review.reviewId)
            .maybeSingle()

          if (existing) continue

          const stars = gbpStarToNumber(review.starRating)
          const suggestion = await generateGbpReviewSuggestion({
            tenantName: tenant?.name || loc.title || 'Unternehmen',
            reviewerName: review.reviewer?.displayName,
            starRating: stars,
            reviewText: review.comment,
            brandVoice: settings.brand_voice,
          })

          const nowIso = new Date().toISOString()
          const auto = shouldAutoPublishReview(settings.review_reply_mode, stars)
          let status: 'suggested' | 'published' | 'failed' = 'suggested'
          let publishedReply: string | null = null
          let publishedAt: string | null = null
          let errorMessage: string | null = null

          if (auto) {
            try {
              await replyToGbpReview(tenantId, review.reviewId, suggestion, loc.id)
              status = 'published'
              publishedReply = suggestion
              publishedAt = nowIso
            } catch (err: any) {
              status = 'failed'
              errorMessage = err?.message || 'auto-publish failed'
            }
          }

          const { error } = await supabase.from('gbp_review_actions').insert({
            tenant_id: tenantId,
            location_id: loc.id,
            google_review_id: review.reviewId,
            star_rating: stars,
            reviewer_name: review.reviewer?.displayName || null,
            review_comment: review.comment || null,
            mode: settings.review_reply_mode,
            suggested_reply: suggestion,
            published_reply: publishedReply,
            status,
            published_at: publishedAt,
            error_message: errorMessage,
            review_create_time: review.createTime || null,
          })

          if (error) {
            console.warn('[poll-gbp-reviews] insert failed', tenantId, loc.id, error.message)
            errors++
            continue
          }
          if (status === 'published') published++
          else if (status === 'failed') errors++
          else suggested++
          createdForLoc++
        }
      } catch (err: any) {
        console.warn('[poll-gbp-reviews] location failed', tenantId, loc.id, err?.message || err)
        errors++
      }
    }
  }

  return { ok: true, tenants: tenantIds.length, suggested, published, skipped, errors }
})
