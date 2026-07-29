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
 * Performance API: GET …/locations/{id}:fetchMultiDailyMetricsTimeSeries (empty body).
 * @see https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries
 */
export async function getGbpInsights(tenantId: string, locationId?: string | null) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 28)

    const metrics = [
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
      'BUSINESS_DIRECTION_REQUESTS',
    ]
    const params = new URLSearchParams()
    for (const m of metrics) params.append('dailyMetrics', m)
    params.set('dailyRange.start_date.year', String(startDate.getFullYear()))
    params.set('dailyRange.start_date.month', String(startDate.getMonth() + 1))
    params.set('dailyRange.start_date.day', String(startDate.getDate()))
    params.set('dailyRange.end_date.year', String(endDate.getFullYear()))
    params.set('dailyRange.end_date.month', String(endDate.getMonth() + 1))
    params.set('dailyRange.end_date.day', String(endDate.getDate()))

    const res = await fetch(
      `${GBP_PERFORMANCE_BASE}/${loc.gbp_location_id}:fetchMultiDailyMetricsTimeSeries?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const text = await res.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(`GBP Insights API returned non-JSON (${res.status})`)
    }
    if (!res.ok) {
      throw new Error(data?.error?.message || `GBP Insights API error ${res.status}`)
    }
    return data
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
  locationId?: string | null,
  description?: string | null
) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const payload: Record<string, unknown> = {
      mediaFormat: 'PHOTO',
      locationAssociation: { category },
      sourceUrl: photoUrl,
    }
    if (description?.trim() && category !== 'COVER') {
      payload.description = description.trim()
    }
    const res = await fetch(
      `${GBP_REVIEWS_BASE}/${loc.gbp_account_name}/${loc.gbp_location_id}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

export interface GbpBusinessHoursPeriod {
  openDay: string
  openTime: string
  closeDay: string
  closeTime: string
}

export interface GbpLocationProfile {
  name: string
  title: string | null
  phoneNumber: string | null
  websiteUri: string | null
  description: string | null
  regularHours: GbpBusinessHoursPeriod[]
  primaryCategory: { categoryId: string; displayName: string } | null
  additionalCategories: { categoryId: string; displayName: string }[]
}

const PROFILE_READ_MASK = 'title,phoneNumbers,websiteUri,regularHours,categories,profile'

/** Google represents hours as a structured TimeOfDay ({hours, minutes}), not "HH:MM" strings. */
function timeOfDayToString(t: { hours?: number; minutes?: number } | null | undefined): string {
  if (!t) return ''
  const h = String(t.hours ?? 0).padStart(2, '0')
  const m = String(t.minutes ?? 0).padStart(2, '0')
  return `${h}:${m}`
}

function stringToTimeOfDay(s: string): { hours: number; minutes: number } {
  const [h, m] = (s || '00:00').split(':').map((n) => parseInt(n, 10) || 0)
  return { hours: h, minutes: m }
}

/**
 * Fetch a location's editable profile fields (description, hours, categories, contact).
 */
export async function getGbpLocationProfile(
  tenantId: string,
  locationId?: string | null
): Promise<GbpLocationProfile> {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_API_BASE}/${loc.gbp_location_id}?readMask=${PROFILE_READ_MASK}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `GBP profile fetch failed (${res.status})`)

    return {
      name: data.name,
      title: data.title ?? null,
      phoneNumber: data.phoneNumbers?.primaryPhone ?? null,
      websiteUri: data.websiteUri ?? null,
      description: data.profile?.description ?? null,
      regularHours: (data.regularHours?.periods ?? []).map((p: any) => ({
        openDay: p.openDay,
        openTime: timeOfDayToString(p.openTime),
        closeDay: p.closeDay,
        closeTime: timeOfDayToString(p.closeTime),
      })),
      primaryCategory: data.categories?.primaryCategory
        ? { categoryId: data.categories.primaryCategory.categoryId ?? data.categories.primaryCategory.name, displayName: data.categories.primaryCategory.displayName }
        : null,
      additionalCategories: (data.categories?.additionalCategories ?? []).map((c: any) => ({
        categoryId: c.categoryId ?? c.name,
        displayName: c.displayName,
      })),
    }
  })
}

export interface GbpLocationProfileUpdate {
  description?: string | null
  phoneNumber?: string | null
  websiteUri?: string | null
  regularHours?: GbpBusinessHoursPeriod[]
  primaryCategoryId?: string
  additionalCategoryIds?: string[]
}

/**
 * Patch editable profile fields. Only fields present in `updates` are sent.
 * Categories are all-or-nothing: passing either requires both to be resolved.
 */
export async function updateGbpLocationProfile(
  tenantId: string,
  updates: GbpLocationProfileUpdate,
  locationId?: string | null
) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const body: Record<string, unknown> = {}
    const maskFields: string[] = []

    if (updates.description !== undefined) {
      body.profile = { description: updates.description ?? '' }
      maskFields.push('profile')
    }
    if (updates.phoneNumber !== undefined) {
      body.phoneNumbers = { primaryPhone: updates.phoneNumber ?? '' }
      maskFields.push('phoneNumbers')
    }
    if (updates.websiteUri !== undefined) {
      body.websiteUri = updates.websiteUri ?? ''
      maskFields.push('websiteUri')
    }
    if (updates.regularHours !== undefined) {
      body.regularHours = {
        periods: updates.regularHours.map((p) => ({
          openDay: p.openDay,
          openTime: stringToTimeOfDay(p.openTime),
          closeDay: p.closeDay,
          closeTime: stringToTimeOfDay(p.closeTime),
        })),
      }
      maskFields.push('regularHours')
    }
    if (updates.primaryCategoryId) {
      // Google's Category resource uses "name" (e.g. "categories/gcid:driving_school"), not "categoryId".
      body.categories = {
        primaryCategory: { name: updates.primaryCategoryId },
        additionalCategories: (updates.additionalCategoryIds ?? []).map((name) => ({ name })),
      }
      maskFields.push('categories')
    }

    if (maskFields.length === 0) return { success: true, unchanged: true }

    const res = await fetch(
      `${GBP_API_BASE}/${loc.gbp_location_id}?updateMask=${maskFields.join(',')}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `GBP profile update failed (${res.status})`)
    return data
  })
}

/**
 * Search Google's canonical business categories (for primary/additional category pickers).
 */
export async function searchGbpCategories(tenantId: string, query: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const params = new URLSearchParams({
    regionCode: 'CH',
    languageCode: 'de',
    view: 'BASIC',
    pageSize: '20',
  })
  if (query.trim()) params.set('filter', `displayName=${query.trim()}`)

  const res = await fetch(`${GBP_API_BASE}/categories?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `GBP category search failed (${res.status})`)
  return (data.categories ?? []).map((c: any) => ({ categoryId: c.categoryId ?? c.name, displayName: c.displayName }))
}

export interface GbpServiceItem {
  isOffered: boolean
  name: string
  description?: string | null
  priceAmount?: number | null
  priceCurrency?: string | null
}

/**
 * Fetch free-form service items configured for a location, plus its primary category
 * (required to write new free-form services back to Google).
 */
export async function getGbpServices(tenantId: string, locationId?: string | null): Promise<{
  services: GbpServiceItem[]
  primaryCategoryId: string | null
}> {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const res = await fetch(
      `${GBP_API_BASE}/${loc.gbp_location_id}?readMask=serviceItems,categories`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `GBP services fetch failed (${res.status})`)

    const services: GbpServiceItem[] = (data.serviceItems ?? [])
      .filter((s: any) => s.freeFormServiceItem)
      .map((s: any) => ({
        isOffered: s.isOffered !== false,
        name: s.freeFormServiceItem?.label?.displayName ?? '',
        description: s.freeFormServiceItem?.label?.description ?? null,
        priceAmount: s.price?.units != null ? Number(s.price.units) : null,
        priceCurrency: s.price?.currencyCode ?? null,
      }))

    return {
      services,
      primaryCategoryId: data.categories?.primaryCategory?.categoryId ?? data.categories?.primaryCategory?.name ?? null,
    }
  })
}

/**
 * Overwrite the full free-form service list for a location.
 * Google does not support updating individual services — the whole array is replaced.
 */
export async function updateGbpServices(
  tenantId: string,
  services: GbpServiceItem[],
  locationId?: string | null
) {
  return withLocation(tenantId, locationId, async (accessToken, loc) => {
    const categoryRes = await fetch(
      `${GBP_API_BASE}/${loc.gbp_location_id}?readMask=categories`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const categoryData = await categoryRes.json()
    const categoryId = categoryData.categories?.primaryCategory?.categoryId ?? categoryData.categories?.primaryCategory?.name
    if (!categoryId) throw new Error('Keine Hauptkategorie gesetzt — bitte zuerst unter Profil festlegen')

    const serviceItems = services.map((s) => {
      const item: Record<string, unknown> = {
        isOffered: s.isOffered,
        freeFormServiceItem: {
          category: categoryId,
          label: {
            displayName: s.name,
            ...(s.description ? { description: s.description } : {}),
            languageCode: 'de',
          },
        },
      }
      if (s.priceAmount != null && s.priceCurrency) {
        item.price = { currencyCode: s.priceCurrency, units: String(Math.round(s.priceAmount)) }
      }
      return item
    })

    const res = await fetch(
      `${GBP_API_BASE}/${loc.gbp_location_id}?updateMask=serviceItems`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceItems }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `GBP services update failed (${res.status})`)
    return data
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
