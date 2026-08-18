import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createGbpPost, getGbpAutomationSettings } from '~/server/utils/gbp'
import { generateCalendarPostCopy } from '~/server/utils/gbp-post-calendar'

/**
 * POST /api/gbp/post-calendar/:id/publish
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = getSupabaseAdmin()
  const { data: item, error } = await supabase
    .from('gbp_post_calendar')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })
  if (item.status === 'published') {
    throw createError({ statusCode: 400, statusMessage: 'Bereits veröffentlicht' })
  }

  let summary = (item.summary || '').trim()
  if (!summary) {
    summary = (await generateCalendarPostCopy({
      tenantId: authUser.tenant_id,
      locationId: item.location_id,
      themeTitle: item.theme_title,
      themeAngle: item.theme_angle,
    })).trim()
    if (!summary) throw createError({ statusCode: 502, statusMessage: 'Kein Post-Text' })
  }

  const settings = await getGbpAutomationSettings(authUser.tenant_id, item.location_id)
  const mediaUrls = Array.isArray(item.media_urls) ? item.media_urls : []

  let gbp: any
  try {
    gbp = await createGbpPost(
      authUser.tenant_id,
      {
        summary,
        topicType: item.topic_type,
        callToActionType: (settings.default_cta_type as any) || undefined,
        callToActionUrl: settings.default_cta_url || undefined,
        languageCode: 'de',
        mediaUrls,
      },
      item.location_id
    )
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'GBP-Post fehlgeschlagen' })
  }

  if (gbp?.error) {
    await supabase
      .from('gbp_post_calendar')
      .update({
        status: 'failed',
        error_message: gbp.error.message || JSON.stringify(gbp.error),
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    throw createError({ statusCode: 502, statusMessage: gbp.error.message || 'GBP-Post fehlgeschlagen' })
  }

  const nowIso = new Date().toISOString()
  const { data: updated } = await supabase
    .from('gbp_post_calendar')
    .update({
      status: 'published',
      summary,
      published_at: nowIso,
      gbp_post_name: gbp?.name || null,
      error_message: null,
      updated_at: nowIso,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  return { ok: true, item: updated, gbp }
})
