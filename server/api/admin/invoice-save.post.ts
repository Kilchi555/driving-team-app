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
  const { payment_id, update_data } = body

  if (!payment_id || !update_data) {
    throw createError({ statusCode: 400, message: 'payment_id and update_data required' })
  }

  // ✅ Whitelist allowed fields for update
  const allowedFields = [
    'billing_company_name',
    'billing_contact_person',
    'billing_street',
    'billing_street_number',
    'billing_zip',
    'billing_city',
    'billing_country',
    'billing_email',
    'notes'
  ]

  // Filter to only allowed fields
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
    // ✅ Verify payment belongs to tenant
    const { data: existingPayment, error: checkError } = await supabase
      .from('payments')
      .select('id, tenant_id')
      .eq('id', payment_id)
      .single()

    if (checkError || !existingPayment) {
      throw createError({ statusCode: 404, message: 'Payment not found' })
    }

    if (existingPayment.tenant_id !== userData.tenant_id && userData.role !== 'superadmin') {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }

    // ✅ Update payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(sanitizedData)
      .eq('id', payment_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error saving invoice:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to save invoice' })
    }

    return {
      success: true,
      payment: updatedPayment
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error saving invoice:', error)
    throw createError({ statusCode: 500, message: 'Failed to save invoice' })
  }
})

