/**
 * GET /api/courses/transfer-targets?courseId=...
 * Returns SARI-managed courses from the same tenant and category that have free slots.
 * Used to populate the Umplanen picker in the customer dashboard modal.
 * Requires authentication.
 */

import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { courseId } = getQuery(event) as { courseId?: string }

  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId erforderlich' })
  }

  const supabase = getSupabaseServerWithSession(event)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Get caller's tenant_id
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!userRecord?.tenant_id) {
    return { courses: [] }
  }

  // Load the source course to get its category
  const { data: sourceCourse } = await supabaseAdmin
    .from('courses')
    .select('id, category, tenant_id')
    .eq('id', courseId)
    .eq('tenant_id', userRecord.tenant_id)
    .single()

  if (!sourceCourse) {
    return { courses: [] }
  }

  // Return eligible target courses
  const { data: targets } = await supabaseAdmin
    .from('courses')
    .select('id, name, category, max_participants, current_participants, course_start_date, sari_managed, sari_course_id')
    .eq('tenant_id', userRecord.tenant_id)
    .eq('category', sourceCourse.category)
    .eq('sari_managed', true)
    .eq('is_active', true)
    .neq('id', courseId)
    .order('course_start_date', { ascending: true })

  const withFreeSlots = (targets ?? []).filter(
    c => (c.max_participants ?? 0) > (c.current_participants ?? 0)
  )

  return { courses: withFreeSlots }
})
