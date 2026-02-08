/**
 * Admin API: Cleanup Duplicate Availability Slots
 * 
 * PURPOSE:
 * Remove duplicate slots that have the same tenant_id, staff_id, location_id, start_time, end_time, duration_minutes, and category_code
 * Keeps only the first occurrence of each duplicate group.
 * 
 * SECURITY:
 * - Admin/Staff only endpoint
 * - Requires authentication
 * - Audit logging
 * 
 * USAGE:
 * POST /api/admin/cleanup-duplicate-slots
 * Headers: Authorization: Bearer <token>
 * Body: { tenant_id?: "<uuid>", staff_id?: "<uuid>", dry_run?: true }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🧹 Cleanup duplicate slots API called')

    // ============ AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Verify user is staff/admin
    const supabase = getSupabaseAdmin()
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile || !['staff', 'admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - admin or staff role required'
      })
    }

    // ============ READ OPTIONS ============
    const body = await readBody(event)
    const { tenant_id, staff_id, dry_run } = body

    const tenantId = tenant_id || userProfile.tenant_id
    logger.debug('🎯 Cleanup options:', { tenant_id: tenantId, staff_id, dry_run })

    // ============ FIND DUPLICATES ============
    // Get all slots for this tenant/staff
    let query = supabase
      .from('availability_slots')
      .select('id, tenant_id, staff_id, location_id, start_time, end_time, duration_minutes, category_code, created_at')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true })
      .order('created_at', { ascending: true })

    if (staff_id) {
      query = query.eq('staff_id', staff_id)
    }

    const { data: allSlots, error: queryError } = await query

    if (queryError) {
      logger.error('❌ Error querying slots:', queryError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to query slots'
      })
    }

    if (!allSlots || allSlots.length === 0) {
      logger.debug('✅ No slots found')
      return {
        success: true,
        message: 'No slots found',
        duplicates_found: 0,
        duplicates_to_delete: 0
      }
    }

    logger.debug(`📊 Found ${allSlots.length} total slots`)

    // Group slots by their unique key
    const slotGroups = new Map<string, any[]>()

    allSlots.forEach((slot: any) => {
      const key = `${slot.tenant_id}|${slot.staff_id}|${slot.location_id}|${slot.start_time}|${slot.end_time}|${slot.duration_minutes}|${slot.category_code}`
      if (!slotGroups.has(key)) {
        slotGroups.set(key, [])
      }
      slotGroups.get(key)!.push(slot)
    })

    // Find duplicates (groups with more than 1 slot)
    const duplicateSlots: any[] = []
    const slotsToDelete: any[] = []

    slotGroups.forEach((group: any[], key: string) => {
      if (group.length > 1) {
        duplicateSlots.push({ key, count: group.length, slots: group })
        // Keep first, delete the rest
        slotsToDelete.push(...group.slice(1))
      }
    })

    logger.debug(`🔍 Found ${duplicateSlots.length} duplicate groups with ${slotsToDelete.length} slots to delete`)

    if (slotsToDelete.length === 0) {
      logger.debug('✅ No duplicates found')
      return {
        success: true,
        message: 'No duplicates found',
        duplicates_found: 0,
        duplicates_to_delete: 0
      }
    }

    // ============ DRY RUN ============
    if (dry_run) {
      logger.debug('📋 DRY RUN MODE - not deleting')
      return {
        success: true,
        message: 'Dry run completed',
        duplicates_found: duplicateSlots.length,
        duplicates_to_delete: slotsToDelete.length,
        sample_duplicates: duplicateSlots.slice(0, 3),
        dry_run: true
      }
    }

    // ============ DELETE DUPLICATES ============
    logger.debug(`🗑️ Deleting ${slotsToDelete.length} duplicate slots...`)

    const idsToDelete = slotsToDelete.map((slot: any) => slot.id)

    const { error: deleteError, count: deletedCount } = await supabase
      .from('availability_slots')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      logger.error('❌ Error deleting slots:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete duplicate slots'
      })
    }

    logger.debug(`✅ Deleted ${deletedCount} duplicate slots`)

    // ============ AUDIT LOGGING ============
    await logAudit({
      auth_user_id: authUser.id,
      action: 'cleanup_duplicate_slots',
      status: 'success',
      details: {
        tenant_id: tenantId,
        staff_id,
        duplicates_found: duplicateSlots.length,
        slots_deleted: deletedCount
      }
    })

    return {
      success: true,
      message: `Cleanup completed - ${deletedCount} duplicate slots deleted`,
      duplicates_found: duplicateSlots.length,
      duplicates_deleted: deletedCount
    }

  } catch (error: any) {
    logger.error('❌ Cleanup duplicate slots failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Cleanup failed'
    })
  }
})
