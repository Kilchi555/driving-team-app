import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpReviews, getGbpAutomationSettings, listTenantGbpLocations } from '~/server/utils/gbp'
import { assertCronAuth, gbpStarToNumber, generateGbpReviewSuggestion } from '~/server/utils/gbp-automation'

/**
 * GET /api/cron/poll-gbp-reviews
 * Polls unreplied reviews and creates AI suggestions (mode=suggest).
 * Auto-publish modes are prepared but not enabled in P1.
 * Schedule: every 30 minutes
 */
export default defineEventHandler(async (event) => {
  assertCronAuth(getHeader(event, 'authorization') || undefined)

  const supabase = getSupabaseAdmin()

  // Tenants with GBP feature + connection
  const { data: connections } = await supabase
    .from('tenant_google_connections')
    .select('tenant_id')

  const tenantIds = [...new Set((connections ?? []).map(c => c.tenant_id))]
  let suggested = 0
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

        for (const review of reviews) {
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

          // P1: always store as suggested (even for auto_* modes) — human approve first
          const { error } = await supabase.from('gbp_review_actions').insert({
            tenant_id: tenantId,
            location_id: loc.id,
            google_review_id: review.reviewId,
            star_rating: stars,
            reviewer_name: review.reviewer?.displayName || null,
            review_comment: review.comment || null,
            mode: settings.review_reply_mode,
            suggested_reply: suggestion,
            status: 'suggested',
            review_create_time: review.createTime || null,
          })

          if (error) {
            errors++
            continue
          }
          suggested++
        }
      } catch {
        errors++
      }
    }
  }

  return { ok: true, tenants: tenantIds.length, suggested, skipped, errors }
})
