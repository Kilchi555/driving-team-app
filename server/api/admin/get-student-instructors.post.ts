// server/api/admin/get-student-instructors.post.ts
// Staff/admin: instructor mapping for students in the caller's tenant only.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import {
  assertUsersBelongToTenant,
  chunkIds,
  normalizeIdList,
} from '~/server/utils/admin-f01-access'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, [
    'admin',
    'staff',
    'tenant_admin',
    'super_admin',
  ])

  const body = await readBody(event)
  const studentIds = normalizeIdList(body?.studentIds, 'studentIds')

  const supabase = getSupabaseAdmin()
  const verifiedIds = await assertUsersBelongToTenant(
    supabase,
    studentIds,
    profile.tenant_id
  )

  try {
    const allLessonInstructors: Array<{ user_id: string; staff_id: string }> = []
    for (const chunk of chunkIds(verifiedIds)) {
      const { data, error: lessonError } = await supabase
        .from('appointments')
        .select('user_id, staff_id')
        .in('user_id', chunk)
        .eq('tenant_id', profile.tenant_id)
        .not('staff_id', 'is', null)

      if (lessonError) throw lessonError
      if (data?.length) allLessonInstructors.push(...data)
    }

    if (allLessonInstructors.length === 0) {
      return {
        success: true,
        data: {
          allLessonInstructors: [],
          instructorData: [],
        },
      }
    }

    const uniqueInstructorIds = [
      ...new Set(allLessonInstructors.map((l) => l.staff_id)),
    ]

    const instructors: Array<{ id: string; first_name: string; last_name: string }> = []
    for (const chunk of chunkIds(uniqueInstructorIds)) {
      const { data, error: instructorError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', chunk)
        .eq('tenant_id', profile.tenant_id)

      if (instructorError) throw instructorError
      if (data?.length) instructors.push(...data)
    }

    return {
      success: true,
      data: {
        allLessonInstructors,
        instructorData: instructors,
      },
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Error loading student instructors:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load student instructors',
    })
  }
})
