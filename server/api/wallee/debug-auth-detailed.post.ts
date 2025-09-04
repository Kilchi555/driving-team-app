// server/api/wallee/debug-auth-detailed.post.ts
// 🔍 DETAILLIERTE AUTHENTIFIZIERUNG DEBUG

export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 DETAILLIERTE AUTHENTIFIZIERUNG DEBUG')
    
    // Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Variables RAW:')
    console.log('WALLEE_SPACE_ID:', `"${walleeSpaceId}"`)
    console.log('WALLEE_APPLICATION_USER_ID:', `"${walleeApplicationUserId}"`)
    console.log('WALLEE_SECRET_KEY LENGTH:', walleeSecretKey?.length)
    console.log('WALLEE_SECRET_KEY PREVIEW:', walleeSecretKey ? `"${walleeSecretKey.substring(0, 20)}..."` : 'MISSING')
    console.log('WALLEE_SECRET_KEY FULL:', `"${walleeSecretKey}"`)

    // Test verschiedene Base64 Varianten
    const authString = `${walleeApplicationUserId}:${walleeSecretKey}`
    console.log('🔐 Auth String:', `"${authString}"`)
    console.log('🔐 Auth String Length:', authString.length)
    
    // Base64 mit Node.js Buffer
    const base64NodeBuffer = Buffer.from(authString).toString('base64')
    console.log('📝 Base64 (Node Buffer):', base64NodeBuffer)
    
    // Base64 mit btoa (falls verfügbar)
    let base64Btoa = 'N/A'
    try {
      if (typeof btoa !== 'undefined') {
        base64Btoa = btoa(authString)
      }
    } catch (e) {
      console.log('btoa not available in Node.js environment')
    }
    console.log('📝 Base64 (btoa):', base64Btoa)
    
    // Support Beispiel zum Vergleich
    const supportExample = 'MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFFdThSZTg5'
    console.log('📝 Support Beispiel:', supportExample)
    console.log('🔍 Identisch mit unserem?:', base64NodeBuffer === supportExample)
    
    // Decode Support Beispiel
    let decodedSupport = 'N/A'
    try {
      decodedSupport = Buffer.from(supportExample, 'base64').toString('utf-8')
    } catch (e) {
      console.log('Fehler beim Dekodieren des Support Beispiels')
    }
    console.log('🔓 Support Beispiel dekodiert:', `"${decodedSupport}"`)
    
    // Test: Space API (einfachster Test)
    console.log('\n🔄 Testing Space API for basic auth...')
    try {
      const spaceUrl = `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`
      console.log('🌐 Space URL:', spaceUrl)
      
      const spaceHeaders = {
        'Authorization': `Basic ${base64NodeBuffer}`,
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
        // Bewusst KEIN Host Header hier um zu testen
      }
      
      console.log('📋 Space Headers:', JSON.stringify(spaceHeaders, null, 2))
      
      const spaceResponse = await fetch(spaceUrl, {
        method: 'GET',
        headers: spaceHeaders
      })
      
      const spaceStatus = spaceResponse.status
      const spaceText = await spaceResponse.text()
      
      console.log('📊 Space API Status:', spaceStatus)
      console.log('📄 Space API Response:', spaceText)
      
      if (spaceStatus === 200) {
        console.log('✅ Space API SUCCESS - Authentifizierung funktioniert!')
        const spaceData = JSON.parse(spaceText)
        return {
          success: true,
          message: 'Authentifizierung funktioniert - Problem liegt woanders',
          spaceData: spaceData,
          authDetails: {
            userId: walleeApplicationUserId,
            spaceId: walleeSpaceId,
            base64Auth: base64NodeBuffer,
            authString: authString
          }
        }
      } else {
        console.log('❌ Space API FAILED')
        return {
          success: false,
          message: 'Space API failed - möglicherweise Auth Problem',
          spaceStatus: spaceStatus,
          spaceResponse: spaceText,
          authDetails: {
            userId: walleeApplicationUserId,
            spaceId: walleeSpaceId,
            base64Auth: base64NodeBuffer,
            authString: authString
          }
        }
      }
      
    } catch (spaceError: any) {
      console.error('❌ Space API Error:', spaceError)
      return {
        success: false,
        message: 'Space API error',
        error: spaceError.message,
        authDetails: {
          userId: walleeApplicationUserId,
          spaceId: walleeSpaceId,
          base64Auth: base64NodeBuffer,
          authString: authString
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Debug Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
