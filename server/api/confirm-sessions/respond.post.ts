/**
 * POST /api/confirm-sessions/respond
 * Public (no auth). Staff confirms or declines sessions via magic-link token.
 *
 * Body:
 *   token        – string
 *   sessionIds   – string[] (session IDs to update) OR 'all' for all sessions of this staff
 *   action       – 'confirmed' | 'declined'
 *   reason       – string (optional, only for declined)
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, sessionIds, action, reason } = body as {
    token: string
    sessionIds: string[] | 'all'
    action: 'confirmed' | 'declined'
    reason?: string
  }

  if (!token || !action || !['confirmed', 'declined'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Parameter' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('session_confirmation_tokens')
    .select('id, course_id, staff_id, expires_at, tenant_id')
    .eq('token', token)
    .single()

  if (tokenErr || !tokenRow) {
    throw createError({ statusCode: 404, statusMessage: 'Token ungültig' })
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Link abgelaufen' })
  }

  // Determine which sessions to update
  let targetSessionIds: string[]
  if (sessionIds === 'all') {
    const { data: allSessions } = await supabase
      .from('course_sessions')
      .select('id')
      .eq('course_id', tokenRow.course_id)
      .eq('staff_id', tokenRow.staff_id)
    targetSessionIds = (allSessions || []).map((s: any) => s.id)
  } else {
    // Validate that all provided session IDs belong to this staff+course
    const { data: validSessions } = await supabase
      .from('course_sessions')
      .select('id')
      .eq('course_id', tokenRow.course_id)
      .eq('staff_id', tokenRow.staff_id)
      .in('id', sessionIds)
    targetSessionIds = (validSessions || []).map((s: any) => s.id)
  }

  if (targetSessionIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine gültigen Sessions' })
  }

  const now = new Date().toISOString()

  // Update sessions
  const { error: updateErr } = await supabase
    .from('course_sessions')
    .update({
      confirmation_status: action,
      confirmation_responded_at: now,
      confirmation_decline_reason: action === 'declined' ? (reason || null) : null,
    })
    .in('id', targetSessionIds)
    .eq('course_id', tokenRow.course_id)
    .eq('staff_id', tokenRow.staff_id)

  if (updateErr) {
    logger.error('❌ Error updating session confirmation:', updateErr)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern' })
  }

  logger.debug(`✅ Staff ${tokenRow.staff_id} ${action} ${targetSessionIds.length} sessions for course ${tokenRow.course_id}`)

  // Load data for admin notification
  const [staffResult, courseResult, tenantResult, adminResult] = await Promise.all([
    supabase.from('users').select('first_name, last_name, email').eq('id', tokenRow.staff_id).single(),
    supabase.from('courses').select('name, category').eq('id', tokenRow.course_id).single(),
    supabase.from('tenants').select('name, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified').eq('id', tokenRow.tenant_id).single(),
    // Find admin users for this tenant
    supabase.from('users').select('email, first_name').eq('tenant_id', tokenRow.tenant_id).eq('role', 'admin').not('email', 'is', null),
  ])

  const staff = staffResult.data
  const course = courseResult.data
  const tenant = tenantResult.data
  const admins = adminResult.data || []

  if (tenant && staff && course && admins.length > 0) {
    const primaryColor = tenant.primary_color || '#2563eb'
    const tenantName = tenant.name || 'Simy'
    const logoUrl = tenant.logo_wide_url || tenant.logo_url || (tenant as any).logo_square_url || null
    const logoHtml = logoUrl
      ? `<div style="background:#fff;text-align:center;padding:20px 32px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
      : ''

    const isConfirmed = action === 'confirmed'
    const icon = isConfirmed ? '✅' : '⚠️'
    const actionLabel = isConfirmed ? 'bestätigt' : 'abgelehnt'
    const headerBg = isConfirmed ? primaryColor : '#dc2626'

    const reasonHtml = !isConfirmed && reason
      ? `<p style="margin-top:16px;padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:14px"><strong>Begründung:</strong> ${reason}</p>`
      : ''

    const pendencyHtml = !isConfirmed
      ? `<p style="margin-top:16px;padding:12px;background:#fef9c3;border-radius:8px;color:#854d0e;font-size:14px">Es wurde automatisch eine Pendenz erstellt. Bitte einen anderen Instruktor zuweisen.</p>`
      : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:${headerBg};padding:28px 32px}.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
${logoHtml}
<div class="header"><h1>${icon} Session ${actionLabel}</h1></div>
<div class="body">
<p><strong>${staff.first_name} ${staff.last_name}</strong> hat ${targetSessionIds.length} Session(s) für den Kurs <strong>${course.name || course.category}</strong> ${actionLabel}.</p>
${reasonHtml}
${pendencyHtml}
</div>
<div class="footer">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></div>
</div></body></html>`

    for (const admin of admins) {
      if (!admin.email) continue
      try {
        await sendTenantEmail(tokenRow.tenant_id, {
          to: admin.email,
          subject: `${icon} Kurs-Session ${actionLabel}: ${staff.first_name} ${staff.last_name}`,
          html,
        })
      } catch (e: any) {
        logger.warn('⚠️ Could not notify admin:', e.message)
      }
    }
  }

  // If declined → create a pendency
  if (action === 'declined') {
    const courseLabel = course?.name || course?.category || 'Kurs'
    const staffLabel = staff ? `${staff.first_name} ${staff.last_name}` : 'Instruktor'
    try {
      await supabase.from('pendencies').insert({
        tenant_id: tokenRow.tenant_id,
        title: `Kurs-Session abgelehnt: ${courseLabel}`,
        description: `${staffLabel} hat ${targetSessionIds.length} Session(s) abgelehnt.${reason ? ` Begründung: ${reason}` : ''} Bitte einen anderen Instruktor zuweisen.`,
        status: 'pendent',
        priority: 'high',
        category: 'Kurse',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      })
    } catch (e: any) {
      logger.warn('⚠️ Could not create pendency:', e.message)
    }
  }

  return { success: true, action, updatedCount: targetSessionIds.length }
})
