/**
 * One-shot: refresh token + link all Driving Team GBP locations (skip Simy).
 * npx tsx server/scripts/gbp-link-dt-locations.ts
 */
import { createClient } from '@supabase/supabase-js'

const TENANT = process.env.GBP_E2E_TENANT_ID || '64259d68-195a-4c68-8875-f1b44d962830'

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  if (!process.env.GOOGLE_GBP_CLIENT_ID || !process.env.GOOGLE_GBP_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_GBP_* env')
  }

  const supabase = createClient(url, key)
  const { data: conn, error: connErr } = await supabase
    .from('tenant_google_connections')
    .select('*')
    .eq('tenant_id', TENANT)
    .single()
  if (connErr || !conn) throw new Error('No connection')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_GBP_CLIENT_ID!,
      client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const tokens = await tokenRes.json() as { access_token?: string; expires_in?: number; error?: string }
  if (!tokens.access_token) throw new Error(`Refresh failed: ${tokens.error}`)

  await supabase.from('tenant_google_connections').update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  }).eq('tenant_id', TENANT)

  const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const accountsData = await accountsRes.json() as { accounts?: Array<{ name: string }> }

  const linked: Array<{ id: string; title: string | null }> = []
  for (const account of accountsData.accounts ?? []) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    )
    const locs = await locRes.json() as { locations?: Array<{ name: string; title?: string }> }
    for (const loc of locs.locations ?? []) {
      if ((loc.title || '').includes('Simy')) continue
      const locationIdOnly = (loc.name.match(/locations\/[^/]+$/) || [loc.name])[0]
      const { data, error } = await supabase.from('gbp_locations').upsert({
        tenant_id: TENANT,
        connection_id: conn.id,
        gbp_account_name: account.name,
        gbp_location_id: locationIdOnly,
        title: loc.title ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,gbp_location_id' }).select('id, title').single()
      if (error) console.error('link fail', loc.title, error.message)
      else if (data) linked.push(data)
    }
  }

  const zh = linked.find(l => (l.title || '').includes('Zürich')) || linked[0]
  if (zh) {
    const { data: full } = await supabase.from('gbp_locations').select('*').eq('id', zh.id).single()
    if (full) {
      await supabase.from('tenant_google_connections').update({
        gbp_account_name: full.gbp_account_name,
        gbp_location_id: full.gbp_location_id,
        gbp_location_name: full.title,
      }).eq('tenant_id', TENANT)
    }
  }

  console.log(JSON.stringify({ linkedCount: linked.length, titles: linked.map(l => l.title) }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
