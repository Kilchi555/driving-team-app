// server/api/admin/get-billing-addresses.post.ts
// Get billing addresses for students

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { studentIds } = body

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'studentIds array is required and must not be empty'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // Get billing addresses for these students
    const { data: companyBillingAddresses, error: billingAddressError } = await supabase
      .from('company_billing_addresses')
      .select('*')
      .in('user_id', studentIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (billingAddressError) throw billingAddressError

    return {
      success: true,
      data: companyBillingAddresses || []
    }
  } catch (err: any) {
    console.error('❌ Error loading billing addresses:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load billing addresses'
    })
  }
})
