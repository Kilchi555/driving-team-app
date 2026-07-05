/**
 * POST /api/sari/test-connection
 *
 * Tests the VKU/PGS SARI connection by attempting to authenticate.
 * Accepts credentials from the request body so unsaved values can be tested.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  await requireAdminProfile(event)

  const body = await readBody(event)
  const {
    environment,
    // Accept both naming conventions (frontend sends camelCase)
    sari_client_id, clientId,
    sari_client_secret, clientSecret,
    sari_username, username,
    sari_password, password
  } = body

  const resolvedClientId = sari_client_id || clientId
  const resolvedClientSecret = sari_client_secret || clientSecret
  const resolvedUsername = sari_username || username
  const resolvedPassword = sari_password || password

  if (!resolvedClientId || !resolvedClientSecret || !resolvedUsername || !resolvedPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Client ID, Client Secret, Benutzername und Passwort sind erforderlich'
    })
  }

  try {
    const client = new SARIClient({
      environment: environment || 'test',
      clientId: resolvedClientId.trim(),
      clientSecret: resolvedClientSecret.trim(),
      username: resolvedUsername.trim(),
      password: resolvedPassword.trim()
    })

    // authenticate() throws on invalid credentials
    await client.authenticate()

    logger.info('✅ SARI VKU/PGS Verbindungstest erfolgreich')
    return { success: true, message: 'Verbindung erfolgreich! Credentials sind gültig.' }
  } catch (error: any) {
    logger.warn('⚠️ SARI VKU/PGS Verbindungstest fehlgeschlagen:', { error: error.message })
    throw createError({
      statusCode: 400,
      statusMessage: `Verbindung fehlgeschlagen: ${error.message}`
    })
  }
})
