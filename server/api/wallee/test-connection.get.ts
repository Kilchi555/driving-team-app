// server/api/wallee/test-connection.get.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Testing Wallee connection...')

    // Environment Variables prüfen
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Variables Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}***` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing. Please check environment variables.'
      })
    }

    // Base64 Authentifizierung
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

    // Wallee Space Information abrufen (einfacher Connection Test)
    const spaceInfo = await $fetch(
      `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ) as any

    console.log('✅ Wallee connection successful:', {
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state
    })

    return {
      success: true,
      connected: true,
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state,
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