/**
 * Cron Job: Clean up expired booking reservations
 * 
 * ⚠️ STATUS: DISABLED - Not currently in use
 * 
 * This endpoint has been disabled to prevent accidental execution.
 * When re-enabling in the future, ensure:
 * ✅ Layer 1: Auth - Vercel CRON_SECRET verification
 * ✅ Layer 2: Rate Limiting - Prevents re-trigger within 30 seconds
 * ✅ Layer 3: Audit Logging - Logs every execution
 * ✅ Layer 7: Error Handling - Detailed error messages
 */

import { defineEventHandler, createError } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  logger.warn('⚠️ API DISABLED: /api/cron/cleanup-booking-reservations is currently disabled')
  
  throw createError({
    statusCode: 410,  // 410 Gone - Resource intentionally disabled
    statusMessage: 'This endpoint is currently disabled and not in use. It will be re-enabled in a future release if needed.',
    fatal: false
  })
})

