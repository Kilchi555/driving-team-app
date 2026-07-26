/**
 * Diagnostic script: GBP E2E readiness for Driving Team tenant.
 * Usage: npx tsx server/scripts/gbp-e2e-check.ts
 *
 * Does NOT publish anything — only checks connection, refresh, accounts/locations.
 */
import { createClient } from '@supabase/supabase-js'

const TENANT_ID = process.env.GBP_E2E_TENANT_ID || '64259d68-195a-4c68-8875-f1b44d962830'

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const report: Record<string, unknown> = { tenantId: TENANT_ID }

  const { data: conn } = await supabase
    .from('tenant_google_connections')
    .select('google_account_email, token_expires_at, refresh_token, access_token')
    .eq('tenant_id', TENANT_ID)
    .maybeSingle()

  report.connected = !!conn
  report.email = conn?.google_account_email ?? null
  report.accessExpired = conn ? new Date(conn.token_expires_at).getTime() < Date.now() : null
  report.hasRefreshToken = !!(conn?.refresh_token && conn.refresh_token.length > 10)

  const { count: locCount } = await supabase
    .from('gbp_locations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
  report.activeLocations = locCount ?? 0

  const { count: mediaCount } = await supabase
    .from('gbp_media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
  report.mediaAssets = mediaCount ?? 0

  const { data: settings } = await supabase
    .from('gbp_automation_settings')
    .select('review_reply_mode, posts_per_week, photo_mode')
    .eq('tenant_id', TENANT_ID)
    .is('location_id', null)
    .maybeSingle()
  report.settings = settings

  // Try token refresh if possible
  if (conn?.refresh_token && process.env.GOOGLE_GBP_CLIENT_ID && process.env.GOOGLE_GBP_CLIENT_SECRET) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID,
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const tokens = await tokenRes.json() as { access_token?: string; error?: string }
    report.refreshOk = !!tokens.access_token
    report.refreshError = tokens.error || null

    if (tokens.access_token) {
      const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const accounts = await accountsRes.json() as { accounts?: any[]; error?: any }
      report.accountsCount = accounts.accounts?.length ?? 0
      report.accountsError = accounts.error?.message || null

      if (accounts.accounts?.[0]?.name) {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accounts.accounts[0].name}/locations?readMask=name,title`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        )
        const locs = await locRes.json() as { locations?: any[]; error?: any }
        report.googleLocations = (locs.locations ?? []).map((l: any) => ({ name: l.name, title: l.title }))
        report.googleLocationsError = locs.error?.message || null
      }
    }
  } else {
    report.refreshSkipped = 'Missing refresh token or GOOGLE_GBP_* env'
  }

  console.log(JSON.stringify(report, null, 2))

  const blockers: string[] = []
  if (!conn) blockers.push('No Google connection')
  if (!report.hasRefreshToken) blockers.push('No refresh token — reconnect with consent')
  if (report.refreshOk === false) blockers.push(`Refresh failed: ${report.refreshError}`)
  if ((report.activeLocations as number) < 1) blockers.push('No linked gbp_locations — pick locations in UI')
  if (blockers.length) {
    console.log('\nBLOCKERS:')
    blockers.forEach(b => console.log(' -', b))
    process.exit(2)
  }
  console.log('\nREADY for E2E publish tests')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
