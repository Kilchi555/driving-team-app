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

interface ReceiptRequest { paymentId?: string; paymentIds?: string[] }

interface ProductInfo {
  name: string
  description?: string
  quantity: number
  totalCHF: number
}

interface CustomerInfo {
  name: string
  address: string
  email: string
  phone: string
}

interface AppointmentInfo {
  eventTypeLabel: string
  statusLabel: string
  eventTypeCode: string
  staffFirstName: string
  categoryCode: string
  date: string
  time: string
  duration: number
  isCancelled: boolean
  cancellationDate: string
  cancellationReason: string
  isCharged: boolean
}

interface AmountBreakdown {
  lesson: number
  adminFee: number
  productsTotal: number
  discount: number
  total: number
}

interface PaymentContext {
  payment: any
  appointment: any
  products: ProductInfo[]
  customer: CustomerInfo
  paymentDate: string
  appointmentInfo: AppointmentInfo
  appointmentTitle: string
  appointmentTimestamp: number | null
  amounts: AmountBreakdown
}

interface TenantAssets {
  logoSrc: string | null
  logoDataUrl: string | null
}

async function loadTenantAssets(tenant: any): Promise<TenantAssets> {
  // Try logo_square_url first, then logo_url, then logo_wide_url
  const logoUrl = tenant?.logo_square_url || tenant?.logo_url || tenant?.logo_wide_url
  
  if (!logoUrl) {
    console.warn('⚠️ No logo URL found in tenant data')
    return { logoSrc: null, logoDataUrl: null }
  }

  try {
    console.log('📷 Loading logo from:', logoUrl)
    const logoRes = await fetch(logoUrl)
    if (logoRes.ok) {
      const logoBuffer = await logoRes.arrayBuffer()
      const logoBase64 = Buffer.from(logoBuffer).toString('base64')
      const logoMime = logoRes.headers.get('content-type') || 'image/png'
      console.log('✅ Logo loaded successfully')
      return {
        logoSrc: logoUrl,
        logoDataUrl: `data:${logoMime};base64,${logoBase64}`
      }
    } else {
      console.warn('⚠️ Logo fetch failed:', logoRes.status)
    }
  } catch (logoErr) {
    console.warn('⚠️ Could not load logo:', logoErr)
  }

  return { logoSrc: logoUrl, logoDataUrl: null }
}

async function loadPaymentContext(payment: any, supabase: any, translateFn: any): Promise<PaymentContext> {
  let appointment: any = null
  let user: any = null
  let products: ProductInfo[] = []
  let eventTypeName = ''

  if (payment.appointment_id) {
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        type,
        status,
        event_type_code,
        deleted_at,
        deletion_reason,
        cancellation_reason_id,
        cancellation_type,
        cancellation_charge_percentage,
        cancellation_credit_hours,
        cancellation_policy_applied,
        user_id,
        staff:users!appointments_staff_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('id', payment.appointment_id)
      .maybeSingle()

    if (appointmentData) {
      appointment = appointmentData
      
      // Load event type name separately if event_type_code exists
      if (appointmentData.event_type_code) {
        try {
          const { data: eventTypeData } = await supabase
            .from('event_types')
            .select('name')
            .eq('code', appointmentData.event_type_code)
            .eq('tenant_id', payment.tenant_id)
            .maybeSingle()
          
          if (eventTypeData?.name) {
            eventTypeName = eventTypeData.name
          }
        } catch (err) {
          console.warn('⚠️ Could not load event type name:', err)
        }
      }
    }
  }

  const userId = appointment?.user_id || payment.user_id
  if (userId) {
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, street, street_nr, zip, city')
      .eq('id', userId)
      .maybeSingle()

    if (userData) {
      user = userData
    }
  }

  if (payment.appointment_id) {
    try {
      const { data: discountSale } = await supabase
        .from('discount_sales')
        .select('id')
        .eq('appointment_id', payment.appointment_id)
        .maybeSingle()

      if (discountSale?.id) {
        const { data: ps } = await supabase
          .from('product_sales')
          .select(`id, quantity, unit_price_rappen, total_price_rappen, products ( name, description )`)
          .eq('product_sale_id', discountSale.id)

        products = (ps || []).map((row: any) => ({
          name: row.products?.name || 'Produkt',
          description: row.products?.description || '',
          quantity: row.quantity || 1,
          totalCHF: (row.total_price_rappen || 0) / 100
        }))
      }
    } catch (productErr) {
      console.warn('⚠️ Could not load products:', productErr)
    }
  }

  const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Kunde' : 'Kunde'
  const addressParts = []
  if (user?.street && user?.street_nr) {
    addressParts.push(`${user.street} ${user.street_nr}`)
  }
  if (user?.zip && user?.city) {
    addressParts.push(`${user.zip} ${user.city}`)
  }

  const lesson = (payment.lesson_price_rappen || 0) / 100
  const adminFee = (payment.admin_fee_rappen || 0) / 100
  const discountAmount = (payment.discount_amount_rappen || 0) / 100
  const productsTotal = products.reduce((sum, p) => sum + p.totalCHF, 0)
  const total = lesson + adminFee + productsTotal - discountAmount

  const appointmentDateObj = appointment?.start_time ? new Date(appointment.start_time) : null
  const appointmentDate = appointmentDateObj ? appointmentDateObj.toLocaleDateString('de-CH') : ''
  const appointmentTime = appointmentDateObj ? appointmentDateObj.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : ''
  const appointmentDuration = appointment?.duration_minutes || 0
  const appointmentTitle = appointment?.title || payment.description || translateFn('eventType.lesson')
  const appointmentTimestamp = appointmentDateObj ? appointmentDateObj.getTime() : null

  const eventTypeKey = appointment?.event_type_code || appointment?.type || 'lesson'
  const eventTypeTranslated = translateFn(`eventType.${eventTypeKey}`)
  const statusKey = appointment?.status || payment.payment_status || 'pending'
  const statusTranslated = translateFn(`status.${statusKey}`)
  const isCancelled = appointment && (appointment.status === 'cancelled' || appointment.deleted_at)
  const cancellationDate = appointment?.deleted_at ? new Date(appointment.deleted_at).toLocaleDateString('de-CH') : '-'
  const cancellationReason = appointment?.deletion_reason || appointment?.cancellation_type || appointment?.cancellation_reason_id || '-'
  const isCharged = appointment ? (Number(appointment.cancellation_charge_percentage || 0) > 0 || appointment.cancellation_policy_applied) : false

  return {
    payment,
    appointment,
    products,
    customer: {
      name: customerName,
      address: addressParts.join(', '),
      email: user?.email || '',
      phone: user?.phone || ''
    },
    paymentDate: new Date(payment.paid_at || payment.created_at).toLocaleDateString('de-CH'),
    appointmentInfo: {
      eventTypeLabel: eventTypeTranslated,
      statusLabel: statusTranslated,
      eventTypeCode: eventTypeName || appointment?.event_type_code || '',
      staffFirstName: appointment?.staff?.first_name || '',
      categoryCode: appointment?.type || '',
      date: appointmentDate,
      time: appointmentTime,
      duration: appointmentDuration,
      isCancelled: Boolean(isCancelled),
      cancellationDate,
      cancellationReason,
      isCharged
    },
    appointmentTitle,
    appointmentTimestamp,
    amounts: {
      lesson,
      adminFee,
      productsTotal,
      discount: discountAmount,
      total
    }
  }
}

function renderHeader(customer: CustomerInfo, dateLabelKey: string, dateValue: string, tenant: any, assets: TenantAssets, translateFn: any) {
  const companyName = tenant?.legal_company_name || tenant?.name || 'Unternehmen'
  const tenantAddress = tenant?.address || ''
  const tenantEmail = tenant?.contact_email || tenant?.email || ''
  const tenantPhone = tenant?.contact_phone || tenant?.phone || ''

  return `
    <div class="header">
      <div class="header-left">
        <div class="title">${translateFn('receipt.title')}</div>
        <div style="margin-top:12px;">
          <div class="label">${translateFn('receipt.customer')}</div>
          <div class="value">${customer.name}</div>
          ${customer.address ? `<div class="address-left">${customer.address}</div>` : ''}
          ${(customer.email || customer.phone) ? `<div class="contact-left">${customer.email || ''}${customer.email && customer.phone ? '<br/>' : ''}${customer.phone || ''}</div>` : ''}
          <div style="margin-top:8px;">
            <div class="label">${translateFn(dateLabelKey)}</div>
            <div class="value" style="display:inline;">${dateValue}</div>
          </div>
        </div>
      </div>
      <div class="header-right">
        ${assets.logoSrc ? `<img class="logo" src="${assets.logoDataUrl || assets.logoSrc}" alt="Logo"/>` : ''}
        ${companyName ? `<div class="value">${companyName}</div>` : ''}
        ${tenantAddress ? `<div class="address">${tenantAddress}</div>` : ''}
        ${(tenantEmail || tenantPhone) ? `<div class="contact">${tenantEmail || ''}${tenantEmail && tenantPhone ? '<br/>' : ''}${tenantPhone || ''}</div>` : ''}
      </div>
    </div>
  `
}

function renderSingleReceipt(context: PaymentContext, tenant: any, assets: TenantAssets, translateFn: any) {
  const { products, customer, paymentDate, appointmentInfo, amounts } = context

  return `
    <div class="doc" style="page-break-after: always;">
      ${renderHeader(customer, 'receipt.date', paymentDate, tenant, assets, translateFn)}
      
      <div class="section">
        <div class="section-title">${translateFn('receipt.costBreakdown')}</div>
        <div class="row">
          <div class="label">
            ${appointmentInfo.eventTypeLabel} - ${appointmentInfo.date} ${appointmentInfo.time} - ${appointmentInfo.duration} ${translateFn('receipt.minutes')}
            ${appointmentInfo.isCancelled ? `<br/><span style="font-size:12px; color:#6b7280;">${translateFn('receipt.cancelled')}: ${appointmentInfo.cancellationDate} | ${translateFn('receipt.reason')}: ${appointmentInfo.cancellationReason} | ${translateFn('receipt.charged')}: ${appointmentInfo.isCharged ? translateFn('receipt.yes') : translateFn('receipt.no')}</span>` : ''}
          </div>
          <div class="value">CHF ${amounts.lesson.toFixed(2)}</div>
        </div>
        ${amounts.adminFee > 0 ? `<div class="row"><div class="label">${translateFn('receipt.adminFee')}</div><div class="value">CHF ${amounts.adminFee.toFixed(2)}</div></div>` : ''}
        ${products && products.length > 0 ? products.map(p => `
          <div class="row">
            <div class="label">${p.name} × ${p.quantity}</div>
            <div class="value">CHF ${p.totalCHF.toFixed(2)}</div>
          </div>
        `).join('') : ''}
        ${amounts.discount > 0 ? `
          <div class="row" style="color:#059669;">
            <div class="label">${translateFn('receipt.discount')}</div>
            <div class="value">- CHF ${amounts.discount.toFixed(2)}</div>
          </div>
        ` : ''}
        <div class="row" style="margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;">
          <div class="label">${translateFn('receipt.totalAmount')}</div>
          <div class="amount">CHF ${amounts.total.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="section">
        <div class="muted">${translateFn('receipt.footer', { email: tenant?.contact_email || 'den Support' })}</div>
      </div>
    </div>
  `
}

function renderCombinedReceipt(contexts: PaymentContext[], tenant: any, assets: TenantAssets, translateFn: any) {
  const customer = contexts[0].customer
  const sorted = [...contexts].sort((a, b) => {
    const tsA = a.appointmentTimestamp ?? new Date(a.payment.paid_at || a.payment.created_at).getTime()
    const tsB = b.appointmentTimestamp ?? new Date(b.payment.paid_at || b.payment.created_at).getTime()
    return tsA - tsB
  })

  const timestamps = sorted
    .map(ctx => ctx.appointmentTimestamp ?? new Date(ctx.payment.paid_at || ctx.payment.created_at).getTime())
    .filter(Boolean)

  const period =
    timestamps.length > 0
      ? `${new Date(Math.min(...timestamps)).toLocaleDateString('de-CH')} – ${new Date(Math.max(...timestamps)).toLocaleDateString('de-CH')}`
      : '-'

  const summary = sorted.reduce(
    (acc, ctx) => {
      acc.lesson += ctx.amounts.lesson
      acc.adminFee += ctx.amounts.adminFee
      acc.products += ctx.amounts.productsTotal
      acc.discount += ctx.amounts.discount
      acc.total += ctx.amounts.total
      return acc
    },
    { lesson: 0, adminFee: 0, products: 0, discount: 0, total: 0 }
  )

  const lessonsTable = sorted
    .map(ctx => {
      const meta: string[] = []
      if (ctx.appointmentInfo.isCancelled) {
        meta.push(`${translateFn('receipt.cancelled')}: ${ctx.appointmentInfo.cancellationDate}`)
      }
      if (ctx.amounts.adminFee > 0) {
        meta.push(`${translateFn('receipt.adminFee')}: CHF ${ctx.amounts.adminFee.toFixed(2)}`)
      }
      if (ctx.products.length > 0) {
        const productList = ctx.products.map(p => `${p.name} (${p.quantity}×)`).join(', ')
        meta.push(`${translateFn('receipt.products')}: ${productList} – CHF ${ctx.amounts.productsTotal.toFixed(2)}`)
      }
      if (ctx.amounts.discount > 0) {
        meta.push(`${translateFn('receipt.discount')}: - CHF ${ctx.amounts.discount.toFixed(2)}`)
      }

      const lessonsDetails = [
        ctx.appointmentInfo.eventTypeCode,
        ctx.appointmentInfo.staffFirstName ? `Mit ${ctx.appointmentInfo.staffFirstName}` : '',
        ctx.appointmentInfo.categoryCode ? `Kategorie ${ctx.appointmentInfo.categoryCode}` : ''
      ].filter(Boolean).join(' - ')

      return `
        <tr>
          <td>
            <div class="lesson-title">${lessonsDetails}</div>
            ${meta.length > 0 ? `<div class="lesson-meta">${meta.join('<br/>')}</div>` : ''}
          </td>
          <td>${ctx.appointmentInfo.date} ${ctx.appointmentInfo.time}</td>
          <td>${ctx.appointmentInfo.duration} ${translateFn('receipt.minutes')}</td>
          <td class="amount">CHF ${ctx.amounts.total.toFixed(2)}</td>
        </tr>
      `
    })
    .join('')

  return `
    <div class="doc">
      ${renderHeader(customer, 'receipt.generatedOn', new Date().toLocaleDateString('de-CH'), tenant, assets, translateFn)}
      
      <div class="section">
        <div class="section-title">${translateFn('receipt.lessonsOverview')}</div>
        <div class="row">
          <div class="label">${translateFn('receipt.lessonCount')}</div>
          <div class="value">${sorted.length}</div>
        </div>
        <div class="row">
          <div class="label">${translateFn('receipt.period')}</div>
          <div class="value">${period}</div>
        </div>
        <table class="lesson-table">
          <thead>
            <tr>
              <th>${translateFn('receipt.table.header.service')}</th>
              <th>${translateFn('receipt.table.header.datetime')}</th>
              <th>${translateFn('receipt.table.header.duration')}</th>
              <th>${translateFn('receipt.table.header.amount')}</th>
            </tr>
          </thead>
          <tbody>
            ${lessonsTable}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">${translateFn('receipt.summary')}</div>
        <div class="row"><div class="label">${translateFn('receipt.totalLessons')}</div><div class="value">CHF ${summary.lesson.toFixed(2)}</div></div>
        ${summary.adminFee > 0 ? `<div class="row"><div class="label">${translateFn('receipt.totalAdminFees')}</div><div class="value">CHF ${summary.adminFee.toFixed(2)}</div></div>` : ''}
        ${summary.products > 0 ? `<div class="row"><div class="label">${translateFn('receipt.totalProducts')}</div><div class="value">CHF ${summary.products.toFixed(2)}</div></div>` : ''}
        ${summary.discount > 0 ? `<div class="row"><div class="label">${translateFn('receipt.totalDiscounts')}</div><div class="value">- CHF ${summary.discount.toFixed(2)}</div></div>` : ''}
        <div class="row" style="margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;">
          <div class="label">${translateFn('receipt.totalAmount')}</div>
          <div class="amount">CHF ${summary.total.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="section">
        <div class="muted">${translateFn('receipt.footer', { email: tenant?.contact_email || 'den Support' })}</div>
      </div>
    </div>
  `
}

function wrapHtml(body: string, primary: string, secondary: string) {
  return `
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
        .address { font-size:12px; color:#6b7280; line-height:1.3; text-align:right; }
        .contact { font-size:12px; color:#6b7280; line-height:1.3; text-align:right; }
        .address-left { font-size:12px; color:#6b7280; line-height:1.3; text-align:left; }
        .contact-left { font-size:12px; color:#6b7280; line-height:1.3; text-align:left; }
        .section { padding:20px 24px; border-top:1px solid #f3f4f6; }
        .section-title { font-size:16px; font-weight:600; color:var(--primary); margin-bottom:12px; }
        .row { display:flex; justify-content:space-between; margin:8px 0; font-size:14px; }
        .label { color:#6b7280; font-weight:500; }
        .value { font-weight:600; }
        .amount { font-weight:700; color:var(--primary); font-size:18px; }
        .muted { color:#6b7280; font-size:12px; line-height:1.4; }
        .lesson-table { width:100%; border-collapse:collapse; margin-top:16px; }
        .lesson-table th { text-align:left; font-size:13px; padding:10px; background:#f1f5f9; color:#475569; border-bottom:1px solid #e2e8f0; }
        .lesson-table td { font-size:13px; padding:12px 10px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
        .lesson-title { font-weight:600; color:#111827; }
        .lesson-meta { font-size:12px; color:#6b7280; margin-top:4px; }
      </style>
    </head>
    <body>
      ${body}
    </body>
    </html>
  `
}

export default defineEventHandler(async (event) => {
  try {
    console.log('📄 Receipt API called')
    
    const { paymentId, paymentIds }: ReceiptRequest = await readBody(event)
    
    // Determine which payments to process
    const ids = paymentIds && paymentIds.length > 0 ? paymentIds : (paymentId ? [paymentId] : [])
    
    if (ids.length === 0) {
      console.error('❌ No payment ID(s) provided')
      throw new Error('Payment ID(s) is required')
    }

    console.log('📄 Generating receipt(s) for payment(s):', ids)

    const supabase = getSupabaseAdmin()

    // Load all payments
    const { data: payments, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .in('id', ids)

    if (pErr) {
      console.error('❌ Error loading payments:', pErr)
      throw new Error(`Payments not found: ${pErr.message}`)
    }
    
    if (!payments || payments.length === 0) {
      throw new Error('Payments not found')
    }

    // Load tenant branding (once for all payments)
    const firstPayment = payments[0]
    const tenantId = firstPayment.tenant_id || firstPayment.metadata?.tenant_id || null
    let tenant: any = null
    if (tenantId) {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('name, legal_company_name, primary_color, secondary_color, logo_url, logo_square_url, logo_wide_url, address, contact_email, contact_phone')
          .eq('id', tenantId)
          .maybeSingle()
        if (error) {
          console.error('❌ Tenant fetch error:', error)
        }
        tenant = data
      } catch (tErr) {
        console.error('❌ Tenant fetch exception:', tErr)
      }
    }

    const primary = tenant?.primary_color || '#2563eb'
    const secondary = tenant?.secondary_color || '#6b7280'

    // Translation helper function (needs to be passed to generateReceiptHTML)
    const translateFn = (key: string, params?: Record<string, any>) => {
      const translations: Record<string, any> = {
        'receipt.title': 'Quittung',
        'receipt.customer': 'Kunde',
        'receipt.date': 'Datum',
        'receipt.costBreakdown': 'Kostenaufstellung',
        'receipt.baseAmount': 'Basisbetrag',
        'receipt.adminFee': 'Administrationsgebühr',
        'receipt.discount': 'Rabatt',
        'receipt.totalAmount': 'Gesamtbetrag',
        'receipt.minutes': 'Minuten',
        'receipt.products': 'Produkte',
        'receipt.cancelled': 'Storniert',
        'receipt.reason': 'Grund',
        'receipt.charged': 'Berechnet',
        'receipt.yes': 'Ja',
        'receipt.no': 'Nein',
        'receipt.footer': `Bei Fragen wenden Sie sich bitte an ${tenant?.contact_email || 'den Support'}.`,
        'receipt.lessonsOverview': 'Lektionsübersicht',
        'receipt.summary': 'Zusammenfassung',
        'receipt.lessonCount': 'Anzahl Lektionen',
        'receipt.period': 'Zeitraum',
        'receipt.totalLessons': 'Total Lektionen',
        'receipt.totalAdminFees': 'Total Administrationsgebühren',
        'receipt.totalProducts': 'Total Produkte',
        'receipt.totalDiscounts': 'Total Rabatte',
        'receipt.generatedOn': 'Erstellt am',
        'receipt.table.header.service': 'Leistung',
        'receipt.table.header.datetime': 'Datum & Zeit',
        'receipt.table.header.duration': 'Dauer',
        'receipt.table.header.amount': 'Betrag',
        'eventType.lesson': 'Fahrlektion',
        'status.pending': 'Ausstehend',
        'status.authorized': 'Reserviert',
        'status.scheduled': 'Geplant',
        'status.completed': 'Abgeschlossen',
        'status.cancelled': 'Storniert'
      }
      const value = translations[key] || key
      if (typeof value !== 'string') return key
      if (params) {
        return value.replace(/{(\w+)}/g, (match: string, param: string) => params[param] || match)
      }
      return value
    }

    const tenantAssets = await loadTenantAssets(tenant)
    const contexts = await Promise.all(
      payments.map(payment => loadPaymentContext(payment, supabase, translateFn))
    )

    const bodyHtml = contexts.length === 1
      ? renderSingleReceipt(contexts[0], tenant, tenantAssets, translateFn)
      : renderCombinedReceipt(contexts, tenant, tenantAssets, translateFn)

    const finalHtml = wrapHtml(bodyHtml, primary, secondary)

    console.log('📄 Generating PDF with Puppeteer...')
    
    let browser: any
    try {
      const { default: Puppeteer } = await getPuppeteer()
      console.log('✅ Puppeteer loaded successfully')
      
      browser = await Puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true
      })
      console.log('✅ Browser launched successfully')
      
      const page = await browser.newPage()
      await page.setContent(finalHtml, { waitUntil: 'networkidle0' })
      
      console.log('📄 Converting to PDF...')
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } 
      })
      
      await page.close()
      await browser.close()
      
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
      
      // Upload PDF to Supabase Storage
      const filename = payments.length === 1 
        ? `Quittung_${payments[0].id}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Alle_Quittungen_${new Date().toISOString().split('T')[0]}.pdf`
      
      const filepath = `receipts/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`
      
      console.log('📤 Uploading PDF to Supabase Storage:', filepath)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filepath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })
      
      if (uploadError) {
        console.error('❌ PDF upload to storage failed:', uploadError)
        throw new Error(`PDF upload failed: ${uploadError.message}`)
      }
      
      console.log('✅ PDF uploaded successfully:', uploadData)
      
      // Get public URL for the PDF
      const { data: publicData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filepath)
      
      const pdfUrl = publicData?.publicUrl
      console.log('📄 PDF public URL:', pdfUrl)
      
      // Return success with URL for email sending
      return {
        success: true,
        pdfUrl,
        filename
      }
    } catch (pdfError: any) {
      console.error('❌ PDF generation error:', pdfError)
      if (browser) {
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