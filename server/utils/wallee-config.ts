/**
 * Get Wallee configuration - ONLY from Vercel Environment Variables
 * 
 * ✅ Security Model:
 * - ALL credentials MUST come from process.env (Vercel)
 * - NO hardcodes, NO fallbacks, NO database queries
 * - Throws error if any required env var is missing
 */
export function getWalleeConfigForTenant(tenantId?: string) {
  // ✅ Load ALL credentials from Vercel environment - REQUIRED
  const apiSecret = process.env.WALLEE_SECRET_KEY
  const spaceId = process.env.WALLEE_SPACE_ID
  const userId = process.env.WALLEE_APPLICATION_USER_ID

  console.log('🔧 [wallee-config] Loading Wallee credentials:', {
    hasApiSecret: !!apiSecret,
    hasSpaceId: !!spaceId,
    hasUserId: !!userId,
    spaceIdValue: spaceId,
    userIdValue: userId,
    apiSecretLength: apiSecret?.length || 0
  })

  // ❌ No fallbacks, no defaults - all MUST be set
  if (!apiSecret) {
    const error = '❌ WALLEE_SECRET_KEY environment variable is REQUIRED and not set in Vercel'
    console.error('🔧 [wallee-config]', error)
    throw new Error(error)
  }
  if (!spaceId) {
    const error = '❌ WALLEE_SPACE_ID environment variable is REQUIRED and not set in Vercel'
    console.error('🔧 [wallee-config]', error)
    throw new Error(error)
  }
  if (!userId) {
    const error = '❌ WALLEE_APPLICATION_USER_ID environment variable is REQUIRED and not set in Vercel'
    console.error('🔧 [wallee-config]', error)
    throw new Error(error)
  }

  const parsedSpaceId = parseInt(spaceId, 10)
  const parsedUserId = parseInt(userId, 10)

  if (isNaN(parsedSpaceId)) {
    const error = `❌ WALLEE_SPACE_ID must be a valid number, got: ${spaceId}`
    console.error('🔧 [wallee-config]', error)
    throw new Error(error)
  }
  if (isNaN(parsedUserId)) {
    const error = `❌ WALLEE_APPLICATION_USER_ID must be a valid number, got: ${userId}`
    console.error('🔧 [wallee-config]', error)
    throw new Error(error)
  }

  console.log('✅ [wallee-config] Wallee credentials loaded successfully:', {
    spaceId: parsedSpaceId,
    userId: parsedUserId,
    secretKeyLength: apiSecret.length
  })

  return {
    spaceId: parsedSpaceId,
    userId: parsedUserId,
    apiSecret
  }
}

/**
 * Get SDK config object for Wallee
 */
export function getWalleeSDKConfig(spaceId: number, userId: number, apiSecret: string) {
  return {
    space_id: spaceId,
    user_id: userId,
    api_secret: apiSecret
  }
}

