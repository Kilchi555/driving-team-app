// server/api/invoices/auto-draft.post.ts
// Aggregiert alle offenen "invoice"-Zahlungen eines Schülers zu einem Rechnungsentwurf.
// Wird aufgerufen nach Terminabschluss, wenn der Fahrlehrer "completed" setzt.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'staff'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { student_user_id, payment_ids: explicitPaymentIds } = body

  if (!student_user_id) {
    throw createError({ statusCode: 400, statusMessage: 'student_user_id is required' })
  }

  let openPayments: any[] | null = null
  let paymentsError: any = null

  const paymentSelect = `
    id,
    total_amount_rappen,
    lesson_price_rappen,
    admin_fee_rappen,
    products_price_rappen,
    discount_amount_rappen,
    credit_used_rappen,
    voucher_discount_rappen,
    appointment_id,
    payment_method,
    payment_status,
    appointments (
      id,
      title,
      start_time,
      duration_minutes,
      type,
      event_type_code
    )
  `

  if (explicitPaymentIds?.length > 0) {
    // Build preview from explicitly selected payment IDs — no DB write needed
    const { data, error } = await supabase
      .from('payments')
      .select(paymentSelect)
      .in('id', explicitPaymentIds)
      .eq('user_id', student_user_id)
      .order('created_at', { ascending: true })
    openPayments = data
    paymentsError = error
  } else {
    // Fallback: fetch all uninvoiced 'invoice'-method payments for this student
    const baseQuery = () => supabase
      .from('payments')
      .select(paymentSelect)
      .eq('user_id', student_user_id)
      .eq('payment_method', 'invoice')
      .in('payment_status', ['pending', 'open'])
      .order('created_at', { ascending: true })

    const withFilter = await baseQuery().is('invoice_id', null)
    if (withFilter.error && withFilter.error.message?.includes('invoice_id')) {
      const withoutFilter = await baseQuery()
      openPayments = withoutFilter.data
      paymentsError = withoutFilter.error
    } else {
      openPayments = withFilter.data
      paymentsError = withFilter.error
    }
  }

  if (paymentsError) {
    throw createError({ statusCode: 500, statusMessage: paymentsError.message })
  }


  if (!openPayments || openPayments.length === 0) {
    return { hasOpenItems: false, draft: null }
  }

  // Schülerdaten laden – versuche erst via users.id, dann via auth_user_id
  let student: any = null
  const { data: studentById, error: errById } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, street, street_nr, zip, city, phone')
    .eq('id', student_user_id)
    .maybeSingle()

  if (studentById) {
    student = studentById
  } else {
    const { data: studentByAuthId } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, street, street_nr, zip, city, phone')
      .eq('auth_user_id', student_user_id)
      .maybeSingle()
    student = studentByAuthId
  }

  if (!student) {
    throw createError({ statusCode: 404, statusMessage: 'Student not found' })
  }

  // Billing-Adresse aus company_billing_addresses laden (neueste aktive)
  const { data: savedBilling } = await supabase
    .from('company_billing_addresses')
    .select('company_name, contact_person, email, street, street_number, zip, city, country')
    .eq('user_id', student.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Tenant-Daten für Rechnungsnummer-Prefix + QR-IBAN
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, invoice_number_prefix, next_invoice_number, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
    .eq('id', staffUser.tenant_id)
    .single()

  // Rechnungsnummer generieren (Preview – wird erst beim Speichern definitiv)
  const prefix = tenant?.invoice_number_prefix || 'RE'
  const nextNum = tenant?.next_invoice_number || 1
  const year = new Date().getFullYear()
  const previewInvoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + 30)

  // Draft-Objekt zusammenstellen
  // BRUTTO-Subtotal: Zahlung-Nettobeträge + alle Abzüge zurückgerechnet (für korrekten Rechnungsaufbau)
  const getGrossAmount = (p: any) =>
    (p.total_amount_rappen || 0) +
    (p.discount_amount_rappen || 0) +
    ((p as any).voucher_discount_rappen || 0) +
    (p.credit_used_rappen || 0)

  const subtotal = openPayments.reduce((sum, p) => sum + getGrossAmount(p), 0)  // Brutto
  const totalDiscounts = openPayments.reduce((sum, p) => sum + (p.discount_amount_rappen || 0) + ((p as any).voucher_discount_rappen || 0), 0)
  const totalCredits = openPayments.reduce((sum, p) => sum + (p.credit_used_rappen || 0), 0)
  const vatRate = 0 // Fahrschulen sind in CH meist von MwSt befreit; anpassbar
  const vatAmount = Math.round(subtotal * vatRate)
  // Nettobetrag = Brutto - Rabatte - Guthaben + MwSt
  const total = subtotal - totalDiscounts - totalCredits + vatAmount

  const draft = {
    // Rechnungsinformationen
    invoice_number_preview: previewInvoiceNumber,
    invoice_date: today.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],

    // Empfänger
    // Rechnungsadresse: gespeicherte company_billing_address bevorzugen, Fallback auf Schülerdaten
    billing_type: savedBilling?.company_name ? 'company' as const : 'individual' as const,
    billing_email: savedBilling?.email || student.email,
    billing_first_name: savedBilling ? (savedBilling.contact_person?.split(' ')[0] || '') : student.first_name,
    billing_last_name: savedBilling ? (savedBilling.contact_person?.split(' ').slice(1).join(' ') || '') : student.last_name,
    billing_company_name: savedBilling?.company_name || '',
    billing_street: savedBilling?.street || student.street || '',
    billing_street_nr: savedBilling?.street_number || student.street_nr || '',
    billing_zip: savedBilling?.zip || student.zip || '',
    billing_city: savedBilling?.city || student.city || '',
    billing_country: savedBilling?.country || 'CH',

    // Beträge
    subtotal_rappen: subtotal,
    vat_rate: vatRate * 100,
    vat_amount_rappen: vatAmount,
    discount_amount_rappen: totalDiscounts + totalCredits, // Kombiniert für DB-Trigger: total = subtotal - discount
    credit_used_rappen: totalCredits,
    total_amount_rappen: total,

    // Referenzen
    user_id: student.id,
    staff_id: staffUser.id,
    tenant_id: staffUser.tenant_id,

    // Items aus Zahlungen
    items: openPayments.map((p, i) => {
      const apt = p.appointments as any
      const eventTypeMap: Record<string, string> = {
        lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorieunterricht', vku: 'VKU', haltbar: 'Haltbarkeitsprüfung'
      }
      const label = apt?.event_type_code ? (eventTypeMap[apt.event_type_code] || apt.event_type_code) : null
      return {
        payment_id: p.id,
        appointment_id: p.appointment_id,
        product_name: label || apt?.title || 'Fahrstunde',
        product_description: apt?.type ? `Kat. ${apt.type}` : null,
        appointment_title: apt?.title || null,
        appointment_date: apt?.start_time || null,
        appointment_start_time: apt?.start_time || null,
        appointment_duration_minutes: apt?.duration_minutes || null,
        quantity: 1,
        unit_price_rappen: getGrossAmount(p),
        total_price_rappen: getGrossAmount(p),
        vat_rate: vatRate * 100,
        vat_amount_rappen: Math.round(p.total_amount_rappen * vatRate),
        sort_order: i,
        // Breakdown
        lesson_price_rappen: p.lesson_price_rappen || 0,
        admin_fee_rappen: p.admin_fee_rappen || 0,
        products_price_rappen: p.products_price_rappen || 0,
        discount_amount_rappen: p.discount_amount_rappen || 0,
        credit_used_rappen: p.credit_used_rappen || 0,
        voucher_discount_rappen: (p as any).voucher_discount_rappen || 0,
      }
    }),

    // Metadaten
    payment_ids: openPayments.map(p => p.id),
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
    },
    // Tenant / Absender für QR-Rechnung
    creditor_name: tenant?.name || '',
    creditor_street: tenant?.invoice_street || '',
    creditor_street_nr: tenant?.invoice_street_nr || '',
    creditor_zip: tenant?.invoice_zip || '',
    creditor_city: tenant?.invoice_city || '',
    qr_iban: tenant?.qr_iban || null,
  }

  return { hasOpenItems: true, draft }
})
