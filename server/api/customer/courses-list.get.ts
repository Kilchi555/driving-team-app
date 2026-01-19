/**
 * GET /api/customer/courses-list
 * 
 * Fetch courses and categories for customer
 * 3-Layer: Auth → Transform → DB + Cache
 * 
 * Security: Tenant isolation, RLS enforcement, field filtering
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (courses can change more often)
const coursesCache = new Map<string, { data: any; timestamp: number }>()

interface TransformedCourse {
  id: string
  name: string
  description?: string
  categoryId: string
  categoryName: string
  price: number
  maxParticipants: number
  currentParticipants: number
  status: string
  registrationDeadline?: string
  sessions: any[]
}

/**
 * LAYER 2: Data Transformation
 */
const transformCourse = (course: any): TransformedCourse => ({
  id: course.id,
  name: course.name,
  description: course.description,
  categoryId: course.course_category_id,
  categoryName: course.course_categories?.name || 'Uncategorized',
  price: course.price_per_participant_rappen || 0,
  maxParticipants: course.max_participants,
  currentParticipants: course.current_participants || 0,
  status: course.status,
  registrationDeadline: course.registration_deadline,
  sessions: (course.course_sessions || [])
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((session: any) => ({
      id: session.id,
      number: session.session_number,
      startTime: session.start_time,
      endTime: session.end_time
    }))
})

/**
 * LAYER 3: Database + Cache
 */
const fetchCoursesFromDb = async (tenantId: string): Promise<any> => {
  const supabase = getSupabaseAdmin()
  
  try {
    logger.debug(`📚 Fetching courses for tenant: ${tenantId}`)
    
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        description,
        price_per_participant_rappen,
        max_participants,
        current_participants,
        status,
        registration_deadline,
        course_category_id,
        course_categories (
          id,
          name
        ),
        course_sessions (
          id,
          session_number,
          start_time,
          end_time
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('name')
    
    if (coursesError) {
      logger.error(`❌ Database error fetching courses:`, coursesError)
      return { courses: [], categories: [] }
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('course_categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')

    if (categoriesError) {
      logger.error(`❌ Database error fetching categories:`, categoriesError)
    }

    logger.debug(`✅ Fetched ${courses?.length || 0} courses and ${categories?.length || 0} categories`)
    
    return {
      courses: courses || [],
      categories: categories || []
    }
  } catch (err: any) {
    logger.error('❌ Unexpected error in fetchCoursesFromDb:', err)
    return { courses: [], categories: [] }
  }
}

const getCachedCourses = (tenantId: string): any | null => {
  const cached = coursesCache.get(tenantId)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    coursesCache.delete(tenantId)
    return null
  }
  
  logger.debug(`⚡ Cache HIT for courses (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`)
  return cached.data
}

const setCachedCourses = (tenantId: string, data: any): void => {
  coursesCache.set(tenantId, { data, timestamp: Date.now() })
  logger.debug(`💾 Cached courses for ${tenantId}`)
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & VALIDATION ==========
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.slice(7)
    const supabase = getSupabaseAdmin()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // Get tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tenant not found'
      })
    }

    const tenantId = userData.tenant_id
    logger.debug(`🔐 Courses request for tenant: ${tenantId}`)

    // ========== LAYER 2+3: CACHE CHECK & DB FETCH ==========
    
    // Try cache
    let cachedData = getCachedCourses(tenantId)
    if (cachedData) {
      const duration = Date.now() - startTime
      return {
        success: true,
        courses: cachedData.courses,
        categories: cachedData.categories,
        cached: true,
        courseCount: cachedData.courses.length,
        categoryCount: cachedData.categories.length,
        duration
      }
    }

    // Fetch from DB
    const { courses: rawCourses, categories: rawCategories } = await fetchCoursesFromDb(tenantId)
    
    // Transform courses
    const transformedCourses = rawCourses.map(transformCourse)

    // Transform categories
    const transformedCategories = rawCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.name
    }))

    // Cache
    const cacheData = {
      courses: transformedCourses,
      categories: transformedCategories
    }
    setCachedCourses(tenantId, cacheData)

    const duration = Date.now() - startTime
    logger.debug(`✅ Courses request completed in ${duration}ms`)

    return {
      success: true,
      courses: transformedCourses,
      categories: transformedCategories,
      cached: false,
      courseCount: transformedCourses.length,
      categoryCount: transformedCategories.length,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ API error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

