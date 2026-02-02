import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
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

  try {
    if (action === 'load') {
      // Get internal user ID from auth_user_id
      const { authUserId } = data

      if (!authUserId) {
        throw createError({
          statusCode: 400,
          message: 'authUserId is required'
        })
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single()

      if (userError || !userData?.id) {
        console.error('Error loading user data:', userError)
        throw createError({
          statusCode: 404,
          message: 'User not found'
        })
      }

      // Load external calendars
      const { data: calendars, error } = await supabase
        .from('external_calendars')
        .select('*')
        .eq('staff_id', userData.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: calendars || []
      }
    } else if (action === 'connect') {
      // Get user's tenant_id and internal users.id (staff id)
      const { authUserId, provider, account_identifier, calendar_name, ics_url } = data

      if (!authUserId || !provider) {
        throw createError({
          statusCode: 400,
          message: 'authUserId and provider are required'
        })
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', authUserId)
        .single()

      if (userError || !userData?.tenant_id || !userData?.id) {
        throw createError({
          statusCode: 404,
          message: 'User or tenant not found'
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

      return {
        success: true,
        message: 'Kalender erfolgreich verbunden!'
      }
    } else if (action === 'disconnect') {
      const { calendarId } = data

      if (!calendarId) {
        throw createError({
          statusCode: 400,
          message: 'calendarId is required'
        })
      }

      const { error } = await supabase
        .from('external_calendars')
        .delete()
        .eq('id', calendarId)

      if (error) throw error

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
    console.error('❌ External calendars API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to manage external calendars'
    })
  }
})
