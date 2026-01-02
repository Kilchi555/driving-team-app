import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

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

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get error trends for the last 30 days (by hour)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: errors, error: fetchError } = await adminSupabase
      .from('error_logs')
      .select('id, created_at, level, status')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch error trends'
      })
    }

    // Aggregate errors by hour
    const trends: Record<string, { total: number; error: number; warning: number; open: number; fixed: number }> = {}

    for (const error of errors || []) {
      const date = new Date(error.created_at)
      const hourKey = date.toISOString().substring(0, 13) + ':00:00' // Format: 2026-01-01T12:00:00

      if (!trends[hourKey]) {
        trends[hourKey] = { total: 0, error: 0, warning: 0, open: 0, fixed: 0 }
      }

      trends[hourKey].total++
      if (error.level === 'error') trends[hourKey].error++
      if (error.level === 'warn') trends[hourKey].warning++
      if (error.status === 'open') trends[hourKey].open++
      if (error.status === 'fixed') trends[hourKey].fixed++
    }

    // Convert to array and sort by date
    const trendArray = Object.entries(trends)
      .map(([timestamp, data]) => ({ timestamp, ...data }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    logger.debug('Error trends calculated:', { dataPoints: trendArray.length })

    return {
      success: true,
      trends: trendArray,
      summary: {
        totalErrors: errors?.length || 0,
        totalErrorLevel: errors?.filter(e => e.level === 'error').length || 0,
        totalWarningLevel: errors?.filter(e => e.level === 'warn').length || 0,
        openErrors: errors?.filter(e => e.status === 'open').length || 0,
        fixedErrors: errors?.filter(e => e.status === 'fixed').length || 0
      }
    }
  } catch (err) {
    console.error('Error in error-trends endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Internal server error'
    })
  }
})

