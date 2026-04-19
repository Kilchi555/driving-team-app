// server/utils/invoice-email.ts
// Gemeinsames responsives Email-Template für Rechnungen

export function formatChfEmail(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

export function formatDateEmail(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}

export function formatAppointmentDateEmail(dateStr: string): string {
  if (!dateStr) return ''
  let s = dateStr
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
  if (s.includes('+00') && !s.includes('+00:00')) s = s.replace('+00', '+00:00')
  if (!s.includes('+') && !s.includes('Z')) s += '+00:00'
  const d = new Date(s)
  if (isNaN(d.getTime())) return dateStr
  const local = new Date(d.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' }))
  const datePart = local.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timePart = local.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

export interface InvoiceEmailItem {
  product_name: string
  appointment_date?: string | null
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  lesson_price_rappen?: number
  admin_fee_rappen?: number
  products_price_rappen?: number
  discount_amount_rappen?: number
  voucher_discount_rappen?: number
  credit_used_rappen?: number
  product_details?: { name: string; price_rappen: number }[]
}

export interface InvoiceEmailData {
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  items: InvoiceEmailItem[]
  subtotalRappen: number
  discountRappen?: number
  totalRappen: number
  tenantName: string
  staffName: string
  primaryColor?: string | null
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  creditorName?: string
  scorRef?: string | null
}

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const brand = data.primaryColor || '#1E40AF'
  const brandLight = brand + '18'

  // Tabellen-Zeilen
  const rows = data.items.map(item => {
    const dateStr = (item as any).appointment_start_time || item.appointment_date
    const hasBreakdown = (item.lesson_price_rappen || 0) > 0 || (item.admin_fee_rappen || 0) > 0 ||
      (item.products_price_rappen || 0) > 0 || (item.discount_amount_rappen || 0) > 0 ||
      (item.voucher_discount_rappen || 0) > 0 || (item.credit_used_rappen || 0) > 0

    const bdRows = hasBreakdown ? `
      <tr class="bd-row">
        <td colspan="4" style="padding:0 12px 10px;border-bottom:1px solid #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${(item.lesson_price_rappen || 0) > 0 ? `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#94a3b8;">Fahrstunde</td><td style="padding:2px 0;text-align:right;font-size:11px;color:#64748b;">${formatChfEmail(item.lesson_price_rappen!)}</td></tr>` : ''}
            ${(item.admin_fee_rappen || 0) > 0 ? `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#94a3b8;">Admin-Gebühr</td><td style="padding:2px 0;text-align:right;font-size:11px;color:#64748b;">${formatChfEmail(item.admin_fee_rappen!)}</td></tr>` : ''}
            ${(item.products_price_rappen || 0) > 0
              ? (item.product_details && item.product_details.length > 0
                ? item.product_details.map(pd => `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#94a3b8;">${pd.name}</td><td style="padding:2px 0;text-align:right;font-size:11px;color:#64748b;">${formatChfEmail(pd.price_rappen)}</td></tr>`).join('')
                : `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#94a3b8;">Material / Produkte</td><td style="padding:2px 0;text-align:right;font-size:11px;color:#64748b;">${formatChfEmail(item.products_price_rappen!)}</td></tr>`)
              : ''}
            ${(item.discount_amount_rappen || 0) > 0 ? `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#16a34a;">Rabatt</td><td style="padding:2px 0;text-align:right;font-size:11px;font-weight:700;color:#16a34a;">-${formatChfEmail(item.discount_amount_rappen!)}</td></tr>` : ''}
            ${(item.voucher_discount_rappen || 0) > 0 ? `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#16a34a;">Gutschein</td><td style="padding:2px 0;text-align:right;font-size:11px;font-weight:700;color:#16a34a;">-${formatChfEmail(item.voucher_discount_rappen!)}</td></tr>` : ''}
            ${(item.credit_used_rappen || 0) > 0 ? `<tr><td style="padding:2px 0 2px 16px;font-size:11px;color:#2563eb;">Guthaben verwendet</td><td style="padding:2px 0;text-align:right;font-size:11px;font-weight:700;color:#2563eb;">-${formatChfEmail(item.credit_used_rappen!)}</td></tr>` : ''}
          </table>
        </td>
      </tr>` : ''

    const border = hasBreakdown ? 'none' : '1px solid #f1f5f9'
    const pb = hasBreakdown ? '4px' : '12px'
    return `
    <tr>
      <td class="col-desc" style="padding:12px 12px ${pb};border-bottom:${border};">
        <strong style="color:#1e293b;font-size:14px;">${item.product_name}</strong>
        ${dateStr ? `<br><span style="color:#94a3b8;font-size:12px;">${formatAppointmentDateEmail(dateStr)}</span>` : ''}
      </td>
      <td class="col-anz" style="padding:12px 8px ${pb};border-bottom:${border};text-align:center;color:#94a3b8;font-size:13px;">${item.quantity}</td>
      <td class="col-ep" style="padding:12px 8px ${pb};border-bottom:${border};text-align:right;color:#64748b;font-size:13px;">${formatChfEmail(item.unit_price_rappen)}</td>
      <td class="col-total" style="padding:12px 12px ${pb};border-bottom:${border};text-align:right;font-weight:700;color:#1e293b;font-size:13px;">${formatChfEmail(item.total_price_rappen)}</td>
    </tr>${bdRows}`
  }).join('')

  const qrSection = data.qrCodeDataUrl ? `
  <div style="margin-top:24px;padding-top:20px;border-top:2px dashed #e2e8f0;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Swiss QR-Rechnung</p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;display:inline-block;">
            <img src="${data.qrCodeDataUrl}" alt="QR" width="100" height="100" style="display:block;" />
            <div style="text-align:center;margin-top:5px;">
              <span style="display:inline-block;background:#FF0000;border-radius:3px;width:20px;height:20px;line-height:20px;text-align:center;color:white;font-weight:900;font-size:14px;">+</span>
            </div>
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Mit Banking-App (PostFinance, UBS, Raiffeisen) oder TWINT scannen.</p>
          ${data.qrIban ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">QR-IBAN: <span style="color:#1e293b;font-family:monospace;font-weight:600;font-size:10px;">${data.qrIban}</span></p>` : ''}
          ${data.creditorName ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">Empfänger: <span style="color:#1e293b;font-weight:600;">${data.creditorName}</span></p>` : ''}
          ${data.scorRef ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">Referenz: <span style="color:#1e293b;font-family:monospace;font-weight:600;font-size:10px;">${data.scorRef}</span></p>` : ''}
          <p style="margin:10px 0 0;font-size:16px;font-weight:800;color:${brand};">${formatChfEmail(data.totalRappen)}</p>
        </td>
      </tr>
    </table>
  </div>` : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rechnung ${data.invoiceNumber}</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
    .outer { background:#f1f5f9; padding:24px 12px; }
    .wrap { max-width:600px; width:100%; margin:0 auto; }
    .header { background:${brand}; border-radius:16px 16px 0 0; padding:28px 32px; }
    .header-inner { display:table; width:100%; }
    .header-l { display:table-cell; vertical-align:middle; }
    .header-r { display:table-cell; vertical-align:middle; text-align:right; }
    .meta-band { background:#1e293b; padding:12px 32px; }
    .meta-inner { display:table; width:100%; }
    .meta-col { display:table-cell; vertical-align:top; padding:2px 0; }
    .body-wrap { background:white; padding:28px 24px; }
    .footer-wrap { background:#f8fafc; border-radius:0 0 16px 16px; padding:16px 24px; border-top:1px solid #e2e8f0; }
    .inv-table { width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; }
    .col-anz { width:44px; }
    .col-ep { width:90px; }
    .col-total { width:90px; }
    @media (max-width:480px) {
      .outer { padding:12px 4px !important; }
      .header { padding:20px 16px !important; border-radius:12px 12px 0 0 !important; }
      .header-l, .header-r { display:block !important; width:100% !important; text-align:left !important; }
      .header-r { margin-top:8px !important; }
      .inv-num { font-size:18px !important; }
      .total-amt { font-size:22px !important; }
      .meta-band { padding:10px 16px !important; }
      .meta-col { display:block !important; width:100% !important; padding:2px 0 !important; }
      .meta-col:not(:last-child) { margin-bottom:6px !important; }
      .meta-col-last { display:none !important; }
      .body-wrap { padding:20px 14px !important; }
      .footer-wrap { padding:14px 16px !important; }
      .col-anz, .col-ep { display:none !important; }
      .col-desc { width:65% !important; }
      .col-total { width:35% !important; }
      .th-anz, .th-ep { display:none !important; }
      .bd-row td { padding-left:8px !important; }
    }
  </style>
</head>
<body>
<div class="outer">
<table class="wrap" cellpadding="0" cellspacing="0">

  <!-- Header -->
  <tr><td class="header">
    <div class="header-inner">
      <div class="header-l">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.65);">RECHNUNG</p>
        <p class="inv-num" style="margin:0;font-size:22px;font-weight:800;color:white;font-family:monospace;">${data.invoiceNumber}</p>
      </div>
      <div class="header-r">
        <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.65);">Gesamtbetrag</p>
        <p class="total-amt" style="margin:0;font-size:26px;font-weight:800;color:white;">${formatChfEmail(data.totalRappen)}</p>
      </div>
    </div>
  </td></tr>

  <!-- Meta -->
  <tr><td class="meta-band">
    <div class="meta-inner">
      <div class="meta-col" style="width:33%;">
        <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.5);">Rechnungsdatum</p>
        <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:white;">${formatDateEmail(data.invoiceDate)}</p>
      </div>
      <div class="meta-col" style="width:33%;text-align:center;">
        <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.5);">Fällig bis</p>
        <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:#f87171;">${formatDateEmail(data.dueDate)}</p>
      </div>
      <div class="meta-col meta-col-last" style="width:33%;text-align:right;">
        <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.5);">Aussteller</p>
        <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:white;">${data.tenantName}</p>
      </div>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td class="body-wrap">
    <p style="margin:0 0 6px;color:#64748b;font-size:15px;">Hallo <strong style="color:#1e293b;">${data.customerName}</strong>,</p>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">anbei erhalten Sie Ihre Rechnung für die absolvierten Fahrstunden. Bitte überweisen Sie den Betrag fristgerecht.</p>

    <!-- Items -->
    <table class="inv-table" cellpadding="0" cellspacing="0">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Position</th>
          <th class="th-anz col-anz" style="padding:9px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Anz.</th>
          <th class="th-ep col-ep" style="padding:9px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Einzelpreis</th>
          <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:${brand};">
          <td colspan="3" style="padding:14px 12px;text-align:right;font-weight:700;font-size:13px;color:rgba(255,255,255,0.85);">Gesamtbetrag CHF</td>
          <td style="padding:14px 12px;text-align:right;font-weight:900;font-size:18px;color:white;">${formatChfEmail(data.totalRappen).replace('CHF ', '')}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Zahlungshinweis -->
    <div style="margin:20px 0 0;background:${brandLight};border-left:4px solid ${brand};border-radius:0 8px 8px 0;padding:14px 16px;">
      <p style="margin:0 0 3px;font-weight:700;font-size:13px;color:#1e293b;">Zahlungsinformationen</p>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
        Bitte überweise den Betrag bis zum <strong>${formatDateEmail(data.dueDate)}</strong> unter Angabe der Rechnungsnummer <strong style="font-family:monospace;">${data.invoiceNumber}</strong>.
      </p>
    </div>

    ${qrSection}

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Freundliche Grüsse,<br><strong style="color:#475569;">${data.staffName}</strong><br>${data.tenantName}</p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="footer-wrap">
    <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">${data.tenantName} · Diese Rechnung wurde automatisch von Simy erstellt</p>
  </td></tr>

</table>
</div>
</body>
</html>`
}
