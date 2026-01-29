import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const staffId = query.staffId as string
    const categoryCode = query.categoryCode as string

    // Verify auth
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    if (!staffId || !categoryCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load durations for staff + category
    const { data, error: fetchError } = await supabase
      .from('staff_category_durations')
      .select('duration_minutes')
      .eq('staff_id', staffId)
      .eq('category_code', categoryCode)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (fetchError) {
      logger.error('Error fetching durations:', fetchError)
      throw fetchError
    }

    const durations = data?.map(item => item.duration_minutes) || []
    
    // Fallback if no specific durations found
    if (durations.length === 0) {
      logger.debug('⚠️ No specific durations found, using category default')
      
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('lesson_duration_minutes')
        .eq('code', categoryCode)
        .eq('is_active', true)
        .maybeSingle()

      if (categoryError) throw categoryError
      
      const defaultDuration = categoryData?.lesson_duration_minutes || 45
      return { durations: [defaultDuration] }
    }

    return { durations: durations.sort((a: number, b: number) => a - b) }

  } catch (error: any) {
    logger.error('Error loading category durations:', error)
    throw error
  }
})
