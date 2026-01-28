import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Manage staff working hours
 * Handles GET, POST, DELETE for staff_working_hours
 */

interface WorkingHourRequest {
  action: 'list' | 'save' | 'delete'
  staffId: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  try {
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
        statusMessage: 'Action required (list, save, delete)'
      })
    }

    // Get Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    logger.debug('📊 Working hours API:', { action: body.action, staffId: body.staffId })

    // LIST - Get all working hours for staff
    if (body.action === 'list') {
      const { data, error } = await supabase
        .from('staff_working_hours')
        .select('*')
        .eq('staff_id', body.staffId)
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

      // Get tenant_id for this staff
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', body.staffId)
        .single()

      if (userError || !userData?.tenant_id) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Staff member not found'
        })
      }

      // Delete existing entries for this day
      const { error: deleteError } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', body.staffId)
        .eq('day_of_week', body.dayOfWeek)

      if (deleteError) throw deleteError

      // Insert new entry if active
      if (body.isActive) {
        const { data: insertedData, error: insertError } = await supabase
          .from('staff_working_hours')
          .insert({
            staff_id: body.staffId,
            day_of_week: body.dayOfWeek,
            start_time: body.startTime,
            end_time: body.endTime,
            is_active: true,
            tenant_id: userData.tenant_id
          })
          .select()

        if (insertError) throw insertError

        logger.debug('✅ Working hours saved')
        return {
          success: true,
          data: insertedData?.[0] || {}
        }
      } else {
        logger.debug('✅ Working hours cleared for day')
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
        .eq('staff_id', body.staffId)

      if (error) throw error

      logger.debug('✅ All working hours cleared')
      return {
        success: true
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
