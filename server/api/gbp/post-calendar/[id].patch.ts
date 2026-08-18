import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * PATCH /api/gbp/post-calendar/:id
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{
    summary?: string
    theme_title?: string
    theme_angle?: string | null
    planned_for?: string
    topic_type?: 'STANDARD' | 'EVENT' | 'OFFER'
    status?: 'planned' | 'skipped'
    bumpToFront?: boolean
  }>(event)

  const supabase = getSupabaseAdmin()
  const { data: existing, error: loadError } = await supabase
    .from('gbp_post_calendar')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (loadError) throw createError({ statusCode: 500, statusMessage: loadError.message })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })
  if (existing.status === 'published') {
    throw createError({ statusCode: 400, statusMessage: 'Bereits veröffentlicht' })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.summary !== undefined) patch.summary = body.summary
  if (body.theme_title !== undefined) patch.theme_title = body.theme_title
  if (body.theme_angle !== undefined) patch.theme_angle = body.theme_angle
  if (body.planned_for !== undefined) patch.planned_for = body.planned_for
  if (body.topic_type !== undefined) patch.topic_type = body.topic_type
  if (body.status === 'skipped' || body.status === 'planned') patch.status = body.status

  if (body.bumpToFront === true) {
    const { data: first } = await supabase
      .from('gbp_post_calendar')
      .select('planned_for')
      .eq('tenant_id', authUser.tenant_id)
      .eq('location_id', existing.location_id)
      .eq('status', 'planned')
      .order('planned_for', { ascending: true })
      .limit(1)
      .maybeSingle()

    const firstAt = first?.planned_for ? new Date(first.planned_for).getTime() : Date.now() + 60 * 60 * 1000
    patch.planned_for = new Date(Math.min(firstAt - 60 * 60 * 1000, Date.now() + 60 * 60 * 1000)).toISOString()
    patch.status = 'planned'
  }

  const { data, error } = await supabase
    .from('gbp_post_calendar')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', authUser.tenant_id)
    .select('*')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, item: data }
})
