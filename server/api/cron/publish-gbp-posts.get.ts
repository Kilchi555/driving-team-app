import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createGbpPost } from '~/server/utils/gbp'
import { assertCronAuth } from '~/server/utils/gbp-automation'

/**
 * GET /api/cron/publish-gbp-posts
 * Publishes due scheduled GBP posts.
 * Schedule: every 15 minutes
 */
export default defineEventHandler(async (event) => {
  assertCronAuth(getHeader(event, 'authorization') || undefined)

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('gbp_scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .not('location_id', 'is', null)
    .order('scheduled_for', { ascending: true })
    .limit(25)

  if (error) {
    return { ok: false, error: error.message }
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = []

  for (const post of due ?? []) {
    try {
      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : []
      const gbp = await createGbpPost(
        post.tenant_id,
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

      if (gbp?.error) {
        await supabase
          .from('gbp_scheduled_posts')
          .update({
            status: 'failed',
            error_message: gbp.error.message || JSON.stringify(gbp.error),
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)
        results.push({ id: post.id, ok: false, error: gbp.error.message })
        continue
      }

      await supabase
        .from('gbp_scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          gbp_post_name: gbp?.name || null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      results.push({ id: post.id, ok: true })
    } catch (err: any) {
      await supabase
        .from('gbp_scheduled_posts')
        .update({
          status: 'failed',
          error_message: err.message || 'publish failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
      results.push({ id: post.id, ok: false, error: err.message })
    }
  }

  return {
    ok: true,
    processed: results.length,
    published: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  }
})
