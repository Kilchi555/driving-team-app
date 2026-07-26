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
  /** @deprecated Prefer gbp_locations — kept for legacy fallback */
  gbp_location_id: string | null
  gbp_location_name: string | null
  gbp_account_name: string | null
}

export interface GbpLocationRow {
  id: string
  tenant_id: string
  connection_id: string
  gbp_account_name: string
  gbp_location_id: string
  title: string | null
  is_active: boolean
}

export type ReviewReplyMode = 'off' | 'suggest' | 'auto_ge_4' | 'auto_all'
export type PhotoMode = 'off' | 'approved_only' | 'pool_auto'

export interface GbpAutomationSettings {
  review_reply_mode: ReviewReplyMode
  posts_per_week: number
  photo_mode: PhotoMode
  brand_voice: string | null
  keywords: string[]
  default_cta_type: string | null
  default_cta_url: string | null
  timezone: string
}

export const GBP_AUTOMATION_DEFAULTS: GbpAutomationSettings = {
  review_reply_mode: 'suggest',
  posts_per_week: 2,
  photo_mode: 'off',
  brand_voice: null,
  keywords: [],
  default_cta_type: 'BOOK',
  default_cta_url: null,
  timezone: 'Europe/Zurich',
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

  if (!conn.refresh_token) {
    throw new Error('GBP refresh token missing — reconnect Google Business Profile')
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
 * Tries the newer account management API first, falls back to the older v4 API.
 */
export async function listGbpAccounts(accessToken: string) {
  const newRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const newData = await newRes.json()
  if (newData.accounts) return newData

  const oldRes = await fetch(`${GBP_REVIEWS_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return oldRes.json()
}

/**
 * List locations for a GBP account.
 * Tries new businessinformation API first, falls back to v4.
 */
export async function listGbpLocations(accessToken: string, accountName: string) {
  const newRes = await fetch(
    `${GBP_API_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const newData = await newRes.json()
  if (newData.locations) return newData

  const oldRes = await fetch(
    `${GBP_REVIEWS_BASE}/${accountName}/locations?pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return oldRes.json()
}

export async function listTenantGbpLocations(tenantId: string): Promise<GbpLocationRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('gbp_locations')
    .select('id, tenant_id, connection_id, gbp_account_name, gbp_location_id, title, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('title', { ascending: true })

  if (error) throw new Error(`Failed to list GBP locations: ${error.message}`)
  return data ?? []
}

/**
 * Resolve a tenant location. If locationId omitted, uses the first active location,
 * then falls back to legacy columns on tenant_google_connections.
 */
export async function resolveGbpLocation(
  tenantId: string,
  locationId?: string | null
): Promise<GbpLocationRow> {
  const supabase = getSupabaseAdmin()

  if (locationId) {
    const { data, error } = await supabase
      .from('gbp_locations')
      .select('id, tenant_id, connection_id, gbp_account_name, gbp_location_id, title, is_active')
      .eq('tenant_id', tenantId)
      .eq('id', locationId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(`Failed to load GBP location: ${error.message}`)
    if (!data) throw new Error('GBP location not found')
    return data
  }

  const locations = await listTenantGbpLocations(tenantId)
  if (locations.length > 0) return locations[0]

  // Legacy fallback: connection still has location fields (pre-migration / not yet linked into gbp_locations)
  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('id, gbp_account_name, gbp_location_id, gbp_location_name')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (conn?.gbp_location_id && conn?.gbp_account_name) {
    return {
      id: conn.id,
      tenant_id: tenantId,
      connection_id: conn.id,
      gbp_account_name: conn.gbp_account_name,
      gbp_location_id: conn.gbp_location_id,
      title: conn.gbp_location_name,
      is_active: true,
    }
  }

  throw new Error('No GBP location linked')
}

export async function ensureTenantGbpDefaults(tenantId: string) {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('gbp_automation_settings')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('location_id', null)
    .maybeSingle()

  if (existing) return

  await supabase.from('gbp_automation_settings').insert({
    tenant_id: tenantId,
    location_id: null,
    review_reply_mode: GBP_AUTOMATION_DEFAULTS.review_reply_mode,
    posts_per_week: GBP_AUTOMATION_DEFAULTS.posts_per_week,
    photo_mode: GBP_AUTOMATION_DEFAULTS.photo_mode,
    default_cta_type: GBP_AUTOMATION_DEFAULTS.default_cta_type,
    timezone: GBP_AUTOMATION_DEFAULTS.timezone,
    keywords: [],
  })
}

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Merge tenant defaults with optional location overrides.
 */
export async function getGbpAutomationSettings(
  tenantId: string,
  locationId?: string | null
): Promise<GbpAutomationSettings> {
  await ensureTenantGbpDefaults(tenantId)
  const supabase = getSupabaseAdmin()

  const { data: defaults } = await supabase
    .from('gbp_automation_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('location_id', null)
    .maybeSingle()

  let override: Record<string, unknown> | null = null
  if (locationId) {
    const { data } = await supabase
      .from('gbp_automation_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .maybeSingle()
    override = data
  }

  const base = defaults ?? {}
  const merged = { ...base, ...(override ?? {}) }

  return {
    review_reply_mode: (merged.review_reply_mode as ReviewReplyMode) || GBP_AUTOMATION_DEFAULTS.review_reply_mode,
    posts_per_week: Number(merged.posts_per_week ?? GBP_AUTOMATION_DEFAULTS.posts_per_week),
    photo_mode: (merged.photo_mode as PhotoMode) || GBP_AUTOMATION_DEFAULTS.photo_mode,
    brand_voice: (merged.brand_voice as string | null) ?? null,
    keywords: parseKeywords(merged.keywords),
    default_cta_type: (merged.default_cta_type as string | null) ?? GBP_AUTOMATION_DEFAULTS.default_cta_type,
    default_cta_url: (merged.default_cta_url as string | null) ?? null,
    timezone: (merged.timezone as string) || GBP_AUTOMATION_DEFAULTS.timezone,
  }
}

async function withLocation(
  tenantId: string,
  locationId: string | null | undefined,
  fn: (accessToken: string, loc: GbpLocationRow) => Promise<any>
) {
  const accessToken = await getValidAccessToken(tenantId)
  const loc = await resolveGbpLocation(tenantId, locationId)
  return fn(accessToken, loc)
}

/**
 * Fetch GBP performance insights (views, clicks, calls).
 */
export async function getGbpInsights(tenantId: string, locationId?: string | null) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
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
      `${GBP_PERFORMANCE_BASE}/${loc.gbp_location_id}:fetchMultiDailyMetricsTimeSeries?dailyMetric=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetric=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetric=CALL_CLICKS&dailyMetric=WEBSITE_CLICKS&dailyMetric=BUSINESS_DIRECTION_REQUESTS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    return res.json()
  })
}

/**
 * Fetch GBP reviews (most recent 20, for UI use).
 */
export async function getGbpReviews(tenantId: string, locationId?: string | null) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/reviews?pageSize=20&orderBy=updateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    return res.json()
  })
}

export interface GbpReview {
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: 'FIVE' | 'FOUR' | 'THREE' | 'TWO' | 'ONE'
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: { comment: string; updateTime: string }
}

export interface GbpReviewsPage {
  reviews: GbpReview[]
  averageRating: number
  totalReviewCount: number
  nextPageToken?: string
}

/**
 * Fetch ALL GBP reviews with pagination.
 */
export async function getAllGbpReviews(
  tenantId: string,
  maxPages = 20,
  connection?: { gbp_location_id: string; gbp_account_name: string },
  locationId?: string | null
): Promise<GbpReview[]> {
  const accessToken = await getValidAccessToken(tenantId)

  let conn = connection
  if (!conn) {
    const loc = await resolveGbpLocation(tenantId, locationId)
    conn = { gbp_location_id: loc.gbp_location_id, gbp_account_name: loc.gbp_account_name }
  }

  const base = `${GBP_REVIEWS_BASE}/${conn.gbp_account_name}/${conn.gbp_location_id}/reviews`
  const allReviews: GbpReview[] = []
  let pageToken: string | undefined
  let page = 0

  do {
    const url = new URL(base)
    url.searchParams.set('pageSize', '50')
    url.searchParams.set('orderBy', 'updateTime desc')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    const data = await res.json() as GbpReviewsPage

    if (data.reviews?.length) allReviews.push(...data.reviews)
    pageToken = data.nextPageToken
    page++
  } while (pageToken && page < maxPages)

  return allReviews
}

/**
 * List GBP local posts.
 */
export async function listGbpPosts(tenantId: string, locationId?: string | null) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/localPosts?pageSize=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    return res.json()
  })
}

/**
 * Create a GBP local post (supports optional media + language).
 */
export async function createGbpPost(tenantId: string, post: {
  summary: string
  callToActionType?: 'LEARN_MORE' | 'SIGN_UP' | 'BOOK' | 'ORDER' | 'SHOP' | 'CALL'
  callToActionUrl?: string
  topicType?: 'STANDARD' | 'EVENT' | 'OFFER'
  languageCode?: string
  mediaUrls?: string[]
}, locationId?: string | null) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const body: Record<string, unknown> = {
      languageCode: post.languageCode ?? 'de',
      summary: post.summary,
      topicType: post.topicType ?? 'STANDARD',
    }

    if (post.callToActionType && post.callToActionUrl) {
      body.callToAction = { actionType: post.callToActionType, url: post.callToActionUrl }
    }

    const mediaUrls = (post.mediaUrls ?? []).filter(Boolean)
    if (mediaUrls.length > 0) {
      body.media = mediaUrls.map((sourceUrl) => ({
        mediaFormat: 'PHOTO',
        sourceUrl,
      }))
    }

    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/localPosts`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    return res.json()
  })
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
export async function uploadGbpPhoto(
  tenantId: string,
  photoUrl: string,
  category: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER' = 'INTERIOR',
  locationId?: string | null
) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/media`,
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
  })
}

/**
 * Reply to a GBP review.
 */
export async function replyToGbpReview(
  tenantId: string,
  reviewId: string,
  comment: string,
  locationId?: string | null
) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/reviews/${reviewId}/reply`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      }
    )
    return res.json()
  })
}

/**
 * Link a real GBP location (from Google APIs) to the tenant.
 * Validates resource names look legitimate (no Place-ID hack).
 */
export async function linkGbpLocation(
  tenantId: string,
  input: { gbpAccountName: string; gbpLocationId: string; title?: string | null }
): Promise<GbpLocationRow> {
  const accountName = input.gbpAccountName.trim()
  const locationResource = input.gbpLocationId.trim()

  if (!accountName.startsWith('accounts/')) {
    throw new Error('Invalid GBP account name — expected accounts/…')
  }
  // Location resource may be "locations/123" or "accounts/x/locations/123"
  if (!locationResource.includes('locations/')) {
    throw new Error('Invalid GBP location id — expected …/locations/…')
  }
  // Reject Place IDs (typically start with ChIJ)
  const bareId = locationResource.split('/').pop() || ''
  if (bareId.startsWith('ChIJ')) {
    throw new Error('Place IDs are not GBP location resource names')
  }

  const supabase = getSupabaseAdmin()
  const { data: conn, error: connError } = await supabase
    .from('tenant_google_connections')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (connError || !conn) throw new Error('GBP not connected for this tenant')

  // Normalize to locations/ID form for storage (v4 APIs often want accounts/X/locations/Y path built from both fields)
  const locationIdOnly = locationResource.includes('/')
    ? (locationResource.match(/locations\/[^/]+$/)?.[0] ?? locationResource)
    : `locations/${locationResource}`

  const { data: loc, error } = await supabase
    .from('gbp_locations')
    .upsert(
      {
        tenant_id: tenantId,
        connection_id: conn.id,
        gbp_account_name: accountName,
        gbp_location_id: locationIdOnly,
        title: input.title ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,gbp_location_id' }
    )
    .select('id, tenant_id, connection_id, gbp_account_name, gbp_location_id, title, is_active')
    .single()

  if (error || !loc) throw new Error(`Failed to link location: ${error?.message}`)

  // Keep legacy columns in sync with "primary" (first/latest linked) for older code paths
  await supabase
    .from('tenant_google_connections')
    .update({
      gbp_account_name: accountName,
      gbp_location_id: locationIdOnly,
      gbp_location_name: input.title ?? null,
    })
    .eq('tenant_id', tenantId)

  await ensureTenantGbpDefaults(tenantId)
  return loc
}
