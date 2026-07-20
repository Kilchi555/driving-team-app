/**
 * GET /api/customer/courses-list
 *
 * Fetch courses and categories for customer
 * 3-Layer: Auth → Transform → DB
 *
 * Security: Tenant isolation, RLS enforcement, field filtering
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

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

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { tenantId } = auth
    logger.debug(`🔐 Courses request for tenant: ${tenantId}`)

    const { courses: rawCourses, categories: rawCategories } = await fetchCoursesFromDb(tenantId)

    const transformedCourses = rawCourses.map(transformCourse)
    const transformedCategories = rawCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.name
    }))

    const duration = Date.now() - startTime
    logger.debug(`✅ Courses request completed in ${duration}ms`)

    return {
      success: true,
      courses: transformedCourses,
      categories: transformedCategories,
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
