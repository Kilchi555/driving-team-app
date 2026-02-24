/**
 * API: Manage external busy times (from external calendars)
 * 
 * PURPOSE:
 * Create, update, or delete external busy times
 * Immediately invalidates/releases overlapping availability slots
 * 
 * USAGE:
 * POST /api/staff/manage-external-busy-times
 * Body: {
 *   action: 'create' | 'update' | 'delete',
 *   staffId: string,
 *   ...details based on action
 * }
 */

import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'

interface CreateExternalBusyTimeRequest {
  action: 'create'
  staff_id: string
  start_time: string
  end_time: string
  tenant_id: string
  title?: string
  source?: string // e.g., "google_calendar", "manual"
}

interface UpdateExternalBusyTimeRequest {
  action: 'update'
  id: string
  staff_id: string
  old_start_time: string
  old_end_time: string
  start_time: string
  end_time: string
  tenant_id: string
}

interface DeleteExternalBusyTimeRequest {
  action: 'delete'
  id: string
  staff_id: string
  start_time: string
  end_time: string
  tenant_id: string
}

type ManageBusyTimeRequest = 
  | CreateExternalBusyTimeRequest 
  | UpdateExternalBusyTimeRequest 
  | DeleteExternalBusyTimeRequest

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const slotManager = createAvailabilitySlotManager(supabase)
    
    const body = await readBody<ManageBusyTimeRequest>(event)
    const { action } = body

    logger.debug('🔄 External busy time action:', action)

    // ========== CREATE EXTERNAL BUSY TIME ==========
    if (action === 'create') {
      const { staff_id, start_time, end_time, tenant_id, title, source } = 
        body as CreateExternalBusyTimeRequest

      logger.debug('➕ Creating external busy time:', {
        staff_id: staff_id.substring(0, 8),
        start_time,
        end_time,
        source
      })

      // 1. Insert into external_busy_times
      const { data: busyTime, error: insertError } = await supabase
        .from('external_busy_times')
        .insert({
          staff_id,
          start_time,
          end_time,
          tenant_id,
          title: title || 'Busy Time',
          source: source || 'manual'
        })
        .select()
        .single()

      if (insertError) {
        logger.error('❌ Error creating external busy time:', insertError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create external busy time'
        })
      }

      logger.debug('✅ External busy time created:', busyTime.id)

      // 2. Immediately invalidate overlapping availability slots
      try {
        const invalidateResult = await slotManager.invalidateSlots(
          staff_id,
          start_time,
          end_time,
          tenant_id
        )
        logger.debug(`✅ Invalidated ${invalidateResult.invalidatedCount} overlapping slots`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to invalidate slots (non-critical):', slotError.message)
        // Non-critical: slots will be regenerated at next cron
      }

      // 3. Queue recalculation to ensure slots are properly updated
      try {
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id,
            tenant_id,
            trigger: 'external_busy_time_created'
          }
        })
        logger.debug('✅ Queued recalculation after external busy time creation')
      } catch (queueError: any) {
        logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
      }

      return {
        success: true,
        message: 'External busy time created',
        data: busyTime
      }
    }

    // ========== UPDATE EXTERNAL BUSY TIME ==========
    if (action === 'update') {
      const {
        id,
        staff_id,
        old_start_time,
        old_end_time,
        start_time,
        end_time,
        tenant_id
      } = body as UpdateExternalBusyTimeRequest

      logger.debug('✏️ Updating external busy time:', {
        id: id.substring(0, 8),
        oldTime: `${old_start_time} - ${old_end_time}`,
        newTime: `${start_time} - ${end_time}`
      })

      // 1. Update in external_busy_times
      const { data: busyTime, error: updateError } = await supabase
        .from('external_busy_times')
        .update({
          start_time,
          end_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        logger.error('❌ Error updating external busy time:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update external busy time'
        })
      }

      logger.debug('✅ External busy time updated:', busyTime.id)

      // 2. Release slots from OLD time
      try {
        const releaseResult = await slotManager.releaseSlots(
          staff_id,
          old_start_time,
          old_end_time,
          tenant_id
        )
        logger.debug(`✅ Released ${releaseResult.releasedCount} slots from old time`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to release old slots (non-critical):', slotError.message)
      }

      // 3. Invalidate slots for NEW time
      try {
        const invalidateResult = await slotManager.invalidateSlots(
          staff_id,
          start_time,
          end_time,
          tenant_id
        )
        logger.debug(`✅ Invalidated ${invalidateResult.invalidatedCount} slots for new time`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to invalidate new slots (non-critical):', slotError.message)
      }

      // 4. Queue recalculation
      try {
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id,
            tenant_id,
            trigger: 'external_busy_time_updated'
          }
        })
        logger.debug('✅ Queued recalculation after external busy time update')
      } catch (queueError: any) {
        logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
      }

      return {
        success: true,
        message: 'External busy time updated',
        data: busyTime
      }
    }

    // ========== DELETE EXTERNAL BUSY TIME ==========
    if (action === 'delete') {
      const { id, staff_id, start_time, end_time, tenant_id } = 
        body as DeleteExternalBusyTimeRequest

      logger.debug('🗑️ Deleting external busy time:', {
        id: id.substring(0, 8),
        start_time,
        end_time
      })

      // 1. Delete from external_busy_times
      const { error: deleteError } = await supabase
        .from('external_busy_times')
        .delete()
        .eq('id', id)

      if (deleteError) {
        logger.error('❌ Error deleting external busy time:', deleteError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to delete external busy time'
        })
      }

      logger.debug('✅ External busy time deleted:', id)

      // 2. Release overlapping availability slots
      try {
        const releaseResult = await slotManager.releaseSlots(
          staff_id,
          start_time,
          end_time,
          tenant_id
        )
        logger.debug(`✅ Released ${releaseResult.releasedCount} overlapping slots`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to release slots (non-critical):', slotError.message)
        // Non-critical: slots will be regenerated at next cron
      }

      // 3. Queue recalculation
      try {
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id,
            tenant_id,
            trigger: 'external_busy_time_deleted'
          }
        })
        logger.debug('✅ Queued recalculation after external busy time deletion')
      } catch (queueError: any) {
        logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
      }

      return {
        success: true,
        message: 'External busy time deleted'
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Unknown action: ${action}`
    })
  } catch (error: any) {
    logger.error('❌ Error managing external busy time:', error)
    
    // If it's already a createError, throw it
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to manage external busy time'
    })
  }
})
