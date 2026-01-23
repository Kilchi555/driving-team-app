/**
 * API to fetch available sessions for swapping
 * Used when user wants to change session 3 or 4 to a different course's session
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { 
    tenantId, 
    category, 
    sessionPosition, // Which session to swap (e.g., "3" or "4")
    afterDate,       // Must be after this date (to ensure chronological order)
    excludeCourseId  // Exclude the user's current course
  } = query

  if (!tenantId || !category || !sessionPosition) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters: tenantId, category, sessionPosition'
    })
  }

  const supabase = getSupabaseAdmin()
  const positionNum = parseInt(sessionPosition as string)

  try {
    logger.debug(`Fetching available sessions for position ${positionNum}, afterDate: ${afterDate}`)

    // Get all active courses of the same category
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        description,
        sari_course_id,
        max_participants,
        current_participants,
        course_sessions(
          id,
          sari_session_id,
          start_time,
          end_time
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('category', category)
      .eq('sari_managed', true)
      .eq('status', 'active')
      .eq('is_public', true)

    if (coursesError) {
      logger.error('Error fetching courses:', coursesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching courses'
      })
    }

    const availableSessions: any[] = []

    for (const course of courses || []) {
      // Skip excluded course
      if (course.id === excludeCourseId) continue
      if (!course.sari_course_id) continue
      
      const sessions = course.course_sessions || []
      if (sessions.length === 0) continue

      // Sort sessions by start time
      const sortedSessions = [...sessions].sort((a: any, b: any) => 
        a.start_time.localeCompare(b.start_time)
      )

      // Group sessions by date to identify day-groups
      const byDate: Map<string, any[]> = new Map()
      for (const session of sortedSessions) {
        const date = session.start_time.split('T')[0]
        if (!byDate.has(date)) byDate.set(date, [])
        byDate.get(date)!.push(session)
      }

      // Build position map
      let currentPosition = 0
      const positionToSessions: Map<number, any[]> = new Map()

      for (const [date, daySessions] of byDate.entries()) {
        currentPosition++
        positionToSessions.set(currentPosition, daySessions)
      }

      // Find sessions for requested position
      const sessionsForPosition = positionToSessions.get(positionNum)
      if (!sessionsForPosition) continue

      logger.debug(`Course ${course.name} has ${sessionsForPosition.length} session(s) at position ${positionNum}`)

      // Check course has free slots
      const freeSlots = course.max_participants - (course.current_participants || 0)
      if (freeSlots <= 0) {
        logger.debug(`  - Course full, skipping`)
        continue
      }

      // Check chronological order (if afterDate provided)
      const firstSessionDate = new Date(sessionsForPosition[0].start_time)
      if (afterDate) {
        const afterDateTime = new Date(afterDate as string)
        if (firstSessionDate <= afterDateTime) {
          logger.debug(`  - Session date ${firstSessionDate.toISOString()} is not after ${afterDateTime.toISOString()}, skipping`)
          continue
        }
      }

      // Add all sessions at this position
      for (const session of sessionsForPosition) {
        availableSessions.push({
          courseId: course.id,
          courseName: course.name,
          courseLocation: course.description,
          sessionId: session.id,
          sariSessionId: session.sari_session_id,
          startTime: session.start_time,
          endTime: session.end_time,
          freeSlots,
          date: session.start_time.split('T')[0]
        })
      }
    }

    // Sort by date
    availableSessions.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    logger.debug(`Found ${availableSessions.length} available session(s) for position ${positionNum}`)

    return {
      success: true,
      sessions: availableSessions,
      position: sessionPosition
    }

  } catch (err: any) {
    if (err.statusCode) throw err
    
    logger.error('Error in available-sessions API:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching available sessions'
    })
  }
})
