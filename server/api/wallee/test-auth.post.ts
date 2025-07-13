// server/api/wallee/test-auth.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Wallee Auth Test started')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Credentials check:', {
      spaceId: spaceId,
      userId: userId,
      secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : 'MISSING',
      allPresent: !!(spaceId && userId && secretKey)
    })
    
    if (!spaceId || !userId || !secretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee credentials'
      })
    }
    
    // Create auth string
    const authString = `${userId}:${secretKey}`
    const authBase64 = Buffer.from(authString).toString('base64')
    
    console.log('🔐 Auth creation:', {
      authString: `${userId}:${secretKey.substring(0, 10)}...`,
      authBase64: `${authBase64.substring(0, 30)}...`,
      authBase64Length: authBase64.length
    })
    
    // Test simple Wallee API call - get space info
    const testUrl = `https://app-wallee.com/api/space/read?spaceId=${spaceId}&id=${spaceId}`
    
    console.log('🌐 Testing Wallee API:', {
      url: testUrl,
      headers: {
        'Authorization': `Basic ${authBase64.substring(0, 30)}...`,
        'Content-Type': 'application/json'
      }
    })
    
    const response = await $fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Wallee API Response:', response)
    
    return {
      success: true,
      message: 'Authentication working!',
      spaceInfo: response
    }
    
  } catch (error: any) {
    console.error('❌ Wallee Auth Test Error:', error)
    
    if (error.statusCode === 442) {
      console.error('🚨 Permission Error - User not authenticated or no permissions')
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      details: error
    }
  }
})