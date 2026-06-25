/**
 * POST /api/admin/wallee-test-saved-credentials
 *
 * Super-admin only. Tests Wallee credentials already stored in tenant_secrets
 * without requiring the secret key to be re-entered.
 * mode: 'test' → tests WALLEE_TEST_* credentials
 * mode: 'prod' → tests WALLEE_* credentials
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { Wallee } from 'wallee'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getWalleeConfigForTenant, getWalleeTestConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, mode = 'test' } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  let config: { spaceId: number; userId: number; apiSecret: string } | null = null

  if (mode === 'test') {
    config = await getWalleeTestConfigForTenant(tenant_id)
    if (!config) {
      throw createError({ statusCode: 404, statusMessage: 'Keine Test-Credentials gespeichert' })
    }
  } else {
    config = await getWalleeConfigForTenant(tenant_id)
  }

  const { spaceId, userId, apiSecret } = config
  try {
    const sdkConfig = getWalleeSDKConfig(spaceId, userId, apiSecret)
    const spaceService = new Wallee.api.SpaceService(sdkConfig)
    const space = await spaceService.read(spaceId)

    logger.info(`✅ [wallee-test-saved] Credentials valid for space ${spaceId} ("${space.name}")`)

    return {
      success: true,
      spaceName: space.name,
      spaceId: space.id,
      state: space.state,
    }
  } catch (err: any) {
    const statusCode = err?.response?.statusCode || err?.statusCode
    const isAuth = statusCode === 401 || statusCode === 403
    return {
      success: false,
      error: isAuth
        ? 'Authentifizierung fehlgeschlagen — Credentials ungültig oder abgelaufen.'
        : statusCode === 404
          ? 'Space nicht gefunden.'
          : `Verbindungsfehler: ${err.message}`,
    }
  }
})
