import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user - use the DB ID version to get the correct user ID for queries
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    // Rate limit
    const rateLimitKey = `upcoming_courses:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    logger.debug('🔍 Fetching course registrations for user:', user.id)

    // Fetch course registrations for this user - simpler query without nested relations
    const { data: registrations, error: regError } = await supabase
      .from('course_registrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')

    if (regError) {
      logger.error('❌ Error loading course registrations:', regError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load course registrations' })
    }

    logger.debug('🔍 Raw registrations from DB:', registrations?.length || 0)
    if (registrations && registrations.length > 0) {
      logger.debug('   First reg:', {
        id: registrations[0].id,
        course_id: registrations[0].course_id,
        status: registrations[0].status,
        payment_status: registrations[0].payment_status,
        deleted_at: registrations[0].deleted_at
      })
    }

    // Filter out deleted registrations
    const activeRegistrations = (registrations || []).filter(r => !r.deleted_at)
    logger.debug('🔍 Active registrations (not deleted):', activeRegistrations.length)

    // For each registration, fetch the course_sessions
    const courseIds = [...new Set((activeRegistrations || []).map(r => r.course_id).filter(Boolean))]
    
    logger.debug('🔍 Course IDs to fetch sessions for:', courseIds.length, courseIds.slice(0, 3))
    
    // Fetch course info (name, etc)
    let coursesByIdMap: Record<string, any> = {}
    if (courseIds.length > 0) {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds)

      if (!coursesError && coursesData) {
        coursesData.forEach(course => {
          coursesByIdMap[course.id] = course
        })
        logger.debug('🔍 Loaded courses:', coursesData.length)
      } else if (coursesError) {
        logger.error('❌ Error loading courses:', coursesError)
      }
    }
    
    let sessionsByClass: Record<string, any[]> = {}
    if (courseIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('course_sessions')
        .select('*')
        .in('course_id', courseIds)
        .order('start_time', { ascending: true })

      if (!sessionsError && sessions) {
        logger.debug('🔍 Loaded course_sessions:', sessions.length)
        sessions.forEach(session => {
          if (!sessionsByClass[session.course_id]) {
            sessionsByClass[session.course_id] = []
          }
          sessionsByClass[session.course_id].push(session)
        })
      } else if (sessionsError) {
        logger.error('❌ Error loading sessions:', sessionsError)
      }
    }

    // Build final result with future sessions only
    const upcomingRegistrations = (activeRegistrations || [])
      .map((reg: any) => {
        let originalSessions = sessionsByClass[reg.course_id] || []
        
        logger.debug(`🔍 Reg ${reg.id}: Found ${originalSessions.length} sessions for course ${reg.course_id}`)
        
        // Start with original sessions, then apply custom overrides
        let sessions = originalSessions.map((session: any) => ({
          ...session,
          is_custom: false
        }))
        
        // If custom_sessions exist, replace the corresponding positions
        if (reg.custom_sessions && typeof reg.custom_sessions === 'object') {
          const customSessions = reg.custom_sessions as Record<string, any>
          
          // For each custom session position, replace the original
          Object.entries(customSessions).forEach(([positionStr, customData]: [string, any]) => {
            const position = parseInt(positionStr)
            
            // Find the index of the session with this session_number
            const idx = sessions.findIndex((s: any) => s.session_number === position)
            
            if (idx !== -1) {
              // Replace with custom session data
              sessions[idx] = {
                id: customData.sessionId,
                session_number: position,
                start_time: customData.startTime,
                end_time: customData.endTime,
                course_id: customData.courseId,
                course_name: customData.courseName,
                current_participants: customData.current_participants || 0,
                max_participants: customData.max_participants || 0,
                is_custom: true
              }
              logger.debug(`🔍 Reg ${reg.id}: Replaced session ${position} with custom session`)
            }
          })
        }

        const futureSessions = sessions.filter((session: any) => 
          new Date(session.start_time) > new Date(now)
        )
        
        logger.debug(`🔍 Reg ${reg.id}: ${futureSessions.length} future sessions`)

        return {
          ...reg,
          courses: coursesByIdMap[reg.course_id] || { id: reg.course_id, name: 'Kurs' },
          course_sessions: futureSessions
        }
      })
      .filter((reg: any) => reg.course_sessions.length > 0)

    logger.debug('✅ Upcoming course registrations loaded:', upcomingRegistrations.length)

    return {
      success: true,
      data: upcomingRegistrations,
      error: null
    }
  } catch (error: any) {
    logger.error('❌ Error in upcoming-course-registrations:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to load upcoming course registrations'
    })
  }
})
