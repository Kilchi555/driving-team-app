// server/api/wallee/test-permissions.get.ts
// ✅ SPEZIFISCHER TEST für CREATE-Berechtigungen

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Testing Wallee CREATE Permissions...')

    // Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee credentials'
      })
    }

    // Base64 Auth
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    
    console.log('🔐 Testing with User ID:', walleeApplicationUserId)

    // Test 1: Application User Details abrufen
    console.log('🔄 Test 1: Getting Application User details...')
    
    try {
      const userResponse = await $fetch(`https://app-wallee.com/api/application-user/read?spaceId=${walleeSpaceId}&id=${walleeApplicationUserId}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json',
          'Host': 'app-wallee.com'
        }
      })
      
      console.log('✅ Application User Details:', userResponse)
      
      return {
        success: true,
        message: 'Application User found - checking permissions',
        userDetails: userResponse,
        userId: walleeApplicationUserId,
        spaceId: walleeSpaceId,
        hasReadPermission: true,
        needsCreatePermission: true
      }
      
    } catch (userError: any) {
      console.error('❌ Application User API FAILED:', {
        statusCode: userError.statusCode,
        message: userError.message,
        data: userError.data
      })
      
      if (userError.statusCode === 404) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Application User not found - Check User ID'
        })
      }
      
      throw userError
    }

  } catch (error: any) {
    console.error('❌ Permissions test failed:', error)
    throw error
  }
})