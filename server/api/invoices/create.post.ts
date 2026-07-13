import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

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
    // Generate invoice number (tenant prefix + year + sequential counter).
    // Uses the persisted tenants.next_invoice_number counter (same approach as
    // send-draft.post.ts / resources/block.post.ts) instead of COUNT(*), which
    // breaks whenever there's a gap in existing invoice numbers (e.g. a deleted
    // invoice) and produces a number that collides with an existing one.
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('invoice_number_prefix, next_invoice_number')
      .eq('id', userProfile.tenant_id)
      .single()

    const prefix = tenantData?.invoice_number_prefix || 'RE'
    const nextNum = tenantData?.next_invoice_number || 1
    const year = new Date().getFullYear()
    const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

    // Reserve the invoice number before inserting
    await supabaseAdmin
      .from('tenants')
      .update({ next_invoice_number: nextNum + 1 })
      .eq('id', userProfile.tenant_id)

    // Compute totals server-side
    const subtotalRappen: number = items.reduce((sum: number, item: any) => sum + (item.total_price_rappen || 0), 0)
    const vatRappen: number = items.reduce((sum: number, item: any) => sum + (item.vat_amount_rappen || 0), 0)
    const discountRappen: number = invoiceData.discount_amount_rappen || 0
    const totalRappen: number = subtotalRappen + vatRappen - discountRappen

    // Create invoice
    const invoiceInsertData = {
      ...invoiceData,
      tenant_id: userProfile.tenant_id,
      invoice_number: invoiceNumber,
      subtotal_rappen: subtotalRappen,
      vat_amount_rappen: vatRappen,
      total_amount_rappen: totalRappen,
      status: 'draft',
      payment_status: 'pending',
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
        }
      })

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError

      // Stamp invoice_id back on source rows (courses, rooms, vehicles)
      for (const item of items) {
        if (!item._open_item_id || !item._open_item_source_table) continue
        const table = item._open_item_source_table as string
        if (!['course_registrations', 'room_bookings', 'vehicle_bookings'].includes(table)) continue
        const { error: stampErr } = await supabaseAdmin
          .from(table)
          .update({ invoice_id: invoice.id })
          .eq('id', item._open_item_id)
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
