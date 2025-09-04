// server/api/wallee/simple-test.get.ts
// ✅ EINFACHER TEST ohne externe API-Calls

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Simple Wallee Test...')
    
    // Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId,
      userId: walleeApplicationUserId,
      secretKeyPreview: walleeSecretKey ? `${walleeSecretKey.substring(0, 10)}...` : 'MISSING'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      return {
        success: false,
        error: 'Missing Wallee credentials',
        fixInstructions: {
          step1: 'Set environment variables: WALLEE_SPACE_ID, WALLEE_APPLICATION_USER_ID, WALLEE_SECRET_KEY',
          step2: 'Restart the server after setting environment variables'
        }
      }
    }

    // Test Base64 encoding
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    
    console.log('🔐 Auth Debug:', {
      authString: `${walleeApplicationUserId}:${walleeSecretKey}`,
      base64Auth: auth,
      authHeader: `Basic ${auth}`
    })

    return {
      success: true,
      message: 'Environment variables are set correctly',
      credentials: {
        spaceId: walleeSpaceId,
        userId: walleeApplicationUserId,
        secretKeyPreview: `${walleeSecretKey.substring(0, 10)}...`,
        authPreview: `${auth.substring(0, 20)}...`
      },
      nextStep: 'Run the full permissions test to check Wallee API access'
    }

  } catch (error: any) {
    console.error('❌ Simple test failed:', error)
    return {
      success: false,
      error: 'Simple test failed',
      details: error.message
    }
  }
})
