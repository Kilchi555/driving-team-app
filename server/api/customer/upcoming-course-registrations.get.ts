import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    // Rate limit
    const rateLimitKey = `upcoming_courses:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    logger.debug('🔍 Fetching course registrations for user:', user.id)

    // Fetch course registrations for this user with course and sessions info
    const { data: registrations, error: regError } = await supabase
      .from('course_registrations')
      .select(`
        id,
        course_id,
        user_id,
        status,
        registration_date,
        payment_status,
        custom_sessions,
        deleted_at,
        courses (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')

    if (regError) {
      logger.error('❌ Error loading course registrations:', regError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load course registrations' })
    }

    logger.debug('🔍 Raw registrations from DB:', registrations?.length || 0, registrations?.slice(0, 1))

    // Filter out deleted registrations
    const activeRegistrations = (registrations || []).filter(r => !r.deleted_at)

    // For each registration, fetch the course_sessions
    const courseIds = [...new Set((activeRegistrations || []).map(r => r.course_id).filter(Boolean))]
    
    logger.debug('🔍 Course IDs to fetch sessions for:', courseIds.length, courseIds.slice(0, 3))
    
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
        let sessions = sessionsByClass[reg.course_id] || []
        
        logger.debug(`🔍 Reg ${reg.id}: Found ${sessions.length} sessions for course ${reg.course_id}`)
        
        // If custom_sessions exist, apply them to show which sessions are actually booked
        if (reg.custom_sessions && typeof reg.custom_sessions === 'object') {
          const customSessions = reg.custom_sessions as Record<string, any>
          
          // Build a list of custom session objects from the metadata
          const appliedSessions = Object.values(customSessions)
            .map((customData: any) => ({
              id: customData.sessionId,
              session_number: parseInt(Object.keys(customSessions).find(k => customSessions[k].sessionId === customData.sessionId) || '0'),
              start_time: customData.startTime,
              end_time: customData.endTime,
              course_id: customData.courseId,
              current_participants: customData.current_participants || 0,
              max_participants: customData.max_participants || 0,
              is_custom: true
            }))
          
          // If we have custom sessions, use those for display (they're the actual booked sessions)
          if (appliedSessions.length > 0) {
            logger.debug(`🔍 Reg ${reg.id}: Using ${appliedSessions.length} custom sessions`)
            sessions = appliedSessions
          }
        }

        const futureSessions = sessions.filter((session: any) => 
          new Date(session.start_time) > new Date(now)
        )
        
        logger.debug(`🔍 Reg ${reg.id}: ${futureSessions.length} future sessions`)

        return {
          ...reg,
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
