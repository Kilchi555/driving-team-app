// server/api/appointments/get-appointment-info.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface GetAppointmentInfoBody {
  action: 'last-duration' | 'last-category' | 'duration-by-category' | 'lesson-duration'
  studentId?: string
  categoryCode?: string
  staffId?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<GetAppointmentInfoBody>(event)
    const { action } = body

    logger.debug('📋 Appointment info action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ========== LAST DURATION ==========
    if (action === 'last-duration') {
      if (!body.studentId) {
        throw new Error('Student ID required')
      }

      logger.debug('⏱️ Getting last duration for student:', body.studentId)

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', body.studentId)
        .is('deleted_at', null)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'aborted')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Last duration found:', data?.duration_minutes)

      return {
        success: true,
        data: data?.duration_minutes || null
      }
    }

    // ========== LAST CATEGORY ==========
    if (action === 'last-category') {
      if (!body.studentId) {
        throw new Error('Student ID required')
      }

      logger.debug('🎯 Getting last category for student:', body.studentId)

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('type')
        .eq('user_id', body.studentId)
        .is('deleted_at', null)
        .in('status', ['completed', 'confirmed'])
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        logger.warn('⚠️ Error fetching last category:', error)
        return {
          success: true,
          data: null
        }
      }

      logger.debug('✅ Last category found:', data?.type)

      return {
        success: true,
        data: data?.type || null
      }
    }

    // ========== DURATION BY CATEGORY ==========
    if (action === 'duration-by-category') {
      if (!body.categoryCode || !body.staffId) {
        throw new Error('Category code and staff ID required')
      }

      logger.debug('⏱️ Getting duration for category:', body.categoryCode)

      // Get user's tenant first
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (userError || !userData?.tenant_id) {
        throw new Error('User tenant not found')
      }

      // Use .limit(1) to avoid "multiple rows" error when parent category has duplicate entries
      // Prefer non-parent categories (with parent_category_id set) over parent entries
      const { data: rows, error } = await supabaseAdmin
        .from('categories')
        .select('lesson_duration_minutes, exam_duration_minutes, parent_category_id')
        .eq('code', body.categoryCode)
        .eq('tenant_id', userData.tenant_id)
        .eq('is_active', true)

      if (error) {
        logger.warn('⚠️ Duration query error, using defaults:', error.message)
        return { success: true, data: { lesson_duration: 45, exam_duration: 90 } }
      }

      // Prefer the non-parent entry (leaf category) if multiple rows exist
      const data = rows && rows.length > 0
        ? (rows.find(r => r.parent_category_id !== null) ?? rows[0])
        : null

      logger.debug('✅ Duration data found:', { rows: rows?.length, selected: data?.lesson_duration_minutes })

      return {
        success: true,
        data: {
          lesson_duration: data?.lesson_duration_minutes || 45,
          exam_duration: data?.exam_duration_minutes || 90
        }
      }
    }

    // ========== LESSON DURATION ==========
    if (action === 'lesson-duration') {
      if (!body.categoryCode) {
        throw new Error('Category code required')
      }

      logger.debug('⏱️ Getting lesson duration for category:', body.categoryCode)

      // Get user's tenant first
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (userError || !userData?.tenant_id) {
        throw new Error('User tenant not found')
      }

      const { data: rows2, error } = await supabaseAdmin
        .from('categories')
        .select('lesson_duration_minutes, parent_category_id')
        .eq('code', body.categoryCode)
        .eq('tenant_id', userData.tenant_id)
        .eq('is_active', true)

      if (error) {
        logger.warn('⚠️ Lesson duration query error, using default:', error.message)
        return { success: true, data: 45 }
      }

      const data2 = rows2 && rows2.length > 0
        ? (rows2.find(r => r.parent_category_id !== null) ?? rows2[0])
        : null

      logger.debug('✅ Lesson duration found:', data2?.lesson_duration_minutes)

      return {
        success: true,
        data: data2?.lesson_duration_minutes || 45
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error getting appointment info:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to get appointment info'
    })
  }
})
