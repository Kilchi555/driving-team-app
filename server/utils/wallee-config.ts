/**
 * Get Wallee configuration for a tenant.
 *
 * Resolution order:
 *   1. tenant_secrets table (per-tenant, encrypted) – preferred
 *   2. Vercel environment variables                  – fallback
 *
 * Results are cached in-process so the DB is only hit once per cold start
 * per tenant (same pattern as marketing-tenant.ts).
 *
 * Test-mode support:
 *   - When a tenant has wallee_test_mode = true, getWalleeConfigForTenant()
 *     returns the WALLEE_TEST_* credentials from tenant_secrets.
 *   - The webhook uses getWalleeConfigBySpace() which resolves credentials
 *     by the incoming space ID — ensuring old pending transactions in the
 *     production space still get verified with the correct credentials.
 */

import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'

interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
}

// Production credentials cache (keyed by tenantId or '__env__')
const prodCache = new Map<string, WalleeConfig>()
// Test credentials cache (keyed by tenantId)
const testCache = new Map<string, WalleeConfig | null>()
// Test-mode flag cache (keyed by tenantId)
const testModeCache = new Map<string, boolean>()

/** Invalidate all in-process caches for a specific tenant (or all tenants). */
export function invalidateWalleeConfigCache(tenantId?: string) {
  if (tenantId) {
    prodCache.delete(tenantId)
    testCache.delete(tenantId)
    testModeCache.delete(tenantId)
  } else {
    prodCache.clear()
    testCache.clear()
    testModeCache.clear()
  }
}

/** Load credentials from Vercel environment variables. Throws if any are missing. */
function getEnvConfig(): WalleeConfig {
  const apiSecret = process.env.WALLEE_SECRET_KEY
  const spaceId = process.env.WALLEE_SPACE_ID
  const userId = process.env.WALLEE_APPLICATION_USER_ID

  if (!apiSecret || !spaceId || !userId) {
    throw new Error(
      'Wallee credentials not configured. Missing: ' +
      [!apiSecret && 'WALLEE_SECRET_KEY', !spaceId && 'WALLEE_SPACE_ID', !userId && 'WALLEE_APPLICATION_USER_ID']
        .filter(Boolean)
        .join(', ')
    )
  }

  const parsedSpaceId = parseInt(spaceId, 10)
  const parsedUserId = parseInt(userId, 10)

  if (isNaN(parsedSpaceId)) throw new Error(`WALLEE_SPACE_ID must be a number, got: ${spaceId}`)
  if (isNaN(parsedUserId)) throw new Error(`WALLEE_APPLICATION_USER_ID must be a number, got: ${userId}`)

  return { spaceId: parsedSpaceId, userId: parsedUserId, apiSecret }
}

/** Load production credentials for a tenant from tenant_secrets (no env fallback). */
async function loadProdCredentials(tenantId: string): Promise<WalleeConfig | null> {
  if (prodCache.has(tenantId)) {
    return prodCache.get(tenantId)!
  }

  try {
    const secrets = await getTenantSecretsSecure(
      tenantId,
      ['WALLEE_SPACE_ID', 'WALLEE_USER_ID', 'WALLEE_SECRET_KEY'],
      'WALLEE_CONFIG'
    )

    const spaceId = parseInt(secrets.WALLEE_SPACE_ID, 10)
    const userId = parseInt(secrets.WALLEE_USER_ID, 10)
    const apiSecret = secrets.WALLEE_SECRET_KEY

    if (!isNaN(spaceId) && !isNaN(userId) && apiSecret) {
      const config: WalleeConfig = { spaceId, userId, apiSecret }
      prodCache.set(tenantId, config)
      return config
    }
  } catch {
    // No prod credentials in tenant_secrets
  }
  return null
}

/** Load test credentials for a tenant from tenant_secrets (WALLEE_TEST_* keys). */
async function loadTestCredentials(tenantId: string): Promise<WalleeConfig | null> {
  if (testCache.has(tenantId)) {
    return testCache.get(tenantId) ?? null
  }

  try {
    const secrets = await getTenantSecretsSecure(
      tenantId,
      ['WALLEE_TEST_SPACE_ID', 'WALLEE_TEST_USER_ID', 'WALLEE_TEST_SECRET_KEY'],
      'WALLEE_TEST_CONFIG'
    )

    const spaceId = parseInt(secrets.WALLEE_TEST_SPACE_ID, 10)
    const userId = parseInt(secrets.WALLEE_TEST_USER_ID, 10)
    const apiSecret = secrets.WALLEE_TEST_SECRET_KEY

    if (!isNaN(spaceId) && !isNaN(userId) && apiSecret) {
      const config: WalleeConfig = { spaceId, userId, apiSecret }
      testCache.set(tenantId, config)
      logger.info(`🧪 [wallee-config] Loaded TEST credentials for tenant ${tenantId} (space ${spaceId})`)
      return config
    }
  } catch {
    // No test credentials configured
  }

  testCache.set(tenantId, null)
  return null
}

/** Check whether wallee_test_mode is enabled for a tenant (cached). */
async function isTestModeActive(tenantId: string): Promise<boolean> {
  if (testModeCache.has(tenantId)) {
    return testModeCache.get(tenantId)!
  }

  try {
    const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('wallee_test_mode')
      .eq('id', tenantId)
      .single()

    const isTest = data?.wallee_test_mode ?? false
    testModeCache.set(tenantId, isTest)
    return isTest
  } catch {
    return false
  }
}

/**
 * Returns Wallee credentials for a tenant.
 *
 * When wallee_test_mode = true, returns test credentials (WALLEE_TEST_*).
 * Otherwise returns production credentials.
 *
 * Resolution order when tenantId is provided:
 *   1. tenant_secrets table (WALLEE_TEST_* if test mode, WALLEE_* if production)
 *   2. Vercel environment variables — MIGRATION FALLBACK ONLY (production path only).
 *
 * When called WITHOUT a tenantId (e.g. local dev / scripts) the function
 * falls back to Vercel environment variables.
 */
export async function getWalleeConfigForTenant(tenantId?: string): Promise<WalleeConfig> {
  if (!tenantId) {
    const cacheKey = '__env__'
    if (prodCache.has(cacheKey)) return prodCache.get(cacheKey)!
    const config = getEnvConfig()
    prodCache.set(cacheKey, config)
    logger.info('✅ [wallee-config] Loaded credentials from environment variables (no tenantId)')
    return config
  }

  // Check if test mode is enabled for this tenant
  const testMode = await isTestModeActive(tenantId)

  if (testMode) {
    const testConfig = await loadTestCredentials(tenantId)
    if (testConfig) {
      logger.info(`🧪 [wallee-config] Using TEST credentials for tenant ${tenantId} (test mode active, space ${testConfig.spaceId})`)
      return testConfig
    }
    logger.warn(
      `⚠️ [wallee-config] Test mode is active for tenant ${tenantId} but no test credentials are configured. ` +
      `Falling back to production credentials.`
    )
  }

  // Production path: tenant_secrets first, then env fallback
  const prodConfig = await loadProdCredentials(tenantId)
  if (prodConfig) {
    logger.info(`✅ [wallee-config] Loaded production credentials from tenant_secrets for tenant ${tenantId}`)
    return prodConfig
  }

  // Migration fallback: env vars
  try {
    const config = getEnvConfig()
    prodCache.set(tenantId, config)
    logger.warn(
      `⚠️ [wallee-config] Using GLOBAL env-var credentials for tenant ${tenantId}. ` +
      `This is a temporary migration fallback — please save per-tenant credentials ` +
      `in Super-Admin → Tenants as soon as possible.`
    )
    return config
  } catch (envErr: any) {
    throw new Error(
      `[Wallee] Keine Credentials für Tenant ${tenantId} konfiguriert. ` +
      `Bitte Space ID, User ID und Secret Key im Super-Admin → Tenants hinterlegen. ` +
      `(tenant_secrets: nicht gefunden, env vars: ${envErr.message})`
    )
  }
}

/**
 * Resolves Wallee credentials for a tenant by matching the incoming space ID.
 *
 * Used by the webhook handler to ensure that incoming webhooks from either
 * the production or test space are verified with the correct credentials —
 * even when the tenant switches test mode or has pending transactions in both spaces.
 *
 * Resolution order:
 *   1. Production credentials — if spaceId matches
 *   2. Test credentials       — if spaceId matches
 *   3. Any configured credentials (production or test) as last resort
 */
export async function getWalleeConfigBySpace(tenantId: string, incomingSpaceId: number): Promise<WalleeConfig> {
  // Try production credentials
  let prodConfig: WalleeConfig | null = null
  try {
    prodConfig = await loadProdCredentials(tenantId)
  } catch {}
  if (!prodConfig) {
    // Try env fallback for production
    try {
      prodConfig = getEnvConfig()
    } catch {}
  }

  if (prodConfig && prodConfig.spaceId === incomingSpaceId) {
    logger.debug(`✅ [wallee-config] Matched PRODUCTION credentials for tenant ${tenantId}, space ${incomingSpaceId}`)
    return prodConfig
  }

  // Try test credentials
  const testConfig = await loadTestCredentials(tenantId)
  if (testConfig && testConfig.spaceId === incomingSpaceId) {
    logger.debug(`🧪 [wallee-config] Matched TEST credentials for tenant ${tenantId}, space ${incomingSpaceId}`)
    return testConfig
  }

  // No exact match — return whichever is configured (prod preferred)
  if (prodConfig) {
    logger.warn(
      `⚠️ [wallee-config] No exact space match for tenant ${tenantId} (incoming: ${incomingSpaceId}, ` +
      `prod: ${prodConfig.spaceId}, test: ${testConfig?.spaceId ?? 'none'}). Using production credentials.`
    )
    return prodConfig
  }

  if (testConfig) {
    logger.warn(`⚠️ [wallee-config] No exact space match, using test credentials as fallback for tenant ${tenantId}`)
    return testConfig
  }

  throw new Error(
    `[Wallee] Keine Credentials für Tenant ${tenantId} konfiguriert (incoming space: ${incomingSpaceId}).`
  )
}

/**
 * Get SDK config object for Wallee
 */
export function getWalleeSDKConfig(spaceId: number, userId: number, apiSecret: string) {
  return {
    space_id: spaceId,
    user_id: userId,
    api_secret: apiSecret
  }
}
