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
    console.log('📄 Receipt API called')
    
    const { paymentId }: ReceiptRequest = await readBody(event)
    console.log('📄 Payment ID received:', paymentId)
    
    if (!paymentId) {
      console.error('❌ No payment ID provided')
      throw new Error('Payment ID is required')
    }

    console.log('📄 Generating receipt for payment:', paymentId)

    const supabase = getSupabaseAdmin()

    // Load payment first
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (pErr) {
      console.error('❌ Error loading payment:', pErr)
      throw new Error(`Payment not found: ${pErr.message}`)
    }
    
    if (!payment) {
      throw new Error('Payment not found')
    }

    // Load appointment details separately
    let appointment: any = null
    let user: any = null
    
    if (payment.appointment_id) {
      const { data: appointmentData, error: aErr } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          duration_minutes,
          type,
          status,
          user_id
        `)
        .eq('id', payment.appointment_id)
        .single()
      
      if (!aErr && appointmentData) {
        appointment = appointmentData
        
        // Load user details
        if (appointment.user_id) {
          const { data: userData, error: uErr } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', appointment.user_id)
            .single()
          
          if (!uErr && userData) {
            user = userData
          }
        }
      }
    }

    // Load tenant branding (optional)
    const tenantId = payment.tenant_id || payment.metadata?.tenant_id || null
    let tenant: any = null
    if (tenantId) {
      const { data } = await supabase
        .from('tenants')
        .select('name, primary_color, secondary_color, logo_url, address, zip, city, email, phone, street, house_number')
        .eq('id', tenantId)
        .single()
      tenant = data
    }

    // Build HTML (simple, neutral, tenant-aware)
    const primary = tenant?.primary_color || '#2563eb'
    const secondary = tenant?.secondary_color || '#6b7280'
    const companyName = tenant?.name || 'Quittung'
    
    // Build tenant address
    const tenantAddress = []
    if (tenant?.street && tenant?.house_number) {
      tenantAddress.push(`${tenant.street} ${tenant.house_number}`)
    } else if (tenant?.address) {
      tenantAddress.push(tenant.address)
    }
    if (tenant?.zip && tenant?.city) {
      tenantAddress.push(`${tenant.zip} ${tenant.city}`)
    }
    const fullAddress = tenantAddress.join(', ')

    const amount = Number(payment.total_amount_rappen || 0) / 100
    const adminFee = Number(payment.admin_fee_rappen || 0) / 100
    const lesson = Number(payment.lesson_price_rappen || 0) / 100

    // Extract appointment and user data
    const appointmentTitle = appointment?.title || 'Fahrstunde'
    const appointmentDate = appointment?.start_time ? new Date(appointment.start_time).toLocaleDateString('de-CH') : '-'
    const appointmentTime = appointment?.start_time ? new Date(appointment.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '-'
    const appointmentDuration = appointment?.duration_minutes || 45
    const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '-'
    const customerEmail = user?.email || '-'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          :root { --primary:${primary}; --secondary:${secondary}; }
          body { font-family: Arial, sans-serif; color:#111827; margin:0; }
          .doc { max-width:720px; margin:24px auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
          .header { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 24px; border-bottom:1px solid #e5e7eb; background:linear-gradient(90deg,#fff,#f9fafb); }
          .header-left { display:flex; flex-direction:column; gap:8px; }
          .header-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
          .logo { height:60px; width:auto; object-fit:contain; max-width:150px; }
          .title { font-size:24px; font-weight:800; color:var(--primary); }
          .subtitle { font-size:14px; color:var(--secondary); margin-top:2px; }
          .address { font-size:12px; color:#6b7280; line-height:1.4; text-align:right; }
          .section { padding:20px 24px; border-top:1px solid #f3f4f6; }
          .section-title { font-size:16px; font-weight:600; color:var(--primary); margin-bottom:12px; }
          .row { display:flex; justify-content:space-between; margin:8px 0; font-size:14px; }
          .label { color:#6b7280; font-weight:500; }
          .value { font-weight:600; }
          .amount { font-weight:700; color:var(--primary); font-size:18px; }
          .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
          .muted { color:#6b7280; font-size:12px; line-height:1.4; }
          .appointment-details { background:#f8fafc; border-radius:8px; padding:16px; margin:12px 0; }
          .customer-info { background:#f0f9ff; border-radius:8px; padding:16px; margin:12px 0; }
        </style>
      </head>
      <body>
        <div class="doc">
          <div class="header">
            <div class="header-left">
              <div>
                <div class="title">Zahlungsquittung</div>
                <div class="subtitle">${companyName}</div>
              </div>
            </div>
            <div class="header-right">
              ${tenant?.logo_url ? `<img class="logo" src="${tenant.logo_url}" alt="Logo"/>` : ''}
              <div>
                <div class="label">Quittungsdatum</div>
                <div class="value">${new Date(payment.paid_at || payment.created_at).toLocaleDateString('de-CH')}</div>
              </div>
              ${fullAddress ? `<div class="address">${fullAddress}</div>` : ''}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Zahlungsinformationen</div>
            <div class="grid">
              <div>
                <div class="label">Zahlungs-ID</div>
                <div class="value">${payment.id}</div>
              </div>
              <div>
                <div class="label">Zahlungsart</div>
                <div class="value">${payment.payment_method || '-'}</div>
              </div>
              <div>
                <div class="label">Status</div>
                <div class="value">${payment.payment_status || '-'}</div>
              </div>
              <div>
                <div class="label">Transaktions-ID</div>
                <div class="value">${payment.wallee_transaction_id || payment.id}</div>
              </div>
            </div>
          </div>

          ${appointment ? `
          <div class="section">
            <div class="section-title">Termindetails</div>
            <div class="appointment-details">
              <div class="grid">
                <div>
                  <div class="label">Termin</div>
                  <div class="value">${appointmentTitle}</div>
                </div>
                <div>
                  <div class="label">Datum</div>
                  <div class="value">${appointmentDate}</div>
                </div>
                <div>
                  <div class="label">Uhrzeit</div>
                  <div class="value">${appointmentTime}</div>
                </div>
                <div>
                  <div class="label">Dauer</div>
                  <div class="value">${appointmentDuration} Min.</div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          ${user ? `
          <div class="section">
            <div class="section-title">Kundeninformationen</div>
            <div class="customer-info">
              <div class="grid">
                <div>
                  <div class="label">Name</div>
                  <div class="value">${customerName}</div>
                </div>
                <div>
                  <div class="label">E-Mail</div>
                  <div class="value">${customerEmail}</div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Kostenaufstellung</div>
            <div class="row"><div class="label">Grundbetrag</div><div class="value">CHF ${lesson.toFixed(2)}</div></div>
            <div class="row"><div class="label">Admin-Gebühr</div><div class="value">CHF ${adminFee.toFixed(2)}</div></div>
            <div class="row" style="margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;"><div class="label">Gesamtbetrag</div><div class="amount">CHF ${amount.toFixed(2)}</div></div>
          </div>
          
          <div class="section">
            <div class="muted">Diese Quittung wurde automatisch erstellt. Bei Fragen wenden Sie sich an ${tenant?.email || 'den Support'}.</div>
          </div>
        </div>
      </body>
    </html>
    `

    console.log('📄 Generating PDF with Puppeteer...')
    
    try {
      const { default: Puppeteer } = await getPuppeteer()
      console.log('✅ Puppeteer loaded successfully')
      
      const browser = await Puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true
      })
      console.log('✅ Browser launched successfully')
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      console.log('📄 Converting to PDF...')
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } 
      })
      
      await page.close()
      await browser.close()
      
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
      
      setHeader(event, 'Content-Type', 'application/pdf')
      setHeader(event, 'Content-Disposition', `attachment; filename="Quittung_${payment.id}.pdf"`)
      return send(event, pdfBuffer)
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError)
      if (typeof browser !== 'undefined') {
        await browser.close()
      }
      throw new Error(`PDF generation failed: ${pdfError.message}`)
    }
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