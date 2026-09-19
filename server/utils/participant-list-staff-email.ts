import { escapeAttr, escapeHtml } from '~/server/utils/branded-email'
import { participantIdentityLine } from '~/utils/participant-identity'

function logoBlock(logoUrl: string | null, tenantName: string, primaryColor: string): string {
  const safeColor = escapeAttr(primaryColor)
  return logoUrl
    ? `<div style="margin-bottom:20px;text-align:center"><img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(tenantName)}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : `<div style="margin-bottom:20px;text-align:center"><div style="width:40px;height:40px;border-radius:10px;background:${safeColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${escapeHtml(tenantName.charAt(0).toUpperCase())}</div></div>`
}

export type StaffEmailParticipant = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  birthdate?: string | null
  license_number?: string | null
  sari_faberid?: string | null
}

export function buildStaffEmail(d: {
  courseName: string
  dateStr: string
  timeRange: string
  location: string | null
  participants: StaffEmailParticipant[]
  tenantName: string
  primaryColor: string
  logoUrl: string | null
  isOnDemand?: boolean
}): string {
  const participantRows = d.participants.map((p, i) => {
    const phoneBtn = p.phone
      ? `<a href="tel:${escapeAttr(p.phone)}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:500;padding:5px 10px;border-radius:6px;border:1px solid #e5e7eb;margin-right:4px;white-space:nowrap">📞 ${escapeHtml(p.phone)}</a>`
      : ''
    const emailBtn = p.email
      ? `<a href="mailto:${escapeAttr(p.email)}" style="display:inline-block;background:#eff6ff;color:#2563eb;text-decoration:none;font-size:12px;font-weight:500;padding:5px 10px;border-radius:6px;border:1px solid #bfdbfe;white-space:nowrap">✉ ${escapeHtml(p.email)}</a>`
      : ''
    const identity = escapeHtml(participantIdentityLine(p) || '—')
    return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 8px;font-size:13px;color:#9ca3af;text-align:center;vertical-align:middle">${i + 1}</td>
        <td style="padding:12px 8px;font-size:13px;color:#111827;font-weight:500;vertical-align:middle">${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`)}</td>
        <td style="padding:12px 8px;font-size:12px;color:#374151;vertical-align:middle;white-space:nowrap">${identity}</td>
        <td style="padding:12px 8px;vertical-align:middle"><div style="display:flex;gap:6px;flex-wrap:wrap">${phoneBtn}${emailBtn}${!phoneBtn && !emailBtn ? '<span style="font-size:12px;color:#9ca3af">—</span>' : ''}</div></td>
      </tr>`
  }).join('')

  const headerTitle = d.isOnDemand ? 'Teilnehmerliste' : 'Kurs morgen'
  const safeTenantName = escapeHtml(d.tenantName)
  const safeColor = escapeAttr(d.primaryColor)
  const headerSubline = d.isOnDemand
    ? `<p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">Auf Anfrage versandt · ${safeTenantName}</p>`
    : `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85)">${safeTenantName}</p>`

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px">
      <tr><td>${logoBlock(d.logoUrl, d.tenantName, d.primaryColor)}</td></tr>
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
        <div style="background:${safeColor};padding:28px 32px">
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff">${headerTitle}</h1>
          ${headerSubline}
        </div>
        <div style="padding:24px 32px 0">
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb;border-radius:10px;margin-bottom:24px">
            <tr><td style="padding:16px 20px">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;white-space:nowrap;width:80px">Kurs</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600">${escapeHtml(d.courseName)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Datum</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${escapeHtml(d.dateStr)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Zeit</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${escapeHtml(d.timeRange)}</td>
                </tr>
                ${d.location ? `<tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Ort</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${escapeHtml(d.location)}</td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">
            Teilnehmerliste
            <span style="display:inline-block;margin-left:8px;background:${safeColor};color:#fff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px">${d.participants.length}</span>
          </p>
        </div>
        <div style="overflow-x:auto">
          <table cellpadding="0" cellspacing="0" width="100%" style="min-width:480px">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
                <th style="padding:10px 8px;font-size:11px;color:#9ca3af;text-align:center;font-weight:600;width:40px">#</th>
                <th style="padding:10px 8px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Name</th>
                <th style="padding:10px 8px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Geburtsdatum / LFA</th>
                <th style="padding:10px 8px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Kontakt</th>
              </tr>
            </thead>
            <tbody>${d.participants.length ? participantRows : '<tr><td colspan="4" style="padding:20px;text-align:center;font-size:13px;color:#9ca3af">Keine bestätigten Teilnehmer</td></tr>'}</tbody>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">${safeTenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
