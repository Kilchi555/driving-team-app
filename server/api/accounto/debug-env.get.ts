// server/api/accounto/debug-env.get.ts
// Debug Environment Variables für Accounto


export default defineEventHandler(async (event) => {
  logger.debug('🔍 Debugging Accounto Environment Variables...')
  
  try {
    // Alle relevanten Environment Variables sammeln
    const accountoApiKey = process.env.ACCOUNTO_API_KEY
    const accountoBaseUrl = process.env.ACCOUNTO_BASE_URL || 'https://api.accounto.ch'
    
    // Zusätzliche Environment Variables prüfen
    const allEnvVars = {
      ACCOUNTO_API_KEY: accountoApiKey,
      ACCOUNTO_BASE_URL: accountoBaseUrl,
      NODE_ENV: process.env.NODE_ENV,
      // Prüfe auch alternative Schreibweisen
      ACCOUNTO_APIKEY: process.env.ACCOUNTO_APIKEY,
      ACCOUNTOAPIKEY: process.env.ACCOUNTOAPIKEY,
      ACCOUNTO_API_KEY_ALT: process.env.ACCOUNTO_API_KEY_ALT
    }
    
    logger.debug('🔧 Environment Variables gefunden:', allEnvVars)
    
    // API Key Analyse
    let apiKeyStatus = 'NOT_SET'
    let apiKeyPreview = 'N/A'
    let apiKeyLength = 0
    let apiKeyIssues = []
    
    if (accountoApiKey) {
      apiKeyStatus = 'SET'
      apiKeyLength = accountoApiKey.length
      
      // API Key Format validieren
      if (accountoApiKey.length < 10) {
        apiKeyIssues.push('API Key zu kurz (mindestens 10 Zeichen)')
      }
      
      if (accountoApiKey.includes(' ')) {
        apiKeyIssues.push('API Key enthält Leerzeichen')
      }
      
      if (accountoApiKey.startsWith('eyJ') && accountoApiKey.includes('.')) {
        apiKeyIssues.push('API Key sieht wie ein JWT Token aus (korrekt)')
      } else {
        apiKeyIssues.push('API Key Format ungewöhnlich')
      }
      
      // Erste und letzte Zeichen anzeigen (für Debugging, aber sicher)
      if (accountoApiKey.length > 20) {
        apiKeyPreview = `${accountoApiKey.substring(0, 10)}...${accountoApiKey.substring(accountoApiKey.length - 10)}`
      } else {
        apiKeyPreview = accountoApiKey
      }
    } else {
      apiKeyIssues.push('ACCOUNTO_API_KEY nicht gesetzt')
      
      // Prüfe alternative Variablen
      if (process.env.ACCOUNTO_APIKEY) {
        apiKeyIssues.push('ACCOUNTO_APIKEY gefunden (alternative Schreibweise)')
      }
      if (process.env.ACCOUNTOAPIKEY) {
        apiKeyIssues.push('ACCOUNTOAPIKEY gefunden (alternative Schreibweise)')
      }
    }
    
    // Base URL Analyse
    let baseUrlStatus = 'DEFAULT'
    let baseUrlIssues = []
    
    if (process.env.ACCOUNTO_BASE_URL) {
      baseUrlStatus = 'CUSTOM'
      
      if (!process.env.ACCOUNTO_BASE_URL.startsWith('http')) {
        baseUrlIssues.push('Base URL sollte mit http:// oder https:// beginnen')
      }
    } else {
      baseUrlIssues.push('Verwendet Standard-URL: https://api.accounto.ch')
    }
    
    // Vollständige Konfiguration
    const config = {
      apiKey: {
        status: apiKeyStatus,
        preview: apiKeyPreview,
        length: apiKeyLength,
        issues: apiKeyIssues
      },
      baseUrl: {
        status: baseUrlStatus,
        value: accountoBaseUrl,
        issues: baseUrlIssues
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        allAccountoVars: allEnvVars
      }
    }
    
    logger.debug('✅ Environment Debug abgeschlossen:', config)
    
    return {
      success: true,
      message: 'Environment Variables Debug abgeschlossen',
      config: config,
      recommendations: getRecommendations(config)
    }
    
  } catch (error: any) {
    console.error('❌ Environment Debug Error:', error)
    
    return {
      success: false,
      message: 'Environment Debug fehlgeschlagen',
      error: error.message
    }
  }
})

// Empfehlungen basierend auf der Konfiguration
function getRecommendations(config: any) {
  const recommendations = []
  
  if (config.apiKey.status === 'NOT_SET') {
    recommendations.push('ACCOUNTO_API_KEY in .env Datei oder Environment setzen')
    recommendations.push('Beispiel: ACCOUNTO_API_KEY=ihr_api_key_hier')
  }
  
  if (config.apiKey.issues.length > 0) {
    config.apiKey.issues.forEach((issue: string) => {
      if (issue.includes('zu kurz')) {
        recommendations.push('API Key sollte mindestens 10 Zeichen lang sein')
      }
      if (issue.includes('Leerzeichen')) {
        recommendations.push('API Key sollte keine Leerzeichen enthalten')
      }
    })
  }
  
  if (config.baseUrl.issues.length > 0) {
    config.baseUrl.issues.forEach((issue: string) => {
      if (issue.includes('http')) {
        recommendations.push('ACCOUNTO_BASE_URL sollte mit https:// beginnen')
      }
    })
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Konfiguration sieht gut aus!')
  }
  
  return recommendations
}

