import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

const SKIP_PATHS = ['/_nuxt/', '/api/', '/__nuxt/', '/favicon', '.webp', '.png', '.jpg', '.svg', '.css', '.js', '.xml', '.txt', '/.well-known/', '/assets/', '/wp-content/', '/test-debug', '/track-debug', '/admin', '/administrator', '/login', '/register', '/user/login', '/user/register', '/wp-admin', '/wp-login', '/__nuxt_error']

const BOT_PATTERNS = /bot|crawl|spider|slurp|vercel|prerender|headless|lighthouse|pagespeed|chrome-lighthouse|googlebot|bingbot|yandex|baidu|facebot|ia_archiver|python-requests|curl|wget|axios|node-fetch/i

function getReferrerType(referrer: string): string {
  if (!referrer) return 'direct'
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\./.test(referrer)) return 'search'
  if (/facebook\.|instagram\.|tiktok\.|linkedin\.|twitter\.|x\.com/.test(referrer)) return 'social'
  if (referrer.includes('drivingteam.ch')) return 'internal'
  return 'other'
}

function getDeviceType(ua: string): string {
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  return 'desktop'
}

async function trackView(event: H3Event, page: string, referrer: string, ua: string, country: string) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  if (!supabaseUrl || !supabaseServiceKey) return

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  await supabase.rpc('increment_page_view', {
    p_page: page,
    p_date: new Date().toISOString().split('T')[0],
    p_referrer_type: getReferrerType(referrer),
    p_device_type: getDeviceType(ua),
    p_country: country || 'unknown',
  })
}

export default defineEventHandler((event) => {
  // Only skip on local development (allow production & preview)
  if (!process.env.VERCEL_ENV) return

  const url = getRequestURL(event)
  const path = url.pathname

  // Skip assets, API routes, and non-page requests
  if (SKIP_PATHS.some(skip => path.includes(skip))) return
  // Only track GET requests (page loads)
  if (event.method !== 'GET') return

  const referrer = getHeader(event, 'referer') || ''
  const ua = getHeader(event, 'user-agent') || ''
  const country = getHeader(event, 'x-vercel-ip-country') || 'unknown'

  // Skip bots and automated crawlers
  if (!ua || BOT_PATTERNS.test(ua)) return

  // Fire and forget - response is NOT delayed
  trackView(event, path, referrer, ua, country).catch(() => {})
})
