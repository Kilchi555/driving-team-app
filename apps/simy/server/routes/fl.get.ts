/**
 * Short-link redirect for SMS/print campaigns aimed at driving-instructor
 * prospects: keeps the link in the message short and human-readable
 * ("simy.ch/fl") while still attaching full UTM attribution server-side
 * before redirecting to the actual landing page, so GA4 can attribute the
 * session correctly.
 *
 * Usage in a message: simy.ch/fl (defaults to campaign "fahrlehrer-empfehlung")
 * Optional override for a different drop: simy.ch/fl?c=other-campaign-name
 *
 * Also logs each click to Supabase (public.sms_link_clicks via the
 * log_sms_link_click RPC) so click counts can be checked directly in the
 * database — no GA4 property access needed for this specific campaign.
 * The RPC only allows inserting into that one table (security definer,
 * narrow grant to anon), so the publishable key used here can't do anything
 * else. Logging failures never block the redirect.
 */
import { defineEventHandler, getHeader, getQuery, sendRedirect, type H3Event } from 'h3'

const DEFAULT_CAMPAIGN = 'fahrlehrer-empfehlung'
const TARGET_PATH = '/fahrschule'

function logClickInBackground(campaign: string, targetPath: string, event: H3Event) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  const userAgent = getHeader(event, 'user-agent') ?? null
  const referrer = getHeader(event, 'referer') ?? null

  fetch(`${supabaseUrl}/rest/v1/rpc/log_sms_link_click`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_campaign: campaign,
      p_target_path: targetPath,
      p_user_agent: userAgent,
      p_referrer: referrer,
    }),
  }).catch(() => {
    // Never block the redirect on logging failures.
  })
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const raw = typeof query.c === 'string' ? query.c.trim() : ''
  const campaign = raw ? raw.slice(0, 60) : DEFAULT_CAMPAIGN

  const params = new URLSearchParams({
    utm_source: 'sms',
    utm_medium: 'sms',
    utm_campaign: campaign,
  })

  logClickInBackground(campaign, TARGET_PATH, event)

  return sendRedirect(event, `${TARGET_PATH}?${params.toString()}`, 302)
})
