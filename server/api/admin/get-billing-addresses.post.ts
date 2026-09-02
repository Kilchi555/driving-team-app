// server/api/admin/get-billing-addresses.post.ts
// Staff/admin: company billing addresses for students in the caller's tenant only.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { assertUsersBelongToTenant, normalizeIdList } from '~/server/utils/admin-f01-access'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, [
    'admin',
    'staff',
    'tenant_admin',
    'super_admin',
  ])

  const body = await readBody(event)
  const studentIds = normalizeIdList(body?.studentIds, 'studentIds')

  const supabase = getSupabaseAdmin()

  // Server-side tenant ownership — never trust client studentIds alone
  const verifiedIds = await assertUsersBelongToTenant(
    supabase,
    studentIds,
    profile.tenant_id
  )

  try {
    const { data: companyBillingAddresses, error: billingAddressError } = await supabase
      .from('company_billing_addresses')
      .select('*')
      .in('user_id', verifiedIds)
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (billingAddressError) throw billingAddressError

    return {
      success: true,
      data: companyBillingAddresses || [],
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Error loading billing addresses:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load billing addresses',
    })
  }
})
