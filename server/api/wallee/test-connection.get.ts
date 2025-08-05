// server/api/wallee/test-connection.get.ts - ERWEITERTE DEBUG VERSION

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Testing Wallee connection...')

    // Credentials laden
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    // ✅ VOLLSTÄNDIGER CREDENTIAL DEBUG
    console.log('🔧 EXACT Credentials being used:')
    console.log('Space ID:', walleeSpaceId)
    console.log('User ID:', walleeApplicationUserId)
    console.log('Secret Key (first 20 chars):', walleeSecretKey?.substring(0, 20) + '...')
    console.log('Secret Key (last 10 chars):', '...' + walleeSecretKey?.substring(-10))
    console.log('Secret Key FULL LENGTH:', walleeSecretKey?.length)
    
    // ✅ VERGLEICH mit Marco's Key
    const marcoKey = 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    console.log('Marco Key (first 20):', marcoKey.substring(0, 20) + '...')
    console.log('Marco Key (last 10):', '...' + marcoKey.substring(-10))
    console.log('Keys MATCH:', walleeSecretKey === marcoKey)
    
    // Base64 Auth
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    console.log('Generated Base64:', auth.substring(0, 30) + '...')
    
    // Expected vs Actual
    const expectedAuth = Buffer.from(`140525:${marcoKey}`).toString('base64')
    console.log('Expected Base64:', expectedAuth.substring(0, 30) + '...')
    console.log('Auth strings MATCH:', auth === expectedAuth)

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing. Please check environment variables.'
      })
    }

    // ✅ ERWEITERTE SPACE API DEBUG
    const spaceUrl = `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`
    console.log('🌐 Calling Wallee Space API:', spaceUrl)

    const spaceInfo = await $fetch(spaceUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }) as any

// ✅ VOLLSTÄNDIGER DEBUG für Marco
console.log('📋 COMPLETE Wallee Space Response:')
console.log('Type:', typeof spaceInfo)
console.log('Value:', spaceInfo)
console.log('Length:', spaceInfo?.length)
console.log('Is String:', typeof spaceInfo === 'string')

console.log('🔐 EXACT AUTH DEBUG:')
console.log('User ID:', walleeApplicationUserId)
console.log('Secret Key:', walleeSecretKey)
console.log('Auth String:', `${walleeApplicationUserId}:${walleeSecretKey}`)
console.log('Base64:', auth)

// ✅ SICHERE PRÜFUNG
if (typeof spaceInfo === 'object' && spaceInfo !== null) {
  console.log('🔍 Space Response Analysis:', {
    hasName: 'name' in spaceInfo,
    hasState: 'state' in spaceInfo,
    nameValue: spaceInfo?.name,
    stateValue: spaceInfo?.state,
    allKeys: Object.keys(spaceInfo || {})
  })
} else {
  console.log('⚠️ Space Response is not an object:', {
    type: typeof spaceInfo,
    value: spaceInfo
  })
}

    return {
      success: true,
      connected: true,
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state,
      // ✅ VOLLSTÄNDIGE SPACE INFO ZURÜCKGEBEN
      fullSpaceInfo: spaceInfo,
      message: 'Wallee connection successful'
    }

  } catch (error: any) {
    console.error('❌ Wallee connection test failed:', error)

    // Spezifische Fehlerbehandlung
    if (error.statusCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Wallee authentication failed. Please check your credentials.'
      })
    }

    if (error.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Wallee space not found. Please check your Space ID.'
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Wallee connection test failed'
    })
  }
})

