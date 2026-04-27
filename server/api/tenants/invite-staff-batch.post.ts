// server/api/tenants/invite-staff-batch.post.ts
// Batch-Einladung von Fahrlehrern direkt im Onboarding-Flow.
// Kein JWT erforderlich – stattdessen wird geprüft, ob der Tenant
// in den letzten 30 Minuten erstellt wurde (Anti-Abuse-Check).
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { sanitizeString } from '~/server/utils/validators'

interface StaffEntry {
  first_name: string
  last_name: string
  phone?: string
  email?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenant_id, staff_list } = body as {
    tenant_id: string
    staff_list: StaffEntry[]
  }

  if (!tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id fehlt' })
  }
  if (!Array.isArray(staff_list) || staff_list.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'staff_list fehlt oder leer' })
  }
  if (staff_list.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Maximal 20 Mitarbeiter pro Batch' })
  }

  const supabase = getSupabaseAdmin()

  // ─── Anti-Abuse: Tenant muss in den letzten 30 Min erstellt worden sein ───
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, twilio_from_sender, created_at')
    .eq('id', tenant_id)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })
  }

  const tenantAge = Date.now() - new Date(tenant.created_at).getTime()
  if (tenantAge > 30 * 60 * 1000) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Batch-Einladungen sind nur direkt nach der Registrierung möglich'
    })
  }

  // Fetch the tenant admin to use as invited_by (admin is created before staff invitations)
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()
  const invitedBy: string | null = adminUser?.id ?? null

  const tenantName  = tenant.name
  const senderName  = tenant.twilio_from_sender || tenantName

  // Einladungs-Link Basis-URL
  const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
  const host    = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host')
  const proto   = getHeader(event, 'x-forwarded-proto') || 'https'
  let baseUrl   = envBase || (host && !host.includes('localhost') ? `${proto}://${host}` : 'https://www.simy.ch')

  const results: Array<{
    name: string
    status: 'sms_sent' | 'email_sent' | 'invited' | 'failed'
    message: string
    invite_link?: string
  }> = []

  for (const entry of staff_list) {
    const firstName = sanitizeString(entry.first_name?.trim() || '', 100)
    const lastName  = sanitizeString(entry.last_name?.trim()  || '', 100)
    const phone     = entry.phone?.trim() || null
    const email     = entry.email?.trim().toLowerCase() || null

    if (!firstName || !lastName) {
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: 'Vor- und Nachname erforderlich' })
      continue
    }
    if (!phone && !email) {
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: 'Telefon oder E-Mail erforderlich' })
      continue
    }

    // Doppelten User oder offene Einladung prüfen (nur wenn E-Mail vorhanden)
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle()

      if (existingUser) {
        results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: `E-Mail bereits als ${existingUser.role} registriert` })
        continue
      }

      const { data: existingInvite } = await supabase
        .from('staff_invitations')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', tenant_id)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingInvite) {
        results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: 'Offene Einladung für diese E-Mail existiert bereits' })
        continue
      }
    }

    // Einladungs-Token generieren
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Placeholder-E-Mail falls keine angegeben (DB-Constraint erfordert E-Mail)
    const inviteEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@onboarding.simy.ch`

    // Staff-Invitation anlegen
    const { data: invitation, error: insertError } = await supabase
      .from('staff_invitations')
      .insert({
        tenant_id,
        first_name: firstName,
        last_name:  lastName,
        email:      inviteEmail,
        phone:      phone,
        invitation_token: token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select('id')
      .single()

    if (insertError) {
      logger.warn('⚠️ invite-staff-batch: Einladung fehlgeschlagen für', firstName, lastName, insertError.message)
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: insertError.message })
      continue
    }

    const inviteLink = `${baseUrl}/register/staff?token=${token}`

    // ─── SMS senden ────────────────────────────────────────────────────────
    if (phone) {
      try {
        const smsText = `Hallo ${firstName}! Willkommen bei ${tenantName}. Bitte vervollständige deine Registrierung als Fahrlehrer: ${inviteLink}`
        await sendSMS({ to: phone, message: smsText, senderName })
        await supabase.from('sms_logs').insert({
          to_phone: phone,
          message: smsText,
          twilio_sid: 'onboarding-batch',
          status: 'sent',
          sent_at: new Date().toISOString(),
          tenant_id
        })
        results.push({ name: `${firstName} ${lastName}`, status: 'sms_sent', message: 'SMS gesendet', invite_link: inviteLink })
        logger.debug('✅ Onboarding-SMS gesendet an:', phone)
        continue
      } catch (smsErr: any) {
        logger.warn('⚠️ SMS fehlgeschlagen für', phone, smsErr.message)
        // Fallback: nur Einladungs-Link zurückgeben
        results.push({ name: `${firstName} ${lastName}`, status: 'invited', message: `SMS fehlgeschlagen. Link: ${inviteLink}`, invite_link: inviteLink })
        continue
      }
    }

    // ─── E-Mail senden (falls keine Telefon-Nr.) ───────────────────────────
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: `Einladung als Fahrlehrer – ${tenantName}`,
          html: buildInviteEmailHtml({ firstName, lastName, tenantName, inviteLink }),
          senderName: tenantName
        })
        results.push({ name: `${firstName} ${lastName}`, status: 'email_sent', message: 'E-Mail gesendet', invite_link: inviteLink })
        logger.debug('✅ Onboarding-E-Mail gesendet an:', email)
      } catch (emailErr: any) {
        logger.warn('⚠️ E-Mail fehlgeschlagen für', email, emailErr.message)
        results.push({ name: `${firstName} ${lastName}`, status: 'invited', message: `E-Mail fehlgeschlagen. Link: ${inviteLink}`, invite_link: inviteLink })
      }
      continue
    }
  }

  logger.debug('✅ invite-staff-batch abgeschlossen:', results)
  return { success: true, results }
})

function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function buildInviteEmailHtml({ firstName, lastName, tenantName, inviteLink }: {
  firstName: string; lastName: string; tenantName: string; inviteLink: string
}): string {
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#f4f4f4;padding:40px 0">
<table width="600" style="background:#fff;border-radius:8px;margin:0 auto;padding:40px">
  <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0">Willkommen im Team!</h1></td></tr>
  <tr><td style="padding:30px">
    <p>Hallo <strong>${firstName} ${lastName}</strong>,</p>
    <p>Sie wurden als Fahrlehrer bei <strong>${tenantName}</strong> eingeladen.</p>
    <p style="text-align:center">
      <a href="${inviteLink}" style="background:#2563eb;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Jetzt registrieren</a>
    </p>
    <p style="font-size:13px;color:#666">Oder Link kopieren: <a href="${inviteLink}">${inviteLink}</a></p>
    <p style="font-size:12px;color:#999">Einladung gültig 7 Tage.</p>
  </td></tr>
</table></body></html>`
}
