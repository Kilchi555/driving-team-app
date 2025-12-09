// middleware/api-features.ts
import { routeRequiresFeatureFlag, validateFeatureAccess } from '~/utils/featureFlags'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  
  // Skip if route doesn't require feature flag
  if (!routeRequiresFeatureFlag(url)) return
  
  try {
    // Get tenant ID from request headers or query
    const tenantId = getHeader(event, 'x-tenant-id') || getQuery(event).tenantId as string
    
    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant ID required for feature-protected route'
      })
    }
    
    // Validate feature access
    const featureCheck = await validateFeatureAccess(tenantId, url)
    
    if (!featureCheck.enabled) {
      logger.debug(`API Feature check failed for ${url}:`, featureCheck.message)
      
      throw createError({
        statusCode: 403,
        statusMessage: `Feature access denied: ${featureCheck.message}`
      })
    }
    
    logger.debug(`API Feature check passed for ${url}`)
    
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    console.error('API feature middleware error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Feature validation failed'
    })
  }
})
