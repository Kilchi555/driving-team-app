import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // ✅ Auth check
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const token = authHeader.substring(7)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ✅ Verify user token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  // ✅ Check if user is admin/staff
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ✅ Get body
  const body = await readBody(event)
  const { invoice_id, action } = body

  if (!invoice_id || !action) {
    throw createError({ statusCode: 400, message: 'invoice_id and action required' })
  }

  // ✅ Validate action
  const validActions = ['draft', 'sent', 'paid', 'cancelled']
  if (!validActions.includes(action)) {
    throw createError({ statusCode: 400, message: `Invalid action. Valid: ${validActions.join(', ')}` })
  }

  try {
    // ✅ Verify invoice belongs to tenant
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, tenant_id, status, payment_status')
      .eq('id', invoice_id)
      .single()

    if (checkError || !existingInvoice) {
      throw createError({ statusCode: 404, message: 'Invoice not found' })
    }

    if (existingInvoice.tenant_id !== userData.tenant_id && userData.role !== 'superadmin') {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }

    // ✅ Build update data based on action
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'draft':
        updateData.status = 'draft'
        break
      case 'sent':
        updateData.status = 'sent'
        break
      case 'cancelled':
        updateData.status = 'cancelled'
        break
      case 'paid':
        updateData.payment_status = 'paid'
        break
    }

    // ✅ Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to update invoice status' })
    }

    return {
      success: true,
      invoice: updatedInvoice
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error updating invoice status:', error)
    throw createError({ statusCode: 500, message: 'Failed to update invoice status' })
  }
})

