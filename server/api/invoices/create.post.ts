import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: authUser } } = await supabase.auth.getUser(token)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile || !['admin', 'staff'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { invoiceData, items } = body

  if (!invoiceData || !items) {
    throw createError({ statusCode: 400, message: 'Missing invoiceData or items' })
  }

  try {
    // Create invoice
    const invoiceInsertData = {
      ...invoiceData,
      tenant_id: userProfile.tenant_id
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceInsertData)
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create invoice items
    if (items.length > 0) {
      const invoiceItems = items.map((item: any, index: number) => ({
        ...item,
        invoice_id: invoice.id,
        sort_order: item.sort_order || index
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError
    }

    // Fetch full invoice with details
    const { data: fullInvoice } = await supabase
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoice.id)
      .single()

    return { success: true, data: fullInvoice }
  } catch (err: any) {
    console.error('Error creating invoice:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
