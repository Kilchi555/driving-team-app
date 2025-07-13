// server/api/wallee/debug-credentials.get.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Debug Wallee Credentials')
  
  // Environment Variables checken
  const walleeSpaceId = process.env.WALLEE_SPACE_ID
  const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
  const walleeSecretKey = process.env.WALLEE_SECRET_KEY
  
  console.log('📊 Environment Check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasSpaceId: !!walleeSpaceId,
    hasUserId: !!walleeApplicationUserId,
    hasSecretKey: !!walleeSecretKey,
    spaceIdLength: walleeSpaceId?.length || 0,
    userIdLength: walleeApplicationUserId?.length || 0,
    secretKeyLength: walleeSecretKey?.length || 0
  })
  
  // Partial values für Debug (keine Secrets leaken!)
  const debugInfo = {
    spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...${walleeSpaceId.substring(-3)}` : 'MISSING',
    userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...${walleeApplicationUserId.substring(-3)}` : 'MISSING',
    secretKey: walleeSecretKey ? `${walleeSecretKey.substring(0, 10)}...` : 'MISSING',
    authString: walleeApplicationUserId && walleeSecretKey ? 
      `${walleeApplicationUserId.substring(0, 3)}:${walleeSecretKey.substring(0, 10)}...` : 'MISSING'
  }
  
  console.log('🔐 Credential Preview:', debugInfo)
  
  // Test Base64 Encoding
  if (walleeApplicationUserId && walleeSecretKey) {
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    console.log('📝 Base64 Auth Length:', auth.length)
    console.log('📝 Base64 Auth Preview:', `${auth.substring(0, 20)}...`)
  }
  
  return {
    success: true,
    environment: process.env.NODE_ENV,
    hasCredentials: {
      spaceId: !!walleeSpaceId,
      userId: !!walleeApplicationUserId,
      secretKey: !!walleeSecretKey
    },
    debug: debugInfo,
    message: 'Check server console for detailed logs'
  }
})