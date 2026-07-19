import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

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
    // ✅ SECURITY: this previously had NO auth check at all — any caller could
    // read/write any staff member's working hours by supplying an arbitrary
    // staffId. Require auth, and only allow acting on your own record unless
    // you're an admin/super_admin (and then only within your own tenant).
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const callerRole: string = authUser.role || authUser.profile?.role || ''
    const callerTenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''
    const callerDbUserId: string = authUser.db_user_id || authUser.profile?.id || ''

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

    const isSelf = !!callerDbUserId && callerDbUserId === body.staffId
    const isSuperAdmin = callerRole === 'super_admin'
    const isTenantAdmin = callerRole === 'admin' || callerRole === 'tenant_admin'

    if (!isSelf && !isSuperAdmin) {
      if (!isTenantAdmin) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
      // Tenant admin acting on someone else's record — verify same tenant.
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', body.staffId)
        .single()
      if (targetError || !targetUser || targetUser.tenant_id !== callerTenantId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    }

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
          .insert([{
            staff_id: body.staffId,
            day_of_week: body.dayOfWeek,
            start_time: body.startTime,
            end_time: body.endTime,
            is_active: true,
            tenant_id: userData.tenant_id,
            timezone: 'Europe/Zurich'
          }])
          .select()

        if (insertError) throw insertError

        logger.debug('✅ Working hours saved')

        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: { staff_id: body.staffId, tenant_id: userData.tenant_id, trigger: 'working_hours' }
        }).catch((e: any) => logger.warn('⚠️ Failed to queue recalc after working hours save:', e.message))

        return {
          success: true,
          data: insertedData?.[0] || {}
        }
      } else {
        logger.debug('✅ Working hours cleared for day')

        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: { staff_id: body.staffId, tenant_id: userData.tenant_id, trigger: 'working_hours' }
        }).catch((e: any) => logger.warn('⚠️ Failed to queue recalc after working hours clear:', e.message))

        return {
          success: true,
          data: {}
        }
      }
    }

    // DELETE - Clear all working hours
    if (body.action === 'delete') {
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

      const { error } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', body.staffId)

      if (error) throw error

      logger.debug('✅ All working hours cleared')

      await $fetch('/api/availability/queue-recalc', {
        method: 'POST',
        body: { staff_id: body.staffId, tenant_id: userData.tenant_id, trigger: 'working_hours' }
      }).catch((e: any) => logger.warn('⚠️ Failed to queue recalc after working hours delete:', e.message))

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

      // Insert new entries for each block
      const blocksToInsert = requestedBlocks
        .filter(block => block.is_active)
        .map(block => ({
          staff_id: body.staffId,
          day_of_week: body.dayOfWeek,
          start_time: block.start_time,
          end_time: block.end_time,
          is_active: true,
          tenant_id: userData.tenant_id,
          timezone: 'Europe/Zurich'
        }))

      if (blocksToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('staff_working_hours')
          .insert(blocksToInsert)
          .select()

        if (insertError) throw insertError

        logger.debug('✅ Working day blocks saved:', blocksToInsert.length)

        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: { staff_id: body.staffId, tenant_id: userData.tenant_id, trigger: 'working_hours' }
        }).catch((e: any) => logger.warn('⚠️ Failed to queue recalc after save_day:', e.message))

        return {
          success: true,
          data: insertedData || []
        }
      } else {
        logger.debug('✅ Working day cleared for all blocks')

        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: { staff_id: body.staffId, tenant_id: userData.tenant_id, trigger: 'working_hours' }
        }).catch((e: any) => logger.warn('⚠️ Failed to queue recalc after save_day clear:', e.message))

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
