// server/api/wallee/debug-tenant-config.get.ts
// Debug endpoint to verify tenant Wallee configuration

import { getWalleeConfigForTenant } from '~/server/utils/wallee-config'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const tenantId = query.tenantId as string
    const verbose = query.verbose === 'true'

    if (!tenantId) {
      return {
        status: 'info',
        message: 'No tenantId provided - will use default config from environment variables',
        env: {
          WALLEE_SPACE_ID: process.env.WALLEE_SPACE_ID,
          WALLEE_APPLICATION_USER_ID: process.env.WALLEE_APPLICATION_USER_ID,
          WALLEE_SECRET_KEY_PREVIEW: process.env.WALLEE_SECRET_KEY?.substring(0, 20) + '...'
        }
      }
    }

    console.log(`🔍 Debug: Loading Wallee config for tenant: ${tenantId}`)

    // Get Wallee config for this tenant
    const walleeConfig = await getWalleeConfigForTenant(tenantId)

    const response: any = {
      status: 'success',
      tenantId,
      config: {
        spaceId: walleeConfig.spaceId,
        userId: walleeConfig.userId,
        apiSecretPreview: walleeConfig.apiSecret?.substring(0, 20) + '...'
      },
      isUsingDefault: walleeConfig.spaceId === parseInt(process.env.WALLEE_SPACE_ID || '82592')
    }

    if (verbose) {
      response.debug = {
        defaultSpaceId: parseInt(process.env.WALLEE_SPACE_ID || '82592'),
        defaultUserId: parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525'),
        tenantConfig: {
          usingEnvironmentFallback: response.isUsingDefault
        }
      }
    }

    console.log('✅ Debug result:', response)
    return response

  } catch (error: any) {
    console.error('❌ Debug error:', error)
    return {
      status: 'error',
      message: error.message,
      error: error.toString()
    }
  }
})

