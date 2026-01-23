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

  try {
    // 1. Get all active SARI-managed courses of the same category
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
      .neq('id', excludeCourseId || '')

    if (coursesError) {
      logger.error('Error fetching courses:', coursesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching courses'
      })
    }

    // 2. Extract available sessions for the requested position
    const availableSessions: any[] = []
    const positionIndex = parseInt(sessionPosition as string) - 1 // 0-indexed

    for (const course of courses || []) {
      if (!course.sari_course_id) continue
      
      // Parse SARI course ID: GROUP_2110027_2110028_2110029_2110030
      const sariSessionIds = course.sari_course_id.split('_').slice(1)
      
      // Group sessions by date
      const sessions = course.course_sessions || []
      const sortedSessions = [...sessions].sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      
      // Group by date
      const sessionsByDate: Map<string, any[]> = new Map()
      for (const session of sortedSessions) {
        const date = new Date(session.start_time).toISOString().split('T')[0]
        if (!sessionsByDate.has(date)) {
          sessionsByDate.set(date, [])
        }
        sessionsByDate.get(date)!.push(session)
      }
      
      // Convert to array of day groups
      const dayGroups = Array.from(sessionsByDate.entries()).map(([date, daySessions]) => ({
        date,
        sessions: daySessions,
        sariIds: daySessions.map((s: any) => s.sari_session_id).filter(Boolean)
      }))
      
      // Check if the requested position exists in this course
      // Position mapping: Session 1 = Day 0, Session 2 = Day 0 (if same day), Session 3 = Day 1, etc.
      let currentPosition = 0
      for (const dayGroup of dayGroups) {
        // Each day group counts as 1 position (sessions on same day are grouped)
        if (dayGroup.sessions.length > 1) {
          // Multiple sessions on same day - they're a group
          // Skip if we're looking for a single session swap
          currentPosition++
          continue
        }
        
        currentPosition++
        
        // Check if this is the position we're looking for
        if (currentPosition === parseInt(sessionPosition as string)) {
          const session = dayGroup.sessions[0]
          const sessionDate = new Date(session.start_time)
          
          // Check chronological order
          if (afterDate && sessionDate <= new Date(afterDate as string)) {
            continue // Skip sessions that are before the required date
          }
          
          // Check availability
          const freeSlots = course.max_participants - (course.current_participants || 0)
          if (freeSlots <= 0) continue
          
          availableSessions.push({
            courseId: course.id,
            courseName: course.name,
            courseLocation: course.description,
            sessionId: session.id,
            sariSessionId: session.sari_session_id || sariSessionIds[positionIndex],
            startTime: session.start_time,
            endTime: session.end_time,
            freeSlots,
            date: dayGroup.date
          })
        }
      }
    }

    // Sort by date
    availableSessions.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

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

