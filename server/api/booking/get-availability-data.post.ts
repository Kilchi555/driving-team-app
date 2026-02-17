// server/api/booking/get-availability-data.post.ts
// Secure endpoint to fetch availability data without user authentication
// Uses service role to bypass RLS and ensure tenant isolation via parameter


import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, staff_id, start_date, end_date, include_working_hours = true, include_busy_times = true, include_appointments = true } = body

    // Validate required parameters
    if (!tenant_id || !staff_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: tenant_id, staff_id'
      })
    }

    // Create anon client to respect RLS policies
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!anonKey) {
      console.error('❌ SUPABASE_ANON_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, anonKey)

    logger.debug('📅 Fetching availability data:', {
      tenant_id,
      staff_id,
      start_date,
      end_date,
      include_working_hours,
      include_busy_times,
      include_appointments
    })

    const response: any = { success: true }

    // Fetch working hours
    if (include_working_hours) {
      const { data: workingHours, error: whError } = await supabase
        .from('staff_working_hours')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('staff_id', staff_id)
        .eq('is_active', true)

      if (whError) {
        console.warn('⚠️ Error fetching working hours:', whError)
      } else {
        response.working_hours = workingHours || []
        logger.debug('✅ Fetched working hours:', workingHours?.length || 0)
      }
    }

    // Fetch external busy times
    if (include_busy_times && start_date && end_date) {
      const { data: busyTimes, error: busyError } = await supabase
        .from('external_busy_times')
        .select('id, staff_id, start_time, end_time, event_title, sync_source')
        .eq('tenant_id', tenant_id)
        .eq('staff_id', staff_id)
        .gte('start_time', start_date)
        .lte('end_time', end_date)

      if (busyError) {
        console.warn('⚠️ Error fetching busy times:', busyError)
      } else {
        response.external_busy_times = busyTimes || []
        logger.debug('✅ Fetched external busy times:', busyTimes?.length || 0)
      }
    }

    // Fetch appointments
    if (include_appointments && start_date && end_date) {
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('staff_id', staff_id)
        .not('status', 'eq', 'deleted')
        .is('deleted_at', null)
        .gte('start_time', start_date)
        .lte('end_time', end_date)

      if (aptError) {
        console.warn('⚠️ Error fetching appointments:', aptError)
      } else {
        response.appointments = appointments || []
        logger.debug('✅ Fetched appointments:', appointments?.length || 0)
      }
    }

    return response

  } catch (error: any) {
    console.error('❌ Error in get-external-busy-times endpoint:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

