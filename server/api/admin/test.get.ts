// server/api/admin/test.get.ts

import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  logger.debug('🧪 Admin test endpoint called')
  
  return {
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString()
  }
})
