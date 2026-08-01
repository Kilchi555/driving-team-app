/**
 * Replaces template variables in HTML/text strings.
 * Supported: lead/tenant vars + offer vars (discount, course, category, CTA, affiliate).
 */
export interface TemplateVariables {
  first_name?: string | null
  last_name?: string | null
  email?: string
  unsubscribe_link?: string
  consent_link?: string
  tenant_name?: string
  tenant_slug?: string
  primary_color?: string
  discount_code?: string
  discount_percent?: string
  discount_valid_until?: string
  cta_url?: string
  course_name?: string
  course_date?: string
  course_price?: string
  category_label?: string
  affiliate_signup_url?: string
}

export type OfferCtaType = 'booking' | 'course' | 'ref' | 'partner' | 'custom'

export interface BuildOfferCtaParams {
  baseUrl: string
  tenantSlug: string
  ctaType: OfferCtaType
  /** Optional absolute or path override when ctaType === 'custom' */
  customPath?: string | null
  categoryCode?: string | null
  courseId?: string | null
  discountCode?: string | null
  campaignId?: string | null
}

/**
 * When first_name is missing, rewrite common German greetings to plain "Hallo"
 * so we never produce "Liebe/r dort" or "Hallo dort".
 */
function applyFirstName(template: string, firstName: string | null | undefined): string {
  const name = firstName?.trim()
  if (name) return template.replace(/\{\{first_name\}\}/g, name)

  return template
    // Liebe/r Max,  /  Lieber Max  /  Liebe Max
    .replace(/Liebe\/r\s*\{\{first_name\}\}/gi, 'Hallo')
    .replace(/Lieber?\s*\{\{first_name\}\}/gi, 'Hallo')
    .replace(/Hallo\s*\{\{first_name\}\}/gi, 'Hallo')
    .replace(/Guten Tag\s*,?\s*\{\{first_name\}\}/gi, 'Guten Tag')
    // "Alles gut, {{first_name}}?" → "Alles gut?"
    .replace(/,\s*\{\{first_name\}\}/g, '')
    // Remaining bare {{first_name}} → drop
    .replace(/\{\{first_name\}\}/g, '')
    // Clean leftover "Hallo ," from greeting rewrites
    .replace(/Hallo\s+,/g, 'Hallo,')
    .replace(/,\s*,/g, ',')
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return applyFirstName(template, variables.first_name)
    .replace(/\{\{last_name\}\}/g, variables.last_name || '')
    .replace(/\{\{email\}\}/g, variables.email || '')
    .replace(/\{\{unsubscribe_link\}\}/g, variables.unsubscribe_link || '#')
    .replace(/\{\{consent_link\}\}/g, variables.consent_link || '#')
    .replace(/\{\{tenant_name\}\}/g, variables.tenant_name || '')
    .replace(/\{\{tenant_slug\}\}/g, variables.tenant_slug || '')
    .replace(/\{\{primary_color\}\}/g, variables.primary_color || '#1e293b')
    .replace(/\{\{discount_code\}\}/g, variables.discount_code || '')
    .replace(/\{\{discount_percent\}\}/g, variables.discount_percent || '')
    .replace(/\{\{discount_valid_until\}\}/g, variables.discount_valid_until || '')
    .replace(/\{\{cta_url\}\}/g, variables.cta_url || '#')
    .replace(/\{\{course_name\}\}/g, variables.course_name || '')
    .replace(/\{\{course_date\}\}/g, variables.course_date || '')
    .replace(/\{\{course_price\}\}/g, variables.course_price || '')
    .replace(/\{\{category_label\}\}/g, variables.category_label || '')
    .replace(/\{\{affiliate_signup_url\}\}/g, variables.affiliate_signup_url || variables.cta_url || '#')
}

export function buildUnsubscribeLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/unsubscribe?lead_id=${leadId}&token=${token}`
}

export function buildConsentLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/api/marketing/confirm-consent?lead_id=${leadId}&token=${token}`
}

/** Format discount value for email copy, e.g. "50%" or "CHF 20.00" or "1 Freistunde" */
export function formatDiscountLabel(
  discountType: string | null | undefined,
  discountValue: number | string | null | undefined,
): string {
  const value = Number(discountValue ?? 0)
  if (discountType === 'percentage') return `${value}%`
  if (discountType === 'fixed') return `CHF ${value.toFixed(2)}`
  if (discountType === 'free_lesson') return '1 Freistunde'
  if (discountType === 'free_product') return 'Gratis-Produkt'
  if (!discountType && !discountValue) return ''
  return String(discountValue ?? '')
}

/** Format ISO date for de-CH display (date only). */
export function formatOfferDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zurich',
    })
  } catch {
    return ''
  }
}

export function formatCoursePriceRappen(rappen: number | null | undefined): string {
  if (rappen == null || Number.isNaN(Number(rappen))) return ''
  return `CHF ${(Number(rappen) / 100).toFixed(2)}`
}

/**
 * Build a deep-link CTA for marketing offers.
 * Booking/course links include ?code= for auto-apply when a discount exists.
 */
export function buildOfferCtaUrl(params: BuildOfferCtaParams): string {
  const base = (params.baseUrl || 'https://app.simy.ch').replace(/\/$/, '')
  const slug = params.tenantSlug
  const q = new URLSearchParams()

  if (params.discountCode) q.set('code', params.discountCode)
  if (params.campaignId) q.set('cid', params.campaignId)
  if (params.categoryCode && params.ctaType === 'booking') q.set('category', params.categoryCode)

  const qs = q.toString()
  const withQs = (path: string) => (qs ? `${path}?${qs}` : path)

  switch (params.ctaType) {
    case 'booking':
      return withQs(`${base}/booking/availability/${slug}`)
    case 'course': {
      if (params.courseId) q.set('courseId', params.courseId)
      const courseQs = q.toString()
      return `${base}/customer/courses/${slug}${courseQs ? `?${courseQs}` : ''}`
    }
    case 'ref':
      return `${base}/ref/${slug}${qs ? `?${qs}` : ''}`
    case 'partner':
      // Affiliate signup landing (no personal ref code required)
      return `${base}/partner/${slug}${qs ? `?${qs}` : ''}`
    case 'custom': {
      const raw = (params.customPath || '').trim()
      if (!raw) return withQs(`${base}/booking/availability/${slug}`)
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
          const u = new URL(raw)
          if (params.discountCode && !u.searchParams.has('code')) u.searchParams.set('code', params.discountCode)
          if (params.campaignId && !u.searchParams.has('cid')) u.searchParams.set('cid', params.campaignId)
          return u.toString()
        } catch {
          return raw
        }
      }
      const path = raw.startsWith('/') ? raw : `/${raw}`
      return withQs(`${base}${path}`)
    }
    default:
      return withQs(`${base}/booking/availability/${slug}`)
  }
}

/** End of current month 23:59:59 Europe/Zurich as ISO (approx via local calc). */
export function endOfMonthZurichIso(from: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(from)
  const get = (t: string) => parts.find(p => p.type === t)?.value || '01'
  const year = Number(get('year'))
  const month = Number(get('month'))
  // Last day of month in Zurich: construct noon UTC for day 1 next month and subtract
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  // Use Date.UTC noon then format — simpler: day 0 of next month
  const lastDay = new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate()
  // 21:59 UTC ≈ 23:59 Zurich in winter; 20:59 in summer — use 21:59:59 UTC as safe end-of-day CH
  return new Date(Date.UTC(year, month - 1, lastDay, 21, 59, 59)).toISOString()
}

export function addDaysZurichEndIso(days: number, from: Date = new Date()): string {
  const d = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), 21, 59, 59)).toISOString()
}

// Always use the production URL for logo proxying in emails — email clients
// cannot reach localhost even when the server runs locally.
const PROD_URL = 'https://app.simy.ch'

function resolveLogoUrl(raw: string | null | undefined, tenantId?: string | null, type: 'wide' | 'square' = 'wide'): string | null {
  if (!raw) return null
  // Already a proper HTTPS URL — use as-is
  if (raw.startsWith('https://') || raw.startsWith('http://')) return raw
  // data: URI — proxy through production API so email clients can always load it
  if (raw.startsWith('data:') && tenantId) {
    return `${PROD_URL}/api/tenants/logo?id=${encodeURIComponent(tenantId)}&type=${type}`
  }
  return null
}

export function wrapMarketingEmail(
  content: string,
  tenantName: string,
  unsubscribeLink: string,
  primaryColor = '#1e293b',
  logoUrl?: string | null,
  logoSquareUrl?: string | null,
  trackingPixelUrl?: string | null,
  tenantId?: string | null,
): string {
  const resolvedLogoUrl = resolveLogoUrl(logoUrl, tenantId, 'wide')
  const resolvedSquareUrl = resolveLogoUrl(logoSquareUrl, tenantId, 'square')

  const hasWideLogo = !!resolvedLogoUrl
  const hasSquareLogo = !!resolvedSquareUrl

  // White logo area + primary color bar underneath
  const header = hasWideLogo
    ? `<div style="background:#ffffff;padding:24px 32px;text-align:center">
        <img src="${resolvedLogoUrl}" alt="${tenantName}" style="max-height:64px;max-width:280px;display:block;margin:0 auto" />
      </div>
      <div style="background:${primaryColor};height:6px;font-size:0;line-height:0">&nbsp;</div>`
    : `<div style="background:#ffffff;padding:20px 32px">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          ${hasSquareLogo ? `<td style="padding-right:12px;vertical-align:middle"><img src="${resolvedSquareUrl}" alt="${tenantName}" style="height:40px;width:40px;border-radius:8px;display:block" /></td>` : ''}
          <td style="vertical-align:middle"><span style="color:#111827;font-size:18px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,sans-serif">${tenantName}</span></td>
        </tr></table>
      </div>
      <div style="background:${primaryColor};height:6px;font-size:0;line-height:0">&nbsp;</div>`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden}
.body{padding:32px;color:#374151;font-size:15px;line-height:1.6}
.body h2{color:#111827;font-size:18px;font-weight:600;margin:0 0 16px}
.body p{margin:0 0 16px}
.body a{color:${primaryColor}}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}
</style></head>
<body><div class="wrap">
${header}
<div class="body">${content}</div>
<div class="footer">
  ${tenantName} &middot;
  <a href="${unsubscribeLink}" style="color:#9ca3af">Abmelden</a>
</div>
</div>${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />` : ''}</body></html>`
}
