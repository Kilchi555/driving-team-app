import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireTenantStaff,
  authorizeWorkingHoursMutation,
} from '~/server/utils/require-tenant-auth'
import { logger } from '~/utils/logger'
import { enqueueStaffAvailabilityRecalc } from '~/server/utils/queue-availability-recalc'

/**
 * Manage staff working hours
 * Handles GET, POST, DELETE for staff_working_hours
 */

interface WorkingHourRequest {
  action: 'list' | 'save' | 'save_day' | 'delete'
  staffId: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  isActive?: boolean
  blocks?: Array<{ start_time: string; end_time: string; is_active: boolean }>
}

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireTenantStaff(event)
    const body = await readBody<WorkingHourRequest>(event)

    if (!body.staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Staff ID required'
      })
    }

    if (!body.action) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Action required (list, save, save_day, delete)'
      })
    }

    const supabase = getSupabaseAdmin()
    const target = await authorizeWorkingHoursMutation(supabase, actor, body.staffId)
    const tenantId = actor.tenant_id

    logger.debug('📊 Working hours API:', { action: body.action, staffId: body.staffId })

    // LIST - Get all working hours for staff
    if (body.action === 'list') {
      const { data, error } = await supabase
        .from('staff_working_hours')
        .select('*')
        .eq('staff_id', target.id)
        .eq('tenant_id', tenantId)
        .order('day_of_week')

      if (error) throw error

      logger.debug('✅ Working hours listed:', data?.length || 0)
      return {
        success: true,
        data: data || []
      }
    }

    // SAVE - Create or update working hour
    if (body.action === 'save') {
      if (body.dayOfWeek === undefined) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Day of week required'
        })
      }

      // Delete existing entries for this day
      const { error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', target.id)
        .eq('tenant_id', tenantId)
        .eq('day_of_week', body.dayOfWeek)

      if (deleteError) throw deleteError

      // Insert new entry if active
      if (body.isActive) {
        const { data: insertedData, error: insertError } = await supabase
          .from('staff_working_hours')
          .insert([{
            staff_id: target.id,
            day_of_week: body.dayOfWeek,
            start_time: body.startTime,
            end_time: body.endTime,
            is_active: true,
            tenant_id: tenantId,
            timezone: 'Europe/Zurich'
          }])
          .select()

        if (insertError) throw insertError

        logger.debug('✅ Working hours saved')

        await enqueueStaffAvailabilityRecalc({
          staff_id: target.id,
          tenant_id: tenantId,
          trigger: 'working_hours',
        })

        return {
          success: true,
          data: insertedData?.[0] || {}
        }
      } else {
        logger.debug('✅ Working hours cleared for day')

        await enqueueStaffAvailabilityRecalc({
          staff_id: target.id,
          tenant_id: tenantId,
          trigger: 'working_hours',
        })

        return {
          success: true,
          data: {}
        }
      }
    }

    // DELETE - Clear all working hours
    if (body.action === 'delete') {
      const { error } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', target.id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      logger.debug('✅ All working hours cleared')

      await enqueueStaffAvailabilityRecalc({
        staff_id: target.id,
        tenant_id: tenantId,
        trigger: 'working_hours',
      })

      return {
        success: true
      }
    }

    // SAVE_DAY - Save multiple blocks for a day
    if (body.action === 'save_day') {
      if (body.dayOfWeek === undefined) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Day of week required'
        })
      }

      // Ein leeres blocks-Array ist gültig: Damit wird der Tag deaktiviert
      // (alle bestehenden Einträge werden weiter unten gelöscht und keine neuen angelegt).
      const requestedBlocks = body.blocks || []

      // Delete existing entries for this day
      const { error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', target.id)
        .eq('tenant_id', tenantId)
        .eq('day_of_week', body.dayOfWeek)

      if (deleteError) throw deleteError

      // Insert new entries for each block
      const blocksToInsert = requestedBlocks
        .filter(block => block.is_active)
        .map(block => ({
          staff_id: target.id,
          day_of_week: body.dayOfWeek,
          start_time: block.start_time,
          end_time: block.end_time,
          is_active: true,
          tenant_id: tenantId,
          timezone: 'Europe/Zurich'
        }))

      if (blocksToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('staff_working_hours')
          .insert(blocksToInsert)
          .select()

        if (insertError) throw insertError

        logger.debug('✅ Working day blocks saved:', blocksToInsert.length)

        await enqueueStaffAvailabilityRecalc({
          staff_id: target.id,
          tenant_id: tenantId,
          trigger: 'working_hours',
        })

        return {
          success: true,
          data: insertedData || []
        }
      } else {
        logger.debug('✅ Working day cleared for all blocks')

        await enqueueStaffAvailabilityRecalc({
          staff_id: target.id,
          tenant_id: tenantId,
          trigger: 'working_hours',
        })

        return {
          success: true,
          data: []
        }
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid action'
    })

  } catch (error: any) {
    logger.error('❌ Working hours API error:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Working hours operation failed'
    })
  }
})
