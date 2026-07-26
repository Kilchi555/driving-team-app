import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpAutomationSettings, resolveGbpLocation } from '~/server/utils/gbp'
import { generateGbpPostDraft } from '~/server/utils/gbp-automation'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/generate-post
 * AI draft → gbp_scheduled_posts (draft by default, or scheduled if scheduledFor set).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    locationId?: string
    scheduledFor?: string | null
    status?: 'draft' | 'scheduled'
    mediaUrls?: string[]
  }>(event)

  const locationId = getGbpLocationIdFromEvent(event, body)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
  const settings = await getGbpAutomationSettings(authUser.tenant_id, loc.id)

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('name')
    .eq('id', authUser.tenant_id)
    .single()

  const summary = await generateGbpPostDraft({
    tenantName: tenant?.name || 'Fahrschule',
    locationTitle: loc.title,
    keywords: settings.keywords,
    brandVoice: settings.brand_voice,
    ctaType: settings.default_cta_type,
  })

  if (!summary) throw createError({ statusCode: 502, statusMessage: 'AI returned empty post' })

  const status = body?.status ?? (body?.scheduledFor ? 'scheduled' : 'draft')

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_scheduled_posts')
    .insert({
      tenant_id: authUser.tenant_id,
      location_id: loc.id,
      summary,
      topic_type: 'STANDARD',
      call_to_action_type: settings.default_cta_type,
      call_to_action_url: settings.default_cta_url,
      scheduled_for: body?.scheduledFor || null,
      status,
      media_urls: body?.mediaUrls ?? [],
      language_code: 'de',
      source: 'ai',
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, post: data }
})
