import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { listGbpAccounts, listGbpLocations } from '~/server/utils/gbp'
import { getAppUrl } from '~/server/utils/app-url'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

/**
 * GET /api/gbp/auth/callback
 * Handles the OAuth callback from Google.
 * Exchanges the code for tokens, fetches GBP account info, stores in DB.
 */
export default defineEventHandler(async (event) => {
  const appUrl = getAppUrl()
  const { code, state, error } = getQuery(event) as Record<string, string>

  if (error || !code || !state) {
    console.error('[GBP callback] Missing params:', { error, hasCode: !!code, hasState: !!state })
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=${error || 'missing_params'}`)
  }

  let tenantId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as { tenant_id: string }
    tenantId = decoded.tenant_id
    if (!tenantId) throw new Error('No tenant_id in state')
  } catch (e) {
    console.error('[GBP callback] State decode failed:', e)
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=invalid_state`)
  }

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_GBP_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    console.error('[GBP callback] Missing env vars: GOOGLE_GBP_CLIENT_ID or GOOGLE_GBP_CLIENT_SECRET')
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=server_config`)
  }

  const redirectUri = `${appUrl}/api/gbp/auth/callback`

  // Exchange code for tokens
  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string }
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    tokens = await tokenRes.json()
    console.log('[GBP callback] Token exchange result:', { ok: tokenRes.ok, has_access: !!tokens.access_token, has_refresh: !!tokens.refresh_token, error: tokens.error })
  } catch (e) {
    console.error('[GBP callback] Token exchange fetch failed:', e)
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=token_fetch_failed`)
  }

  if (!tokens.access_token) {
    console.error('[GBP callback] No access token:', tokens.error, tokens.error_description)
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=${tokens.error || 'no_access_token'}`)
  }

  // refresh_token is only returned on first authorization – store null if missing (will be updated on re-auth)
  if (!tokens.refresh_token) {
    console.warn('[GBP callback] No refresh_token returned (user may have authorized before). Proceeding without it.')
  }

  // Fetch Google user info
  let userInfo: { sub?: string; email?: string } = {}
  try {
    const userRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } })
    userInfo = await userRes.json()
  } catch (e) {
    console.warn('[GBP callback] Userinfo fetch failed (non-fatal):', e)
  }

  // Fetch GBP accounts to auto-link the first location
  let gbpLocationId: string | null = null
  let gbpLocationName: string | null = null
  let gbpAccountName: string | null = null

  try {
    const accounts = await listGbpAccounts(tokens.access_token)
    console.log('[GBP callback] Accounts found:', accounts.accounts?.length ?? 0)
    if (accounts.accounts?.length > 0) {
      gbpAccountName = accounts.accounts[0].name
      const locations = await listGbpLocations(tokens.access_token, gbpAccountName!)
      console.log('[GBP callback] Locations found:', locations.locations?.length ?? 0)
      if (locations.locations?.length > 0) {
        gbpLocationId = locations.locations[0].name
        gbpLocationName = locations.locations[0].title
      }
    }
  } catch (e) {
    console.warn('[GBP callback] GBP account/location fetch failed (non-fatal):', e)
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  // Build upsert payload — only include refresh_token if we got a new one
  const upsertData: Record<string, unknown> = {
    tenant_id: tenantId,
    google_account_id: userInfo.sub ?? 'unknown',
    google_account_email: userInfo.email ?? null,
    access_token: tokens.access_token,
    token_expires_at: expiresAt,
    gbp_location_id: gbpLocationId,
    gbp_location_name: gbpLocationName,
    gbp_account_name: gbpAccountName,
    connected_at: new Date().toISOString(),
  }
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token
  }

  try {
    const { error: dbError } = await getSupabaseAdmin()
      .from('tenant_google_connections')
      .upsert(upsertData, { onConflict: 'tenant_id' })

    if (dbError) {
      console.error('[GBP callback] DB upsert failed:', dbError)
      return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=db_error`)
    }
  } catch (e) {
    console.error('[GBP callback] DB upsert threw:', e)
    return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=error&reason=db_error`)
  }

  console.log('[GBP callback] Successfully connected GBP for tenant:', tenantId)
  return sendRedirect(event, `${appUrl}/admin/google-business-profile?gbp=connected`)
})
