/**
 * GET /api/confirm-sessions/info?token=xxx
 * Public (no auth). Returns course + staff sessions for the confirmation page.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('session_confirmation_tokens')
    .select('id, course_id, staff_id, expires_at, tenant_id')
    .eq('token', token)
    .single()

  if (tokenErr || !tokenRow) {
    throw createError({ statusCode: 404, statusMessage: 'Token ungültig oder abgelaufen' })
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Link abgelaufen' })
  }

  // Load course
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, category, status, course_start_date')
    .eq('id', tokenRow.course_id)
    .single()

  // Load staff info
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', tokenRow.staff_id)
    .single()

  // Load sessions for this staff member in this course
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, session_number, start_time, end_time, description, confirmation_status, confirmation_responded_at, confirmation_decline_reason')
    .eq('course_id', tokenRow.course_id)
    .eq('staff_id', tokenRow.staff_id)
    .order('start_time', { ascending: true })

  // Load tenant branding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tokenRow.tenant_id)
    .single()

  return {
    token,
    course,
    staff: staffUser,
    sessions: sessions || [],
    tenant: {
      name: tenant?.name,
      primaryColor: tenant?.primary_color || '#2563eb',
      logoUrl: tenant?.logo_wide_url || tenant?.logo_url || (tenant as any)?.logo_square_url || null,
    },
  }
})
