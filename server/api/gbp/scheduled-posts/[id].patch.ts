import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * PATCH /api/gbp/scheduled-posts/:id
 * Update draft fields / reschedule.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{
    summary?: string
    status?: 'draft' | 'scheduled'
    scheduledFor?: string | null
    callToActionType?: string | null
    callToActionUrl?: string | null
  }>(event)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.summary != null) patch.summary = body.summary
  if (body.status != null) patch.status = body.status
  if (body.scheduledFor !== undefined) patch.scheduled_for = body.scheduledFor
  if (body.callToActionType !== undefined) patch.call_to_action_type = body.callToActionType
  if (body.callToActionUrl !== undefined) patch.call_to_action_url = body.callToActionUrl

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_scheduled_posts')
    .update(patch)
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .neq('status', 'published')
    .select('*')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Post not found or already published' })
  return { ok: true, post: data }
})
