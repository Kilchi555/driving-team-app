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

    // Collect all custom session IDs AND their course IDs to fetch their details (for custom_location)
    const customSessionIds: string[] = []
    const customCourseIds: Set<string> = new Set()
    
    activeRegistrations.forEach((reg: any) => {
      let customSessions = reg.custom_sessions
      
      // Parse if it's a JSON string
      if (typeof customSessions === 'string') {
        try {
          customSessions = JSON.parse(customSessions)
        } catch (e) {
          logger.warn('❌ Failed to parse custom_sessions JSON:', e)
          return
        }
      }
      
      if (customSessions && typeof customSessions === 'object') {
        Object.values(customSessions).forEach((customData: any) => {
          if (customData.sessionId) {
            customSessionIds.push(customData.sessionId)
            logger.debug(`🔍 Found custom session ID: ${customData.sessionId}`)
            logger.debug(`   Full custom data:`, JSON.stringify(customData))
            
            // Also track the course ID if provided
            if (customData.courseId) {
              customCourseIds.add(customData.courseId)
            }
          }
        })
      }
    })

    logger.debug('🔍 All custom session IDs to fetch:', customSessionIds.length, customSessionIds.slice(0, 5))
    logger.debug('🔍 Custom course IDs:', Array.from(customCourseIds))

    // Load sessions from custom courses too (in case swapped sessions are from different courses)
    if (customCourseIds.size > 0) {
      const { data: customCourseSessions, error: customCourseError } = await supabase
        .from('course_sessions')
        .select('*')
        .in('course_id', Array.from(customCourseIds))
        .order('start_time', { ascending: true })

      if (!customCourseError && customCourseSessions) {
        logger.debug('🔍 Loaded sessions from custom courses:', customCourseSessions.length)
        customCourseSessions.forEach(session => {
          sessionsByClass[session.course_id] = sessionsByClass[session.course_id] || []
          sessionsByClass[session.course_id].push(session)
        })
      }
    }

    // Fetch custom session details (for custom_location)
    // NOTE: Custom sessions can be from DIFFERENT courses
    // We match by courseId + startTime + endTime since sessionId might be temporary/local ID
    let customSessionDetails: Record<string, any> = {}
    
    if (customSessionIds.length > 0) {
      // Build a map of unique (courseId, startTime, endTime) -> session details
      const allSessions = Object.values(sessionsByClass).flat()
      
      activeRegistrations.forEach((reg: any) => {
        let customSessions = reg.custom_sessions
        
        if (typeof customSessions === 'string') {
          try {
            customSessions = JSON.parse(customSessions)
          } catch (e) {
            return
          }
        }
        
        if (customSessions && typeof customSessions === 'object') {
          Object.values(customSessions).forEach((customData: any) => {
            // Find matching session by courseId + startTime + endTime
            const matchingSession = allSessions.find((s: any) => 
              s.course_id === customData.courseId &&
              s.start_time === customData.startTime &&
              s.end_time === customData.endTime
            )
            
            if (matchingSession) {
              customSessionDetails[customData.sessionId] = matchingSession
              logger.debug(`🔍 Matched custom session ${customData.sessionId}:`)
              logger.debug(`   Course: ${customData.courseId}`)
              logger.debug(`   Time: ${customData.startTime} - ${customData.endTime}`)
              logger.debug(`   Location: ${matchingSession.custom_location || 'NULL'}`)
            } else {
              logger.warn(`⚠️ Could not find matching session for custom data:`, JSON.stringify(customData))
            }
          })
        }
      })
      
      logger.debug('🔍 Loaded custom session details:', Object.keys(customSessionDetails).length)
    }

    // Build final result with future sessions only
    const upcomingRegistrations = (activeRegistrations || [])
      .map((reg: any) => {
        let originalSessions = sessionsByClass[reg.course_id] || []
        
        logger.debug(`🔍 Reg ${reg.id}: Found ${originalSessions.length} sessions for course ${reg.course_id}`)
        
        // First: Group original sessions by date to calculate position and session_number
        const byDate: Map<string, any[]> = new Map()
        for (const session of originalSessions) {
          const date = session.start_time.split('T')[0]
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(session)
        }
        
        // Sort dates chronologically
        const sortedDates = Array.from(byDate.keys()).sort()
        
        // Build mapping: position -> sessions (with session_number = actual part number 1,2,3,4...)
        let currentPosition = 0
        let partCounter = 0 // Fortlaufende Teil-Nummer (1, 2, 3, 4...)
        const positionToSessions: Map<number, any[]> = new Map()
        const positionToPartRange: Map<number, { start: number, end: number }> = new Map()
        
        for (const date of sortedDates) {
          const daySessions = byDate.get(date)!
          currentPosition++
          const startPart = partCounter + 1
          
          // Sort sessions within day by start_time
          daySessions.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
          
          // Add session_number (actual Teil number) to each session
          const sessionsWithNumber = daySessions.map((s: any) => {
            partCounter++
            return {
              ...s,
              session_number: partCounter, // Teil 1, 2, 3, 4...
              position: currentPosition, // Tag 1, Tag 2...
              is_custom: false
            }
          })
          
          positionToSessions.set(currentPosition, sessionsWithNumber)
          positionToPartRange.set(currentPosition, { start: startPart, end: partCounter })
        }
        
        // Flatten to get all sessions with session_number assigned
        let sessions = Array.from(positionToSessions.values()).flat()
        
        logger.debug(`🔍 Reg ${reg.id}: Sessions grouped into ${currentPosition} positions, ${partCounter} parts total`)
        sessions.forEach((s: any) => {
          logger.debug(`   Teil ${s.session_number} (Position ${s.position}): ${s.start_time}`)
        })
        
        // If custom_sessions exist, replace the corresponding positions
        if (reg.custom_sessions && typeof reg.custom_sessions === 'object') {
          const customSessions = reg.custom_sessions as Record<string, any>
          
          // For each custom session position, replace ALL sessions of that position
          Object.entries(customSessions).forEach(([positionStr, customData]: [string, any]) => {
            const position = parseInt(positionStr)
            
            logger.debug(`🔍 Processing custom session for position ${position}:`)
            logger.debug(`   Custom courseId: ${customData.courseId}`)
            logger.debug(`   Custom date: ${customData.date}`)
            
            // Get the part range for this position (e.g., position 2 = Teil 3-4)
            const partRange = positionToPartRange.get(position)
            logger.debug(`   Part range for position ${position}: ${partRange?.start}-${partRange?.end}`)
            
            // REMOVE all original sessions with this position
            const originalCount = sessions.filter((s: any) => s.position === position).length
            sessions = sessions.filter((s: any) => s.position !== position)
            logger.debug(`   Removed ${originalCount} original sessions for position ${position}`)
            
            // Get sessions from the custom course for the same date
            const customCourseSessions = sessionsByClass[customData.courseId] || []
            const customDate = customData.date // e.g. "2026-04-16"
            
            // Find all sessions from custom course on that date
            const customDaySessions = customCourseSessions.filter((s: any) => 
              s.start_time.split('T')[0] === customDate
            )
            
            // Sort by start_time
            customDaySessions.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
            
            logger.debug(`   Found ${customDaySessions.length} sessions from custom course on ${customDate}`)
            
            // Add all custom sessions with the correct Teil numbers
            let partNum = partRange?.start || 1
            customDaySessions.forEach((customSession: any) => {
              const sessionDetails = customSessionDetails[customSession.id] || {}
              const customLocation = sessionDetails.custom_location || customSession.custom_location || null
              
              sessions.push({
                id: customSession.id,
                session_number: partNum, // Teil 3, 4... (correct part number)
                position: position, // Tag 2
                start_time: customSession.start_time,
                end_time: customSession.end_time,
                course_id: customData.courseId,
                course_name: customData.courseName,
                custom_location: customLocation,
                current_participants: customSession.current_participants || 0,
                max_participants: customSession.max_participants || 0,
                is_custom: true
              })
              logger.debug(`   Added custom session Teil ${partNum}: ${customSession.start_time} - ${customSession.end_time}`)
              partNum++
            })
            
            logger.debug(`🔍 Reg ${reg.id}: Replaced position ${position} with ${customDaySessions.length} custom sessions`)
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
    
    // Debug: Log custom_location for each session
    upcomingRegistrations.forEach((reg: any) => {
      reg.course_sessions.forEach((session: any) => {
        logger.debug(`   Session ${session.session_number}: location=${session.custom_location || 'NULL'}`)
      })
    })

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
