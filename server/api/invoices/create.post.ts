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
    // Create invoice
    const invoiceInsertData = {
      ...invoiceData,
      tenant_id: userProfile.tenant_id
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
    }

    // Create invoice items
    if (items.length > 0) {
      const invoiceItems = items.map((item: any, index: number) => ({
        ...item,
        invoice_id: invoice.id,
        sort_order: item.sort_order || index
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError
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
