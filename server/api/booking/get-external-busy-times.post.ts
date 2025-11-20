// server/api/booking/get-external-busy-times.post.ts
// Secure endpoint to fetch external busy times without user authentication
// Uses service role to bypass RLS and ensure tenant isolation via parameter

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, staff_id, start_date, end_date } = body

    // Validate required parameters
    if (!tenant_id || !staff_id || !start_date || !end_date) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: tenant_id, staff_id, start_date, end_date'
      })
    }

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    console.log('📅 Fetching external busy times:', {
      tenant_id,
      staff_id,
      start_date,
      end_date
    })

    // Fetch external busy times with tenant isolation
    // Important: We still filter by tenant_id on the server to ensure security
    const { data: busyTimes, error: busyError } = await serviceSupabase
      .from('external_busy_times')
      .select('id, staff_id, start_time, end_time, event_title, sync_source')
      .eq('tenant_id', tenant_id)
      .eq('staff_id', staff_id)
      .gte('start_time', start_date)
      .lte('end_time', end_date)

    if (busyError) {
      console.error('❌ Error fetching busy times:', busyError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching busy times'
      })
    }

    console.log('✅ Fetched external busy times:', busyTimes?.length || 0, 'entries')

    return {
      success: true,
      data: busyTimes || [],
      count: busyTimes?.length || 0
    }

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

