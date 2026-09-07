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

export interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
}

export const PRODUCTION_WALLEE_SPACE_ID = 88489

export function isNonProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV !== 'production'
  return env.NODE_ENV !== 'production'
}

function assertIsolatedTestConfig(config: WalleeConfig, context: string): WalleeConfig {
  if (config.spaceId === PRODUCTION_WALLEE_SPACE_ID) {
    throw new Error(`[Wallee] ${context}: test credentials must not use production space ${PRODUCTION_WALLEE_SPACE_ID}`)
  }
  return config
}

/**
 * Pure credential resolution. Preview/staging never receive production space 88489.
 * Production keeps tenant_secrets → env fallback.
 */
export function resolveWalleeConfigForTenant(input: {
  tenantId?: string
  testMode: boolean
  testConfig: WalleeConfig | null
  prodConfig: WalleeConfig | null
  envConfig: WalleeConfig | null
  nonProduction: boolean
}): WalleeConfig {
  const { tenantId, testMode, testConfig, prodConfig, envConfig, nonProduction } = input
  const isolatedTest = testConfig
    ? assertIsolatedTestConfig(testConfig, tenantId ? `tenant ${tenantId}` : 'no tenantId')
    : null

  if (!tenantId) {
    if (nonProduction) {
      throw new Error('[Wallee] Non-production checkout requires tenant-scoped test credentials (no tenantId).')
    }
    if (!envConfig) {
      throw new Error('Wallee credentials not configured. Missing environment variables.')
    }
    return envConfig
  }

  if (testMode) {
    if (!isolatedTest) {
      throw new Error(
        `[Wallee] Test mode is active for tenant ${tenantId} but isolated test credentials are missing. ` +
        `Refusing production fallback.`
      )
    }
    return isolatedTest
  }

  if (nonProduction) {
    if (!isolatedTest) {
      throw new Error(
        `[Wallee] Preview/staging checkout requires isolated test credentials for tenant ${tenantId}. ` +
        `Refusing production space fallback.`
      )
    }
    return isolatedTest
  }

  if (prodConfig) return prodConfig
  if (envConfig) return envConfig
  throw new Error(
    `[Wallee] Keine Credentials für Tenant ${tenantId} konfiguriert. ` +
    `Bitte Space ID, User ID und Secret Key im Super-Admin → Tenants hinterlegen.`
  )
}

export function resolveWalleeConfigBySpace(input: {
  tenantId: string
  incomingSpaceId: number
  testConfig: WalleeConfig | null
  prodConfig: WalleeConfig | null
  envConfig: WalleeConfig | null
  nonProduction: boolean
}): WalleeConfig {
  const { tenantId, incomingSpaceId, testConfig, prodConfig, envConfig, nonProduction } = input
  if (nonProduction && incomingSpaceId === PRODUCTION_WALLEE_SPACE_ID) {
    throw new Error(
      `[Wallee] Preview/staging refused incoming production space ${PRODUCTION_WALLEE_SPACE_ID} for tenant ${tenantId}.`
    )
  }

  const isolatedTest = testConfig && testConfig.spaceId !== PRODUCTION_WALLEE_SPACE_ID
    ? testConfig
    : null

  if (isolatedTest && isolatedTest.spaceId === incomingSpaceId) {
    return isolatedTest
  }
  if (nonProduction) {
    throw new Error(
      `[Wallee] Preview/staging has no isolated test credentials matching space ${incomingSpaceId} for tenant ${tenantId}.`
    )
  }

  if (prodConfig && prodConfig.spaceId === incomingSpaceId) {
    return prodConfig
  }
  if (envConfig && envConfig.spaceId === incomingSpaceId) {
    return envConfig
  }
  throw new Error(
    `[Wallee] Keine Credentials für Tenant ${tenantId} konfiguriert (incoming space: ${incomingSpaceId}).`
  )
}

/**
 * Fail closed before any Wallee transaction read: expected space must equal
 * the resolved credential space. Prevents Space A webhooks from being verified
 * with Space B credentials.
 */
export function assertWalleeReadSpace(
  expectedSpaceId: number | string | null | undefined,
  credentials: WalleeConfig,
  context: string,
): number {
  const readSpaceId = Number(expectedSpaceId)
  if (!Number.isFinite(readSpaceId) || credentials.spaceId !== readSpaceId) {
    throw new Error(
      `[Wallee] ${context}: credential space ${credentials.spaceId} ` +
      `does not match expected space ${expectedSpaceId}.`
    )
  }
  return readSpaceId
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

/**
 * Load test credentials for a tenant from tenant_secrets (WALLEE_TEST_* keys).
 * Exported so the super-admin test-payment endpoint can use test credentials
 * directly without activating wallee_test_mode globally.
 */
export async function getWalleeTestConfigForTenant(tenantId: string): Promise<WalleeConfig | null> {
  return loadTestCredentials(tenantId)
}

/** Internal: load test credentials for a tenant from tenant_secrets (WALLEE_TEST_* keys). */
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

function tryEnvConfig(): WalleeConfig | null {
  try {
    return getEnvConfig()
  } catch {
    return null
  }
}

/**
 * Returns Wallee credentials for a tenant.
 *
 * Preview/staging (VERCEL_ENV !== production): isolated test credentials only.
 * Missing or production-space test credentials fail closed — never 88489.
 *
 * Production:
 *   1. tenant_secrets WALLEE_TEST_* when wallee_test_mode is true
 *   2. tenant_secrets WALLEE_* otherwise
 *   3. env-var fallback only on the production runtime
 */
export async function getWalleeConfigForTenant(tenantId?: string): Promise<WalleeConfig> {
  const nonProduction = isNonProductionRuntime()
  const testMode = tenantId ? await isTestModeActive(tenantId) : false
  const testConfig = tenantId ? await loadTestCredentials(tenantId) : null
  const prodConfig = tenantId && !nonProduction ? await loadProdCredentials(tenantId) : null
  const envConfig = nonProduction ? null : tryEnvConfig()

  const config = resolveWalleeConfigForTenant({
    tenantId,
    testMode,
    testConfig,
    prodConfig,
    envConfig,
    nonProduction,
  })

  if (testMode || nonProduction) {
    logger.info(`🧪 [wallee-config] Using isolated TEST credentials for tenant ${tenantId || 'none'} (space ${config.spaceId})`)
  } else if (prodConfig && config === prodConfig) {
    logger.info(`✅ [wallee-config] Loaded production credentials from tenant_secrets for tenant ${tenantId}`)
  } else {
    logger.warn(
      `⚠️ [wallee-config] Using GLOBAL env-var credentials for tenant ${tenantId || 'none'}. ` +
      `This is a temporary production migration fallback.`
    )
    if (tenantId) prodCache.set(tenantId, config)
    else prodCache.set('__env__', config)
  }

  return config
}

/**
 * Resolves Wallee credentials for a tenant by matching the incoming space ID.
 *
 * Used by the webhook handler to ensure that incoming webhooks from either
 * the production or test space are verified with the correct credentials —
 * even when the tenant switches test mode or has pending transactions in both spaces.
 *
 * Resolution order (incoming space must match the returned config):
 *   1. Isolated test credentials — if spaceId matches
 *   2. Production tenant_secrets — if spaceId matches
 *   3. Production env credentials — if spaceId matches
 * Unmatched spaces fail closed. Never return credentials for a different space.
 */
export async function getWalleeConfigBySpace(tenantId: string, incomingSpaceId: number): Promise<WalleeConfig> {
  const nonProduction = isNonProductionRuntime()
  const testConfig = await loadTestCredentials(tenantId)
  const prodConfig = nonProduction ? null : await loadProdCredentials(tenantId)
  const envConfig = nonProduction ? null : tryEnvConfig()
  return resolveWalleeConfigBySpace({
    tenantId,
    incomingSpaceId,
    testConfig,
    prodConfig,
    envConfig,
    nonProduction,
  })
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
