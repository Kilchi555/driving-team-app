import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

/**
 * GET /api/customer/get-learning-progress
 * 
 * Secure API for fetching customer learning progress data
 * 
 * Security Layers:
 * ✅ Layer 1: Authentication (user must be logged in)
 * ✅ Layer 2: Authorization (customer/client only)
 * ✅ Layer 3: Rate Limiting (60 req/min per user)
 * ✅ Layer 4: Tenant Isolation (can only see own data)
 * ✅ Layer 5: Audit Logging (all access logged)
 * 
 * Returns:
 * - Student categories (from users.category + appointments.type)
 * - Appointments with evaluations
 * - Evaluation scale (max rating)
 * - Notes with criteria ratings
 * - Evaluation categories (with progress)
 * - Evaluation criteria (with educational content)
 */

interface LearningProgressResponse {
  success: boolean
  data: {
    studentCategories: string[]
    appointments: any[]
    maxRating: number
    notes: any[]
    categories: any[]
    criteria: any[]
  }
}

export default defineEventHandler(async (event): Promise<LearningProgressResponse> => {
  const startTime = Date.now()
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, category')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ User profile not found:', authUser.id)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // ============ LAYER 2: AUTHORIZATION ============
    const allowedRoles = ['client', 'admin', 'staff']
    if (!allowedRoles.includes(userProfile.role)) {
      logger.warn('⚠️ Unauthorized access attempt:', {
        userId: userProfile.id,
        role: userProfile.role,
        requiredRoles: allowedRoles
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Customer access required'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ============ LAYER 3: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      userId,
      'get_learning_progress',
      60, // 60 requests per minute
      60 * 1000
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Rate limit exceeded:', {
        userId,
        operation: 'get_learning_progress'
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    logger.debug('📊 Fetching learning progress:', {
      tenantId,
      userId
    })

    // ============ LAYER 4: TENANT ISOLATION + DATA LOADING ============
    
    // 1. Get student categories (from users.category)
    let studentCategories: string[] = []
    if (userProfile.category) {
      if (Array.isArray(userProfile.category)) {
        studentCategories.push(...userProfile.category)
      } else {
        studentCategories.push(userProfile.category)
      }
    }

    // 2. Load appointments for this user (incl. older rows that may have tenant_id = null)
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('id, type')
      .eq('user_id', userId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

    if (appointmentsError) {
      logger.error('❌ Error fetching appointments:', appointmentsError)
      throw appointmentsError
    }

    // Add appointment categories to student categories
    const appointmentCategories = [...new Set(
      (appointments || [])
        .map(a => a.type)
        .filter(Boolean)
    )]
    studentCategories = [...new Set([...studentCategories, ...appointmentCategories])]

    logger.debug('🚗 Student categories:', studentCategories)

    const appointmentIds = (appointments || []).map(a => a.id)

    // 3. Load max evaluation scale rating
    const { data: scaleData, error: scaleError } = await supabaseAdmin
      .from('evaluation_scale')
      .select('rating')
      .order('rating', { ascending: false })
      .limit(1)

    if (scaleError) {
      logger.error('❌ Error fetching evaluation scale:', scaleError)
      throw scaleError
    }

    const maxRating = scaleData?.[0]?.rating || 5

    // 4. Load notes/evaluations for appointments
    let notes: any[] = []
    if (appointmentIds.length > 0) {
      const { data: notesData, error: notesError } = await supabaseAdmin
        .from('notes')
        .select('evaluation_criteria_id, criteria_rating, criteria_note, appointment_id')
        .in('appointment_id', appointmentIds)
        .not('evaluation_criteria_id', 'is', null)
        .or('criteria_rating.not.is.null,criteria_note.not.is.null')

      if (notesError) {
        logger.error('❌ Error fetching notes:', notesError)
        throw notesError
      }
      notes = notesData || []
    }

    // 5. Load ALL evaluation_categories for this tenant (incl. global ones with tenant_id = null)
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('evaluation_categories')
      .select('id, name, display_order, color, is_theory')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq('is_active', true)
      .order('display_order')

    if (categoriesError) {
      logger.error('❌ Error fetching categories:', categoriesError)
      throw categoriesError
    }

    // 6. Load ALL criteria for this tenant (incl. global categories with tenant_id = null)
    // Filter by category_id using already tenant-scoped categories — avoids unsupported cross-table .or() filter
    const categoryIds = (categories || []).map((c: any) => c.id)

    let criteria: any[] = []
    let criteriaError: any = null

    if (categoryIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('evaluation_criteria')
        .select(`
        id, 
        name, 
        educational_content, 
        driving_categories,
        category_id,
        display_order,
        always_visible,
        evaluation_categories!inner(id, name, display_order, color, tenant_id)
      `)
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('display_order')
      criteria = data || []
      criteriaError = error
    }

    if (criteriaError) {
      logger.error('❌ Error fetching criteria:', criteriaError)
      throw criteriaError
    }

    // ============ LAYER 5: AUDIT LOGGING ============
    await logAudit({
      user_id: userId,
      tenant_id: tenantId,
      action: 'get_learning_progress',
      resource_type: 'learning_progress',
      resource_id: userId,
      status: 'success',
      details: {
        student_categories: studentCategories.length,
        appointments_count: appointments?.length || 0,
        notes_count: notes.length,
        categories_count: categories?.length || 0,
        criteria_count: criteria?.length || 0,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Learning progress fetched successfully:', {
      tenantId,
      userId,
      categoriesCount: studentCategories.length,
      appointmentsCount: appointments?.length || 0,
      notesCount: notes.length,
      durationMs: Date.now() - startTime
    })

    return {
      success: true,
      data: {
        studentCategories,
        appointments: appointments || [],
        maxRating,
        notes,
        categories: categories || [],
        criteria: criteria || []
      }
    }
  } catch (error: any) {
    logger.error('❌ Error in get-learning-progress API:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

