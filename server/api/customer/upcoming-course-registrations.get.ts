import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { collectCustomSessionPointers } from '~/server/utils/course-custom-sessions'
import {
  CUSTOMER_COURSE_SESSION_COLUMNS,
  CUSTOMER_REGISTRATION_COLUMNS,
} from '~/server/utils/course-session-embed'

function customerSessionShape(session: any, extras: Record<string, unknown> = {}) {
  return {
    id: session.id,
    session_number: extras.session_number ?? session.session_number,
    position: extras.position ?? session.position,
    start_time: session.start_time,
    end_time: session.end_time,
    course_id: session.course_id,
    course_name: extras.course_name,
    custom_location: session.custom_location || extras.custom_location || null,
    is_custom: extras.is_custom === true,
  }
}

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!user.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const rateLimitKey = `upcoming_courses:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 'upcoming_course_registrations', 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()
    const tenantId = user.tenant_id as string

    logger.debug('🔍 Fetching course registrations for user:', user.id)

    const { data: registrations, error: regError } = await supabase
      .from('course_registrations')
      .select(CUSTOMER_REGISTRATION_COLUMNS)
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')

    if (regError) {
      logger.error('❌ Error loading course registrations:', regError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load course registrations' })
    }

    const activeRegistrations = (registrations || []).filter(r => !r.deleted_at)

    const courseIds = [...new Set((activeRegistrations || []).map(r => r.course_id).filter(Boolean))]

    let coursesByIdMap: Record<string, { id: string, name: string }> = {}
    if (courseIds.length > 0) {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, tenant_id')
        .in('id', courseIds)
        .eq('tenant_id', tenantId)

      if (!coursesError && coursesData) {
        coursesData.forEach(course => {
          coursesByIdMap[course.id] = { id: course.id, name: course.name }
        })
      } else if (coursesError) {
        logger.error('❌ Error loading courses:', coursesError)
      }
    }

    let sessionsByClass: Record<string, any[]> = {}
    if (courseIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('course_sessions')
        .select(CUSTOMER_COURSE_SESSION_COLUMNS)
        .in('course_id', courseIds)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true })

      if (!sessionsError && sessions) {
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

    const customCourseIds: Set<string> = new Set()
    const customSessionIds: string[] = []

    for (const reg of activeRegistrations) {
      let pointers
      try {
        pointers = collectCustomSessionPointers(reg.custom_sessions)
      } catch {
        continue
      }
      if (pointers.empty) continue
      for (const id of pointers.courseIds) customCourseIds.add(id)
      customSessionIds.push(...pointers.sessionIds)
    }

    const extraCourseIds = [...customCourseIds].filter((id) => !sessionsByClass[id])
    if (extraCourseIds.length > 0) {
      const { data: customCourseSessions, error: customCourseError } = await supabase
        .from('course_sessions')
        .select(CUSTOMER_COURSE_SESSION_COLUMNS)
        .in('course_id', extraCourseIds)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true })

      if (!customCourseError && customCourseSessions) {
        customCourseSessions.forEach(session => {
          sessionsByClass[session.course_id] = sessionsByClass[session.course_id] || []
          sessionsByClass[session.course_id].push(session)
        })
      }
    }

    let customSessionDetails: Record<string, any> = {}
    if (customSessionIds.length > 0) {
      const { data: byId } = await supabase
        .from('course_sessions')
        .select(CUSTOMER_COURSE_SESSION_COLUMNS)
        .in('id', customSessionIds)
        .eq('tenant_id', tenantId)

      for (const session of byId || []) {
        customSessionDetails[session.id] = session
      }
    }

    const upcomingRegistrations = (activeRegistrations || [])
      .map((reg: any) => {
        if (!coursesByIdMap[reg.course_id]) {
          return null
        }

        let originalSessions = sessionsByClass[reg.course_id] || []

        const byDate: Map<string, any[]> = new Map()
        for (const session of originalSessions) {
          const date = session.start_time.split('T')[0]
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(session)
        }

        const sortedDates = Array.from(byDate.keys()).sort()

        let currentPosition = 0
        let partCounter = 0
        const positionToSessions: Map<number, any[]> = new Map()
        const positionToPartRange: Map<number, { start: number, end: number }> = new Map()

        for (const date of sortedDates) {
          const daySessions = byDate.get(date)!
          currentPosition++
          const startPart = partCounter + 1
          daySessions.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
          const sessionsWithNumber = daySessions.map((s: any) => {
            partCounter++
            return customerSessionShape(s, {
              session_number: partCounter,
              position: currentPosition,
              is_custom: false,
            })
          })
          positionToSessions.set(currentPosition, sessionsWithNumber)
          positionToPartRange.set(currentPosition, { start: startPart, end: partCounter })
        }

        let sessions = Array.from(positionToSessions.values()).flat()

        if (reg.custom_sessions && typeof reg.custom_sessions === 'object') {
          const customSessions = reg.custom_sessions as Record<string, any>

          Object.entries(customSessions).forEach(([positionStr, customData]: [string, any]) => {
            const position = parseInt(positionStr)
            const partRange = positionToPartRange.get(position)

            sessions = sessions.filter((s: any) => s.position !== position)

            const customCourseId = customData?.courseId
            const customCourseSessions = customCourseId && sessionsByClass[customCourseId]
              ? sessionsByClass[customCourseId]
              : []
            const customDate = customData.date

            const customDaySessions = customCourseSessions.filter((s: any) =>
              s.tenant_id === tenantId &&
              s.start_time.split('T')[0] === customDate
            )

            customDaySessions.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))

            let partNum = partRange?.start || 1
            customDaySessions.forEach((customSession: any) => {
              const sessionDetails = customSessionDetails[customSession.id] || {}
              if (customSession.tenant_id !== tenantId) return
              sessions.push(customerSessionShape(customSession, {
                session_number: partNum,
                position,
                course_name: customData.courseName,
                custom_location: sessionDetails.custom_location || customSession.custom_location || null,
                is_custom: true,
              }))
              partNum++
            })
          })
        }

        const futureSessions = sessions.filter((session: any) =>
          new Date(session.start_time) > new Date(now)
        )

        return {
          id: reg.id,
          course_id: reg.course_id,
          tenant_id: tenantId,
          status: reg.status,
          payment_status: reg.payment_status,
          registration_date: reg.registration_date,
          is_partial_enrollment: reg.is_partial_enrollment,
          individual_session_number: reg.individual_session_number,
          partial_start_session: reg.partial_start_session,
          courses: coursesByIdMap[reg.course_id],
          course_sessions: futureSessions,
        }
      })
      .filter((reg: any) => reg && reg.course_sessions.length > 0)

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
