// server/api/admin/get-student-instructors.post.ts
// Get all instructors for a list of students

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { studentIds } = body

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'studentIds array is required and must not be empty'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // Get all appointments for these students
    const { data: allLessonInstructors, error: lessonError } = await supabase
      .from('appointments')
      .select('user_id, staff_id')
      .in('user_id', studentIds)
      .not('staff_id', 'is', null)

    if (lessonError) throw lessonError

    if (!allLessonInstructors || allLessonInstructors.length === 0) {
      return {
        success: true,
        data: {
          allLessonInstructors: [],
          instructorData: []
        }
      }
    }

    // Get unique instructor IDs
    const uniqueInstructorIds = [...new Set(allLessonInstructors.map((l: any) => l.staff_id))]

    // Get instructor details
    const { data: instructors, error: instructorError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', uniqueInstructorIds)

    if (instructorError) throw instructorError

    return {
      success: true,
      data: {
        allLessonInstructors,
        instructorData: instructors || []
      }
    }
  } catch (err: any) {
    console.error('❌ Error loading student instructors:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load student instructors'
    })
  }
})
