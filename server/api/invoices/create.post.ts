import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'
import { computeInvoiceDueDate, getTenantInvoiceDueDays } from '~/server/utils/invoice-due-date'
import { getTenantDefaultVatRate } from '~/server/utils/invoice-vat'

export default defineEventHandler(async (event) => {
  // ✅ Use authenticated user
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile || !['admin', 'staff'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const body = await readBody(event)
  const { invoiceData, items } = body

  if (!invoiceData || !items) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invoiceData or items' })
  }

  try {
    const invoiceNumber = await allocateInvoiceNumber(supabaseAdmin, userProfile.tenant_id)

    const toRappen = (value: unknown): number => {
      const num = Number(value) || 0
      if (!Number.isFinite(num)) return 0
      // Some clients historically sent CHF decimals in *_rappen fields
      if (!Number.isInteger(num)) return Math.round(num * 100)
      return num
    }

    // Compute totals server-side (amounts must be integer rappen, not CHF decimals)
    const subtotalRappen: number = items.reduce((sum: number, item: any) => sum + toRappen(item.total_price_rappen), 0)
    const discountRappen: number = toRappen(invoiceData.discount_amount_rappen)

    const invoiceDate =
      invoiceData.invoice_date || new Date().toISOString().slice(0, 10)
    // Prefer explicit due_date from client; otherwise use admin Zahlungsfrist
    const dueDate =
      invoiceData.due_date ||
      computeInvoiceDueDate(invoiceDate, await getTenantInvoiceDueDays(supabaseAdmin, userProfile.tenant_id))

    // Tenant MwSt is source of truth — never invent 7.7% when tenant has 0
    const tenantVatRate = await getTenantDefaultVatRate(supabaseAdmin, userProfile.tenant_id)
    let vatRappen: number = items.reduce((sum: number, item: any) => sum + toRappen(item.vat_amount_rappen), 0)
    let vatRate =
      invoiceData.vat_rate != null && Number.isFinite(Number(invoiceData.vat_rate))
        ? Number(invoiceData.vat_rate)
        : tenantVatRate

    if (tenantVatRate <= 0) {
      vatRate = 0
      vatRappen = 0
      for (const item of items) {
        item.vat_rate = 0
        item.vat_amount_rappen = 0
      }
    }

    const totalRappen: number = subtotalRappen + vatRappen - discountRappen

    // Create invoice
    const invoiceInsertData = {
      ...invoiceData,
      tenant_id: userProfile.tenant_id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      vat_rate: vatRate,
      subtotal_rappen: subtotalRappen,
      vat_amount_rappen: vatRappen,
      total_amount_rappen: totalRappen,
      status: 'pdf_created',
      payment_status: 'pending',
      notes: invoiceData.notes || null,
      payment_terms: invoiceData.payment_terms || null,
      footer_text: invoiceData.footer_text || null,
      // company invoices have no user_id — coerce empty strings to null (uuid columns)
      user_id: invoiceData.user_id || null,
      company_id: invoiceData.company_id || null,
      staff_id: invoiceData.staff_id || null,
      product_sale_id: invoiceData.product_sale_id || null,
      appointment_id: invoiceData.appointment_id || null,
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceInsertData)
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Update user's preferred payment method to 'invoice' if user_id is provided
    if (invoiceData.user_id) {
      const { error: updateUserError } = await supabaseAdmin
        .from('users')
        .update({ preferred_payment_method: 'invoice' })
        .eq('id', invoiceData.user_id)

      if (updateUserError) {
        console.warn('Warning: Could not update user payment method:', updateUserError)
      }

      // Update payments for the selected appointments in the invoice items
      if (items.length > 0) {
        // Collect all appointment IDs from invoice items
        const appointmentIds = items
          .filter((item: any) => item.appointment_id)
          .map((item: any) => item.appointment_id)

        if (appointmentIds.length > 0) {
          const { error: updatePaymentsError } = await supabaseAdmin
            .from('payments')
            .update({ payment_status: 'invoice', payment_method: 'invoice', invoice_id: invoice.id })
            .eq('user_id', invoiceData.user_id)
            .in('appointment_id', appointmentIds)

          if (updatePaymentsError) {
            console.warn('Warning: Could not update payment statuses:', updatePaymentsError)
          }
        }
      }
    }

    // Create invoice items
    if (items.length > 0) {
      const invoiceItems = items.map((item: any, index: number) => {
        // Strip internal metadata and computed-only fields before inserting
        const {
          _open_item_id, _open_item_type, _open_item_source_table,
          payment_method, status,
          ...cleanItem
        } = item
        return {
          ...cleanItem,
          invoice_id: invoice.id,
          tenant_id: userProfile.tenant_id,
          sort_order: item.sort_order ?? index,
          discount_percent: item.discount_percent || 0,
          unit_price_rappen: toRappen(cleanItem.unit_price_rappen),
          total_price_rappen: toRappen(cleanItem.total_price_rappen),
          vat_amount_rappen: toRappen(cleanItem.vat_amount_rappen),
        }
      })

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError

      // Stamp invoice_id back on source rows (payments, courses, rooms, vehicles)
      for (const item of items) {
        if (!item._open_item_id || !item._open_item_source_table) continue
        const table = item._open_item_source_table as string
        const sourceId = item._open_item_id as string

        if (table === 'payments') {
          // Course/lesson open items come from payments — link them so they
          // disappear from "Offene Positionen" (filter: invoice_id IS NULL).
          const { data: paymentRow, error: payErr } = await supabaseAdmin
            .from('payments')
            .update({
              invoice_id: invoice.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sourceId)
            .eq('tenant_id', userProfile.tenant_id)
            .select('id, course_registration_id')
            .maybeSingle()

          if (payErr) {
            console.warn('[invoice/create] Could not stamp invoice_id on payment:', payErr)
          } else if (paymentRow?.course_registration_id) {
            const { error: regErr } = await supabaseAdmin
              .from('course_registrations')
              .update({ invoice_id: invoice.id })
              .eq('id', paymentRow.course_registration_id)
              .eq('tenant_id', userProfile.tenant_id)
            if (regErr) console.warn('[invoice/create] Could not stamp invoice_id on course_registration:', regErr)
          }
          continue
        }

        if (!['course_registrations', 'room_bookings', 'vehicle_bookings'].includes(table)) continue
        const { error: stampErr } = await supabaseAdmin
          .from(table)
          .update({ invoice_id: invoice.id })
          .eq('id', sourceId)
        if (stampErr) console.warn(`[invoice/create] Could not stamp invoice_id on ${table}:`, stampErr)
      }
    }

    // Fetch full invoice with details
    const { data: fullInvoice } = await supabaseAdmin
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoice.id)
      .single()

    return { success: true, data: fullInvoice }
  } catch (err: any) {
    console.error('Error creating invoice:', err)
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
