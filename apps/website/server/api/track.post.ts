import { createClient } from '@supabase/supabase-js'

function getReferrerType(referrer: string): string {
  if (!referrer) return 'direct'
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\./.test(referrer)) return 'search'
  if (/facebook\.|instagram\.|tiktok\.|linkedin\.|twitter\.|x\.com/.test(referrer)) return 'social'
  if (referrer.includes('drivingteam.ch')) return 'internal'
  return 'other'
}

function getDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'mobile'
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  return 'desktop'
}

async function trackView(data: {
  page: string
  referrer: string
  ua: string
  country: string
}) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  await supabase.rpc('increment_page_view', {
    p_page: data.page,
    p_date: new Date().toISOString().split('T')[0],
    p_referrer_type: getReferrerType(data.referrer),
    p_device_type: getDeviceType(data.ua),
    p_country: data.country || 'unknown',
  })
}

export default defineEventHandler(async (event) => {
  // Only track on live production
  if (process.env.VERCEL_ENV !== 'production') return { ok: false, reason: 'not production' }

  const body = await readBody(event).catch(() => null)
  if (!body?.page) return { ok: false }

  const ua = getHeader(event, 'user-agent') || ''
  const country = getHeader(event, 'x-vercel-ip-country') || 'unknown'

  // Fire and forget - never delays response, but log errors
  trackView({
    page: body.page,
    referrer: body.referrer || '',
    ua,
    country,
  }).catch((err) => console.error('[analytics/track] Supabase error:', err))

  return { ok: true }
})
