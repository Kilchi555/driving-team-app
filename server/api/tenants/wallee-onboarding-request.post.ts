// server/api/tenants/wallee-onboarding-request.post.ts
// Tenant submits KYC documents to request Wallee/online-payment activation.
// Uploads Handelsregister PDF to Supabase Storage, updates tenant record,
// and notifies the simy.ch team by email.

import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const SIMY_TEAM_EMAIL = 'info@simy.ch'
const SIMY_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch'

export default defineEventHandler(async (event) => {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const tenantId = authUser.tenant_id as string
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Tenant ID missing' })

  // ─── Parse multipart form ─────────────────────────────────────────────────
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No form data received' })

  const field = (name: string) =>
    parts.find(p => p.name === name && !p.filename)?.data.toString().trim() || ''

  const uidNumber   = field('uid_number')
  const iban        = field('iban')
  const companyName = field('company_name')
  const contactName = field('contact_name')
  const notes       = field('notes')
  const pdfPart     = parts.find(p => p.name === 'handelsregister' && p.filename)

  if (!uidNumber || !iban || !companyName) {
    throw createError({ statusCode: 400, statusMessage: 'uid_number, iban und company_name sind erforderlich' })
  }

  const supabase = getSupabaseAdmin()

  // ─── Check current status ─────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('wallee_onboarding_status, name')
    .eq('id', tenantId)
    .single()

  if (tenant?.wallee_onboarding_status === 'active') {
    throw createError({ statusCode: 409, statusMessage: 'Online-Zahlungen sind bereits aktiv' })
  }

  // ─── Upload Handelsregister PDF (optional) ────────────────────────────────
  let handelsregisterUrl: string | null = null

  if (pdfPart?.data) {
    if (pdfPart.data.length > 10 * 1024 * 1024) {
      throw createError({ statusCode: 400, statusMessage: 'PDF darf maximal 10 MB gross sein' })
    }
    const filename = `${tenantId}/handelsregister-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('tenant-documents')
      .upload(filename, pdfPart.data, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      throw createError({ statusCode: 500, statusMessage: 'PDF-Upload fehlgeschlagen' })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('tenant-documents')
      .getPublicUrl(filename)
    handelsregisterUrl = publicUrl
  }

  // ─── Update tenant record ─────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      wallee_onboarding_status:    'pending',
      wallee_uid_number:           uidNumber,
      wallee_iban:                 iban,
      wallee_application_notes:    notes || null,
      ...(handelsregisterUrl ? { wallee_handelsregister_url: handelsregisterUrl } : {}),
      wallee_applied_at:           new Date().toISOString(),
      updated_at:                  new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (updateError) {
    console.error('Tenant update error:', updateError)
    throw createError({ statusCode: 500, statusMessage: 'Datenbankfehler beim Speichern des Antrags' })
  }

  // ─── Send notification email to simy team ────────────────────────────────
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const pdfLine = handelsregisterUrl
      ? `<p><strong>Handelsregister:</strong> <a href="${handelsregisterUrl}">PDF öffnen</a></p>`
      : '<p><strong>Handelsregister:</strong> Kein PDF hochgeladen</p>'

    await resend.emails.send({
      from: SIMY_FROM_EMAIL,
      to: SIMY_TEAM_EMAIL,
      subject: `🏦 Neuer Wallee-Antrag: ${companyName}`,
      html: `
        <h2>Neuer Wallee Onboarding-Antrag</h2>
        <p><strong>Firma:</strong> ${companyName}</p>
        <p><strong>Tenant ID:</strong> ${tenantId}</p>
        <p><strong>Kontaktperson:</strong> ${contactName || '—'}</p>
        <p><strong>UID-Nummer:</strong> ${uidNumber}</p>
        <p><strong>IBAN:</strong> ${iban}</p>
        ${pdfLine}
        <p><strong>Notizen:</strong> ${notes || '—'}</p>
        <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}</p>
        <hr/>
        <p>→ <a href="https://app.simy.ch/tenant-admin/tenants">Tenant in simy.ch Verwaltung öffnen</a></p>
        <p>Nach Einrichtung des Wallee-Spaces bitte Tenant-ID + Space-ID + User-ID dort eintragen und auf "Aktivieren" klicken.</p>
      `,
    })
  } catch (emailErr: any) {
    console.error('⚠️ Team notification email failed (non-fatal):', emailErr.message)
  }

  return {
    success: true,
    message: 'Dein Antrag wurde eingereicht. Wir melden uns innerhalb von 2–5 Werktagen.',
  }
})
