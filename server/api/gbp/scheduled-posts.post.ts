import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/scheduled-posts
 * Create a draft or scheduled GBP post in the queue.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    summary: string
    locationId?: string
    topicType?: string
    callToActionType?: string | null
    callToActionUrl?: string | null
    scheduledFor?: string | null
    status?: 'draft' | 'scheduled'
    mediaUrls?: string[]
    languageCode?: string
    source?: 'manual' | 'ai' | 'system'
  }>(event)

  if (!body?.summary?.trim()) throw createError({ statusCode: 400, statusMessage: 'summary required' })

  const locationId = getGbpLocationIdFromEvent(event, body)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)

  const status = body.status ?? (body.scheduledFor ? 'scheduled' : 'draft')
  if (status === 'scheduled' && !body.scheduledFor) {
    throw createError({ statusCode: 400, statusMessage: 'scheduledFor required for scheduled status' })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_scheduled_posts')
    .insert({
      tenant_id: authUser.tenant_id,
      location_id: loc.id,
      summary: body.summary.trim(),
      topic_type: body.topicType || 'STANDARD',
      call_to_action_type: body.callToActionType || null,
      call_to_action_url: body.callToActionUrl || null,
      scheduled_for: body.scheduledFor || null,
      status,
      media_urls: body.mediaUrls ?? [],
      language_code: body.languageCode || 'de',
      source: body.source || 'manual',
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, post: data }
})
