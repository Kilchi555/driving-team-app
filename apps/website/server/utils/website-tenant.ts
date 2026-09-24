/**
 * Website Tenant Auto-Discovery
 *
 * Resolves the tenant_id for one request by matching that request's host
 * against the `domain` column in the tenants table.
 * The result is not cached: one Nitro process can serve many tenant hosts.
 */

import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import type { H3Event } from 'h3'
import { getRequestHost } from 'h3'

export async function getWebsiteTenantId(event: H3Event): Promise<string | null> {
  // Explicit single-deploy override. Read on every call so a later request
  // is not stuck with a value captured at process start.
  const configuredTenantId = process.env.NUXT_TENANT_ID
  if (configuredTenantId) return configuredTenantId

  try {
    const supabase = createWebsiteSupabaseClient(event)
    if (!supabase) return null

    const host = getRequestHost(event, { xForwardedHost: true })

    // Match against the `domain` column (stored as full URL like https://drivingteam.ch)
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .ilike('domain', `%${host}%`)
      .maybeSingle()

    const tenantId = data?.id ?? null
    if (!tenantId) {
      console.warn(`[website-tenant] No tenant found for host: ${host}`)
    }
    return tenantId
  } catch (err) {
    const message = err instanceof Error ? err.message : 'lookup failed'
    console.error('[website-tenant] Lookup failed:', message)
    return null
  }
}
