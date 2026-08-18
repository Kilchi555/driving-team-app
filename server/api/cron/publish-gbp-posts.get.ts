import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createGbpPost, getGbpAutomationSettings } from '~/server/utils/gbp'
import { assertCronAuth } from '~/server/utils/gbp-automation'
import { fillUpcomingCalendarCopy, generateCalendarPostCopy } from '~/server/utils/gbp-post-calendar'

/**
 * GET /api/cron/publish-gbp-posts
 * 1) Fill AI copy for upcoming calendar slots
 * 2) Publish due calendar posts (post_mode=calendar)
 * 3) Publish due gbp_scheduled_posts
 * Schedule: every 15 minutes
 */
export default defineEventHandler(async (event) => {
  assertCronAuth(getHeader(event, 'authorization') || undefined)

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  let copyFilled = 0
  try {
    copyFilled = await fillUpcomingCalendarCopy(6)
  } catch (err: any) {
    console.warn('[cron/publish-gbp-posts] fill copy', err?.message || err)
  }

  const calendarResults: Array<{ id: string; ok: boolean; error?: string }> = []
  const { data: dueCalendar } = await supabase
    .from('gbp_post_calendar')
    .select('*')
    .eq('status', 'planned')
    .lte('planned_for', nowIso)
    .order('planned_for', { ascending: true })
    .limit(15)

  for (const item of dueCalendar ?? []) {
    try {
      const settings = await getGbpAutomationSettings(item.tenant_id, item.location_id)
      if (settings.post_mode !== 'calendar') {
        calendarResults.push({ id: item.id, ok: true, error: 'post_mode off' })
        continue
      }

      let summary = String(item.summary || '').trim()
      if (!summary) {
        summary = (await generateCalendarPostCopy({
          tenantId: item.tenant_id,
          locationId: item.location_id,
          themeTitle: item.theme_title,
          themeAngle: item.theme_angle,
        })).trim()
      }
      if (!summary) throw new Error('Leerer Post-Text')

      const mediaUrls = Array.isArray(item.media_urls) ? item.media_urls : []
      const gbp = await createGbpPost(
        item.tenant_id,
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

      if (gbp?.error) {
        await supabase
          .from('gbp_post_calendar')
          .update({
            status: 'failed',
            summary,
            error_message: gbp.error.message || JSON.stringify(gbp.error),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        calendarResults.push({ id: item.id, ok: false, error: gbp.error.message })
        continue
      }

      await supabase
        .from('gbp_post_calendar')
        .update({
          status: 'published',
          summary,
          published_at: new Date().toISOString(),
          gbp_post_name: gbp?.name || null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      calendarResults.push({ id: item.id, ok: true })
    } catch (err: any) {
      await supabase
        .from('gbp_post_calendar')
        .update({
          status: 'failed',
          error_message: err.message || 'publish failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
      calendarResults.push({ id: item.id, ok: false, error: err.message })
    }
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = []

  const { data: due, error } = await supabase
    .from('gbp_scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .not('location_id', 'is', null)
    .order('scheduled_for', { ascending: true })
    .limit(25)

  if (error) {
    return { ok: false, error: error.message, copyFilled, calendar: calendarResults }
  }

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
    copyFilled,
    calendarProcessed: calendarResults.length,
    calendarPublished: calendarResults.filter(r => r.ok && !r.error).length,
    processed: results.length,
    published: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length + calendarResults.filter(r => !r.ok).length,
    calendar: calendarResults,
    results,
  }
})
