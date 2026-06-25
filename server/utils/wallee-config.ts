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

/** Invalidate the in-process cache for a specific tenant (or all tenants). */
export function invalidateWalleeConfigCache(tenantId?: string) {
  if (tenantId) {
    cache.delete(tenantId)
  } else {
    cache.clear()
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

/**
 * Returns Wallee credentials for a tenant.
 *
 * Resolution order when tenantId is provided:
 *   1. tenant_secrets table (per-tenant, encrypted) — preferred and required for all new tenants
 *   2. Vercel environment variables — MIGRATION FALLBACK ONLY.
 *      This fallback exists so existing tenants whose credentials are still
 *      stored in env vars don't break before they are migrated to tenant_secrets.
 *      Once all tenants have their credentials in tenant_secrets, this fallback
 *      should be removed.
 *
 * When called WITHOUT a tenantId (e.g. local dev / scripts) the function
 * falls back to Vercel environment variables.
 */
export async function getWalleeConfigForTenant(tenantId?: string): Promise<WalleeConfig> {
  const cacheKey = tenantId ?? '__env__'

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  if (tenantId) {
    // ── Try tenant_secrets first (the correct per-tenant path) ───────────────
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

      // Secrets exist but are incomplete — log a warning before falling back
      logger.warn(
        `⚠️ [wallee-config] Incomplete Wallee credentials in tenant_secrets for tenant ${tenantId} ` +
        `(spaceId=${isNaN(spaceId) ? 'MISSING' : spaceId}, userId=${isNaN(userId) ? 'MISSING' : userId}, ` +
        `secret=${apiSecret ? 'ok' : 'MISSING'}). Falling back to env vars. ` +
        `Please migrate this tenant's credentials via Super-Admin → Tenants.`
      )
    } catch (err: any) {
      // No entry in tenant_secrets at all — fall back to env vars with a warning
      logger.warn(
        `⚠️ [wallee-config] No Wallee credentials in tenant_secrets for tenant ${tenantId}. ` +
        `Falling back to env vars (migration required). Error: ${err.message}`
      )
    }

    // ── Migration fallback: env vars ──────────────────────────────────────────
    // TODO: remove once all tenants have credentials in tenant_secrets.
    try {
      const config = getEnvConfig()
      cache.set(cacheKey, config)
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

  // ── No-tenant path (local dev / scripts): env var only ─────────────────────
  const config = getEnvConfig()
  cache.set(cacheKey, config)
  logger.info('✅ [wallee-config] Loaded credentials from environment variables (no tenantId)')
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
