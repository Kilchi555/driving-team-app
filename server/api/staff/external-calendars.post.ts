import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION (Server-side) ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const body = await readBody(event)
    const { action, data } = body

    if (!action) {
      throw createError({
        statusCode: 400,
        message: 'action is required (load, connect, disconnect)'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // ============ Get authenticated user's profile (NOT from client) ============
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.id) {
      logger.error('❌ External calendars: User profile not found', {
        authUserId: authUser.id,
        error: userError
      })
      throw createError({
        statusCode: 404,
        message: 'User profile not found'
      })
    }

    if (action === 'load') {

      // Load external calendars for authenticated user
      const { data: calendars, error } = await supabase
        .from('external_calendars')
        .select('*')
        .eq('staff_id', userData.id)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: calendars || []
      }
    } else if (action === 'connect') {
      // ============ LAYER 2: AUTHORIZATION FOR CONNECT ============
      const { provider, account_identifier, calendar_name, ics_url } = data

      if (!provider) {
        throw createError({
          statusCode: 400,
          message: 'provider is required'
        })
      }

      const calendarData = {
        tenant_id: userData.tenant_id,
        staff_id: userData.id,
        provider,
        account_identifier,
        calendar_name,
        connection_type: provider === 'ics' ? 'ics_url' : 'oauth',
        ics_url,
        sync_enabled: true
      }

      // Upsert: bei Duplikat aktualisieren statt Fehler
      const { error: upsertError } = await supabase
        .from('external_calendars')
        .upsert(calendarData, {
          onConflict: 'tenant_id,staff_id,provider,account_identifier'
        })

      if (upsertError) throw upsertError

      logger.info('📅 External calendar connected', {
        provider,
        staffId: userData.id,
        tenantId: userData.tenant_id
      })

      return {
        success: true,
        message: 'Kalender erfolgreich verbunden!'
      }
    } else if (action === 'disconnect') {
      // ============ LAYER 2: AUTHORIZATION FOR DISCONNECT ============
      const { calendarId } = data

      if (!calendarId) {
        throw createError({
          statusCode: 400,
          message: 'calendarId is required'
        })
      }

      // ✅ CRITICAL: Verify ownership before deletion
      const { data: calendar, error: calendarCheckError } = await supabase
        .from('external_calendars')
        .select('staff_id, tenant_id')
        .eq('id', calendarId)
        .single()

      if (calendarCheckError || !calendar) {
        throw createError({
          statusCode: 404,
          message: 'Calendar not found'
        })
      }

      // Verify user owns this calendar
      if (calendar.staff_id !== userData.id || calendar.tenant_id !== userData.tenant_id) {
        logger.warn('⚠️ Unauthorized calendar disconnect attempt', {
          calendarId,
          userId: userData.id,
          calendarStaffId: calendar.staff_id
        })
        throw createError({
          statusCode: 403,
          message: 'You do not have permission to disconnect this calendar'
        })
      }

      const { error } = await supabase
        .from('external_calendars')
        .delete()
        .eq('id', calendarId)

      if (error) throw error

      logger.info('📅 External calendar disconnected', {
        calendarId,
        staffId: userData.id
      })

      return {
        success: true,
        message: 'Kalender-Verbindung getrennt!'
      }
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid action. Use: load, connect, or disconnect'
      })
    }
  } catch (err: any) {
    logger.error('❌ External calendars API error:', {
      action,
      error: err.message,
      statusCode: err.statusCode
    })
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to manage external calendars'
    })
  }
})
