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
  const raw = propertyId ?? process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  if (!raw) return fallbackTenantId()

  // Normalise: accept both "400627759" and "properties/400627759"
  const pid = raw.startsWith('properties/') ? raw : `properties/${raw}`
  const pidShort = pid.replace(/^properties\//, '')

  const cacheKey = `ga4:${pidShort}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    // Try both formats in case the tenant table uses the short form
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .in('ga4_property_id', [pid, pidShort])
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
  const raw = customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID
  if (!raw) return fallbackTenantId()

  // Normalise: accept both "191-669-8119" and "1916698119"
  const cidClean = raw.replace(/-/g, '')
  const cidDashes = cidClean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')

  const cacheKey = `ads:${cidClean}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .in('google_ads_customer_id', [cidClean, cidDashes])
      .maybeSingle()
    const id = data?.id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for Ads customer ${raw}`)
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

  // Normalise: try both sc-domain: and https:// variants
  const variants: string[] = [url]
  if (url.startsWith('sc-domain:')) {
    const domain = url.replace('sc-domain:', '')
    variants.push(`https://${domain}`, `https://www.${domain}`, domain)
  } else if (url.startsWith('https://') || url.startsWith('http://')) {
    const domain = url.replace(/^https?:\/\/(www\.)?/, '')
    variants.push(`sc-domain:${domain}`, domain)
  }

  const cacheKey = `gsc:${url}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .in('gsc_site_url', variants)
      .maybeSingle()
    const id = data?.id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for GSC site ${url} (tried: ${variants.join(', ')})`)
    return id
  } catch (err: any) {
    logger.error('marketing-tenant: gsc lookup failed', err?.message)
    return fallbackTenantId()
  }
}

/**
 * Look up tenant_id by Meta Ad Account ID.
 * Reads META_AD_ACCOUNT_ID from env if not passed explicitly.
 * Queries marketing_meta_accounts table (Sprint 3). Falls back to MARKETING_TENANT_ID.
 *
 * To register a mapping, insert into marketing_meta_accounts:
 *   INSERT INTO marketing_meta_accounts (tenant_id, ad_account_id, pixel_id, label)
 *   VALUES ('<uuid>', 'act_123456789', '1523803071276836', 'Driving Team');
 */
export async function getTenantIdByMetaAdAccount(adAccountId?: string): Promise<string | null> {
  const rawId = adAccountId ?? process.env.META_AD_ACCOUNT_ID
  if (!rawId) return fallbackTenantId()

  // Normalize: accept both "act_123" and "123" formats.
  const withPrefix = rawId.startsWith('act_') ? rawId : `act_${rawId}`
  const withoutPrefix = rawId.replace(/^act_/, '')

  const cacheKey = `meta:${withoutPrefix}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('marketing_meta_accounts')
      .select('tenant_id')
      .in('ad_account_id', [withPrefix, withoutPrefix])
      .eq('is_active', true)
      .maybeSingle()

    const id = data?.tenant_id ?? fallbackTenantId()
    cache.set(cacheKey, id)
    if (!id) logger.warn(`marketing-tenant: no tenant found for Meta ad account ${rawId}`)
    return id
  } catch (err: any) {
    logger.error('marketing-tenant: meta lookup failed', err?.message)
    return fallbackTenantId()
  }
}
