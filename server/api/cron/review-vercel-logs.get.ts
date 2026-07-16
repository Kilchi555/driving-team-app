/**
 * GET /api/cron/review-vercel-logs
 *
 * Daily job: aggregates the last 24h of error/warning entries in
 * `vercel_log_events` (populated by the Vercel Log Drain, see
 * server/api/integrations/vercel-log-drain.post.ts) into a
 * `vercel_log_reviews` row, then emails every super_admin a summary with a
 * link to review it in /tenant-admin/vercel-log-reviews.
 *
 * Schedule: daily at 05:00 UTC (see vercel.json).
 * If there is nothing to report, no review/email is created (no noise).
 */
import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

const REVIEW_URL = 'https://app.simy.ch/tenant-admin/vercel-log-reviews'
const TOP_ISSUES_LIMIT = 20

interface AggregatedIssue {
  message: string
  path: string | null
  status_code: number | null
  level: string
  count: number
  sample_event_id: string
}

function groupKey(row: { message: string | null; path: string | null; status_code: number | null }): string {
  return `${row.path || ''}::${row.status_code ?? ''}::${(row.message || '').slice(0, 200)}`
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)

  const { data: events, error: fetchError } = await supabase
    .from('vercel_log_events')
    .select('id, message, path, status_code, level')
    .is('review_id', null)
    .gte('occurred_at', periodStart.toISOString())
    .lt('occurred_at', periodEnd.toISOString())

  if (fetchError) {
    logger.error('ReviewVercelLogs', 'Failed to fetch vercel_log_events:', fetchError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch log events' })
  }

  if (!events || events.length === 0) {
    return { success: true, created: false, reason: 'No error/warning log events in the last 24h' }
  }

  const errorCount = events.filter(e => e.level === 'error').length
  const warningCount = events.filter(e => e.level === 'warning').length

  const groups = new Map<string, AggregatedIssue>()
  for (const e of events) {
    const key = groupKey(e)
    const existing = groups.get(key)
    if (existing) {
      existing.count++
    } else {
      groups.set(key, {
        message: e.message || '(no message)',
        path: e.path,
        status_code: e.status_code,
        level: e.level,
        count: 1,
        sample_event_id: e.id,
      })
    }
  }

  const topIssues = [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_ISSUES_LIMIT)

  const { data: review, error: insertError } = await supabase
    .from('vercel_log_reviews')
    .insert({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      error_count: errorCount,
      warning_count: warningCount,
      top_issues: topIssues,
      status: 'open',
    })
    .select('id')
    .single()

  if (insertError || !review) {
    logger.error('ReviewVercelLogs', 'Failed to create review:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create review' })
  }

  // Link the aggregated events to this review so the next run's 24h window doesn't re-count them.
  await supabase
    .from('vercel_log_events')
    .update({ review_id: review.id })
    .in('id', events.map(e => e.id))

  const { data: superAdmins, error: adminError } = await supabase
    .from('users')
    .select('email, first_name')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  if (adminError) {
    logger.error('ReviewVercelLogs', 'Failed to load super admins:', adminError)
  }

  const recipients = (superAdmins || []).map(u => u.email).filter(Boolean) as string[]

  if (recipients.length > 0) {
    const issueRows = topIssues.map(issue => `
      <tr>
        <td style="padding:8px 10px;font-size:12px;color:#111827;border-bottom:1px solid #f3f4f6">
          ${issue.status_code ? `<strong>${issue.status_code}</strong> ` : ''}${issue.path ? `<code style="font-size:11px">${escapeHtml(issue.path)}</code>` : ''}
          <div style="color:#6b7280;margin-top:2px">${escapeHtml(issue.message).slice(0, 200)}</div>
        </td>
        <td style="padding:8px 10px;font-size:12px;color:${issue.level === 'error' ? '#dc2626' : '#d97706'};text-align:center;border-bottom:1px solid #f3f4f6;white-space:nowrap">
          ${issue.level === 'error' ? 'Error' : 'Warning'}
        </td>
        <td style="padding:8px 10px;font-size:12px;color:#111827;text-align:center;border-bottom:1px solid #f3f4f6;font-weight:700">
          ${issue.count}
        </td>
      </tr>
    `).join('')

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto">
        <div style="padding:24px 24px 12px">
          <h1 style="margin:0 0 4px;font-size:18px;color:#111827">Vercel Error Review – letzte 24h</h1>
          <p style="margin:0;font-size:13px;color:#6b7280">${periodStart.toLocaleString('de-CH')} – ${periodEnd.toLocaleString('de-CH')}</p>
        </div>
        <div style="display:flex;gap:12px;padding:0 24px 16px">
          <div style="flex:1;padding:12px;background:#fef2f2;border-radius:8px">
            <div style="font-size:22px;font-weight:800;color:#dc2626">${errorCount}</div>
            <div style="font-size:11px;color:#991b1b">Errors</div>
          </div>
          <div style="flex:1;padding:12px;background:#fffbeb;border-radius:8px">
            <div style="font-size:22px;font-weight:800;color:#d97706">${warningCount}</div>
            <div style="font-size:11px;color:#92400e">Warnings</div>
          </div>
        </div>
        <div style="padding:0 24px 16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px 10px;font-size:10px;color:#9ca3af;text-align:left;text-transform:uppercase">Issue</th>
                <th style="padding:8px 10px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Level</th>
                <th style="padding:8px 10px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Anzahl</th>
              </tr>
            </thead>
            <tbody>${issueRows}</tbody>
          </table>
        </div>
        <div style="padding:0 24px 24px">
          <a href="${REVIEW_URL}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none">
            Review im Dashboard öffnen
          </a>
        </div>
      </div>
    `

    try {
      await sendEmail({
        to: recipients,
        subject: `⚠️ Vercel Error Review · ${errorCount} Errors, ${warningCount} Warnings (24h)`,
        html,
      })
    } catch (emailError) {
      logger.error('ReviewVercelLogs', 'Failed to send review email:', emailError)
    }
  }

  return {
    success: true,
    created: true,
    reviewId: review.id,
    errorCount,
    warningCount,
    topIssuesCount: topIssues.length,
    recipients: recipients.length,
  }
})

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
