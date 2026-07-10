/**
 * Google Ads auth + credential resolver — Multi-Tenant aware
 *
 * Supports two auth modes:
 *
 * 1. CRON_SECRET (Authorization: Bearer $CRON_SECRET)
 *    → Uses GOOGLE_ADS_CUSTOMER_ID from env vars (Driving Team account)
 *    → Backward-compatible with all existing curl scripts
 *
 * 2. Admin session (Supabase cookie, same as all other admin endpoints)
 *    → Reads google_ads_customer_id from the authenticated tenant's row
 *    → Uses shared MCC OAuth credentials from env vars (GOOGLE_ADS_LOGIN_CUSTOMER_ID = MCC ID)
 *    → Returns { ok: false, reason: 'not_connected' } if tenant has no customer ID
 *
 * MCC setup required for session mode:
 *   - Set GOOGLE_ADS_LOGIN_CUSTOMER_ID = your MCC manager account ID
 *   - Each tenant's Google Ads account must be linked under that MCC
 *   - Enter the tenant's customer ID in Settings → Google Ads
 */

import { getHeader, createError } from 'h3'
import type { H3Event } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export interface GadsCredentials {
  customerId: string         // The tenant's Google Ads customer ID (dashes stripped)
  loginCustomerId: string    // MCC manager account ID (for login-customer-id header)
  developerToken: string
  clientId: string
  clientSecret: string
  refreshToken: string
  /** True when the env-var credentials are used (CRON_SECRET auth) */
  isCron: boolean
}

export type GadsAuthResult =
  | { ok: true } & GadsCredentials
  | { ok: false; reason: 'unauthorized' | 'missing_credentials' | 'not_connected'; message: string }

/**
 * Resolves Google Ads credentials for the current request.
 * Call this at the top of every gads-* endpoint instead of manual auth checks.
 *
 * @example
 * const gads = await resolveGadsAuth(event)
 * if (!gads.ok) return gads   // { ok: false, reason, message }
 *
 * // Use gads.customerId, gads.loginCustomerId, etc.
 */
export async function resolveGadsAuth(event: H3Event): Promise<GadsAuthResult> {
  // ── Shared OAuth credentials (from env vars, same for all tenants via MCC) ──
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? ''
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID ?? ''
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET ?? ''
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? ''

  if (!developerToken || !clientId || !clientSecret || !refreshToken) {
    return { ok: false, reason: 'missing_credentials', message: 'Google Ads OAuth credentials not configured in env vars.' }
  }

  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization') ?? ''
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  // ── Mode A: CRON_SECRET auth ─────────────────────────────────────────────────
  if (isCron) {
    const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
    const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? customerId).replace(/-/g, '')

    if (!customerId) {
      return { ok: false, reason: 'missing_credentials', message: 'GOOGLE_ADS_CUSTOMER_ID not set.' }
    }

    return { ok: true, isCron: true, customerId, loginCustomerId, developerToken, clientId, clientSecret, refreshToken }
  }

  // ── Mode B: Admin session auth ───────────────────────────────────────────────
  let profile: { tenant_id: string } | null = null
  try {
    profile = await requireAdminProfile(event)
  } catch {
    return { ok: false, reason: 'unauthorized', message: 'Bitte melde dich an.' }
  }

  if (!profile?.tenant_id) {
    return { ok: false, reason: 'unauthorized', message: 'Kein Tenant gefunden.' }
  }

  // Read google_ads_customer_id from tenants table
  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('google_ads_customer_id')
    .eq('id', profile.tenant_id)
    .single()

  const rawCustomerId = tenant?.google_ads_customer_id ?? ''
  if (!rawCustomerId) {
    return {
      ok: false,
      reason: 'not_connected',
      message: 'Google Ads ist noch nicht verbunden. Bitte trage die Customer ID in den Einstellungen ein.',
    }
  }

  const customerId = rawCustomerId.replace(/-/g, '')
  // MCC login customer ID: prefer GOOGLE_ADS_LOGIN_CUSTOMER_ID, else use same account
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? rawCustomerId).replace(/-/g, '')

  return { ok: true, isCron: false, customerId, loginCustomerId, developerToken, clientId, clientSecret, refreshToken }
}

/**
 * Gets an OAuth access token using the credentials from resolveGadsAuth.
 */
export async function getGadsAccessToken(creds: GadsCredentials): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken.trim(),
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as any
  if (!data.access_token) {
    throw createError({ statusCode: 502, statusMessage: `Google OAuth failed: ${JSON.stringify(data)}` })
  }
  return data.access_token
}

/**
 * Returns the standard Google Ads REST headers for a resolved credential set.
 */
export function buildGadsHeaders(creds: GadsCredentials, accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': creds.developerToken,
    'login-customer-id': creds.loginCustomerId,
    'Content-Type': 'application/json',
  }
}

/**
 * Builds a google-ads-api Customer instance using the resolved credentials.
 * Use for endpoints that rely on the google-ads-api library (GAQL queries, mutateResources).
 */
export function buildGadsCustomer(creds: GadsCredentials) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleAdsApi } = require('google-ads-api') as typeof import('google-ads-api')
  const client = new GoogleAdsApi({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    developer_token: creds.developerToken,
  })
  return client.Customer({
    customer_id: creds.customerId,
    refresh_token: creds.refreshToken,
    login_customer_id: creds.loginCustomerId || undefined,
  })
}
