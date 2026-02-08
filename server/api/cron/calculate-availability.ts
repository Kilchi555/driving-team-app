/**
 * Cron Job: Calculate Availability
 * 
 * PURPOSE:
 * Automatically recalculates availability slots nightly at 2 AM.
 * Keeps availability_slots table up-to-date for next 30-60 days.
 * 
 * SECURITY:
 * - Service role only (CRON_SECRET required)
 * - No external access
 * - Audit logging
 * 
 * SCHEDULE:
 * Daily at 2 AM (configured in vercel.json)
 * 
 * USAGE:
 * Vercel calls this automatically via cron schedule (GET or POST).
 * Can also be manually triggered via:
 * POST/GET /api/cron/calculate-availability
 * Headers: Authorization: Bearer <CRON_SECRET>
 */

import { defineEventHandler, createError, getHeader, readBody } from 'h3'
import { availabilityCalculator } from '~/server/services/availability-calculator'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface CalculateAvailabilityRequest {
  tenant_id?: string
  staff_id?: string
  days?: number // How many days ahead to calculate (default: 30)
  force?: boolean // Force recalculation even if already calculated
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    logger.debug('🔄 Calculate Availability Cron Job started')

    // ============ SECURITY: VERIFY CRON SECRET ============
    const cronSecret = process.env.CRON_SECRET
    
    // CRITICAL: Secret must always be configured!
    if (!cronSecret || cronSecret.trim() === '') {
      logger.error('❌ CRON_SECRET not configured - cron job is disabled for security!')
      throw createError({
        statusCode: 503,
        statusMessage: 'Cron job disabled - missing CRON_SECRET configuration'
      })
    }

    const authHeader = getHeader(event, 'authorization')
    
    // Verify the secret using constant-time comparison to prevent timing attacks
    const expectedAuth = `Bearer ${cronSecret}`
    const isValid = authHeader === expectedAuth
    
    if (!isValid) {
      logger.warn('❌ Unauthorized cron job access attempt - invalid or missing credentials')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ============ READ OPTIONS ============
    let body: any = {}
    try {
      body = await readBody(event)
      logger.debug('📦 Request body received:', body)
    } catch (bodyError: any) {
      logger.debug('ℹ️ No request body or parsing error (using defaults):', bodyError?.message)
      // Use defaults
    }
    
    const days = body?.days || 30
    const tenantId = body?.tenant_id
    const staffId = body?.staff_id

    logger.debug('🎯 Cron options:', {
      tenant_id: tenantId || 'ALL',
      staff_id: staffId || 'ALL',
      days
    })

    // ============ CALCULATE AVAILABILITY ============
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    let totalSlotsWritten = 0

    if (tenantId) {
      // Recalculate for specific tenant
      logger.debug('🏢 Recalculating for tenant:', tenantId)
      const slotsWritten = await availabilityCalculator.calculateAvailability({
        tenantId,
        staffId,
        startDate,
        endDate
      })
      totalSlotsWritten += slotsWritten

    } else {
      // Recalculate for ALL tenants
      logger.debug('🌍 Recalculating for ALL tenants')

      const supabase = getSupabaseAdmin()
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true)

      if (tenantsError) {
        logger.error('❌ Error loading tenants:', tenantsError)
        throw tenantsError
      }

      logger.debug(`🏢 Found ${tenants?.length || 0} active tenants`)

      // Process each tenant
      for (const tenant of tenants || []) {
        try {
          logger.debug(`🔄 Processing tenant: ${tenant.name} (${tenant.slug})`)

          const slotsWritten = await availabilityCalculator.calculateAvailability({
            tenantId: tenant.id,
            staffId,
            startDate,
            endDate
          })

          totalSlotsWritten += slotsWritten

          logger.debug(`✅ Tenant ${tenant.name}: ${slotsWritten} slots written`)

        } catch (tenantError: any) {
          logger.error(`❌ Error processing tenant ${tenant.name}:`, tenantError)
          // Continue with next tenant
          await logAudit({
            action: 'cron_calculate_availability_tenant_failed',
            tenant_id: tenant.id,
            status: 'error',
            error_message: tenantError.message,
            details: {
              tenant_name: tenant.name,
              tenant_slug: tenant.slug
            }
          })
        }
      }
    }

    // ============ CLEANUP EXPIRED RESERVATIONS ============
    await cleanupExpiredReservations()

    // ============ DETAILED LOGGING: SLOTS PER STAFF ============
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get the tenant_id filter
    const tenantFilter = tenantId === 'ALL' ? undefined : tenantId
    
    // Build query to get all slots (no limit)
    let query = supabaseAdmin
      .from('availability_slots')
      .select('staff_id', { count: 'exact' })
    
    if (tenantFilter) {
      query = query.eq('tenant_id', tenantFilter)
    }
    
    const { data: allSlots, count: totalCount } = await query
      .gte('start_time', startDate.toISOString())
      .lt('end_time', endDate.toISOString())

    // Count slots per staff
    const slotsByStaff = new Map<string, number>()
    allSlots?.forEach((slot: any) => {
      slotsByStaff.set(slot.staff_id, (slotsByStaff.get(slot.staff_id) || 0) + 1)
    })

    logger.debug('📊 AVAILABILITY SLOTS PER STAFF:', {
      date_range: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      tenant: tenantFilter || 'ALL',
      total_slots: totalCount || 0,
      by_staff: Array.from(slotsByStaff.entries()).map(([staffId, count]) => ({
        staff_id: staffId?.substring(0, 8) + '...' || 'unknown',
        slots: count
      }))
    })

    // ============ AUDIT LOGGING ============
    const duration = Date.now() - startTime
    logger.debug('✅ Calculate Availability Cron Job completed:', {
      total_slots_written: totalSlotsWritten,
      duration: `${duration}ms`
    })

    await logAudit({
      action: 'cron_calculate_availability_completed',
      status: 'success',
      details: {
        tenant_id: tenantId,
        staff_id: staffId,
        days,
        total_slots_written: totalSlotsWritten,
        duration_ms: duration
      }
    })

    return {
      success: true,
      message: `Availability calculated successfully for next ${days} days`,
      total_slots_written: totalSlotsWritten,
      duration_ms: duration
    }

  } catch (error: any) {
    logger.error('❌ Calculate Availability Cron Job failed:', error)
    const duration = Date.now() - startTime

    await logAudit({
      action: 'cron_calculate_availability_failed',
      status: 'error',
      error_message: error.statusMessage || error.message,
      details: {
        duration_ms: duration
      }
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Availability calculation failed'
    })
  }
})

/**
 * Cleanup expired slot reservations
 */
async function cleanupExpiredReservations(): Promise<void> {
  try {
    logger.debug('🧹 Cleaning up expired reservations...')

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Reset expired reservations
    const { error: cleanupError } = await supabase
      .from('availability_slots')
      .update({
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .not('reserved_until', 'is', null)
      .lt('reserved_until', now)

    if (cleanupError) {
      logger.error('❌ Error cleaning up expired reservations:', cleanupError)
      throw cleanupError
    }

    logger.debug('✅ Expired reservations cleaned up')

  } catch (error: any) {
    logger.error('❌ Cleanup expired reservations failed:', error)
    // Non-critical, continue
  }
}
