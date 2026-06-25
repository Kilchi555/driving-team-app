/**
 * POST /api/admin/wallee-test-credentials
 *
 * Super-admin only. Validates a set of Wallee credentials by calling
 * SpaceService.read() — a read-only API call with no side effects.
 * Returns the Space name and ID on success so the admin can confirm
 * they entered the right space.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { Wallee } from 'wallee'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { wallee_space_id, wallee_user_id, wallee_secret_key } = await readBody(event)

  if (!wallee_space_id || !wallee_user_id || !wallee_secret_key?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_space_id, wallee_user_id und wallee_secret_key sind erforderlich' })
  }

  const spaceId = parseInt(String(wallee_space_id), 10)
  const userId = parseInt(String(wallee_user_id), 10)

  if (isNaN(spaceId) || isNaN(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_space_id und wallee_user_id müssen Zahlen sein' })
  }

  try {
    const sdkConfig = getWalleeSDKConfig(spaceId, userId, wallee_secret_key.trim())
    const spaceService = new Wallee.api.SpaceService(sdkConfig)

    // read() is a no-op read call — no transaction, no charge, no side effects
    const space = await spaceService.read(spaceId)

    logger.info(`✅ [wallee-test] Credentials valid for space ${spaceId} ("${space.name}")`)

    return {
      success: true,
      spaceName: space.name,
      spaceId: space.id,
      state: space.state,
    }
  } catch (err: any) {
    const statusCode = err?.response?.statusCode || err?.statusCode
    const isAuth = statusCode === 401 || statusCode === 403

    logger.warn(`⚠️ [wallee-test] Credential test failed for space ${spaceId}: ${err.message}`)

    return {
      success: false,
      error: isAuth
        ? 'Authentifizierung fehlgeschlagen — User ID oder Secret Key ungültig.'
        : statusCode === 404
          ? 'Space nicht gefunden — Space ID ungültig oder kein Zugriff.'
          : `Verbindungsfehler: ${err.message}`,
    }
  }
})
