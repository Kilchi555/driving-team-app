// server/api/tenants/wallee-onboarding-request.post.ts
// Tenant requests Wallee onboarding. No form data needed — simy.ch team
// will contact the tenant and share the Wallee signup link directly.

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const tenantId = authUser.tenant_id as string
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Tenant ID missing' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, contact_phone, address, wallee_onboarding_status')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  if (tenant.wallee_onboarding_status === 'active') {
    throw createError({ statusCode: 409, statusMessage: 'Online-Zahlungen sind bereits aktiv.' })
  }
  if (tenant.wallee_onboarding_status === 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Dein Antrag wurde bereits eingereicht.' })
  }

  // Set status to pending
  await supabase
    .from('tenants')
    .update({
      wallee_onboarding_status: 'pending',
      wallee_applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  // Notify simy team
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch',
      to: 'info@simy.ch',
      subject: `🏦 Wallee-Anfrage: ${tenant.name}`,
      html: `
        <h2>Neuer Wallee Onboarding-Wunsch</h2>
        <p><strong>Fahrschule:</strong> ${tenant.name}</p>
        <p><strong>E-Mail:</strong> ${tenant.contact_email}</p>
        <p><strong>Telefon:</strong> ${tenant.contact_phone || '—'}</p>
        <p><strong>Adresse:</strong> ${tenant.address || '—'}</p>
        <p><strong>Tenant ID:</strong> ${tenantId}</p>
        <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}</p>
        <hr/>
        <p>→ Bitte dem Tenant den Wallee-Anmeldelink per E-Mail schicken.</p>
        <p>→ <a href="https://app.simy.ch/tenant-admin/tenants">Tenant in der Verwaltung öffnen</a></p>
      `,
    })
  } catch (e: any) {
    console.error('⚠️ Team-E-Mail fehlgeschlagen (non-fatal):', e.message)
  }

  // Confirmation to tenant
  try {
    const { sendEmail } = await import('~/server/utils/email')
    await sendEmail({
      to: tenant.contact_email,
      fromName: 'Simy',
      subject: '✅ Online-Zahlungen – wir melden uns in Kürze',
      html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Anfrage erhalten</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px">Online-Zahlungen für ${tenant.name}</p>
        </div>
        <div style="padding:32px">
          <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo,</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
            wir haben deine Anfrage erhalten. Unser Team wird sich in Kürze per E-Mail mit dem Wallee-Anmeldelink bei dir melden, damit du dein Konto direkt bei Wallee einrichten kannst.
          </p>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            Bei Fragen erreichst du uns unter <a href="mailto:info@simy.ch" style="color:#6000BD">info@simy.ch</a>.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    })
  } catch (e: any) {
    console.error('⚠️ Tenant-Bestätigung fehlgeschlagen (non-fatal):', e.message)
  }

  return { success: true, message: 'Anfrage eingegangen. Wir melden uns per E-Mail mit dem Wallee-Link.' }
})
