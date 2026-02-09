/**
 * Public API: Check Appointment Conflicts
 * 
 * PURPOSE:
 * Check if a proposed appointment time conflicts with existing appointments.
 * Used on public booking page (no authentication required).
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Rate limited (20/min per IP)
 * - Input validation (datetime format, UUID)
 * - Tenant isolation (via slug parameter)
 * - Returns minimal conflict info (no sensitive data)
 * 
 * USAGE:
 * POST /api/booking/check-conflicts
 * Body: { 
 *   slug: "driving-team",
 *   staff_id: "<uuid>",
 *   start_time: "2026-02-10T10:00:00Z",
 *   end_time: "2026-02-10T11:30:00Z"
 * }
 */

import { defineEventHandler, readBody, createError, H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

interface CheckConflictsRequest {
  slug: string
  staff_id: string
  start_time: string
  end_time: string
}

export default defineEventHandler(async (event: H3Event) => {
  const ipAddress = getClientIP(event)

  try {
    logger.debug('🔍 Check Conflicts API called')

    // ============ LAYER 1: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      ipAddress,
      'check_conflicts',
      20, // 20 requests per minute per IP
      60000 // 60 seconds
    )

    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ============ LAYER 2: INPUT VALIDATION ============
    const body = await readBody(event) as CheckConflictsRequest

    if (!body.slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slug is required'
      })
    }

    if (!body.staff_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staff_id is required'
      })
    }

    if (!body.start_time || !body.end_time) {
      throw createError({
        statusCode: 400,
        statusMessage: 'start_time and end_time are required'
      })
    }

    // Validate datetime format (ISO 8601)
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    if (!dateRegex.test(body.start_time) || !dateRegex.test(body.end_time)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid datetime format. Use ISO 8601 format (e.g., 2026-02-10T12:00:00Z)'
      })
    }

    // Normalize datetime strings to ISO 8601 with Z suffix
    let startTime = body.start_time
    let endTime = body.end_time
    
    // If no timezone suffix, add Z
    if (!startTime.includes('+') && !startTime.includes('Z') && !startTime.includes('-00')) {
      startTime = startTime + 'Z'
    }
    if (!endTime.includes('+') && !endTime.includes('Z') && !endTime.includes('-00')) {
      endTime = endTime + 'Z'
    }

    logger.debug('🔍 Conflict check times:', { startTime, endTime })

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(body.staff_id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid staff ID format'
      })
    }

    // ============ LAYER 3: RESOLVE TENANT FROM SLUG ============
    const supabase = getSupabaseAdmin()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ Tenant not found for slug:', body.slug)
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    const tenantId = tenant.id

    // ============ LAYER 4: CHECK FOR CONFLICTS ============
    // Find appointments that overlap with the given time range
    // Note: Supabase comparison operators work with ISO 8601 datetime strings
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status')
      .eq('tenant_id', tenantId)
      .eq('staff_id', body.staff_id)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime)

    if (conflictError) {
      logger.error('❌ Error checking conflicts:', conflictError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check appointment conflicts'
      })
    }

    const hasConflict = conflicts && conflicts.length > 0

    logger.debug('✅ Conflict check completed:', {
      tenantId,
      staffId: body.staff_id,
      hasConflict,
      conflictCount: conflicts?.length || 0
    })

    return {
      success: true,
      has_conflict: hasConflict,
      conflict_count: conflicts?.length || 0
    }

  } catch (error: any) {
    logger.error('❌ Check Conflicts API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to check appointment conflicts'
    })
  }
})
