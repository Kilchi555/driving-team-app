import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody<{ user_id: string }>(event)
  if (!body.user_id) throw createError({ statusCode: 400, statusMessage: 'Missing user_id' })

  const supabase = getSupabaseAdmin()
  const clientIP = getClientIP(event)

  // Load caller — must be admin or staff
  const { data: caller } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!caller || !['admin', 'staff', 'super_admin'].includes(caller.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  // Load target user — must be in same tenant
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, email, first_name, tenant_id, auth_user_id, failed_login_attempts')
    .eq('id', body.user_id)
    .single()

  if (!targetUser || targetUser.tenant_id !== caller.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (!targetUser.email) {
    throw createError({ statusCode: 400, statusMessage: 'User has no email address' })
  }

  // Reset login counter and any temporary MFA/lock
  const { error: resetError } = await supabase
    .from('users')
    .update({
      failed_login_attempts: 0,
      last_failed_login_at: null,
      mfa_required_until: null,
      account_locked_until: null,
    })
    .eq('id', body.user_id)

  if (resetError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to reset login counter' })
  }

  // Create a password reset token (1h validity)
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error: tokenError } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: targetUser.id,
      email: targetUser.email,
      token,
      reset_method: 'email',
      expires_at: expiresAt.toISOString(),
      ip_address: clientIP,
    })

  if (tokenError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create reset token' })
  }

  // Build the reset link
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch'

  // Look up tenant slug for branded reset link
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug, name, primary_color, logo_wide_url, logo_url, logo_square_url, contact_email')
    .eq('id', caller.tenant_id)
    .single()

  const tenantSlug = tenant?.slug || ''
  const tenantName = tenant?.name || 'Simy'
  const tenantPrimaryColor = tenant?.primary_color || '#2563eb'
  const tenantLogoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  const tenantContactEmail = tenant?.contact_email || null

  const resetLink = `${baseUrl}/password-reset?token=${token}${tenantSlug ? `&tenant=${tenantSlug}` : ''}`
  const firstName = targetUser.first_name || 'dort'

  // Send email via Resend
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

  if (!resendApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Email service not configured' })
  }

  const logoImgTag = tenantLogoUrl
    ? `<img src="${tenantLogoUrl}" alt="${tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto;">`
    : `<div style="width:40px;height:40px;border-radius:10px;background:${tenantPrimaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto;">${tenantName.charAt(0).toUpperCase()}</div>`

  const emailHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:32px 10px;">
      <div style="margin-bottom:20px;text-align:center;">${logoImgTag}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,${tenantPrimaryColor} 0%,${tenantPrimaryColor}cc 100%);padding:32px 32px 28px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:white;">Passwort zurücksetzen</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${tenantName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hallo ${firstName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Dein Fahrlehrer hat für dich einen Link zum Zurücksetzen deines Passworts erstellt. Klicke auf den Button unten, um ein neues Passwort zu wählen.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${resetLink}" style="display:inline-block;padding:14px 36px;background:${tenantPrimaryColor};color:white;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                    🔐 Passwort zurücksetzen
                  </a>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;border-left:4px solid ${tenantPrimaryColor};">
              <tr><td style="padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#374151;">⏱ Dieser Link ist <strong>24 Stunden gültig</strong>.</p>
              </td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Button funktioniert nicht? Kopiere diesen Link:<br>
              <a href="${resetLink}" style="color:${tenantPrimaryColor};word-break:break-all;font-size:12px;">${resetLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              ${tenantName}${tenantContactEmail ? ` · <a href="mailto:${tenantContactEmail}" style="color:#9ca3af;">${tenantContactEmail}</a>` : ''}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { Resend } = await import('resend')
  const resend = new Resend(resendApiKey)

  const { error: emailError } = await resend.emails.send({
    from: `${tenantName} <${fromEmail}>`,
    to: targetUser.email,
    subject: `${tenantName} - Passwort zurücksetzen`,
    html: emailHtml,
  })

  if (emailError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to send email: ' + emailError.message })
  }

  await logAudit({
    user_id: caller.id,
    action: 'admin_password_reset',
    resource_type: 'user',
    resource_id: body.user_id,
    status: 'success',
    ip_address: clientIP,
    metadata: { target_email: targetUser.email },
  })

  return { success: true, email: targetUser.email }
})
