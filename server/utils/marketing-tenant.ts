/**
 * Marketing Tenant Auto-Discovery
 *
 * Resolves the tenant_id for marketing cron jobs without requiring a manually
 * configured MARKETING_TENANT_ID env var. Each cron already has credentials
 * scoped to one tenant (GA4 property, Google Ads customer, GSC site). We match
 * those credentials against the tenants table to get the correct tenant_id.
 *
 * Results are cached in-process so the DB is only hit once per Vercel cold start.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const cache = new Map<string, string | null>()

/** Fallback: MARKETING_TENANT_ID env var, used until credential columns are backfilled */
function fallbackTenantId(): string | null {
  return process.env.MARKETING_TENANT_ID ?? null
}

/**
 * Look up tenant_id by GA4 property ID.
 * Reads GOOGLE_ANALYTICS_PROPERTY_ID from env if not passed explicitly.
 * Falls back to MARKETING_TENANT_ID if no DB match found.
 */
export async function getTenantIdByGa4Property(propertyId?: string): Promise<string | null> {
  const pid = propertyId ?? process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  if (!pid) return fallbackTenantId()

  const cacheKey = `ga4:${pid}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('ga4_property_id', pid)
      .maybeSingle()
    const id = data?.id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for GA4 property ${pid}`)
    return id
  } catch (err: any) {
    logger.error('marketing-tenant: ga4 lookup failed', err?.message)
    return fallbackTenantId()
  }
}

/**
 * Look up tenant_id by Google Ads customer ID.
 * Reads GOOGLE_ADS_CUSTOMER_ID from env if not passed explicitly.
 * Falls back to MARKETING_TENANT_ID if no DB match found.
 */
export async function getTenantIdByGoogleAdsCustomer(customerId?: string): Promise<string | null> {
  const cid = customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID
  if (!cid) return fallbackTenantId()

  const cacheKey = `ads:${cid}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('google_ads_customer_id', cid)
      .maybeSingle()
    const id = data?.id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for Ads customer ${cid}`)
    return id
  } catch (err: any) {
    logger.error('marketing-tenant: ads lookup failed', err?.message)
    return fallbackTenantId()
  }
}

/**
 * Look up tenant_id by GSC site URL.
 * Reads GOOGLE_SEARCH_CONSOLE_SITE_URL from env if not passed explicitly.
 * Falls back to MARKETING_TENANT_ID if no DB match found.
 */
export async function getTenantIdByGscSite(siteUrl?: string): Promise<string | null> {
  const url = siteUrl ?? process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  if (!url) return fallbackTenantId()

  const cacheKey = `gsc:${url}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('gsc_site_url', url)
      .maybeSingle()
    const id = data?.id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for GSC site ${url}`)
    return id
  } catch (err: any) {
    logger.error('marketing-tenant: gsc lookup failed', err?.message)
    return fallbackTenantId()
  }
}
