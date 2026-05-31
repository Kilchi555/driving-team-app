/**
 * Get Wallee configuration for a tenant.
 *
 * Resolution order:
 *   1. tenant_secrets table (per-tenant, encrypted) – preferred
 *   2. Vercel environment variables                  – fallback
 *
 * Results are cached in-process so the DB is only hit once per cold start
 * per tenant (same pattern as marketing-tenant.ts).
 */

import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'

interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
}

const cache = new Map<string, WalleeConfig>()

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

/**
 * Returns Wallee credentials for a tenant.
 * Tries tenant_secrets DB first; falls back to Vercel env vars.
 */
export async function getWalleeConfigForTenant(tenantId?: string): Promise<WalleeConfig> {
  const cacheKey = tenantId ?? '__env__'

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  if (tenantId) {
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
        cache.set(cacheKey, config)
        logger.info(`✅ [wallee-config] Loaded credentials from tenant_secrets for tenant ${tenantId}`)
        return config
      }
    } catch (err: any) {
      logger.warn(`⚠️ [wallee-config] tenant_secrets lookup failed for tenant ${tenantId}, falling back to env: ${err.message}`)
    }
  }

  // Fallback: Vercel environment variables
  const config = getEnvConfig()
  cache.set(cacheKey, config)
  logger.info(`✅ [wallee-config] Loaded credentials from environment variables (tenant: ${tenantId ?? 'none'})`)
  return config
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
