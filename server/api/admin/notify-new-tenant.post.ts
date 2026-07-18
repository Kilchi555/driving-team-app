// server/api/admin/notify-new-tenant.post.ts
// Sends notification to super-admins (+ a guaranteed info@simy.ch fallback) when
// a new tenant registers.
// ✅ Protected by internal secret header
//
// ⚠️ Previously called a non-existent '/api/email/send' route, so every
// notification silently failed (swallowed by a .catch() with just a warn log) -
// nobody ever actually got an email about new registrations. Now sends directly
// via the same Resend-backed sendEmail() utility used elsewhere in the app.
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

const INTERNAL_SECRET = process.env.NUXT_INTERNAL_API_SECRET

// Guaranteed fallback recipient - always notified in addition to whatever
// super_admin users exist in the DB, so this can never silently go unnoticed
// just because nobody is configured as super_admin (or their email bounces).
const FALLBACK_NOTIFICATION_EMAIL = 'info@simy.ch'

function buildNewTenantEmailHtml(params: {
  recipientName: string
  tenantName: string
  tenantId: string
  contactEmail: string
  customerNumber: string
  dashboardLink: string
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">🎉 Neue Tenant-Registrierung</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px;margin:0 0 24px">Hallo ${params.recipientName},<br><br>
      soeben hat sich eine neue Fahrschule bei Simy registriert.</p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 20px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:4px">Fahrschule</div>
        <div style="font-size:15px;color:#111827;margin-bottom:20px">${params.tenantName}</div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:4px">Kontakt-E-Mail</div>
        <div style="font-size:15px;color:#111827;margin-bottom:20px"><a href="mailto:${params.contactEmail}" style="color:#2563eb">${params.contactEmail}</a></div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:4px">Kundennummer</div>
        <div style="font-size:15px;color:#111827">${params.customerNumber}</div>
      </div>
      <a href="${params.dashboardLink}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Im Admin-Dashboard ansehen →</a>
    </div>
    <div style="border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center">Simy · Automatische Benachrichtigung</div>
  </div>
</body></html>`
}

export default defineEventHandler(async (event) => {
  // ✅ Verify internal secret so this endpoint can only be called server-side
  const providedSecret = getHeader(event, 'x-internal-secret')
  if (!INTERNAL_SECRET || providedSecret !== INTERNAL_SECRET) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const body = await readBody(event)
    const { tenantId, tenantName, contactEmail, customerNumber } = body

    if (!tenantId || !tenantName || !contactEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    logger.debug('📧 Sending new tenant notification:', { tenantId, tenantName })

    const supabase = getSupabaseAdmin()

    // Get super admin users (role = 'super_admin')
    const { data: superAdmins, error: adminError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if (adminError) {
      console.error('❌ Error fetching super admins:', adminError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching super admins'
      })
    }

    // Recipients = active super admins + the guaranteed fallback address,
    // deduplicated (case-insensitive) so info@simy.ch doesn't get the email twice
    // when it's already a super admin's address.
    const recipients = [
      ...(superAdmins || []).map(a => ({ email: a.email, name: a.first_name || 'Admin' })),
      { email: FALLBACK_NOTIFICATION_EMAIL, name: 'Team' }
    ].filter((r, idx, arr) =>
      arr.findIndex(x => x.email.toLowerCase() === r.email.toLowerCase()) === idx
    )

    logger.debug(`✅ Notifying ${recipients.length} recipient(s) about new tenant`)

    const dashboardLink = `${process.env.NUXT_PUBLIC_BASE_URL}/admin/tenants/${tenantId}`

    // Send email to each recipient
    const notifications = []
    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject: `🎉 Neue Tenant-Registrierung: ${tenantName}`,
          html: buildNewTenantEmailHtml({
            recipientName: recipient.name,
            tenantName,
            tenantId,
            contactEmail,
            customerNumber: customerNumber || 'N/A',
            dashboardLink
          })
        })
        notifications.push({
          admin_email: recipient.email,
          status: 'sent'
        })
        logger.debug(`✅ Notification sent to ${recipient.email}`)
      } catch (notifyError) {
        console.error(`❌ Error notifying ${recipient.email}:`, notifyError)
        notifications.push({
          admin_email: recipient.email,
          status: 'error'
        })
      }
    }

    // Log notification attempt
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          notification_type: 'new_tenant_registration',
          tenant_id: tenantId,
          recipients: notifications.map(n => n.admin_email),
          sent_at: new Date().toISOString(),
          details: {
            tenant_name: tenantName,
            contact_email: contactEmail,
            customer_number: customerNumber,
            notifications: notifications
          }
        })
    } catch (logErr) {
      logger.warn('⚠️ Could not log notification:', logErr)
    }

    const sentCount = notifications.filter(n => n.status === 'sent').length

    return {
      success: true,
      message: `Notification sent to ${sentCount} of ${recipients.length} recipient(s)`,
      notified: sentCount,
      total: recipients.length,
      notifications: notifications
    }

  } catch (error: any) {
    console.error('❌ Error sending tenant notification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to send notification'
    })
  }
})

