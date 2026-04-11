import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

const BOT_PATTERNS = /bot|crawl|spider|slurp|vercel|prerender|headless|lighthouse|pagespeed|chrome-lighthouse|googlebot|bingbot|yandex|baidu|facebot|ia_archiver|python-requests|curl|wget|axios|node-fetch/i

// Paths to skip - system pages, bots, scanners
const SKIP_PATHS_CLIENT = [
  '/__nuxt_error',
  '/admin', '/administrator',
  '/login', '/register', '/user/login', '/user/register',
  '/wp-admin', '/wp-login', '/wp-content', '/wp-json', '/wp-includes',
  '/cgi-bin',
  '/.well-known',
  '/xmlrpc', '/xmlrpc.php',
  '/assets/',
  '/en/', '/it/', '/fr/', '/de/', // Wrong language paths (drivingteam.ch is only german)
]

// Skip file extensions that should never be tracked
const SKIP_EXTENSIONS = ['.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb', '.sh', '.env', '.git', '.sql', '.bak', '.log', '.conf', '.cfg']

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

async function trackView(event: H3Event, data: {
  page: string
  referrer: string
  ua: string
  country: string
  sessionId: string
}) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  if (!supabaseUrl || !supabaseServiceKey) return

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  await supabase.rpc('increment_page_view', {
    p_page: data.page,
    p_date: new Date().toISOString().split('T')[0],
    p_referrer_type: getReferrerType(data.referrer),
    p_device_type: getDeviceType(data.ua),
    p_country: data.country || 'unknown',
    p_session_id: data.sessionId,
  })
}

export default defineEventHandler(async (event) => {
  // Only skip on local development (allow production & preview)
  if (!process.env.VERCEL_ENV) return { ok: false, reason: 'local dev' }

  const body = await readBody(event).catch(() => null)
  if (!body?.page) return { ok: false }

  // Skip unwanted paths
  if (SKIP_PATHS_CLIENT.some(path => body.page.startsWith(path))) {
    return { ok: false, reason: 'skipped path' }
  }
  
  // Skip file extensions (bot scanners)
  if (SKIP_EXTENSIONS.some(ext => body.page.includes(ext))) {
    return { ok: false, reason: 'skipped extension' }
  }

  const ua = getHeader(event, 'user-agent') || ''
  const country = getHeader(event, 'x-vercel-ip-country') || 'unknown'

  // Skip bots
  if (!ua || BOT_PATTERNS.test(ua)) return { ok: false, reason: 'bot' }

  // Fire and forget - never delays response, but log errors
  trackView(event, {
    page: body.page,
    referrer: body.referrer || '',
    ua,
    country,
    sessionId: body.sessionId || 'unknown',
  }).catch((err) => console.error('[analytics/track] Supabase error:', err))

  return { ok: true }
})
