import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateCalendarPostCopy } from '~/server/utils/gbp-post-calendar'

/**
 * POST /api/gbp/post-calendar/:id/regenerate
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

  const summary = await generateCalendarPostCopy({
    tenantId: authUser.tenant_id,
    locationId: item.location_id,
    themeTitle: item.theme_title,
    themeAngle: item.theme_angle,
    existingSummary: item.summary,
    mode: item.summary?.trim() ? 'regenerate' : 'generate',
  })

  if (!summary?.trim()) {
    throw createError({ statusCode: 502, statusMessage: 'Simy AI lieferte keinen Post-Text' })
  }

  const { data: updated, error: updError } = await supabase
    .from('gbp_post_calendar')
    .update({
      summary: summary.trim(),
      status: item.status === 'failed' ? 'planned' : item.status,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (updError) throw createError({ statusCode: 500, statusMessage: updError.message })
  return { ok: true, item: updated }
})
