// server/api/admin/test.get.ts

export default defineEventHandler(async (event) => {
  logger.debug('🧪 Admin test endpoint called')
  
  return {
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString()
  }
})
