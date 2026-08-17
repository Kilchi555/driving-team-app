// server/api/admin/get-billing-addresses.post.ts
// Get billing addresses for students (staff/admin only, tenant-scoped)

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const BILLING_ADDRESS_COLUMNS = `
  id,
  user_id,
  tenant_id,
  company_name,
  contact_person,
  email,
  phone,
  street,
  street_number,
  zip,
  city,
  country,
  vat_number,
  company_register_number,
  is_active,
  created_at,
  updated_at
`

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, [
    'admin',
    'staff',
    'super_admin',
    'tenant_admin'
  ])

  const body = await readBody(event)
  const { studentIds } = body

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'studentIds array is required and must not be empty'
    })
  }

  if (studentIds.length > 200) {
    throw createError({
      statusCode: 400,
      message: 'Too many studentIds (max 200)'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Restrict to students in the caller's tenant (unless super_admin)
    let scopedStudentIds = studentIds as string[]
    if (profile.role !== 'super_admin') {
      const { data: tenantUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .in('id', studentIds)

      if (usersError) throw usersError
      scopedStudentIds = (tenantUsers || []).map((u: { id: string }) => u.id)
      if (scopedStudentIds.length === 0) {
        return { success: true, data: [] }
      }
    }

    const query = supabase
      .from('company_billing_addresses')
      .select(BILLING_ADDRESS_COLUMNS)
      .in('user_id', scopedStudentIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (profile.role !== 'super_admin') {
      query.eq('tenant_id', profile.tenant_id)
    }

    const { data: companyBillingAddresses, error: billingAddressError } = await query

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
