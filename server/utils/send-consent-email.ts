/**
 * Sends a dynamic double opt-in consent invitation.
 * Personalises the email based on what the tenant offers:
 * - Driving license categories (Kat. B, A, BE…)
 * - Course categories (VKU, CZV, PGS…)
 * - Affiliate program (if enabled)
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { buildConsentLink, buildUnsubscribeLink, wrapMarketingEmail } from '~/server/utils/email-template'

export async function sendConsentEmail({
  leadId,
  token,
  email,
  firstName,
  tenantId,
  tenantName,
  primaryColor,
}: {
  leadId: string
  token: string
  email: string
  firstName?: string | null
  tenantId: string
  tenantName: string
  primaryColor: string
}) {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'
  const consentLink = buildConsentLink(baseUrl, leadId, token)
  const unsubscribeLink = buildUnsubscribeLink(baseUrl, leadId, token)
  const greeting = firstName ? `Hallo ${firstName}` : 'Hallo'

  const supabase = getSupabaseAdmin()

  // Fetch tenant context in parallel
  const [{ data: drivingCats }, { data: courseCats }, { data: affiliateSetting }] = await Promise.all([
    supabase
      .from('categories')
      .select('name, code, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
      .limit(10),
    supabase
      .from('course_categories')
      .select('name, code, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
      .limit(8),
    supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'affiliate')
      .eq('setting_key', 'enabled')
      .maybeSingle(),
  ])

  const affiliateEnabled = affiliateSetting?.setting_value === 'true' || affiliateSetting?.setting_value === true

  // ── Build driving categories block ──────────────────────────────
  let categoriesBlock = ''
  if (drivingCats && drivingCats.length > 0) {
    const badges = drivingCats.map(c =>
      `<span style="display:inline-block;background:${c.color || primaryColor}22;color:${c.color || primaryColor};border:1px solid ${c.color || primaryColor}44;border-radius:20px;padding:4px 12px;font-size:13px;font-weight:600;margin:3px">${c.name}</span>`
    ).join('')
    categoriesBlock = `
      <div style="margin:20px 0;padding:16px 20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">🚗 Führerscheinkategorien</div>
        <div>${badges}</div>
      </div>`
  }

  // ── Build course categories block ────────────────────────────────
  let coursesBlock = ''
  if (courseCats && courseCats.length > 0) {
    const items = courseCats.map(c =>
      `<li style="margin:4px 0;color:#374151;font-size:14px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color || primaryColor};margin-right:8px;vertical-align:middle"></span>
        ${c.name}
      </li>`
    ).join('')
    coursesBlock = `
      <div style="margin:20px 0;padding:16px 20px;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd">
        <div style="font-size:12px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">📚 Kurse & Weiterbildungen</div>
        <ul style="margin:0;padding:0 0 0 4px;list-style:none">${items}</ul>
      </div>`
  }

  // ── Build affiliate block ────────────────────────────────────────
  let affiliateBlock = ''
  if (affiliateEnabled) {
    affiliateBlock = `
      <div style="margin:20px 0;padding:16px 20px;background:#fefce8;border-radius:12px;border:1px solid #fde047">
        <div style="font-size:12px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">💰 Affiliate-Programm</div>
        <p style="margin:0;font-size:14px;color:#713f12;line-height:1.6">
          Empfiehl uns weiter und verdiene Prämien für jede erfolgreiche Weiterempfehlung — direkt ausgezahlt.
        </p>
      </div>`
  }

  // ── Has any extra content? ───────────────────────────────────────
  const hasExtras = categoriesBlock || coursesBlock || affiliateBlock
  const extrasSection = hasExtras ? `
    <p style="margin:20px 0 12px;color:#374151;font-size:15px;font-weight:600">Was dich erwartet:</p>
    ${categoriesBlock}${coursesBlock}${affiliateBlock}
  ` : ''

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:800">Bleib auf dem Laufenden! 👋</h2>
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">${greeting}</p>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">
      Wir würden dir gerne Neuigkeiten, Aktionen und Tipps von <strong>${tenantName}</strong> senden.
      Melde dich jetzt an — kostenlos und jederzeit kündbar.
    </p>

    ${extrasSection}

    <a href="${consentLink}"
      style="display:block;background:${primaryColor};color:#fff;text-decoration:none;text-align:center;padding:18px 28px;border-radius:14px;font-weight:800;font-size:17px;margin:28px 0;letter-spacing:0.01em">
      ✅ Ja, ich melde mich an!
    </a>

    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">
      Kein Interesse? Dann ignoriere diese Email einfach — du wirst nicht erneut kontaktiert.
    </p>
  `

  await sendEmail({
    to: email,
    subject: `Möchtest du von ${tenantName} auf dem Laufenden bleiben?`,
    html: wrapMarketingEmail(content, tenantName, unsubscribeLink, primaryColor),
    fromName: tenantName,
  })
}
