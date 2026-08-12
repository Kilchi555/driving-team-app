import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  ensureTenantGbpDefaults,
  getGbpAutomationSettings,
  type PhotoMode,
  type ReviewReplyMode,
} from '~/server/utils/gbp'

/**
 * PUT /api/gbp/settings
 * Upserts tenant defaults (locationId omitted) or a location override.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    locationId?: string | null
    review_reply_mode?: ReviewReplyMode
    posts_per_week?: number
    photos_per_week?: number
    photo_mode?: PhotoMode
    brand_voice?: string | null
    keywords?: string[]
    default_cta_type?: string | null
    default_cta_url?: string | null
    timezone?: string
  }>(event)

  const locationId = body.locationId || null
  await ensureTenantGbpDefaults(authUser.tenant_id)

  if (locationId) {
    const { data: loc } = await getSupabaseAdmin()
      .from('gbp_locations')
      .select('id')
      .eq('tenant_id', authUser.tenant_id)
      .eq('id', locationId)
      .maybeSingle()
    if (!loc) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  }

  if (body.posts_per_week != null && (body.posts_per_week < 1 || body.posts_per_week > 4)) {
    throw createError({ statusCode: 400, statusMessage: 'posts_per_week must be 1–4' })
  }
  if (body.photos_per_week != null && (body.photos_per_week < 1 || body.photos_per_week > 7)) {
    throw createError({ statusCode: 400, statusMessage: 'photos_per_week must be 1–7' })
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.review_reply_mode != null) patch.review_reply_mode = body.review_reply_mode
  if (body.posts_per_week != null) patch.posts_per_week = body.posts_per_week
  if (body.photos_per_week != null) patch.photos_per_week = body.photos_per_week
  if (body.photo_mode != null) patch.photo_mode = body.photo_mode
  if (body.brand_voice !== undefined) patch.brand_voice = body.brand_voice
  if (body.keywords != null) patch.keywords = body.keywords
  if (body.default_cta_type !== undefined) patch.default_cta_type = body.default_cta_type
  if (body.default_cta_url !== undefined) patch.default_cta_url = body.default_cta_url
  if (body.timezone != null) patch.timezone = body.timezone

  const supabase = getSupabaseAdmin()

  if (locationId) {
    const { data: existing } = await supabase
      .from('gbp_automation_settings')
      .select('id')
      .eq('tenant_id', authUser.tenant_id)
      .eq('location_id', locationId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('gbp_automation_settings').update(patch).eq('id', existing.id)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    } else {
      const defaults = await getGbpAutomationSettings(authUser.tenant_id, null)
      const { error } = await supabase.from('gbp_automation_settings').insert({
        tenant_id: authUser.tenant_id,
        location_id: locationId,
        review_reply_mode: defaults.review_reply_mode,
        posts_per_week: defaults.posts_per_week,
        photos_per_week: defaults.photos_per_week,
        photo_mode: defaults.photo_mode,
        brand_voice: defaults.brand_voice,
        keywords: defaults.keywords,
        default_cta_type: defaults.default_cta_type,
        default_cta_url: defaults.default_cta_url,
        timezone: defaults.timezone,
        ...patch,
      })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
  } else {
    const { error } = await supabase
      .from('gbp_automation_settings')
      .update(patch)
      .eq('tenant_id', authUser.tenant_id)
      .is('location_id', null)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const settings = await getGbpAutomationSettings(authUser.tenant_id, locationId)
  return { ok: true, settings }
})
