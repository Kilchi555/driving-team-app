// server/api/invoices/download.post.ts
// Generiert ein PDF für eine bestehende Rechnung (Download / Vorschau)
// Verwendet die neue generateInvoicePdf Funktion (pdfkit) mit vollem Breakdown

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

export default defineEventHandler(async (event) => {
  const { invoiceId } = await readBody(event)
  if (!invoiceId) throw createError({ statusCode: 400, statusMessage: 'invoiceId required' })

  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  // Rechnung laden
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices_with_details')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })

  // Zugriffskontrolle: nur eigener Tenant
  const { data: staffUser } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || staffUser.tenant_id !== invoice.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, legal_company_name, contact_email, primary_color, secondary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, logo_wide_url')
    .eq('id', invoice.tenant_id)
    .single()

  // Invoice Items + Appointments
  const { data: rawItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  const appointmentIds = (rawItems || []).map((i: any) => i.appointment_id).filter(Boolean)
  const appointmentMap: Record<string, any> = {}
  if (appointmentIds.length > 0) {
    const { data: apts } = await supabase
      .from('appointments')
      .select('id, start_time, event_type_code, type, duration_minutes, staff:users!staff_id(first_name)')
      .in('id', appointmentIds)
    if (apts) for (const apt of apts) appointmentMap[apt.id] = apt
  }

  const eventTypeMap: Record<string, string> = {
    lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorieunterricht', vku: 'VKU', haltbar: 'Haltbarkeitsprüfung',
  }

  const items = (rawItems || []).map((item: any) => {
    const apt = item.appointment_id ? appointmentMap[item.appointment_id] : null
    const eventLabel = apt?.event_type_code ? (eventTypeMap[apt.event_type_code] || apt.event_type_code) : null
    const staffFirstName = (apt?.staff as any)?.first_name || null
    const baseLabel = eventLabel || item.product_name
    const productName = staffFirstName ? `${baseLabel} mit ${staffFirstName}` : baseLabel
    return {
      ...item,
      product_name: productName,
      appointment_start_time: apt?.start_time || null,
      appointment_duration_minutes: apt?.duration_minutes ?? item.appointment_duration_minutes ?? null,
      product_description: apt?.type ? `Kat. ${apt.type}` : (item.product_description || null),
    }
  })

  // Payment-Breakdown (Rabatt, Guthaben etc.) pro Position
  const paymentBreakdown: Record<string, any> = {}
  if (appointmentIds.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('appointment_id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, voucher_discount_rappen, credit_used_rappen')
      .eq('invoice_id', invoiceId)
      .in('appointment_id', appointmentIds)
    if (payments) for (const p of payments) {
      if (p.appointment_id) paymentBreakdown[p.appointment_id] = p
    }
  }

  const enrichedItems = items.map((item: any) => {
    const bd = item.appointment_id ? paymentBreakdown[item.appointment_id] : null
    return bd ? { ...item, ...bd } : item
  })

  // Produkte pro Termin laden
  const aptIdsWithProducts = appointmentIds.filter(id =>
    paymentBreakdown[id] && (paymentBreakdown[id].products_price_rappen || 0) > 0
  )
  const productsByApt: Record<string, { name: string; price_rappen: number }[]> = {}
  if (aptIdsWithProducts.length > 0) {
    const { data: productSales } = await supabase
      .from('product_sales')
      .select('appointment_id, total_price_rappen, products(name)')
      .in('appointment_id', aptIdsWithProducts)
    if (productSales) {
      for (const ps of productSales as any[]) {
        if (!productsByApt[ps.appointment_id]) productsByApt[ps.appointment_id] = []
        productsByApt[ps.appointment_id].push({ name: ps.products?.name || 'Produkt', price_rappen: ps.total_price_rappen || 0 })
      }
    }
  }

  const finalItems = enrichedItems.map((item: any) =>
    item.appointment_id && productsByApt[item.appointment_id]
      ? { ...item, product_details: productsByApt[item.appointment_id] }
      : { ...item, product_details: item.product_details || [] }
  )

  const customerName = invoice.billing_contact_person ||
    `${(invoice as any).customer_first_name || ''} ${(invoice as any).customer_last_name || ''}`.trim() || 'Kunde'

  // QR-Code generieren
  let qrCodeDataUrl: string | null = null
  const qrIban = (tenant as any)?.qr_iban || null
  if (qrIban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref: paymentRef } = generateReference(invoice.invoice_number, qrIban)
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: qrIban,
        creditor_name: (tenant as any)?.legal_company_name || (tenant as any)?.name || '',
        creditor_street: (tenant as any)?.invoice_street?.trim() || '',
        creditor_street_nr: (tenant as any)?.invoice_street_nr?.trim() || '',
        creditor_zip: (tenant as any)?.invoice_zip || '',
        creditor_city: (tenant as any)?.invoice_city || '',
        debtor_name: customerName,
        debtor_street: invoice.billing_street || '',
        debtor_zip: invoice.billing_zip || '',
        debtor_city: invoice.billing_city || '',
        amount_rappen: invoice.total_amount_rappen,
        reference: paymentRef,
        additional_info: `Rechnung ${invoice.invoice_number}`,
      })
    } catch { /* QR optional */ }
  }

  // Logo
  const logoDataUrl: string | null = (tenant as any)?.logo_wide_url || null
  let tenantLogoBase64: string | null = null
  let tenantLogoFormat: 'png' | 'jpeg' = 'png'
  if (logoDataUrl?.startsWith('data:image/')) {
    const match = logoDataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
    if (match) {
      tenantLogoFormat = match[1] === 'jpg' ? 'jpeg' : match[1] as 'png' | 'jpeg'
      tenantLogoBase64 = match[2]
    }
  }

  const tenantStreet = [(tenant as any)?.invoice_street?.trim(), (tenant as any)?.invoice_street_nr?.trim()].filter(Boolean).join(' ')

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    tenantName: (tenant as any)?.legal_company_name || (tenant as any)?.name || '',
    tenantStreet,
    tenantZip: (tenant as any)?.invoice_zip || '',
    tenantCity: (tenant as any)?.invoice_city || '',
    tenantEmail: (tenant as any)?.contact_email || '',
    tenantLogoBase64,
    tenantLogoFormat,
    customerName,
    billingStreet: invoice.billing_street || '',
    billingZip: invoice.billing_zip || '',
    billingCity: invoice.billing_city || '',
    billingEmail: invoice.billing_email || '',
    items: finalItems.map((i: any) => ({
      product_name: i.product_name,
      appointment_date: i.appointment_start_time || i.appointment_date,
      appointment_duration_minutes: i.appointment_duration_minutes ?? null,
      product_description: i.product_description || null,
      quantity: i.quantity,
      unit_price_rappen: i.unit_price_rappen,
      total_price_rappen: i.total_price_rappen,
      lesson_price_rappen: i.lesson_price_rappen || 0,
      admin_fee_rappen: i.admin_fee_rappen || 0,
      products_price_rappen: i.products_price_rappen || 0,
      discount_amount_rappen: i.discount_amount_rappen || 0,
      voucher_discount_rappen: i.voucher_discount_rappen || 0,
      credit_used_rappen: i.credit_used_rappen || 0,
      product_details: i.product_details || [],
    })),
    subtotalRappen: invoice.subtotal_rappen || invoice.total_amount_rappen,
    discountRappen: invoice.discount_amount_rappen || 0,
    totalRappen: invoice.total_amount_rappen,
    qrCodeDataUrl,
    qrIban,
    creditorName: (tenant as any)?.legal_company_name || (tenant as any)?.name || '',
    primaryColor: (tenant as any)?.primary_color || '#1E40AF',
    secondaryColor: (tenant as any)?.secondary_color || '#64748B',
  })

  const pdfBase64 = pdfBuffer.toString('base64')
  return { success: true, pdfUrl: `data:application/pdf;base64,${pdfBase64}` }
})
