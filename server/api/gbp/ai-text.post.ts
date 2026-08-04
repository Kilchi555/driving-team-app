import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpAutomationSettings, resolveGbpLocation } from '~/server/utils/gbp'
import { generateGbpAiText, type GbpAiTextContext, type GbpAiTextMode, type GbpAiTextTone } from '~/server/utils/gbp-automation'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/ai-text
 * Unified AI copy for posts, photo captions, review replies.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    context: GbpAiTextContext
    locationId?: string | null
    keywords?: string[]
    draftText?: string | null
    tone?: GbpAiTextTone
    mode?: GbpAiTextMode
    reviewContext?: {
      reviewerName?: string
      starRating?: number
      reviewText?: string
    }
  }>(event)

  if (!body?.context) throw createError({ statusCode: 400, statusMessage: 'context required' })

  const locationId = getGbpLocationIdFromEvent(event, body)
  let locationTitle: string | null = null
  let settings = await getGbpAutomationSettings(authUser.tenant_id, null)

  if (locationId) {
    const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
    locationTitle = loc.title
    settings = await getGbpAutomationSettings(authUser.tenant_id, loc.id)
  }

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('name, business_type')
    .eq('id', authUser.tenant_id)
    .single()

  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const terms = getTerminologyDefaults(tenant?.business_type)

  const mergedKeywords = [...new Set([
    ...(settings.keywords ?? []),
    ...(body.keywords ?? []),
  ])].filter(Boolean)

  try {
    const text = await generateGbpAiText({
      context: body.context,
      tenantName: tenant?.name || terms.businessNoun,
      businessNoun: terms.businessNoun,
      clientsPlural: terms.clientsPlural,
      clientSingular: terms.client,
      appointmentSingular: terms.appointment,
      locationTitle,
      brandVoice: settings.brand_voice,
      keywords: mergedKeywords,
      draftText: body.draftText,
      tone: body.tone,
      mode: body.mode,
      ctaType: settings.default_cta_type,
      reviewerName: body.reviewContext?.reviewerName,
      starRating: body.reviewContext?.starRating,
      reviewText: body.reviewContext?.reviewText,
    })

    if (!text) throw createError({ statusCode: 502, statusMessage: 'KI lieferte keinen Text' })
    return { success: true, text }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 502, statusMessage: err?.message || 'KI-Text fehlgeschlagen' })
  }
})
