/**
 * GET /api/courses/my-registrations?tenantId=...
 * Returns the authenticated user's active registrations for courses belonging to the given tenant.
 * Returns an empty array (not 401) when the user is unauthenticated.
 */

import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tenantId = (query.tenantId as string) || ''

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId erforderlich' })
  }

  // Check if user is authenticated — return empty gracefully if not
  const supabase = getSupabaseServerWithSession(event)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { registrations: [] }
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Look up our internal user record to get the user's identifier
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('id, faberid')
    .eq('auth_user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!userRecord) {
    return { registrations: [] }
  }

  // Fetch active registrations for this tenant, joining course info
  const { data: regs } = await supabaseAdmin
    .from('course_registrations')
    .select(`
      id,
      course_id,
      status,
      payment_status,
      first_name,
      last_name,
      sari_faberid,
      created_at,
      courses!inner(
        id,
        name,
        category,
        sari_managed,
        sari_course_id,
        course_start_date,
        max_participants,
        current_participants,
        tenant_id
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('user_id', userRecord.id)
    .in('status', ['confirmed', 'enrolled', 'pending'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return { registrations: regs ?? [] }
})
