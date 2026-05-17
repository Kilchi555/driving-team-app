/**
 * POST /api/partner/offer-request
 *
 * Handles partner offer-request form submissions (e.g. Helvetia insurance).
 *
 * Flow:
 * 1. Parse multipart form data
 * 2. Validate required fields
 * 3. Upload documents to private 'partner-documents' bucket
 * 4. Generate 48h signed URLs for uploaded docs
 * 5. Insert row into partner_offer_requests
 * 6. Send email to partner (Helvetia) with full details + docs + referral IBANs
 * 7. Send confirmation email to tenant (minimal info)
 * 8. Send CC to Simy
 * 9. Delete documents from Storage
 */
import { readMultipartFormData } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { wrapMarketingEmail } from '~/server/utils/email-template'

const SIMY_IBAN = 'CH2706300508265621908'
const PARTNER_EMAIL_HELVETIA = 'pascal_kilchenmann@icloud.com' // TODO: change to michele.cecio@helvetia.ch before go-live
const SIMY_CC_EMAIL = 'pascal_kilchenmann@icloud.com' // TODO: change to info@simy.ch before go-live

// In development, all emails are redirected to this address instead of real recipients
const DEV_OVERRIDE_EMAIL = process.env.NODE_ENV !== 'production'
  ? 'pascal_kilchenmann@icloud.com'
  : null

const INSURANCE_LABELS: Record<string, string> = {
  fahrzeug: 'Fahrzeugversicherung',
  hausrat: 'Hausrat',
  privathaftpflicht: 'Privathaftpflicht',
  rechtsschutz: 'Rechtsschutz',
  krankenversicherung: 'Krankenversicherung',
  lebensversicherung: 'Lebensversicherung',
  reise: 'Reiseversicherung',
  andere: 'Andere',
}

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // ── 1. Parse multipart form data ────────────────────────────
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No form data received' })

  const field = (name: string) =>
    parts.find(p => p.name === name)?.data.toString('utf8').trim() || ''

  const tenantId = field('tenant_id')
  const partnerSlug = field('partner_slug') || 'helvetia'
  const firstName = field('first_name')
  const lastName = field('last_name')
  const email = field('email')
  const phone = field('phone')
  const notes = field('notes')
  const insuranceTypesRaw = field('insurance_types')

  // ── 2. Validate ─────────────────────────────────────────────
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email ist erforderlich' })
  if (!firstName) throw createError({ statusCode: 400, statusMessage: 'Vorname ist erforderlich' })

  let insuranceTypes: string[] = []
  try { insuranceTypes = JSON.parse(insuranceTypesRaw) } catch {}
  if (insuranceTypes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens eine Versicherung auswählen' })
  }

  const fileParts = parts.filter(p => p.name === 'files' && p.filename && p.data.length > 0)

  // ── 3. Fetch tenant ─────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, email, iban, primary_color, logo_url, logo_square_url')
    .eq('id', tenantId)
    .maybeSingle()

  const tenantName = tenant?.name || 'Fahrschule'
  const tenantEmail = tenant?.email || null
  const tenantIban = tenant?.iban || '—'
  const primaryColor = tenant?.primary_color || '#0f172a'
  const logoUrl = (() => {
    const v = tenant?.logo_url
    if (!v) return null
    if (v.startsWith('https://') || v.startsWith('data:')) return v
    return null
  })()

  // ── 4. Insert request row (get ID for Storage paths) ────────
  const { data: request, error: insertError } = await supabase
    .from('partner_offer_requests')
    .insert({
      tenant_id: tenantId || null,
      partner_slug: partnerSlug,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      insurance_types: insuranceTypes,
      notes: notes || null,
      status: 'sent',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('partner_offer_requests insert error:', insertError.message)
    // Non-fatal — continue with email sending
  }

  const requestId = request?.id || crypto.randomUUID()

  // ── 5. Upload documents ─────────────────────────────────────
  const uploadedPaths: string[] = []
  const signedUrls: { name: string; url: string }[] = []

  for (const part of fileParts) {
    const safeName = (part.filename || 'dokument').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${tenantId}/${requestId}/${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('partner-documents')
      .upload(path, part.data, {
        contentType: part.type || 'application/octet-stream',
        upsert: true,
      })
    if (uploadError) {
      console.error('Document upload error:', uploadError.message)
      continue
    }
    uploadedPaths.push(path)

    const { data: signed } = await supabase.storage
      .from('partner-documents')
      .createSignedUrl(path, 48 * 60 * 60) // 48h
    if (signed?.signedUrl) {
      signedUrls.push({ name: part.filename || safeName, url: signed.signedUrl })
    }
  }

  // ── 6. Build email content ───────────────────────────────────
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const insuranceList = insuranceTypes
    .map(t => INSURANCE_LABELS[t] || t)
    .join(', ')

  const docsHtml = signedUrls.length > 0
    ? `<div style="margin:20px 0;padding:16px 20px;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd">
        <div style="font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">📎 Hochgeladene Dokumente (Zugriff 48h)</div>
        <ul style="margin:0;padding:0;list-style:none">
          ${signedUrls.map(d => `<li style="margin:6px 0"><a href="${d.url}" style="color:#0369a1;text-decoration:underline;font-size:14px">📄 ${d.name}</a></li>`).join('')}
        </ul>
      </div>`
    : ''

  const referralHtml = `
    <div style="margin:28px 0 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;font-size:13px;color:#64748b">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:10px">Kontaktvermittlung</div>
      <p style="margin:0 0 4px"><strong style="color:#374151">${tenantName}</strong></p>
      <p style="margin:0 0 12px">IBAN: <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${tenantIban}</code></p>
      <div style="border-top:1px solid #e2e8f0;padding-top:10px">
        <p style="margin:0 0 4px"><strong style="color:#374151">Simy IT Systems</strong></p>
        <p style="margin:0">IBAN: <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${SIMY_IBAN}</code></p>
      </div>
    </div>`

  const helvetiaContent = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px;font-weight:800">Neue Offerten-Anfrage</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Eingegangen via Simy Partner-Portal · ${new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

    <div style="margin:0 0 20px;padding:20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
      <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">👤 Kundenangaben</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#6b7280;width:120px">Name</td><td style="padding:4px 0;color:#111827;font-weight:600">${fullName || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Email</td><td style="padding:4px 0"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Telefon</td><td style="padding:4px 0;color:#111827">${phone || '—'}</td></tr>
        ${notes ? `<tr><td style="padding:4px 0;color:#6b7280;vertical-align:top">Notiz</td><td style="padding:4px 0;color:#111827">${notes}</td></tr>` : ''}
      </table>
    </div>

    <div style="margin:0 0 20px;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0">
      <div style="font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">🛡️ Gewünschte Offerten</div>
      <div style="font-size:15px;color:#166534;font-weight:600">${insuranceList}</div>
    </div>

    ${docsHtml}
    ${referralHtml}
  `

  // ── 7. Confirmation to customer ─────────────────────────────
  const customerContent = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:800">Ihre Anfrage ist eingegangen!</h2>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">
      Liebe/r ${firstName || 'Kunde'},<br/><br/>
      vielen Dank für Ihre Anfrage. Wir haben Ihre Offerten-Anfrage an <strong>Helvetia Glarus</strong> weitergeleitet.
      Ein Berater wird sich in Kürze bei Ihnen melden — in der Regel innert 1–2 Arbeitstagen.
    </p>
    <div style="padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:0 0 20px">
      <div style="font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">🛡️ Ihre gewünschten Offerten</div>
      <div style="font-size:15px;color:#166534;font-weight:600">${insuranceList}</div>
    </div>
    <div style="padding:16px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;font-size:13px;color:#64748b">
      <p style="margin:0 0 8px"><strong style="color:#374151">Ihr Ansprechpartner</strong></p>
      <p style="margin:0 0 4px;color:#374151;font-weight:600">Michele Cecio · Helvetia Glarus</p>
      <p style="margin:0 0 3px">📞 <a href="tel:+41582806051" style="color:#2563eb;text-decoration:none">+41 58 280 60 51</a></p>
      <p style="margin:0">✉️ <a href="mailto:michele.cecio@helvetia.ch" style="color:#2563eb;text-decoration:none">michele.cecio@helvetia.ch</a></p>
    </div>
  `
  await sendEmail({
    to: DEV_OVERRIDE_EMAIL ?? email,
    subject: `${DEV_OVERRIDE_EMAIL ? '[TEST — Kunden-Bestätigung] ' : ''}Ihre Helvetia-Offerten-Anfrage ist eingegangen`,
    html: wrapMarketingEmail(customerContent, tenantName, '#', primaryColor, logoUrl, null),
    fromName: tenantName,
  })

  // ── 8. Email to Helvetia ────────────────────────────────────
  const helvetiaTo = DEV_OVERRIDE_EMAIL ?? PARTNER_EMAIL_HELVETIA
  await sendEmail({
    to: helvetiaTo,
    subject: `${DEV_OVERRIDE_EMAIL ? '[TEST — Helvetia] ' : ''}Offerten-Anfrage: ${fullName || email} — ${insuranceList}`,
    html: wrapMarketingEmail(helvetiaContent, 'Simy Partner-Portal', '#', '#0f172a', null, null),
    fromName: 'Simy Partner-Portal',
  })

  // ── 8. Confirmation to tenant (minimal) ─────────────────────
  const tenantContent = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:800">Neue Offerten-Anfrage eingegangen</h2>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">
      Ein Interessent hat via Ihr Partner-Portal eine unverbindliche Offerte angefragt und wurde an Helvetia weitergeleitet.
    </p>
    <div style="padding:16px 20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;font-size:14px">
      <p style="margin:0 0 6px;color:#6b7280">Name: <strong style="color:#111827">${fullName || '—'}</strong></p>
      <p style="margin:0 0 6px;color:#6b7280">Email: <strong style="color:#111827">${email}</strong></p>
      <p style="margin:0;color:#6b7280">Gewünschte Offerten: <strong style="color:#111827">${insuranceList}</strong></p>
    </div>
  `
  const tenantTo = DEV_OVERRIDE_EMAIL ?? tenantEmail
  if (tenantTo) {
    await sendEmail({
      to: tenantTo,
      subject: `${DEV_OVERRIDE_EMAIL ? '[TEST — Tenant-Bestätigung] ' : ''}Neue Helvetia-Offerten-Anfrage von ${fullName || email}`,
      html: wrapMarketingEmail(tenantContent, tenantName, '#', primaryColor, logoUrl, null),
      fromName: 'Simy Partner-Portal',
    })
  }

  // ── 9. CC to Simy ───────────────────────────────────────────
  const simyTo = DEV_OVERRIDE_EMAIL ?? SIMY_CC_EMAIL
  await sendEmail({
    to: simyTo,
    subject: `${DEV_OVERRIDE_EMAIL ? '[TEST — Simy CC] ' : ''}[Helvetia Lead] ${fullName || email} via ${tenantName}`,
    html: wrapMarketingEmail(helvetiaContent, 'Simy Partner-Portal', '#', '#0f172a', null, null),
    fromName: 'Simy Partner-Portal',
  })

  // ── 10. Delete documents from Storage ───────────────────────
  if (uploadedPaths.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from('partner-documents')
      .remove(uploadedPaths)
    if (deleteError) console.error('Document cleanup error:', deleteError.message)
  }

  return { success: true }
})
