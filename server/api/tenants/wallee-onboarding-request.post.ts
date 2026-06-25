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

// Swiss Handelsregisteramt by canton
const HRA_BY_CANTON: Record<string, { name: string; address: string; url: string }> = {
  ZH: { name: 'Handelsregisteramt Kanton Zürich',        address: 'Selnaustrasse 32, 8001 Zürich',         url: 'https://www.zh.ch/de/wirtschaft-arbeit/handelsregister.html' },
  BE: { name: 'Handelsregister Kanton Bern',             address: 'Schermenweg 11, 3001 Bern',             url: 'https://www.be.ch/de/start/themen/wirtschaft-arbeit/handelsregister.html' },
  LU: { name: 'Handelsregister Kanton Luzern',           address: 'Bahnhofstrasse 15, 6002 Luzern',        url: 'https://www.lu.ch/verwaltung/JSD/handelsregister' },
  UR: { name: 'Handelsregister Kanton Uri',              address: 'Rathausplatz 1, 6460 Altdorf',          url: 'https://www.ur.ch/handelsregister' },
  SZ: { name: 'Handelsregister Kanton Schwyz',           address: 'Kollegiumstrasse 28, 6431 Schwyz',      url: 'https://www.sz.ch/handelsregister' },
  OW: { name: 'Handelsregister Kanton Obwalden',         address: 'Rathaus, 6060 Sarnen',                  url: 'https://www.ow.ch/handelsregister' },
  NW: { name: 'Handelsregister Kanton Nidwalden',        address: 'Dorfplatz 2, 6371 Stans',               url: 'https://www.nw.ch/handelsregister' },
  GL: { name: 'Handelsregister Kanton Glarus',           address: 'Kirchgasse 2, 8750 Glarus',             url: 'https://www.gl.ch/handelsregister' },
  ZG: { name: 'Handelsregister Kanton Zug',              address: 'Ägeristrasse 56, 6301 Zug',             url: 'https://www.zg.ch/handelsregister' },
  FR: { name: 'Registre du commerce Fribourg',           address: 'Route du Mont-Carmel 1, 1762 Givisiez', url: 'https://www.fr.ch/handelsregister' },
  SO: { name: 'Handelsregister Kanton Solothurn',        address: 'Ambassadoren-Hof, 4509 Solothurn',      url: 'https://www.so.ch/handelsregister' },
  BS: { name: 'Handelsregister Kanton Basel-Stadt',      address: 'Eisengasse 8, 4001 Basel',              url: 'https://www.bs.ch/handelsregister' },
  BL: { name: 'Handelsregister Kanton Basel-Landschaft', address: 'Rheinstrasse 29, 4410 Liestal',         url: 'https://www.bl.ch/handelsregister' },
  SH: { name: 'Handelsregister Kanton Schaffhausen',     address: 'Beckenstube 7, 8200 Schaffhausen',      url: 'https://www.sh.ch/handelsregister' },
  AR: { name: 'Handelsregister Kanton Appenzell A.Rh.',  address: 'Obstmarkt 1, 9102 Herisau',             url: 'https://www.ar.ch/handelsregister' },
  AI: { name: 'Handelsregister Kanton Appenzell I.Rh.',  address: 'Marktgasse 2, 9050 Appenzell',          url: 'https://www.ai.ch/handelsregister' },
  SG: { name: 'Handelsregister Kanton St. Gallen',       address: 'Davidstrasse 35, 9001 St. Gallen',      url: 'https://www.sg.ch/handelsregister' },
  GR: { name: 'Handelsregister Kanton Graubünden',       address: 'Rohanstrasse 5, 7001 Chur',             url: 'https://www.gr.ch/handelsregister' },
  AG: { name: 'Handelsregister Kanton Aargau',           address: 'Entfelderstrasse 22, 5001 Aarau',       url: 'https://www.ag.ch/handelsregister' },
  TG: { name: 'Handelsregister Kanton Thurgau',          address: 'Promenadenstrasse 8, 8510 Frauenfeld',  url: 'https://www.tg.ch/handelsregister' },
  TI: { name: 'Registro di commercio Ticino',            address: 'Via Ghiringhelli 19, 6500 Bellinzona',  url: 'https://www.ti.ch/registrocommercio' },
  VD: { name: 'Registre du commerce Vaud',               address: 'Place du Château 4, 1014 Lausanne',     url: 'https://www.vd.ch/registreducommerce' },
  VS: { name: 'Registre du commerce Valais',             address: 'Place de la Planta 3, 1950 Sion',       url: 'https://www.vs.ch/registreducommerce' },
  NE: { name: 'Registre du commerce Neuchâtel',          address: 'Rue du Pommier 1, 2000 Neuchâtel',      url: 'https://www.ne.ch/registreducommerce' },
  GE: { name: 'Registre du commerce Genève',             address: 'Rue du Pré-de-la-Bichette 1, 1202 Genève', url: 'https://www.ge.ch/registreducommerce' },
  JU: { name: 'Registre du commerce Jura',               address: 'Rue du 24-Septembre 1, 2800 Delémont',  url: 'https://www.jura.ch/registreducommerce' },
}

function getCantonFromZip(zip: string | null | undefined): string | null {
  if (!zip) return null
  const z = parseInt(zip.replace(/\D/g, ''), 10)
  if (isNaN(z)) return null
  if (z >= 1200 && z <= 1299) return 'GE'
  if (z >= 1000 && z <= 1199) return 'VD'
  if (z >= 1300 && z <= 1599) return 'VD'
  if (z >= 1600 && z <= 1799) return 'FR'
  if (z >= 1800 && z <= 1999) return 'VS'
  if (z >= 2000 && z <= 2399) return 'NE'
  if (z >= 2800 && z <= 2999) return 'JU'
  if (z >= 3000 && z <= 3999) return 'BE'
  if (z >= 4000 && z <= 4099) return 'BS'
  if (z >= 4100 && z <= 4499) return 'BL'
  if (z >= 4500 && z <= 4799) return 'SO'
  if (z >= 5000 && z <= 5799) return 'AG'
  if (z >= 6000 && z <= 6059) return 'LU'
  if (z >= 6060 && z <= 6079) return 'OW'
  if (z >= 6080 && z <= 6099) return 'LU'
  if (z >= 6100 && z <= 6199) return 'LU'
  if (z >= 6200 && z <= 6299) return 'LU'
  if (z >= 6300 && z <= 6369) return 'ZG'
  if (z >= 6370 && z <= 6389) return 'NW'
  if (z >= 6390 && z <= 6399) return 'OW'
  if (z >= 6400 && z <= 6459) return 'SZ'
  if (z >= 6460 && z <= 6479) return 'UR'
  if (z >= 6480 && z <= 6499) return 'UR'
  if (z >= 6500 && z <= 6999) return 'TI'
  if (z >= 7000 && z <= 7999) return 'GR'
  if (z >= 8000 && z <= 8099) return 'ZH'
  if (z >= 8100 && z <= 8199) return 'ZH'
  if (z >= 8200 && z <= 8299) return 'SH'
  if (z >= 8300 && z <= 8499) return 'ZH'
  if (z >= 8500 && z <= 8599) return 'TG'
  if (z >= 8600 && z <= 8799) return 'ZH'
  if (z >= 8800 && z <= 8899) return 'SZ'
  if (z >= 8900 && z <= 8999) return 'ZH'
  if (z >= 9000 && z <= 9099) return 'SG'
  if (z >= 9100 && z <= 9199) return 'AR'
  if (z >= 9200 && z <= 9499) return 'SG'
  if (z >= 9500 && z <= 9599) return 'SG'
  if (z >= 9600 && z <= 9699) return 'SG'
  return null
}

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

  const uidNumber      = field('uid_number')
  const iban           = field('iban')
  const companyName    = field('company_name')
  const contactName    = field('contact_name')
  const notes          = field('notes')
  const uidUpdateOnly  = field('uid_update_only') === 'true'
  const pdfPart        = parts.find(p => p.name === 'handelsregister' && p.filename)

  // UID-only update: tenant is adding their UID after initial pending_uid submission
  if (uidUpdateOnly) {
    if (!uidNumber) throw createError({ statusCode: 400, statusMessage: 'uid_number erforderlich' })
    const supabaseUid = getSupabaseAdmin()
    const { error: uidErr } = await supabaseUid
      .from('tenants')
      .update({ wallee_uid_number: uidNumber, wallee_onboarding_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', tenantId)
    if (uidErr) throw createError({ statusCode: 500, statusMessage: uidErr.message })
    // Notify simy team
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data: t } = await getSupabaseAdmin().from('tenants').select('name').eq('id', tenantId).single()
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch',
        to: 'info@simy.ch',
        subject: `✅ UID nachgereicht: ${t?.name || tenantId}`,
        html: `<p><strong>${t?.name}</strong> hat die UID-Nummer nachgereicht: <strong>${uidNumber}</strong></p><p>→ <a href="https://app.simy.ch/tenant-admin/tenants">Tenant verwalten</a></p>`,
      })
    } catch {}
    return { success: true, message: 'UID eingereicht. Wir werden deinen Antrag jetzt bearbeiten.' }
  }

  if (!iban || !companyName) {
    throw createError({ statusCode: 400, statusMessage: 'iban und company_name sind erforderlich' })
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
  const newStatus = uidNumber ? 'pending' : 'pending_uid'
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      wallee_onboarding_status:    newStatus,
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

  // ─── Load tenant contact email + address for confirmation ────────────────
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('contact_email, name, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
    .eq('id', tenantId)
    .single()

  // ─── Send notification email to simy team ────────────────────────────────
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const pdfLine = handelsregisterUrl
      ? `<p><strong>Handelsregister:</strong> <a href="${handelsregisterUrl}">PDF öffnen</a></p>`
      : '<p><strong>Handelsregister:</strong> Kein PDF hochgeladen</p>'

    const street = tenantData?.invoice_street
      ? `${tenantData.invoice_street} ${tenantData.invoice_street_nr || ''}`.trim()
      : null
    const cityLine = tenantData?.invoice_zip || tenantData?.invoice_city
      ? `${tenantData.invoice_zip || ''} ${tenantData.invoice_city || ''}`.trim()
      : null
    const addressLine = [street, cityLine].filter(Boolean).join(', ')

    await resend.emails.send({
      from: SIMY_FROM_EMAIL,
      to: SIMY_TEAM_EMAIL,
      subject: `🏦 Neuer Wallee-Antrag: ${companyName}`,
      html: `
        <h2>Neuer Wallee Onboarding-Antrag</h2>
        <p><strong>Firma:</strong> ${companyName}</p>
        <p><strong>Adresse:</strong> ${addressLine || '—'}</p>
        <p><strong>Tenant ID:</strong> ${tenantId}</p>
        <p><strong>Kontaktperson:</strong> ${contactName || '—'}</p>
        <p><strong>UID-Nummer:</strong> ${uidNumber || '⚠️ noch keine UID — Antrag als pending_uid gespeichert'}</p>
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

  // ─── Confirmation email to tenant ────────────────────────────────────────
  if (tenantData?.contact_email) {
    try {
      const { sendEmail } = await import('~/server/utils/email')
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
      await sendEmail({
        to: tenantData.contact_email,
        fromName: 'Simy',
        subject: '✅ Wallee-Antrag erhalten – wir melden uns in ca. 5 Werktagen',
        html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Antrag erfolgreich eingereicht</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px">Online-Zahlungen für ${tenantData.name || companyName}</p>
        </div>
        <div style="padding:32px">
          <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo ${contactName || tenantData.name || 'Team'},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
            wir haben deinen Antrag für Online-Zahlungen erhalten und werden dein Wallee-Konto innerhalb von <strong>ca. 5 Werktagen</strong> einrichten. Du erhältst eine weitere E-Mail sobald alles aktiv ist.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.05em">Deine Angaben</p>
            <table cellpadding="4" style="font-size:14px;color:#374151;width:100%">
              <tr><td style="color:#6b7280;width:140px">Firma</td><td><strong>${companyName}</strong></td></tr>
              <tr><td style="color:#6b7280">UID-Nummer</td><td><strong>${uidNumber}</strong></td></tr>
              <tr><td style="color:#6b7280">IBAN</td><td><strong>${iban}</strong></td></tr>
            </table>
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:20px 0">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em">Erinnerung: Abrechnung</p>
            <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6">
              Die Abrechnung startet erst ab dem Zeitpunkt, wenn deine Online-Zahlungen aktiv sind. Du hast insgesamt <strong>30 Tage</strong> ab deinem Upgrade.
            </p>
          </div>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            Bei Fragen erreichst du uns jederzeit unter <a href="mailto:info@simy.ch" style="color:#6000BD">info@simy.ch</a>
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:20px 0">
              <a href="${baseUrl}/admin/profile"
                 style="display:inline-block;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                Zum Admin-Bereich →
              </a>
            </td>
          </tr></table>
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
    } catch (confirmErr: any) {
      console.error('⚠️ Tenant confirmation email failed (non-fatal):', confirmErr.message)
    }
  }

  if (newStatus === 'pending_uid' && tenantData?.contact_email) {
    try {
      const { sendEmail } = await import('~/server/utils/email')
      await sendEmail({
        to: tenantData.contact_email,
        fromName: 'Simy',
        subject: '📋 Wallee-Antrag erhalten – UID-Nummer fehlt noch',
        html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:600px">
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Antrag vorgemerkt</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px">Noch ein Schritt fehlt</p>
        </div>
        <div style="padding:32px">
          <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo ${contactName || tenantData.name || 'Team'},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
            wir haben deinen Antrag für Online-Zahlungen erhalten. Für die Aktivierung benötigen wir jedoch noch deine <strong>UID-Nummer</strong> (Unternehmens-Identifikationsnummer).
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c2410c">Was ist die UID-Nummer?</p>
            <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6">
              Die UID ist deine Unternehmens-Identifikationsnummer (z.B. CHE-123.456.789).
              Du findest sie im <a href="https://www.uid.admin.ch" style="color:#c2410c">UID-Register</a> oder auf deinen Steuerunterlagen.
            </p>
          </div>
          ${(() => {
            const canton = getCantonFromZip(tenantData?.invoice_zip)
            const hra = canton ? HRA_BY_CANTON[canton] : null
            if (!hra) return ''
            return `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8">📍 Zuständiges Handelsregisteramt (${canton})</p>
            <p style="margin:0 0 4px;font-size:14px;color:#1e40af;font-weight:600">${hra.name}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#1e40af">${hra.address}</p>
            <a href="${hra.url}" style="font-size:14px;color:#1d4ed8">${hra.url} →</a>
          </div>`
          })()}
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#15803d">Noch keine UID? Kein Problem.</p>
            <p style="margin:0;font-size:14px;color:#166534;line-height:1.6">
              Falls dein Betrieb noch nicht eingetragen ist, übernimmt <strong>Simy bis zu CHF 80.–</strong> der Kosten für die Eintragung als Einzelfirma.
              Melde dich einfach bei <a href="mailto:info@simy.ch" style="color:#15803d">info@simy.ch</a> — wir helfen dir dabei.
            </p>
          </div>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            Sobald du die UID hast, kannst du sie direkt in deinem Admin-Bereich nachtragen.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:20px 0">
              <a href="https://app.simy.ch/admin/profile"
                 style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                UID nachtragen →
              </a>
            </td>
          </tr></table>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
      })
    } catch (e: any) {
      console.error('⚠️ pending_uid email failed (non-fatal):', e.message)
    }
  }

  return {
    success: true,
    message: uidNumber
      ? 'Dein Antrag wurde eingereicht. Wir melden uns innerhalb von 2–5 Werktagen.'
      : 'Dein Antrag wurde vorgemerkt. Du erhältst eine E-Mail mit Infos zur UID-Nummer.',
  }
})
