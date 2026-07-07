// server/api/send-invite-email.post.ts
// Sends appointment invitation emails to external (non-registered) customers

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface InviteEmailBody {
  to: string
  name: string
  appointment_id: string
  meeting_type?: 'in_person' | 'phone' | 'online'
  meeting_link?: string | null
  tenant_id?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as InviteEmailBody
    const { to, name, appointment_id, meeting_type, meeting_link, tenant_id } = body

    if (!to || !appointment_id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields: to, appointment_id' })
    }

    const supabase = getSupabaseAdmin()

    // Load appointment details
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, event_type_code, custom_event_name,
        staff_id, tenant_id,
        locations ( name, address )
      `)
      .eq('id', appointment_id)
      .single()

    if (apptError || !appointment) {
      throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
    }

    const resolvedTenantId = tenant_id || appointment.tenant_id

    // Load tenant branding
    let primaryColor = '#2563eb'
    let logoUrl: string | null = null
    let tenantName = 'Ihre Fahrschule'
    let tenantSlug: string | null = null

    if (resolvedTenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, logo_wide_url, logo_url, logo_square_url, name, slug')
        .eq('id', resolvedTenantId)
        .single()
      if (tenant) {
        primaryColor = tenant.primary_color || primaryColor
        logoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
        tenantName = tenant.name || tenantName
        tenantSlug = tenant.slug || null
      }
    }

    // Load staff
    let staffName = ''
    let staffPhone: string | null = null
    if (appointment.staff_id) {
      const { data: staff } = await supabase
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', appointment.staff_id)
        .single()
      if (staff) {
        staffName = `${staff.first_name} ${staff.last_name}`
        staffPhone = (staff as any).phone || null
      }
    }

    // Format appointment time
    const start = new Date(appointment.start_time)
    const end = new Date(appointment.end_time)
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    const appointmentTime = `${weekdays[start.getDay()]}, ${start.toLocaleDateString('de-CH')}, ${start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)

    // Determine event type name
    const EVENT_TYPE_LABELS: Record<string, string> = {
      lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorie',
      vku: 'VKU', nothelfer: 'Nothelferkurs', meeting: 'Meeting', vacation: 'Urlaub'
    }
    const eventTypeName = appointment.custom_event_name
      || EVENT_TYPE_LABELS[appointment.event_type_code]
      || appointment.event_type_code
      || 'Termin'

    // Location (only for in-person)
    const isPhoneOrOnline = meeting_type === 'phone' || meeting_type === 'online'
    const loc = (appointment as any).locations
    const locationDisplay = !isPhoneOrOnline && loc ? loc.name : undefined
    const locationAddress = !isPhoneOrOnline && loc ? loc.address : undefined

    // Build HTML
    const isLessonType = ['lesson', 'exam', 'theory'].includes(appointment.event_type_code || '')
    const meetingTypeLabel = meeting_type === 'phone'
      ? '📞 Telefonat'
      : meeting_type === 'online' ? '💻 Online' : '📍 Vor Ort'

    const primaryBg = `background-color:${primaryColor}`
    const logoHtml = logoUrl
      ? `<tr><td style="background:#fff;text-align:center;padding:20px 30px 16px"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></td></tr>`
      : ''

    const detailRows = [
      `<p style="margin:5px 0;color:#374151"><strong>Termin:</strong> ${appointmentTime} (${durationMinutes} Min.)</p>`,
      `<p style="margin:5px 0;color:#374151"><strong>Art:</strong> ${eventTypeName}</p>`,
      meeting_type
        ? `<p style="margin:5px 0;color:#374151"><strong>Durchführung:</strong> ${meetingTypeLabel}</p>`
        : '',
      meeting_type === 'online' && meeting_link
        ? `<p style="margin:5px 0;color:#374151"><strong>Meeting-Link:</strong> <a href="${meeting_link}" style="color:${primaryColor}">${meeting_link}</a></p>`
        : '',
      staffName
        ? `<p style="margin:5px 0;color:#374151"><strong>Kontakt:</strong> ${staffName}${staffPhone ? ` · <a href="tel:${staffPhone}" style="color:#374151;text-decoration:none">${staffPhone}</a>` : ''}</p>`
        : '',
      locationDisplay
        ? `<p style="margin:5px 0;color:#374151"><strong>Ort:</strong> ${locationDisplay}${locationAddress ? `<br><span style="font-size:13px;color:#6b7280">${locationAddress}</span>` : ''}</p>`
        : '',
    ].filter(Boolean).join('\n')

    const firstName = name?.split(' ')[0] || name || 'Hallo'
    const dashboardUrl = tenantSlug ? `https://app.simy.ch/${tenantSlug}` : 'https://app.simy.ch'

    const html = `
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:0 auto;">
        ${logoHtml}
        <tr><td style="${primaryBg};padding:40px 30px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">Termineinladung</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${firstName},</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">du wurdest zu einem Termin eingeladen. Bitte überprüfe die Details:</p>
          <div style="background-color:#f8f9fa;border-left:4px solid ${primaryColor};padding:15px;margin:20px 0;border-radius:4px">
            ${detailRows}
          </div>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:20px 0 0 0;">Freundliche Grüsse,<br><strong>${tenantName}</strong></p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#6b7280;font-size:12px;margin:0;">Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>`

    await sendEmail({
      to,
      subject: `Termineinladung – ${eventTypeName}`,
      html,
    })

    logger.debug(`✅ Invite email sent to ${to} for appointment ${appointment_id}`)
    return { success: true }

  } catch (err: any) {
    logger.error('❌ Failed to send invite email:', err.message)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to send invite email' })
  }
})
