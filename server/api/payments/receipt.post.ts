// PDF Receipt Generation API

import { setHeader, send, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

let puppeteer: any
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer')
  }
  return puppeteer
}

interface ReceiptRequest { paymentId: string }

export default defineEventHandler(async (event) => {
  try {
    const { paymentId }: ReceiptRequest = await readBody(event)
    if (!paymentId) throw new Error('Payment ID is required')

    console.log('📄 Generating receipt for payment:', paymentId)

    const supabase = getSupabaseAdmin()

    // Load payment (avoid FK joins to prevent schema cache errors)
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (pErr || !payment) throw new Error('Payment not found')

    // Load tenant branding (optional)
    const tenantId = payment.tenant_id || payment.metadata?.tenant_id || null
    let tenant: any = null
    if (tenantId) {
      const { data } = await supabase
        .from('tenants')
        .select('name, primary_color, secondary_color, logo_url, address, zip, city, email, phone')
        .eq('id', tenantId)
        .single()
      tenant = data
    }

    // Build HTML (simple, neutral, tenant-aware)
    const primary = tenant?.primary_color || '#2563eb'
    const secondary = tenant?.secondary_color || '#6b7280'
    const companyName = tenant?.name || 'Quittung'

    const amount = Number(payment.total_amount_rappen || 0) / 100
    const adminFee = Number(payment.admin_fee_rappen || 0) / 100
    const lesson = Number(payment.lesson_price_rappen || 0) / 100

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          :root { --primary:${primary}; --secondary:${secondary}; }
          body { font-family: Arial, sans-serif; color:#111827; margin:0; }
          .doc { max-width:720px; margin:24px auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
          .header { display:flex; align-items:center; gap:16px; padding:16px 24px; border-bottom:1px solid #e5e7eb; background:linear-gradient(90deg,#fff,#f9fafb); }
          .logo { height:44px; width:auto; object-fit:contain; }
          .title { font-size:20px; font-weight:800; }
          .subtitle { font-size:13px; color:var(--secondary); }
          .section { padding:20px 24px; border-top:1px solid #f3f4f6; }
          .row { display:flex; justify-content:space-between; margin:6px 0; font-size:14px; }
          .label { color:#6b7280; }
          .amount { font-weight:700; color:var(--primary); font-size:18px; }
          .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
          .muted { color:#6b7280; font-size:12px; }
        </style>
      </head>
      <body>
        <div class="doc">
          <div class="header">
            ${tenant?.logo_url ? `<img class="logo" src="${tenant.logo_url}" alt="Logo"/>` : ''}
            <div>
              <div class="title">Zahlungsquittung</div>
              <div class="subtitle">${companyName}</div>
            </div>
          </div>
          <div class="section grid">
            <div>
              <div class="label">Zahlungs-ID</div>
              <div>${payment.id}</div>
            </div>
            <div>
              <div class="label">Datum</div>
              <div>${new Date(payment.paid_at || payment.created_at).toLocaleString('de-CH')}</div>
            </div>
            <div>
              <div class="label">Zahlungsart</div>
              <div>${payment.payment_method || '-'}</div>
            </div>
            <div>
              <div class="label">Status</div>
              <div>${payment.payment_status || '-'}</div>
            </div>
          </div>
          <div class="section">
            <div class="row"><div class="label">Grundbetrag</div><div>CHF ${lesson.toFixed(2)}</div></div>
            <div class="row"><div class="label">Admin-Gebühr</div><div>CHF ${adminFee.toFixed(2)}</div></div>
            <div class="row" style="margin-top:10px"><div class="label">Gesamtbetrag</div><div class="amount">CHF ${amount.toFixed(2)}</div></div>
          </div>
          <div class="section">
            <div class="muted">Diese Quittung wurde automatisch erstellt. Bei Fragen wenden Sie sich an ${tenant?.email || 'den Support'}.</div>
          </div>
        </div>
      </body>
      </html>
    `

    const { default: Puppeteer } = await getPuppeteer()
    const browser = await Puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({ format:'A4', printBackground:true, margin:{ top:'10mm', right:'10mm', bottom:'10mm', left:'10mm' } })
    await page.close(); await browser.close()

    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="Quittung_${payment.id}.pdf"`)
    return send(event, pdfBuffer)
  } catch (error: any) {
    console.error('❌ Receipt generation failed:', error)
    setHeader(event, 'Content-Type', 'application/json')
    return { success:false, error: error.message || 'Receipt generation failed' }
  }
})

// .env Variables für Wallee
/*
# Wallee Configuration
WALLEE_BASE_URL=https://app-wallee.com
WALLEE_SPACE_ID=your_space_id_here
WALLEE_USER_ID=your_user_id_here
WALLEE_API_SECRET=your_api_secret_here
WALLEE_TWINT_METHOD_ID=your_twint_method_configuration_id

# Webhook URLs (für Wallee Dashboard)
# Success URL: https://yourdomain.com/payment/success
# Failed URL: https://yourdomain.com/payment/failed
# Webhook URL: https://yourdomain.com/api/wallee/webhook
*/