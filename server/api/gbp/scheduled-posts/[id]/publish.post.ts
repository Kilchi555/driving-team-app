import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createGbpPost } from '~/server/utils/gbp'

/**
 * POST /api/gbp/scheduled-posts/:id/publish
 * Publish a draft/scheduled post immediately to GBP.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = getSupabaseAdmin()
  const { data: post, error } = await supabase
    .from('gbp_scheduled_posts')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  if (post.status === 'published') throw createError({ statusCode: 400, statusMessage: 'Already published' })

  try {
    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : []
    const result = await createGbpPost(
      authUser.tenant_id,
      {
        summary: post.summary,
        topicType: post.topic_type,
        callToActionType: post.call_to_action_type || undefined,
        callToActionUrl: post.call_to_action_url || undefined,
        languageCode: post.language_code || 'de',
        mediaUrls,
      },
      post.location_id
    )

    if (result?.error) {
      await supabase
        .from('gbp_scheduled_posts')
        .update({
          status: 'failed',
          error_message: result.error.message || JSON.stringify(result.error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      throw createError({ statusCode: 502, statusMessage: result.error.message || 'GBP publish failed' })
    }

    const { data: updated } = await supabase
      .from('gbp_scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        gbp_post_name: result?.name || null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    return { ok: true, post: updated, gbp: result }
  } catch (err: any) {
    if (err?.statusCode) throw err
    await supabase
      .from('gbp_scheduled_posts')
      .update({
        status: 'failed',
        error_message: err.message || 'publish failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to publish' })
  }
})
