import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const GBP_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GBP_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const GBP_PERFORMANCE_BASE = 'https://businessprofileperformance.googleapis.com/v1'
const GBP_REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4'

export interface GbpConnection {
  id: string
  tenant_id: string
  google_account_id: string
  google_account_email: string | null
  access_token: string
  refresh_token: string
  token_expires_at: string
  gbp_location_id: string | null
  gbp_location_name: string | null
  gbp_account_name: string | null
}

/**
 * Get a valid access token for a tenant, refreshing if expired.
 */
export async function getValidAccessToken(tenantId: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data: conn, error } = await supabase
    .from('tenant_google_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !conn) throw new Error('GBP not connected for this tenant')

  const expiresAt = new Date(conn.token_expires_at).getTime()
  const now = Date.now()

  if (now < expiresAt - 60_000) {
    return conn.access_token
  }

  return await refreshAccessToken(tenantId, conn.refresh_token)
}

async function refreshAccessToken(tenantId: string, refreshToken: string): Promise<string> {
  const res = await fetch(GBP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_GBP_CLIENT_ID!,
      client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json() as { access_token?: string; expires_in?: number; error?: string }
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error}`)

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()

  await getSupabaseAdmin()
    .from('tenant_google_connections')
    .update({ access_token: data.access_token, token_expires_at: expiresAt })
    .eq('tenant_id', tenantId)

  return data.access_token
}

/**
 * List all GBP accounts for a given access token.
 */
export async function listGbpAccounts(accessToken: string) {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

/**
 * List locations for a GBP account.
 */
export async function listGbpLocations(accessToken: string, accountName: string) {
  const res = await fetch(
    `${GBP_API_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

/**
 * Fetch GBP performance insights (views, clicks, calls).
 */
export async function getGbpInsights(tenantId: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const body = {
    dailyRange: {
      startDate: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
      endDate: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() },
    },
  }

  const res = await fetch(
    `${GBP_PERFORMANCE_BASE}/${conn.gbp_location_id}:fetchMultiDailyMetricsTimeSeries?dailyMetric=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetric=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetric=CALL_CLICKS&dailyMetric=WEBSITE_CLICKS&dailyMetric=BUSINESS_DIRECTION_REQUESTS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return res.json()
}

/**
 * Fetch GBP reviews.
 */
export async function getGbpReviews(tenantId: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id, gbp_account_name')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/reviews?pageSize=20&orderBy=updateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

/**
 * List GBP local posts.
 */
export async function listGbpPosts(tenantId: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id, gbp_account_name')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/localPosts?pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

/**
 * Create a GBP local post.
 */
export async function createGbpPost(tenantId: string, post: {
  summary: string
  callToActionType?: 'LEARN_MORE' | 'SIGN_UP' | 'BOOK' | 'ORDER' | 'SHOP' | 'CALL'
  callToActionUrl?: string
  topicType?: 'STANDARD' | 'EVENT' | 'OFFER'
}) {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id, gbp_account_name')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const body: Record<string, unknown> = {
    languageCode: 'de',
    summary: post.summary,
    topicType: post.topicType ?? 'STANDARD',
  }

  if (post.callToActionType && post.callToActionUrl) {
    body.callToAction = { actionType: post.callToActionType, url: post.callToActionUrl }
  }

  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/localPosts`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return res.json()
}

/**
 * Delete a GBP local post.
 */
export async function deleteGbpPost(tenantId: string, postName: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${postName}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.ok ? { success: true } : res.json()
}

/**
 * Upload a photo to GBP (media).
 * photoUrl must be a publicly accessible URL.
 */
export async function uploadGbpPhoto(tenantId: string, photoUrl: string, category: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER' = 'INTERIOR') {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id, gbp_account_name')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaFormat: 'PHOTO',
        locationAssociation: { category },
        sourceUrl: photoUrl,
      }),
    }
  )
  return res.json()
}

/**
 * Reply to a GBP review.
 */
export async function replyToGbpReview(tenantId: string, reviewId: string, comment: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('gbp_location_id, gbp_account_name')
    .eq('tenant_id', tenantId)
    .single()

  if (!conn?.gbp_location_id) throw new Error('No GBP location linked')

  const res = await fetch(
    `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/reviews/${reviewId}/reply`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    }
  )
  return res.json()
}
