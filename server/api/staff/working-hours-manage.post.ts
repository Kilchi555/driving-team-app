// server/api/staff/working-hours-manage.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'

interface ManageWorkingHoursBody {
  action: 'delete' | 'toggle'
  staffId: string
  dayOfWeek?: number
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageWorkingHoursBody>(event)
    const { action, staffId, dayOfWeek, isActive } = body

    logger.debug('⏰ Staff working hours action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ========== DELETE WORKING HOUR ==========
    if (action === 'delete') {
      if (!dayOfWeek) {
        throw new Error('Day of week required')
      }

      logger.debug('🗑️ Deleting working hour:', { staffId, dayOfWeek })

      // Verify staff can manage this (owner or admin)
      const { data: staff, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('id, user_id')
        .eq('id', staffId)
        .single()

      if (staffError || !staff) {
        throw new Error('Staff not found')
      }

      // Check authorization
      if (staff.user_id !== user.id) {
        throw new Error('Unauthorized to manage this staff')
      }

      // Get tenant_id for slot manager
      const { data: staffUser, error: userLookupError } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('id', staffId)
        .single()

      const tenantId = staffUser?.tenant_id

      const { error: deleteError } = await supabaseAdmin
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      logger.debug('✅ Working hour deleted')

      // ✅ NEW: Release all availability slots for this day
      // Get today's date and set to the specified day of week
      try {
        const slotManager = createAvailabilitySlotManager(supabaseAdmin)
        
        const today = new Date()
        const currentDay = today.getUTCDay()
        const daysUntilTarget = (dayOfWeek === 0 ? 7 : dayOfWeek) - (currentDay === 0 ? 7 : currentDay)
        const targetDate = new Date(today)
        targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilTarget)
        targetDate.setUTCHours(0, 0, 0, 0)

        const dayEnd = new Date(targetDate)
        dayEnd.setUTCHours(23, 59, 59, 999)

        logger.debug('🔓 Releasing slots for deleted working hours:', {
          staffId: staffId.substring(0, 8),
          dayOfWeek,
          date: targetDate.toISOString()
        })

        const releaseResult = await slotManager.releaseSlots(
          staffId,
          targetDate.toISOString(),
          dayEnd.toISOString(),
          tenantId
        )

        logger.debug(`✅ Released ${releaseResult.releasedCount} slots for deleted working hours`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to release slots (non-critical):', slotError.message)
        // Non-critical: slots will be regenerated at next cron
      }

      // ✅ NEW: Queue staff for availability recalculation
      if (!userLookupError && staffUser) {
        try {
          await $fetch('/api/availability/queue-recalc', {
            method: 'POST',
            body: {
              staff_id: staffId,
              tenant_id: staffUser.tenant_id,
              trigger: 'working_hours'
            }
          })
          logger.debug('✅ Queued staff for recalculation after working hours deletion')
        } catch (queueError: any) {
          logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
          // Non-critical: availability will be recalculated at next cron
        }
      }

      return {
        success: true,
        message: 'Working hour deleted'
      }
    }

    // ========== TOGGLE WORKING HOUR ==========
    if (action === 'toggle') {
      if (!dayOfWeek || isActive === undefined) {
        throw new Error('Day of week and isActive required')
      }

      logger.debug('🔄 Toggling working hour:', { staffId, dayOfWeek, isActive })

      // Verify staff can manage this (owner or admin)
      const { data: staff, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('id, user_id')
        .eq('id', staffId)
        .single()

      if (staffError || !staff) {
        throw new Error('Staff not found')
      }

      // Check authorization
      if (staff.user_id !== user.id) {
        throw new Error('Unauthorized to manage this staff')
      }

      // Get tenant_id for slot manager
      const { data: staffUser, error: userLookupError } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('id', staffId)
        .single()

      const tenantId = staffUser?.tenant_id

      const { error: updateError } = await supabaseAdmin
        .from('staff_working_hours')
        .update({ is_active: isActive })
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)

      if (updateError) {
        throw new Error(updateError.message)
      }

      logger.debug('✅ Working hour toggled')

      // ✅ NEW: If toggling to false (deactivating), release all slots for this day
      if (!isActive) {
        try {
          const slotManager = createAvailabilitySlotManager(supabaseAdmin)
          
          const today = new Date()
          const currentDay = today.getUTCDay()
          const daysUntilTarget = (dayOfWeek === 0 ? 7 : dayOfWeek) - (currentDay === 0 ? 7 : currentDay)
          const targetDate = new Date(today)
          targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilTarget)
          targetDate.setUTCHours(0, 0, 0, 0)

          const dayEnd = new Date(targetDate)
          dayEnd.setUTCHours(23, 59, 59, 999)

          logger.debug('🔓 Releasing slots for deactivated working hours:', {
            staffId: staffId.substring(0, 8),
            dayOfWeek,
            date: targetDate.toISOString()
          })

          const releaseResult = await slotManager.releaseSlots(
            staffId,
            targetDate.toISOString(),
            dayEnd.toISOString(),
            tenantId
          )

          logger.debug(`✅ Released ${releaseResult.releasedCount} slots for deactivated day`)
        } catch (slotError: any) {
          logger.warn('⚠️ Failed to release slots (non-critical):', slotError.message)
        }
      }

      // ✅ NEW: Queue staff for availability recalculation
      if (!userLookupError && staffUser) {
        try {
          await $fetch('/api/availability/queue-recalc', {
            method: 'POST',
            body: {
              staff_id: staffId,
              tenant_id: staffUser.tenant_id,
              trigger: 'working_hours'
            }
          })
          logger.debug('✅ Queued staff for recalculation after working hours change')
        } catch (queueError: any) {
          logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
          // Non-critical: availability will be recalculated at next cron
        }
      }

      return {
        success: true,
        data: { is_active: isActive }
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error managing working hours:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage working hours'
    })
  }
})
