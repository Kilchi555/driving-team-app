import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpAutomationSettings, resolveGbpLocation } from '~/server/utils/gbp'
import { generateGbpAiText } from '~/server/utils/gbp-automation'
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
    keywords?: string[]
    draftText?: string | null
    tone?: 'local_friendly' | 'factual' | 'cta_focus'
    mode?: 'generate' | 'regenerate' | 'shorter' | 'more_cta'
  }>(event)

  const locationId = getGbpLocationIdFromEvent(event, body)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
  const settings = await getGbpAutomationSettings(authUser.tenant_id, loc.id)

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('name')
    .eq('id', authUser.tenant_id)
    .single()

  try {
    const mergedKeywords = [...new Set([...(settings.keywords ?? []), ...(body.keywords ?? [])])].filter(Boolean)
    const summary = await generateGbpAiText({
      context: 'post',
      tenantName: tenant?.name || 'Fahrschule',
      locationTitle: loc.title,
      keywords: mergedKeywords,
      brandVoice: settings.brand_voice,
      ctaType: settings.default_cta_type,
      draftText: body.draftText,
      tone: body.tone,
      mode: body.mode,
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
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || 'KI-Post konnte nicht erzeugt werden',
    })
  }
})
