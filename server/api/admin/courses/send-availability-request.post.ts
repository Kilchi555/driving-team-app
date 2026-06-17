/**
 * POST /api/admin/courses/send-availability-request
 * Sends a "session marketplace" email to a staff member showing all unassigned
 * sessions of a given category (and optionally a specific course).
 * Staff can claim sessions directly via token-based links.
 *
 * Body:
 *   staffId      – uuid of the staff member to email
 *   category     – course category filter (e.g. 'VKU', 'Nothelferkurs')
 *   courseId     – (optional) limit to a specific course
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { staffId, category, courseId } = await readBody(event) as {
    staffId: string
    category?: string
    courseId?: string
  }

  if (!staffId) throw createError({ statusCode: 400, statusMessage: 'Missing staffId' })

  const supabase = getSupabaseAdmin()

  // Load staff user
  const { data: staffUser, error: staffErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', staffId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (staffErr || !staffUser?.email) {
    throw createError({ statusCode: 404, statusMessage: 'Instruktor nicht gefunden oder keine Email' })
  }

  // Build sessions query: unassigned sessions in future, filtered by category / courseId
  let sessionsQuery = supabase
    .from('course_sessions')
    .select(`
      id, session_number, start_time, end_time, description, course_id,
      courses!inner(id, name, category, status)
    `)
    .eq('tenant_id', profile.tenant_id)
    .is('staff_id', null)
    .is('external_instructor_name', null)
    .gt('start_time', new Date().toISOString())
    .neq('courses.status', 'cancelled')
    .order('start_time', { ascending: true })

  if (courseId) {
    sessionsQuery = sessionsQuery.eq('course_id', courseId)
  } else if (category) {
    sessionsQuery = sessionsQuery.eq('courses.category', category)
  }

  const { data: sessions, error: sessErr } = await sessionsQuery

  if (sessErr) {
    logger.error('❌ Error loading unassigned sessions:', sessErr)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Sessions' })
  }

  if (!sessions || sessions.length === 0) {
    return { success: false, message: 'Keine offenen Sessions gefunden' }
  }

  // Generate / reuse one token per course for this staff member
  const courseIds = [...new Set(sessions.map((s: any) => s.course_id))]
  const tokenMap = new Map<string, string>() // courseId → token

  for (const cId of courseIds) {
    const { data: existing } = await supabase
      .from('session_confirmation_tokens')
      .select('token')
      .eq('course_id', cId)
      .eq('staff_id', staffId)
      .single()

    if (existing) {
      tokenMap.set(cId, existing.token)
      await supabase
        .from('session_confirmation_tokens')
        .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('course_id', cId)
        .eq('staff_id', staffId)
    } else {
      const { data: newToken } = await supabase
        .from('session_confirmation_tokens')
        .insert({
          tenant_id: profile.tenant_id,
          course_id: cId,
          staff_id: staffId,
        })
        .select('token')
        .single()
      if (newToken?.token) tokenMap.set(cId, newToken.token)
    }
  }

  // Load tenant branding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
    .eq('id', profile.tenant_id)
    .single()

  const primaryColor = tenant?.primary_color || '#2563eb'
  const tenantName = tenant?.name || 'Simy'
  const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || (tenant as any)?.logo_square_url || null
  const logoHtml = logoUrl
    ? `<div style="background:#fff;text-align:center;padding:20px 32px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : ''

  const appBaseUrl = process.env.APP_BASE_URL || 'https://app.simy.ch'

  // Group sessions by course for display
  const byCourse = new Map<string, any[]>()
  for (const s of sessions) {
    const cId = s.course_id
    if (!byCourse.has(cId)) byCourse.set(cId, [])
    byCourse.get(cId)!.push(s)
  }

  const courseBlocksHtml = Array.from(byCourse.entries()).map(([cId, courseSessions]) => {
    const courseName = (courseSessions[0] as any).courses?.name || (courseSessions[0] as any).courses?.category || 'Kurs'
    const token = tokenMap.get(cId)
    const claimUrl = token ? `${appBaseUrl}/confirm-sessions?token=${token}` : null

    const sessionRowsHtml = courseSessions.map((s: any) => {
      const dt = new Date(s.start_time)
      const dayLabel = dt.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' })
      const startTime = dt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
      const endTime = new Date(s.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${dayLabel}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${startTime} – ${endTime} Uhr</td>
      </tr>`
    }).join('')

    const claimBtn = claimUrl
      ? `<div style="margin-top:16px">
          <a href="${claimUrl}" style="display:inline-block;background:${primaryColor};color:#fff;font-weight:700;font-size:14px;padding:10px 24px;border-radius:10px;text-decoration:none">
            Sessions auswählen &amp; übernehmen →
          </a>
        </div>`
      : ''

    return `<div style="margin-bottom:28px;padding:20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
      <p style="font-weight:700;font-size:16px;color:#1e293b;margin:0 0 12px">${courseName}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:8px 12px;background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Datum</th>
          <th style="text-align:left;padding:8px 12px;background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Zeit</th>
        </tr></thead>
        <tbody>${sessionRowsHtml}</tbody>
      </table>
      ${claimBtn}
    </div>`
  }).join('')

  const filterLabel = courseId
    ? `Kurs: ${(sessions[0] as any).courses?.name || courseId}`
    : category
      ? `Kategorie: ${category}`
      : 'Alle Kategorien'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:${primaryColor};padding:28px 32px}.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
${logoHtml}
<div class="header"><h1>🗓️ Offene Sessions – Kannst du einspringen?</h1></div>
<div class="body">
<p>Hallo ${staffUser.first_name},</p>
<p>Folgende Sessions haben noch keinen Instruktor. Kannst du eine oder mehrere übernehmen?</p>
<p style="font-size:12px;color:#9ca3af;margin-bottom:24px">Filter: ${filterLabel}</p>
${courseBlocksHtml}
<p style="margin-top:24px;color:#6b7280;font-size:13px">Klicke auf «Sessions auswählen» um zu wählen welche du übernehmen möchtest. Du wirst dann direkt eingeplant.</p>
</div>
<div class="footer">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></div>
</div></body></html>`

  try {
    await sendTenantEmail(profile.tenant_id, {
      to: staffUser.email,
      subject: `Offene Sessions: Kannst du einspringen? (${sessions.length} Session${sessions.length > 1 ? 's' : ''})`,
      html,
    })
    logger.debug(`✅ Availability request sent to ${staffUser.email} for ${sessions.length} sessions`)
  } catch (emailErr: any) {
    logger.warn('⚠️ Could not send availability request email:', emailErr.message)
    throw createError({ statusCode: 500, statusMessage: 'Email konnte nicht gesendet werden' })
  }

  return { success: true, sessionCount: sessions.length, staffEmail: staffUser.email }
})
