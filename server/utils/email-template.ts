/**
 * Replaces template variables in HTML/text strings.
 * Supported: {{first_name}}, {{last_name}}, {{email}}, {{unsubscribe_link}}, {{consent_link}}, {{tenant_name}}, {{tenant_slug}}
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
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template
    .replace(/\{\{first_name\}\}/g, variables.first_name || 'dort')
    .replace(/\{\{last_name\}\}/g, variables.last_name || '')
    .replace(/\{\{email\}\}/g, variables.email || '')
    .replace(/\{\{unsubscribe_link\}\}/g, variables.unsubscribe_link || '#')
    .replace(/\{\{consent_link\}\}/g, variables.consent_link || '#')
    .replace(/\{\{tenant_name\}\}/g, variables.tenant_name || '')
    .replace(/\{\{tenant_slug\}\}/g, variables.tenant_slug || '')
    .replace(/\{\{primary_color\}\}/g, variables.primary_color || '#1e293b')
    .replace(/\{\{discount_code\}\}/g, variables.discount_code || '')
}

export function buildUnsubscribeLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/unsubscribe?lead_id=${leadId}&token=${token}`
}

export function buildConsentLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/api/marketing/confirm-consent?lead_id=${leadId}&token=${token}`
}

const BASE_URL = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

function resolveLogoUrl(raw: string | null | undefined, tenantId?: string | null, type: 'wide' | 'square' = 'wide'): string | null {
  if (!raw) return null
  // Already a proper HTTPS URL — use as-is
  if (raw.startsWith('https://') || raw.startsWith('http://')) return raw
  // data: URI — proxy through our API so email clients can load it
  if (raw.startsWith('data:') && tenantId) {
    return `${BASE_URL}/api/tenants/logo?id=${encodeURIComponent(tenantId)}&type=${type}`
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
