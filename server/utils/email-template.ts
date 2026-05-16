/**
 * Replaces template variables in HTML/text strings.
 * Supported: {{first_name}}, {{last_name}}, {{email}}, {{unsubscribe_link}}, {{consent_link}}, {{tenant_name}}
 */
export interface TemplateVariables {
  first_name?: string | null
  last_name?: string | null
  email?: string
  unsubscribe_link?: string
  consent_link?: string
  tenant_name?: string
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
    .replace(/\{\{primary_color\}\}/g, variables.primary_color || '#1e293b')
    .replace(/\{\{discount_code\}\}/g, variables.discount_code || '')
}

export function buildUnsubscribeLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/unsubscribe?lead_id=${leadId}&token=${token}`
}

export function buildConsentLink(baseUrl: string, leadId: string, token: string): string {
  return `${baseUrl}/api/marketing/confirm-consent?lead_id=${leadId}&token=${token}`
}

export function wrapMarketingEmail(
  content: string,
  tenantName: string,
  unsubscribeLink: string,
  primaryColor = '#1e293b',
  logoUrl?: string | null,
): string {
  // Only use logo if it's a real hosted URL (not a base64 data URI)
  const showLogo = logoUrl && logoUrl.startsWith('https://')

  const logoSection = showLogo
    ? `<div style="background:#fff;padding:20px 32px 0;text-align:center">
        <img src="${logoUrl}" alt="${tenantName}" style="max-height:56px;max-width:180px;object-fit:contain" />
      </div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden}
.header{background:${primaryColor};padding:20px 32px}
.header h1{margin:0;color:#fff;font-size:18px;font-weight:600}
.body{padding:32px;color:#374151;font-size:15px;line-height:1.6}
.body h2{color:#111827;font-size:18px;font-weight:600;margin:0 0 16px}
.body p{margin:0 0 16px}
.body a{color:${primaryColor}}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}
</style></head>
<body><div class="wrap">
${logoSection}
<div class="header"><h1>${tenantName}</h1></div>
<div class="body">${content}</div>
<div class="footer">
  ${tenantName} &middot;
  <a href="${unsubscribeLink}" style="color:#9ca3af">Abmelden</a>
</div>
</div></body></html>`
}
