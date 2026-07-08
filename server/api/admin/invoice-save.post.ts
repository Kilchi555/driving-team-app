import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userError || !userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { invoice_id, update_data } = body

  if (!invoice_id || !update_data) {
    throw createError({ statusCode: 400, message: 'invoice_id and update_data required' })
  }

  const allowedFields = [
    'due_date',
    'billing_company_name',
    'billing_contact_person',
    'billing_street',
    'billing_street_number',
    'billing_zip',
    'billing_city',
    'billing_country',
    'billing_email',
    'notes',
    'payment_terms',
    'footer_text',
  ]

  const sanitizedData: any = {}
  for (const field of allowedFields) {
    if (update_data[field] !== undefined) {
      sanitizedData[field] = update_data[field]
    }
  }

  if (Object.keys(sanitizedData).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  sanitizedData.updated_at = new Date().toISOString()

  try {
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, tenant_id')
      .eq('id', invoice_id)
      .single()

    if (checkError || !existingInvoice) {
      throw createError({ statusCode: 404, message: 'Invoice not found' })
    }

    if (existingInvoice.tenant_id !== userData.tenant_id && userData.role !== 'superadmin') {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(sanitizedData)
      .eq('id', invoice_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error saving invoice:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to save invoice' })
    }

    return { success: true, invoice: updatedInvoice }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error saving invoice:', error)
    throw createError({ statusCode: 500, message: 'Failed to save invoice' })
  }
})
