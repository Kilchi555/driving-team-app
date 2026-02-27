/**
 * DEBUG: Manually trigger availability slot generation
 * 
 * Purpose:
 * - Generate availability slots for a specific tenant/staff for testing
 * - Useful for debugging slot generation issues
 * 
 * Usage:
 * POST /api/debug/generate-slots
 * Body: {
 *   "tenant_id": "uuid",              // Required: tenant to generate slots for
 *   "staff_id": "uuid",               // Optional: specific staff member (all if omitted)
 *   "days": 30                        // Optional: how many days to calculate (default: 30)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Slots generated successfully",
 *   "stats": {
 *     "total_slots_written": 245,
 *     "duration_ms": 1250
 *   }
 * }
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { availabilityCalculator } from '~/server/services/availability-calculator'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🧪 DEBUG: Manually triggering slot generation...')

    // Get CRON_SECRET for authentication
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || cronSecret.trim() === '') {
      throw createError({
        statusCode: 503,
        statusMessage: 'CRON_SECRET not configured'
      })
    }

    const authHeader = getHeader(event, 'authorization')
    const expectedAuth = `Bearer ${cronSecret}`
    
    if (authHeader !== expectedAuth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - invalid CRON_SECRET'
      })
    }

    // Read request body
    const body = await readBody(event)
    const { tenant_id, staff_id, days = 30 } = body

    if (!tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)
    endDate.setHours(23, 59, 59, 999)

    logger.debug('📊 Slot generation parameters:', {
      tenant_id,
      staff_id: staff_id || 'ALL',
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    const startTime = Date.now()

    // Generate slots using availability calculator
    const result = await availabilityCalculator.calculateAvailability({
      tenantId: tenant_id,
      staffId: staff_id,
      startDate,
      endDate
    })

    const duration = Date.now() - startTime

    logger.debug('✅ Slot generation completed:', {
      total_slots_written: result,
      duration_ms: duration
    })

    return {
      success: true,
      message: 'Slots generated successfully',
      stats: {
        total_slots_written: result,
        duration_ms: duration,
        parameters: {
          tenant_id,
          staff_id: staff_id || 'ALL',
          days
        }
      }
    }

  } catch (error: any) {
    logger.error('❌ Failed to generate slots:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to generate slots'
    })
  }
})
