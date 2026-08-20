import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

const EMPTY = {
  totalViews: 0,
  ctaClicks: 0,
  topPages: [] as { page: string; views: number }[],
  sources: {} as Record<string, number>,
  devices: {} as Record<string, number>,
  daily: [] as { date: string; views: number }[],
}

function classifyReferrer(referrer: string | null, eventUrl: string | null): string {
  if (!referrer) return 'direct'
  let host = ''
  let eventHost = ''
  try { host = new URL(referrer).hostname.replace(/^www\./, '') } catch { /* ignore */ }
  try { eventHost = eventUrl ? new URL(eventUrl).hostname.replace(/^www\./, '') : '' } catch { /* ignore */ }
  const h = host.toLowerCase()
  if (!h) return 'direct'
  if (eventHost && h === eventHost) return 'internal'
  if (h.includes('localhost') || h.endsWith('.simy.ch') || h === 'app.simy.ch') return 'internal'
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\.|search\.brave/.test(h)) return 'search'
  if (/facebook\.|instagram\.|tiktok\.|linkedin\.|twitter\.|x\.com|whatsapp\./.test(h)) return 'social'
  return 'other'
}

function classifyDevice(ua: string | null): string {
  const u = (ua || '').toLowerCase()
  if (!u) return 'desktop'
  if (/ipad|tablet/.test(u)) return 'tablet'
  if (/mobile|iphone|android/.test(u)) return 'mobile'
  return 'desktop'
}

function pagePath(eventUrl: string | null, subdomain: string | null): string {
  if (!eventUrl) return '/'
  try {
    const u = new URL(eventUrl)
    let path = u.pathname || '/'
    if (subdomain && path.startsWith(`/s/${subdomain}`)) {
      path = path.slice(`/s/${subdomain}`.length) || '/'
    }
    return `${path}${u.hash || ''}`
  } catch {
    return eventUrl
  }
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'tenant_admin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  const days = Math.min(Math.max(Number(getQuery(event).days) || 30, 1), 365)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceIso = since.toISOString()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (!website?.id) return EMPTY

  const { data: rows, error } = await supabase
    .from('website_analytics_events')
    .select('event_type, event_url, referrer, user_agent, created_at')
    .eq('website_id', website.id)
    .in('event_type', ['pageview', 'page_view', 'cta_click'])
    .gte('created_at', sinceIso)
    .limit(20000)

  if (error) {
    console.error('[website-analytics] query failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Analytics konnten nicht geladen werden' })
  }

  const pageMap: Record<string, number> = {}
  const sourceMap: Record<string, number> = {}
  const deviceMap: Record<string, number> = {}
  const dailyMap: Record<string, number> = {}
  const views = (rows || []).filter((r) => r.event_type === 'pageview' || r.event_type === 'page_view')
  const clicks = (rows || []).filter((r) => r.event_type === 'cta_click')

  for (const row of views) {
    const page = pagePath(row.event_url, website.subdomain)
    pageMap[page] = (pageMap[page] || 0) + 1

    const source = classifyReferrer(row.referrer, row.event_url)
    sourceMap[source] = (sourceMap[source] || 0) + 1

    const device = classifyDevice(row.user_agent)
    deviceMap[device] = (deviceMap[device] || 0) + 1

    const date = String(row.created_at).slice(0, 10)
    dailyMap[date] = (dailyMap[date] || 0) + 1
  }

  const topPages = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([page, views]) => ({ page, views }))

  const daily = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, views]) => ({ date, views }))

  return {
    totalViews: views.length,
    ctaClicks: clicks.length,
    topPages,
    sources: sourceMap,
    devices: deviceMap,
    daily,
  }
})
