import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
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
  const { code, state, error } = getQuery(event) as Record<string, string>

  const appUrl = getAppUrl()

  if (error || !code || !state) {
    return sendRedirect(event, `${appUrl}/settings/integrations?gbp=error&reason=${error || 'missing_params'}`)
  }

  let tenantId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as { tenant_id: string }
    tenantId = decoded.tenant_id
  } catch {
    return sendRedirect(event, `${appUrl}/settings/integrations?gbp=error&reason=invalid_state`)
  }

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_GBP_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/gbp/auth/callback`

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })

  const tokens = await tokenRes.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return sendRedirect(event, `${appUrl}/settings/integrations?gbp=error&reason=token_exchange_failed`)
  }

  // Fetch Google user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userRes.json() as { sub?: string; email?: string }

  // Fetch GBP accounts to auto-link the first location
  let gbpLocationId: string | null = null
  let gbpLocationName: string | null = null
  let gbpAccountName: string | null = null

  try {
    const accounts = await listGbpAccounts(tokens.access_token)
    if (accounts.accounts?.length > 0) {
      gbpAccountName = accounts.accounts[0].name
      const locations = await listGbpLocations(tokens.access_token, gbpAccountName!)
      if (locations.locations?.length > 0) {
        gbpLocationId = locations.locations[0].name
        gbpLocationName = locations.locations[0].title
      }
    }
  } catch {
    // Non-fatal: user can link location manually later
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  await getSupabaseAdmin()
    .from('tenant_google_connections')
    .upsert({
      tenant_id: tenantId,
      google_account_id: userInfo.sub ?? 'unknown',
      google_account_email: userInfo.email ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      gbp_location_id: gbpLocationId,
      gbp_location_name: gbpLocationName,
      gbp_account_name: gbpAccountName,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  return sendRedirect(event, `${appUrl}/settings/integrations?gbp=connected`)
})
