import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Use service role to bypass RLS
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get all error logs (no RLS restrictions with service role)
    const { data, error, count } = await adminSupabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching error logs:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch error logs'
      })
    }

    return {
      success: true,
      count: count || 0,
      data: data || [],
    }
  } catch (err) {
    console.error('Error in error-logs endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Internal server error'
    })
  }
})

