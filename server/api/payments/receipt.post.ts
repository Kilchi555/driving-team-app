// PDF Receipt Generation API

import { setHeader, send, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import chromium from '@sparticuz/chromium'
import { logger } from '~/utils/logger'

let puppeteer: any
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer-core')
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
  isCourse?: boolean
  courseLocation?: string
}

interface AmountBreakdown {
  lesson: number
  adminFee: number
  productsTotal: number
  discount: number
  voucherDiscount: number
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
  creditInfo?: {
    currentBalance: number
    creditUsed: number
    recentTransactions: Array<{
      type: string
      amount: number
      date: string
      description: string
    }>
  }
  refundInfo?: {
    totalRefunded: number
    refundedComponents: Array<{
      label: string
      amount: number
    }>
    refundDate: string
  }
}

interface TenantAssets {
  logoSrc: string | null
  logoDataUrl: string | null
}

async function loadTenantAssets(tenant: any, supabase: any): Promise<TenantAssets> {
  // Try logo_square_url first, then logo_url, then logo_wide_url
  const logoUrl = tenant?.logo_square_url || tenant?.logo_url || tenant?.logo_wide_url
  
  if (!logoUrl) {
    console.warn('⚠️ No logo URL found in tenant data')
    return { logoSrc: null, logoDataUrl: null }
  }

  logger.debug('📷 Using logo URL directly:', logoUrl)
  
  // Simply use the public URL directly - no need to download and convert to base64
  // The PDF generator can fetch it directly
  return {
    logoSrc: logoUrl,
    logoDataUrl: logoUrl
  }
}

async function loadPaymentContext(payment: any, supabase: any, translateFn: any): Promise<PaymentContext> {
  let appointment: any = null
  let course: any = null
  let user: any = null
  let products: ProductInfo[] = []
  let eventTypeName = ''
  
  // Try to load course if it's a course registration
  let courseData: any = null
  const courseRegId = payment.course_registration_id || 
    (payment.metadata && typeof payment.metadata === 'string' 
      ? (() => { try { return JSON.parse(payment.metadata).enrollment_id || JSON.parse(payment.metadata).course_registration_id; } catch { return null; } })()
      : payment.metadata?.enrollment_id)
  
  if (courseRegId) {
    try {
      logger.debug('📚 Loading course registration:', courseRegId)
      const { data: courseRegData, error: courseRegError } = await supabase
        .from('course_registrations')
        .select(`
          id,
          course_id,
          status,
          courses (
            id,
            name,
            description,
            course_start_date,
            price_per_participant_rappen
          )
        `)
        .eq('id', courseRegId)
        .maybeSingle()
      
      if (courseRegError) {
        logger.warn('⚠️ Course query error:', courseRegError)
      } else if (courseRegData?.courses) {
        courseData = courseRegData
        course = courseRegData.courses
        logger.debug('✅ Course loaded for payment:', course?.name)
      } else {
        logger.debug('ℹ️ No course found for registration:', courseRegId)
      }
    } catch (courseErr) {
      logger.warn('⚠️ Could not load course:', courseErr)
    }
  } else {
    logger.debug('ℹ️ No course_registration_id found in payment')
  }

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

  // Load products from appointment if available
  if (payment.appointment_id) {
    try {
      logger.debug('📦 Loading products for appointment:', payment.appointment_id)
      const { data: ps, error: psError } = await supabase
        .from('product_sales')
        .select(`id, quantity, unit_price_rappen, total_price_rappen, products ( name, description )`)
        .eq('appointment_id', payment.appointment_id)

      if (psError) {
        logger.warn('⚠️ product_sales query error:', psError)
      } else {
        products = (ps || []).map((row: any) => ({
          name: row.products?.name || 'Produkt',
          description: row.products?.description || '',
          quantity: row.quantity || 1,
          totalCHF: (row.total_price_rappen || 0) / 100
        }))
        logger.debug('✅ Products loaded:', products.length)
      }
    } catch (productErr) {
      console.warn('⚠️ Could not load products:', productErr)
    }
  } else if (courseRegId) {
    try {
      logger.debug('📦 Loading products for course registration:', courseRegId)
      // For courses, we might have course-related products
      // For now, courses typically don't have product_sales, just the course itself
      logger.debug('ℹ️ Courses typically have no additional products')
    } catch (productErr) {
      console.warn('⚠️ Could not load course products:', productErr)
    }
  }

  // Load vouchers directly linked to payment
  try {
    logger.debug('🎫 Loading vouchers for payment:', payment.id)
    const { data: vouchersData, error: voucherError } = await supabase
      .from('vouchers')
      .select('name, description, amount_rappen, recipient_name')
      .eq('payment_id', payment.id)

    if (voucherError) {
      console.error('❌ Voucher query error:', voucherError)
    } else {
      logger.debug('🎫 Vouchers found:', vouchersData?.length || 0)
      if (vouchersData && vouchersData.length > 0) {
        logger.debug('🎫 Voucher details:', vouchersData)
        const voucherProducts = vouchersData.map((voucher: any) => ({
          name: voucher.name || 'Gutschein',
          description: voucher.recipient_name ? `Für: ${voucher.recipient_name}` : (voucher.description || ''),
          quantity: 1,
          totalCHF: (voucher.amount_rappen || 0) / 100
        }))
        products = [...products, ...voucherProducts]
        logger.debug('✅ Added vouchers to products, total products:', products.length)
      }
    }
  } catch (voucherErr) {
    console.warn('⚠️ Could not load vouchers:', voucherErr)
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
  const voucherDiscountAmount = (payment.voucher_discount_rappen || 0) / 100
  const productsTotal = products.reduce((sum, p) => sum + p.totalCHF, 0)
  
  // For courses: if lesson_price is 0 but there's a total_amount, use that as the course price
  const coursePrice = course && lesson === 0 ? ((payment.total_amount_rappen || 0) / 100) : 0
  const lessonOrCoursePrice = lesson > 0 ? lesson : coursePrice
  
  const total = lessonOrCoursePrice + adminFee + productsTotal - discountAmount - voucherDiscountAmount
  
  logger.debug('💰 Amount breakdown:', {
    lesson,
    coursePrice,
    lessonOrCoursePrice,
    adminFee,
    productsTotal,
    discountAmount,
    voucherDiscountAmount,
    total,
    paymentTotal: (payment.total_amount_rappen || 0) / 100
  })
  
  // Load credit information
  let creditInfo = undefined
  if (userId) {
    try {
      // Get current balance
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', userId)
        .maybeSingle()
      
      // Get recent credit transactions (all transactions)
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('transaction_type, amount_rappen, description, created_at, payment_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      const currentBalance = (creditData?.balance_rappen || 0) / 100
      const creditUsed = (payment.credit_used_rappen || 0) / 100
      
      const recentTransactions = (transactionsData || []).map((tx: any) => ({
        type: tx.transaction_type === 'deduction' ? 'Verwendet' : 
              tx.transaction_type === 'refund' ? 'Rückvergütet' : 
              tx.transaction_type === 'purchase' ? 'Gekauft' : 
              tx.transaction_type === 'voucher' ? 'Gutschein eingelöst' : 
              'Gutschrift',
        amount: Math.abs(tx.amount_rappen || 0) / 100,
        date: new Date(tx.created_at).toLocaleDateString('de-CH'),
        description: tx.description || '-'
      }))
      
      creditInfo = {
        currentBalance,
        creditUsed,
        recentTransactions
      }
    } catch (creditErr) {
      console.warn('⚠️ Could not load credit info:', creditErr)
    }
  }

  const appointmentDateObj = appointment?.start_time ? new Date(appointment.start_time) : (course?.course_start_date ? new Date(course.course_start_date) : null)
  const appointmentDate = appointmentDateObj ? appointmentDateObj.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' }) : ''
  const appointmentTime = appointmentDateObj ? appointmentDateObj.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }) : ''
  const appointmentDuration = appointment?.duration_minutes || 0
  const appointmentTitle = appointment?.title || course?.name || payment.description || translateFn('eventType.lesson')
  const appointmentTimestamp = appointmentDateObj ? appointmentDateObj.getTime() : null

  const isCourse = !!course && !appointment
  const eventTypeKey = appointment?.event_type_code || appointment?.type || (isCourse ? 'course' : 'lesson')
  const eventTypeTranslated = isCourse ? (course?.name || translateFn('eventType.course')) : translateFn(`eventType.${eventTypeKey}`)
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
      eventTypeCode: eventTypeName || appointment?.event_type_code || course?.name || '',
      staffFirstName: appointment?.staff?.first_name || '',
      categoryCode: appointment?.type || '',
      date: appointmentDate,
      time: appointmentTime,
      duration: appointmentDuration,
      isCancelled: Boolean(isCancelled),
      cancellationDate,
      cancellationReason,
      isCharged,
      isCourse,
      courseLocation: isCourse && payment.metadata ? (typeof payment.metadata === 'string' ? JSON.parse(payment.metadata).course_location : payment.metadata.course_location) : undefined
    },
    appointmentTitle,
    appointmentTimestamp,
    amounts: {
      lesson: lessonOrCoursePrice,
      adminFee,
      productsTotal,
      discount: discountAmount,
      voucherDiscount: voucherDiscountAmount,
      total
    },
    creditInfo
  }
}

function renderHeader(customer: CustomerInfo, dateLabelKey: string, dateValue: string, tenant: any, assets: TenantAssets, translateFn: any) {
  const companyName = tenant?.legal_company_name || tenant?.name || 'Unternehmen'
  const brandName = tenant?.name || tenant?.legal_company_name || 'Unternehmen'
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
        ${assets.logoDataUrl ? `<img class="logo" src="${assets.logoDataUrl}" alt="Logo"/>` : `<div class="company-name-large">${brandName}</div>`}
        ${companyName && assets.logoDataUrl ? `<div class="value">${companyName}</div>` : ''}
        ${tenantAddress ? `<div class="address">${tenantAddress}</div>` : ''}
        ${(tenantEmail || tenantPhone) ? `<div class="contact">${tenantEmail || ''}${tenantEmail && tenantPhone ? '<br/>' : ''}${tenantPhone || ''}</div>` : ''}
      </div>
    </div>
  `
}

function renderSingleReceipt(context: PaymentContext, tenant: any, assets: TenantAssets, translateFn: any) {
  const { products, customer, paymentDate, appointmentInfo, amounts, creditInfo } = context

  return `
    <div class="doc" style="page-break-after: always;">
      ${renderHeader(customer, 'receipt.date', paymentDate, tenant, assets, translateFn)}
      
      <div class="section">
        <div class="section-title">${appointmentInfo.isCourse ? translateFn('receipt.courseDetails') : translateFn('receipt.serviceDetails')}</div>
        <div class="row">
          <div class="label">
            ${appointmentInfo.eventTypeLabel}${appointmentInfo.date ? ` - ${appointmentInfo.date}` : ''}${appointmentInfo.time ? ` ${appointmentInfo.time}` : ''}${appointmentInfo.duration ? ` - ${appointmentInfo.duration} ${translateFn('receipt.minutes')}` : ''}
          </div>
          <div class="value">CHF ${amounts.lesson.toFixed(2)}</div>
        </div>
        ${appointmentInfo.courseLocation ? `<div class="row" style="font-size:12px; color:#6b7280;"><div class="label">Ort</div><div class="value">${appointmentInfo.courseLocation}</div></div>` : ''}
        ${appointmentInfo.staffFirstName && !appointmentInfo.isCourse ? `<div class="row" style="font-size:12px; color:#6b7280;"><div class="label">Instruktor</div><div class="value">${appointmentInfo.staffFirstName}</div></div>` : ''}
        ${appointmentInfo.isCancelled && !appointmentInfo.isCourse ? `
          <div class="row" style="background:#fee2e2; padding:8px 12px; margin:8px 0; border-radius:6px; border-left:3px solid #dc2626;">
            <div style="font-size:12px; color:#991b1b;">
              <div style="font-weight:600;">${translateFn('receipt.cancellation')}</div>
              <div>${translateFn('receipt.date')}: ${appointmentInfo.cancellationDate}</div>
              <div>${translateFn('receipt.reason')}: ${appointmentInfo.cancellationReason}</div>
              <div>${translateFn('receipt.charged')}: ${appointmentInfo.isCharged ? translateFn('receipt.yes') : translateFn('receipt.no')}</div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">${translateFn('receipt.costBreakdown')}</div>
        ${amounts.adminFee > 0 ? `<div class="row"><div class="label">${translateFn('receipt.adminFee')}</div><div class="value">CHF ${amounts.adminFee.toFixed(2)}</div></div>` : ''}
        ${products && products.length > 0 ? `
          <div style="margin:12px 0; padding:12px; background:#f9fafb; border-radius:6px;">
            <div class="label" style="margin-bottom:8px; font-weight:600;">${translateFn('receipt.products')}</div>
            ${products.map(p => `
              <div class="row" style="font-size:13px; margin:4px 0;">
                <div class="label">${p.name}${p.description ? ` (${p.description})` : ''}</div>
                <div class="value">CHF ${p.totalCHF.toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${amounts.discount > 0 ? `
          <div class="row" style="color:#059669; font-weight:600;">
            <div class="label">${translateFn('receipt.staffDiscount')}</div>
            <div class="value">- CHF ${amounts.discount.toFixed(2)}</div>
          </div>
        ` : ''}
        ${amounts.voucherDiscount > 0 ? `
          <div class="row" style="color:#059669; font-weight:600;">
            <div class="label">${translateFn('receipt.voucherDiscount')}</div>
            <div class="value">- CHF ${amounts.voucherDiscount.toFixed(2)}</div>
          </div>
        ` : ''}
        ${creditInfo && creditInfo.creditUsed > 0 ? `
          <div class="row" style="color:#059669; font-weight:600;">
            <div class="label">${translateFn('receipt.creditUsed')}</div>
            <div class="value">- CHF ${creditInfo.creditUsed.toFixed(2)}</div>
          </div>
        ` : ''}
        <div class="row" style="margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;">
          <div class="label">${translateFn('receipt.totalAmount')}</div>
          <div class="amount">CHF ${amounts.total.toFixed(2)}</div>
        </div>
      </div>
      
      ${creditInfo ? `
        <div class="section">
          <div class="section-title">${translateFn('receipt.creditBalance')}</div>
          <div class="row">
            <div class="label">${translateFn('receipt.currentBalance')}</div>
            <div class="value" style="color:#059669; font-size:16px; font-weight:700;">CHF ${creditInfo.currentBalance.toFixed(2)}</div>
          </div>
          ${creditInfo.recentTransactions.length > 0 ? `
            <div style="margin-top:16px;">
              <div class="label" style="margin-bottom:8px;">${translateFn('receipt.recentTransactions')}</div>
              <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <th style="text-align:left; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.transactionType')}</th>
                    <th style="text-align:left; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.date')}</th>
                    <th style="text-align:right; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${creditInfo.recentTransactions.map(tx => `
                    <tr style="border-bottom:1px solid #f3f4f6;">
                      <td style="padding:6px 8px;">${tx.type}</td>
                      <td style="padding:6px 8px; color:#6b7280;">${tx.date}</td>
                      <td style="padding:6px 8px; text-align:right; ${tx.type === 'Verwendet' ? 'color:#dc2626;' : 'color:#059669;'}">${tx.type === 'Verwendet' ? '-' : '+'} CHF ${tx.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <div class="section">
        <div class="muted">${translateFn('receipt.footer', { email: tenant?.contact_email || 'den Support' })}</div>
      </div>
    </div>
  `
}

function renderCombinedReceipt(contexts: PaymentContext[], tenant: any, assets: TenantAssets, translateFn: any) {
  const customer = contexts[0].customer
  const creditInfo = contexts[0].creditInfo // Use credit info from first context
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
      acc.voucherDiscount += ctx.amounts.voucherDiscount
      acc.total += ctx.amounts.total
      // Sum up all credit used across all payments
      if (ctx.creditInfo?.creditUsed) {
        acc.creditUsed += ctx.creditInfo.creditUsed
      }
      return acc
    },
    { lesson: 0, adminFee: 0, products: 0, discount: 0, voucherDiscount: 0, total: 0, creditUsed: 0 }
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
        meta.push(`${translateFn('receipt.staffDiscount')}: - CHF ${ctx.amounts.discount.toFixed(2)}`)
      }
      if (ctx.amounts.voucherDiscount > 0) {
        meta.push(`${translateFn('receipt.voucherDiscount')}: - CHF ${ctx.amounts.voucherDiscount.toFixed(2)}`)
      }
      if (ctx.creditInfo?.creditUsed && ctx.creditInfo.creditUsed > 0) {
        meta.push(`${translateFn('receipt.creditUsed')}: - CHF ${ctx.creditInfo.creditUsed.toFixed(2)}`)
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

  // Calculate actual lesson count (only for event_type_code 'lesson', duration / 45)
  const totalLessonCount = sorted.reduce((count, ctx) => {
    // Only count if it's a lesson (not exam, theory, etc.)
    if (ctx.appointment?.event_type_code === 'lesson' && ctx.appointmentInfo.duration > 0) {
      return count + (ctx.appointmentInfo.duration / 45)
    }
    return count
  }, 0)

  return `
    <div class="doc">
      ${renderHeader(customer, 'receipt.generatedOn', new Date().toLocaleDateString('de-CH'), tenant, assets, translateFn)}
      
      <div class="section">
        <div class="section-title">${translateFn('receipt.lessonsOverview')}</div>
        <div class="row">
          <div class="label">${translateFn('receipt.lessonCount')}</div>
          <div class="value">${totalLessonCount}</div>
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
        ${summary.discount > 0 ? `<div class="row"><div class="label">${translateFn('receipt.totalStaffDiscounts')}</div><div class="value">- CHF ${summary.discount.toFixed(2)}</div></div>` : ''}
        ${summary.voucherDiscount > 0 ? `<div class="row"><div class="label">${translateFn('receipt.totalVoucherDiscounts')}</div><div class="value">- CHF ${summary.voucherDiscount.toFixed(2)}</div></div>` : ''}
        ${summary.creditUsed > 0 ? `<div class="row" style="color:#059669;"><div class="label">${translateFn('receipt.totalCreditUsed')}</div><div class="value">- CHF ${summary.creditUsed.toFixed(2)}</div></div>` : ''}
        <div class="row" style="margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;">
          <div class="label">${translateFn('receipt.totalAmount')}</div>
          <div class="amount">CHF ${summary.total.toFixed(2)}</div>
        </div>
      </div>
      
      ${creditInfo ? `
        <div class="section">
          <div class="section-title">${translateFn('receipt.creditBalance')}</div>
          <div class="row">
            <div class="label">${translateFn('receipt.currentBalance')}</div>
            <div class="value" style="color:#059669; font-size:16px; font-weight:700;">CHF ${creditInfo.currentBalance.toFixed(2)}</div>
          </div>
          ${creditInfo.recentTransactions.length > 0 ? `
            <div style="margin-top:16px;">
              <div class="label" style="margin-bottom:8px;">${translateFn('receipt.recentTransactions')}</div>
              <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <th style="text-align:left; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.transactionType')}</th>
                    <th style="text-align:left; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.date')}</th>
                    <th style="text-align:right; padding:6px 8px; color:#6b7280; font-weight:600;">${translateFn('receipt.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${creditInfo.recentTransactions.map(tx => `
                    <tr style="border-bottom:1px solid #f3f4f6;">
                      <td style="padding:6px 8px;">${tx.type}</td>
                      <td style="padding:6px 8px; color:#6b7280;">${tx.date}</td>
                      <td style="padding:6px 8px; text-align:right; ${tx.type === 'Verwendet' ? 'color:#dc2626;' : 'color:#059669;'}">${tx.type === 'Verwendet' ? '-' : '+'} CHF ${tx.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
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
        .company-name-large { font-size:22px; font-weight:800; color:var(--primary); text-align:right; max-width:200px; line-height:1.2; }
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
    logger.debug('📄 Receipt API called')
    
    const { paymentId, paymentIds }: ReceiptRequest = await readBody(event)
    
    // Determine which payments to process
    const ids = paymentIds && paymentIds.length > 0 ? paymentIds : (paymentId ? [paymentId] : [])
    
    if (ids.length === 0) {
      console.error('❌ No payment ID(s) provided')
      throw new Error('Payment ID(s) is required')
    }

    logger.debug('📄 Generating receipt(s) for payment(s):', ids)

    const supabase = getSupabaseAdmin()
    
    // ✅ SECURITY: Get authenticated user
    const user = await getAuthUserFromRequest(event)
    if (!user?.id) {
      logger.warn('⚠️ Unauthorized: User not authenticated')
      throw new Error('Unauthorized: User not authenticated')
    }
    logger.debug('👤 User authenticated:', user.id)

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
    
    // ✅ SECURITY: Verify that all payments belong to the authenticated user
    const unauthorizedPayments = payments.filter(p => p.user_id !== user.id)
    if (unauthorizedPayments.length > 0) {
      logger.warn('⚠️ Unauthorized payment access attempt - filtering to authorized payments:', {
        userId: user.id,
        requestedPaymentCount: payments.length,
        unauthorizedPaymentCount: unauthorizedPayments.length,
        authorizedPaymentCount: payments.filter(p => p.user_id === user.id).length
      })
      // Filter to only authorized payments instead of rejecting all
      // This is safer - generate receipts only for payments user owns
    }
    
    const authorizedPayments = payments.filter(p => p.user_id === user.id)
    if (authorizedPayments.length === 0) {
      logger.warn('❌ No authorized payments found for user:', user.id)
      throw new Error('Unauthorized: You do not have access to any of these payments')
    }
    logger.debug('✅ Authorized payments for user:', { userId: user.id, count: authorizedPayments.length })

    // Load tenant branding (once for all payments)
    const firstPayment = authorizedPayments[0]
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
        'receipt.serviceDetails': 'Leistungsdetails',
        'receipt.courseDetails': 'Kursdetails',
        'receipt.costBreakdown': 'Kostenaufstellung',
        'receipt.baseAmount': 'Basisbetrag',
        'receipt.adminFee': 'Administrationsgebühr',
        'receipt.discount': 'Rabatt',
        'receipt.staffDiscount': 'Personalrabatt (nicht erstattet)',
        'receipt.voucherDiscount': 'Gutschein-Rabatt (erstattbar)',
        'receipt.creditUsed': 'Verwendetes Guthaben',
        'receipt.totalAmount': 'Gesamtbetrag',
        'receipt.minutes': 'Minuten',
        'receipt.products': 'Produkte',
        'receipt.cancellation': 'Stornierung',
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
        'receipt.totalStaffDiscounts': 'Total Personalrabatte',
        'receipt.totalVoucherDiscounts': 'Total Gutschein-Rabatte',
        'receipt.totalCreditUsed': 'Total Verwendetes Guthaben',
        'receipt.generatedOn': 'Erstellt am',
        'receipt.table.header.service': 'Leistung',
        'receipt.table.header.datetime': 'Datum & Zeit',
        'receipt.table.header.duration': 'Dauer',
        'receipt.table.header.amount': 'Betrag',
        'receipt.creditBalance': 'Guthaben',
        'receipt.currentBalance': 'Aktueller Guthabenstand',
        'receipt.recentTransactions': 'Guthaben-Transaktionen',
        'receipt.transactionType': 'Typ',
        'receipt.amount': 'Betrag',
        'eventType.lesson': 'Fahrlektion',
        'eventType.course': 'Kurs',
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

    const tenantAssets = await loadTenantAssets(tenant, supabase)
    const contexts = await Promise.all(
      authorizedPayments.map(payment => loadPaymentContext(payment, supabase, translateFn))
    )

    const bodyHtml = contexts.length === 1
      ? renderSingleReceipt(contexts[0], tenant, tenantAssets, translateFn)
      : renderCombinedReceipt(contexts, tenant, tenantAssets, translateFn)

    const finalHtml = wrapHtml(bodyHtml, primary, secondary)

    logger.debug('📄 Generating PDF with Puppeteer...')
    
    let browser: any
    try {
      const { default: Puppeteer } = await getPuppeteer()
      logger.debug('✅ Puppeteer loaded successfully')
      
      // Try to launch browser with appropriate settings for environment
      let launchOptions: any = { headless: 'new' }
      
      // If we're in a serverless environment (Vercel), use chromium
      if (process.env.VERCEL) {
        logger.debug('📍 Serverless environment detected (Vercel), using chromium')
        launchOptions = {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }
      } else {
        // Local development: use system Chrome/Chromium
        logger.debug('📍 Local environment detected, using system Chrome')
        launchOptions = {
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      }
      
      browser = await Puppeteer.launch(launchOptions)
      logger.debug('✅ Browser launched successfully with options:', { isVercel: !!process.env.VERCEL })
      
      const page = await browser.newPage()
      await page.setContent(finalHtml, { waitUntil: 'networkidle0' })
      
      logger.debug('📄 Converting to PDF...')
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } 
      })
      
      await page.close()
      await browser.close()
      
      logger.debug('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
      
      // Upload PDF to Supabase Storage
      const filename = authorizedPayments.length === 1 
        ? `Quittung_${authorizedPayments[0].id}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Alle_Quittungen_${new Date().toISOString().split('T')[0]}.pdf`
      
      // Don't include 'receipts/' in path since bucket is already named 'receipts'
      const filepath = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`
      
      logger.debug('📤 Uploading PDF to Supabase Storage:', filepath)
      
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
      
      logger.debug('✅ PDF uploaded successfully:', uploadData)
      
      // Get public URL for the PDF
      const { data: publicData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filepath)
      
      const pdfUrl = publicData?.publicUrl
      logger.debug('📄 PDF public URL:', pdfUrl)
      
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