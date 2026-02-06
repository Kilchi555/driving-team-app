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

  // ❌ No fallbacks, no defaults - all MUST be set
  if (!apiSecret) {
    throw new Error('❌ WALLEE_SECRET_KEY environment variable is REQUIRED and not set in Vercel')
  }
  if (!spaceId) {
    throw new Error('❌ WALLEE_SPACE_ID environment variable is REQUIRED and not set in Vercel')
  }
  if (!userId) {
    throw new Error('❌ WALLEE_APPLICATION_USER_ID environment variable is REQUIRED and not set in Vercel')
  }

  const parsedSpaceId = parseInt(spaceId, 10)
  const parsedUserId = parseInt(userId, 10)

  if (isNaN(parsedSpaceId)) {
    throw new Error(`❌ WALLEE_SPACE_ID must be a valid number, got: ${spaceId}`)
  }
  if (isNaN(parsedUserId)) {
    throw new Error(`❌ WALLEE_APPLICATION_USER_ID must be a valid number, got: ${userId}`)
  }

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

