/**
 * Theme presets for the "Aktion starten" marketing wizard.
 * Copied into email_templates per tenant — not shared rows.
 *
 * Themes are filtered per tenant (business_type + feature flags).
 * Additional "suggestions" are built dynamically from the tenant's
 * course_categories (VKU, Motorradkurse, …) and license categories.
 */

export type ThemeKey = 'discount_promo' | 'course' | 'category' | 'affiliate'
export type ThemeFeature = 'courses_enabled' | 'affiliate_enabled' | 'discounts_enabled'

export interface ThemeCreative {
  id: string
  label: string
  subject: string
  /** HTML body using {{…}} placeholders — wrapped later by wrapMarketingEmail */
  html_body: string
}

export interface ThemePreset {
  key: ThemeKey
  title: string
  description: string
  creatives: ThemeCreative[]
  /** If set, ALL listed features must be enabled for the tenant */
  requiresFeatures?: ThemeFeature[]
  /**
   * If set, tenant.business_type must be one of these.
   * Empty/undefined = available for all business types.
   */
  requiresBusinessTypes?: string[]
}

export interface ThemeSuggestion {
  id: string
  /** Which wizard theme flow to open */
  themeKey: ThemeKey
  title: string
  description: string
  /** Prefill category / course_category code */
  categoryCode?: string
  categoryLabel?: string
  /** course_category vs license category */
  kind: 'course_category' | 'license_category'
}

export interface TenantThemeContext {
  businessType: string
  features: Partial<Record<ThemeFeature, boolean>>
  courseCategories: { code: string; name: string }[]
  licenseCategories: { code: string; name: string }[]
}

function ctaButton(label: string): string {
  return `<p style="margin:24px 0"><a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">${label}</a></p>`
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'discount_promo',
    title: 'Rabattaktion',
    description: 'Zeitlich begrenzter Rabatt — z. B. 50 % bis Monatsende',
    requiresFeatures: ['discounts_enabled'],
    creatives: [
      {
        id: 'discount_bold',
        label: 'Direkt & stark',
        subject: '{{discount_percent}} Rabatt — nur noch bis {{discount_valid_until}}',
        html_body: `
<p>Hallo {{first_name}},</p>
<p>Jetzt zugreifen: Mit dem Code <strong>{{discount_code}}</strong> sparst du <strong>{{discount_percent}}</strong> bei {{tenant_name}}.</p>
<p>Gültig bis <strong>{{discount_valid_until}}</strong> — danach ist die Aktion vorbei.</p>
${ctaButton('Jetzt Angebot sichern')}
<p>Fragen? Antworte einfach auf diese E-Mail.</p>
<p>Freundliche Grüsse<br>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'discount_friendly',
        label: 'Freundlich',
        subject: 'Dein persönlicher Vorteil bei {{tenant_name}}',
        html_body: `
<p>Liebe/r {{first_name}},</p>
<p>wir haben etwas für dich: Mit Code <strong>{{discount_code}}</strong> erhältst du <strong>{{discount_percent}}</strong> Rabatt.</p>
<p>Das Angebot gilt bis zum <strong>{{discount_valid_until}}</strong>.</p>
${ctaButton('Zum Angebot')}
<p>Wir freuen uns auf dich!<br>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'discount_urgency',
        label: 'Mit Dringlichkeit',
        subject: 'Nur noch kurz: {{discount_code}} sichert dir {{discount_percent}}',
        html_body: `
<p>Hallo {{first_name}},</p>
<p>Achtung — unser Aktionscode <strong>{{discount_code}}</strong> ({{discount_percent}}) läuft am <strong>{{discount_valid_until}}</strong> ab.</p>
<p>Sichere dir den Vorteil, solange er noch gilt.</p>
${ctaButton('Jetzt buchen')}
<p>{{tenant_name}}</p>
`.trim(),
      },
    ],
  },
  {
    key: 'course',
    title: 'Kurs bewerben',
    description: 'Konkreter Kurstermin mit Datum, Preis und Anmeldelink',
    requiresFeatures: ['courses_enabled'],
    requiresBusinessTypes: ['driving_school'],
    creatives: [
      {
        id: 'course_direct',
        label: 'Direkt',
        subject: '{{course_name}} am {{course_date}} — noch Plätze frei',
        html_body: `
<p>Hallo {{first_name}},</p>
<p>Unser Kurs <strong>{{course_name}}</strong> findet am <strong>{{course_date}}</strong> statt.</p>
<p>Preis: <strong>{{course_price}}</strong></p>
${ctaButton('Jetzt anmelden')}
<p>Wir freuen uns auf dich!<br>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'course_with_discount',
        label: 'Mit Rabatt',
        subject: '{{course_name}} — mit Code {{discount_code}} günstiger',
        html_body: `
<p>Hallo {{first_name}},</p>
<p><strong>{{course_name}}</strong> am {{course_date}} ({{course_price}}).</p>
<p>Mit Code <strong>{{discount_code}}</strong> sparst du {{discount_percent}} — gültig bis {{discount_valid_until}}.</p>
${ctaButton('Kursplatz sichern')}
<p>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'course_soft',
        label: 'Einladend',
        subject: 'Einladung: {{course_name}}',
        html_body: `
<p>Liebe/r {{first_name}},</p>
<p>wir möchten dich zu <strong>{{course_name}}</strong> am {{course_date}} einladen.</p>
<p>Kosten: {{course_price}}</p>
${ctaButton('Details & Anmeldung')}
<p>Freundliche Grüsse<br>{{tenant_name}}</p>
`.trim(),
      },
    ],
  },
  {
    key: 'category',
    title: 'Kategorie bewerben',
    description: 'Fahrkategorie oder Kurskategorie (z. B. Kat. B, Motorrad)',
    requiresBusinessTypes: ['driving_school'],
    creatives: [
      {
        id: 'category_start',
        label: 'Einstieg',
        subject: 'Bereit für Kategorie {{category_label}}?',
        html_body: `
<p>Hallo {{first_name}},</p>
<p>Bei {{tenant_name}} starten wir dich stark in der Kategorie <strong>{{category_label}}</strong>.</p>
<p>Professionelle Ausbildung, flexible Termine — und du bestimmst das Tempo.</p>
${ctaButton('Jetzt Termin finden')}
<p>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'category_discount',
        label: 'Mit Aktion',
        subject: '{{category_label}}: {{discount_percent}} mit Code {{discount_code}}',
        html_body: `
<p>Hallo {{first_name}},</p>
<p>Spezial für Kategorie <strong>{{category_label}}</strong>: Code <strong>{{discount_code}}</strong> gibt dir {{discount_percent}} Rabatt bis {{discount_valid_until}}.</p>
${ctaButton('Angebot nutzen')}
<p>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'category_question',
        label: 'Frage-Stil',
        subject: 'Noch Fragen zu Kategorie {{category_label}}?',
        html_body: `
<p>Liebe/r {{first_name}},</p>
<p>Du interessierst dich für <strong>{{category_label}}</strong>? Wir helfen dir gerne weiter — unverbindlich und persönlich.</p>
${ctaButton('Beratung / Termin')}
<p>Freundliche Grüsse<br>{{tenant_name}}</p>
`.trim(),
      },
    ],
  },
  {
    key: 'affiliate',
    title: 'Affiliate / Freunde werben',
    description: 'Partnerprogramm und Empfehlungen bewerben',
    requiresFeatures: ['affiliate_enabled'],
    creatives: [
      {
        id: 'affiliate_full',
        label: 'Vollprogramm',
        subject: '💸 Bis zu CHF 70.– pro Empfehlung – werde Partner bei {{tenant_name}}',
        html_body: `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827">Verdiene bis zu CHF 70.– pro Empfehlung</h2>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px">Das Affiliate-Programm von {{tenant_name}}</p>
<p>Hallo {{first_name}},</p>
<p>Du kennst jemanden, der den Führerschein machen möchte? Dann empfiehl uns – und verdiene eine Prämie, vollautomatisch und ohne Aufwand.</p>
<h2>So funktioniert es</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">① Kostenlos Partner werden</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Registriere dich mit einem Klick – ohne Vertrag, ohne Kosten.</p>
  </td></tr>
  <tr><td style="height:8px"></td></tr>
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">② Link teilen</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Teile deinen persönlichen Empfehlungslink mit Freunden und Bekannten.</p>
  </td></tr>
  <tr><td style="height:8px"></td></tr>
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">③ Prämie erhalten</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Sobald dein Freund eine Fahrstunde bezahlt, wird die Prämie automatisch gutgeschrieben – Auszahlung jederzeit möglich.</p>
  </td></tr>
</table>
<h2>Was du verdienst</h2>
<p style="margin:0 0 12px;font-size:13px;color:#6b7280">Beträge je nach Kategorie (anpassbar in deinen Affiliate-Einstellungen):</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px">
  <tr style="background:#f8fafc">
    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Kategorie</td>
    <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;text-align:right">Prämie</td>
  </tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">🚌 D (Bus/Car)</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 70.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">🚛 C / CE (LKW)</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 50.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">👨‍🏫 Fahrlehrer</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 40.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">🚗 B Automatik</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 30.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">⛵ Boot / PGS / C1/D1</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 30.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">🚗 B Schaltung</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 20.–</td></tr>
  <tr><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px">🏍️ A / A1 / A35KW</td><td style="padding:11px 14px;border-top:1px solid #f3f4f6;font-size:14px;font-weight:700;color:{{primary_color}};text-align:right">CHF 10.–</td></tr>
</table>
${ctaButton('Jetzt kostenlos Partner werden →')}
<p style="font-size:13px;color:#6b7280">Fragen? Antworte einfach auf diese E-Mail.<br>Freundliche Grüsse<br>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'affiliate_exam_alumni',
        label: 'Nach der Prüfung',
        subject: '💸 Freunde empfehlen & Geld verdienen – so funktioniert\'s',
        html_body: `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827">Geld verdienen mit Empfehlungen</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:13px">{{tenant_name}}</p>
<p>Hallo {{first_name}},</p>
<p>du hast deinen Führerausweis – herzlichen Glückwunsch! 🎉</p>
<p>Hast du Freunde oder Bekannte, die noch die Fahrschule vor sich haben? Mit unserem Empfehlungsprogramm verdienst du ganz einfach Geld:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">① Link teilen</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Teile deinen persönlichen Link mit Freunden.</p>
  </td></tr>
  <tr><td style="height:8px"></td></tr>
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">② Freund bucht</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Sobald dein Freund eine Fahrstunde bezahlt, wird die Prämie automatisch gutgeschrieben.</p>
  </td></tr>
  <tr><td style="height:8px"></td></tr>
  <tr><td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
    <p style="margin:0;font-size:14px;color:#374151;font-weight:600">③ Geld auszahlen</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Du kannst die Auszahlung deiner Prämie jederzeit per Banküberweisung beantragen.</p>
  </td></tr>
</table>
${ctaButton('💸 Jetzt Geld verdienen')}
<p>Freundliche Grüsse<br>{{tenant_name}}</p>
`.trim(),
      },
      {
        id: 'affiliate_friends',
        label: 'Kurz & freundlich',
        subject: 'Teile {{tenant_name}} mit Freunden und verdiene mit',
        html_body: `
<p>Liebe/r {{first_name}},</p>
<p>Gute Ausbildung verdient Weiterempfehlung. Lade Freunde ein — über unseren Partner-Link — und verdiene eine Prämie, sobald sie buchen.</p>
${ctaButton('Empfehlungslink öffnen')}
<p>Danke fürs Teilen!<br>{{tenant_name}}</p>
`.trim(),
      },
    ],
  },
]

export function getThemePreset(key: ThemeKey): ThemePreset | undefined {
  return THEME_PRESETS.find(t => t.key === key)
}

export function getThemeCreative(themeKey: ThemeKey, creativeId: string): ThemeCreative | undefined {
  return getThemePreset(themeKey)?.creatives.find(c => c.id === creativeId)
}

export function isThemeAvailable(theme: ThemePreset, ctx: TenantThemeContext): boolean {
  if (theme.requiresBusinessTypes?.length) {
    if (!theme.requiresBusinessTypes.includes(ctx.businessType)) return false
  }
  if (theme.requiresFeatures?.length) {
    for (const f of theme.requiresFeatures) {
      if (!ctx.features[f]) return false
    }
  }
  return true
}

/** Base themes filtered for this tenant (no dynamic suggestions). */
export function filterThemesForTenant(ctx: TenantThemeContext): ThemePreset[] {
  return THEME_PRESETS.filter(t => isThemeAvailable(t, ctx))
}

/**
 * Build offer suggestions from the tenant's real catalog:
 * - course_categories → VKU, Motorradkurse, CZV, … (only if courses enabled + Fahrschule)
 * - license categories → Kat. B, A, … (Fahrschule)
 */
export function buildThemeSuggestions(ctx: TenantThemeContext): ThemeSuggestion[] {
  const suggestions: ThemeSuggestion[] = []
  const isDrivingSchool = ctx.businessType === 'driving_school'

  if (isDrivingSchool && ctx.features.courses_enabled) {
    for (const cc of ctx.courseCategories) {
      suggestions.push({
        id: `course_cat_${cc.code}`,
        themeKey: 'course',
        title: `${cc.name} bewerben`,
        description: `Kampagne für deine ${cc.name}-Kurse (z. B. offene Termine)`,
        categoryCode: cc.code,
        categoryLabel: cc.name,
        kind: 'course_category',
      })
    }
  }

  if (isDrivingSchool) {
    for (const cat of ctx.licenseCategories) {
      const label = (cat.name || cat.code).replace(/^Kategorie\s*/i, '') || cat.code
      suggestions.push({
        id: `license_${cat.code}`,
        themeKey: 'category',
        title: `Kategorie ${label} bewerben`,
        description: `Fahrstunden / Ausbildung Kat. ${label}`,
        categoryCode: cat.code,
        categoryLabel: cat.name || cat.code,
        kind: 'license_category',
      })
    }
  }

  return suggestions
}

/** Documented placeholders for UI / AI */
export const OFFER_PLACEHOLDERS = [
  '{{first_name}}',
  '{{last_name}}',
  '{{email}}',
  '{{tenant_name}}',
  '{{tenant_slug}}',
  '{{primary_color}}',
  '{{discount_code}}',
  '{{discount_percent}}',
  '{{discount_valid_until}}',
  '{{cta_url}}',
  '{{course_name}}',
  '{{course_date}}',
  '{{course_price}}',
  '{{category_label}}',
  '{{affiliate_signup_url}}',
  '{{unsubscribe_link}}',
  '{{consent_link}}',
] as const
