/**
 * POST /api/sari/test-connection
 * Test connection to SARI API with provided credentials
 */

import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Auth check - optional for test connection (users may not be logged in when testing)
    // const user = await requireAuth(event)

    const body = await readBody(event)
    const { environment, clientId, clientSecret, username, password } = body

    // Validate input
    if (!environment || !clientId || !clientSecret || !username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Missing required credentials: environment, clientId, clientSecret, username, password'
      })
    }

    logger.debug('Testing SARI connection', {
      environment,
      clientId: clientId.substring(0, 5) + '***'
    })

    // Create SARI client
    const sari = new SARIClient({
      environment: environment as 'test' | 'production',
      clientId,
      clientSecret,
      username,
      password
    })

    // Test connection with getVersion
    const testText = `Test_${Date.now()}`
    const result = await sari.getVersion(testText)

    if (result !== testText) {
      throw new Error('Version test returned unexpected result')
    }

    logger.debug('✅ SARI connection successful')

    return {
      success: true,
      message: 'Connection successful',
      environment,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    logger.error('SARI connection test failed', { error: error.message })

    throw createError({
      statusCode: 400,
      statusMessage: `SARI connection failed: ${error.message}`
    })
  }
})

