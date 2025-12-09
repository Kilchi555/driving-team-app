// server/api/accounto/test-connection.get.ts
// Accounto API Connection Test

import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const apiKey = config.accountoApiKey as string
    const baseUrl = config.accountoBaseUrl as string

    if (!apiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ACCOUNTO_API_KEY nicht konfiguriert'
      })
    }

    logger.debug('🔗 Testing Accounto API connection...')
    logger.debug('🔧 Accounto Config:', {
      baseUrl,
      apiKeyPreview: `${apiKey.substring(0, 20)}...`,
      apiKeyLength: apiKey.length
    })

    // Test different possible base URLs for Administer branding
    const possibleBaseUrls = [
      baseUrl, // Original: https://api.accounto.ch
      'https://api.administer.ch',
      'https://api.administer.com',
      'https://administer.ch',
      'https://administer.com',
      'https://api.accounto.com'
    ]

    logger.debug('🔄 Testing multiple base URLs for Administer branding...')

    for (const testBaseUrl of possibleBaseUrls) {
      logger.debug(`🔍 Testing base URL: ${testBaseUrl}`)
      
      // Test the /api/v1/me endpoint with this base URL
      try {
        const response = await $fetch(`${testBaseUrl}/api/v1/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DrivingTeam-App/1.0',
            'X-Request-ID': `test-${Date.now()}`
          }
        })

        // If we get here, this base URL works!
        logger.debug(`✅ Base URL ${testBaseUrl} works with /api/v1/me!`)
        return {
          success: true,
          message: `Verbindung erfolgreich mit ${testBaseUrl}`,
          details: {
            workingBaseUrl: testBaseUrl,
            workingEndpoint: '/api/v1/me',
            authMethod: 'Bearer Token (Standard)',
            status: 'CONNECTION_SUCCESSFUL',
            fix: `Verwenden Sie ${testBaseUrl} als ACCOUNTO_BASE_URL`,
            nextSteps: 'Aktualisieren Sie die .env Datei mit der funktionierenden Base URL'
          }
        }
      } catch (error: any) {
        if (error.status === 401) {
          logger.debug(`❌ Base URL ${testBaseUrl} - 401 Unauthorized (API Key ungültig)`)
        } else if (error.status === 404) {
          logger.debug(`❌ Base URL ${testBaseUrl} - 404 Not Found (Endpoint existiert nicht)`)
        } else {
          logger.debug(`❌ Base URL ${testBaseUrl} - ${error.status} ${error.statusText}`)
        }
      }
    }

    // If we get here, none of the base URLs worked
    logger.debug('❌ Keine der getesteten Base URLs funktioniert')
    return {
      success: false,
      message: 'Keine der getesteten Base URLs funktioniert',
      details: {
        testedUrls: possibleBaseUrls,
        status: 'ALL_BASE_URLS_FAILED',
        fix: 'Überprüfen Sie die korrekte Base URL für Ihr Administer-Branding',
        nextSteps: 'Kontaktieren Sie Ihren Treuhänder für die korrekte API-URL',
        documentation: 'Administer verwendet möglicherweise eine andere Base URL als Accounto'
      }
    }

  } catch (error: any) {
    console.error('❌ Error testing connection:', error)
    return {
      success: false,
      message: error.message || 'Unbekannter Fehler beim Testen der Verbindung',
      details: {
        error: error.message,
        status: 'ERROR',
        fix: 'Überprüfen Sie die Server-Logs für Details'
      }
    }
  }
})
