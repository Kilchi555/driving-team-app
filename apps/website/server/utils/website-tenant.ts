/**
 * Website Tenant Auto-Discovery
 *
 * Resolves the tenant_id for a website deployment by matching the request
 * hostname against the `domain` column in the tenants table.
 * Result is cached in-process (one DB lookup per cold start).
 */

import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import type { H3Event } from 'h3'
import { getRequestHost } from 'h3'

let cachedTenantId: string | null | undefined = undefined

export async function getWebsiteTenantId(event: H3Event): Promise<string | null> {
  if (cachedTenantId !== undefined) return cachedTenantId

  // NUXT_TENANT_ID env var is still supported as explicit override
  if (process.env.NUXT_TENANT_ID) {
    cachedTenantId = process.env.NUXT_TENANT_ID
    return cachedTenantId
  }

  try {
    const supabase = createWebsiteSupabaseClient(event)
    if (!supabase) {
      cachedTenantId = null
      return null
    }

    const host = getRequestHost(event, { xForwardedHost: true })

    // Match against the `domain` column (stored as full URL like https://drivingteam.ch)
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .ilike('domain', `%${host}%`)
      .maybeSingle()

    cachedTenantId = data?.id ?? null
    if (!cachedTenantId) {
      console.warn(`[website-tenant] No tenant found for host: ${host}`)
    }
    return cachedTenantId
  } catch (err: any) {
    console.error('[website-tenant] Lookup failed:', err?.message)
    cachedTenantId = null
    return null
  }
}
