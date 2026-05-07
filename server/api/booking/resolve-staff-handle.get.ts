// GET /api/booking/resolve-staff-handle?handle=max-muster&tenant=driving-team
// Resolves a public booking_handle to the staff's internal UUID.
// UUID is never exposed in the URL – only the readable handle is public-facing.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const { handle, tenant } = getQuery(event) as { handle?: string; tenant?: string }

  if (!handle || !tenant) {
    throw createError({ statusCode: 400, statusMessage: 'handle and tenant are required' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve tenant slug → tenant_id
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenant)
    .single()

  if (!tenantRow) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  // Look up staff by booking_handle within this tenant
  const { data: staff } = await supabase
    .from('users')
    .select('id, first_name, last_name, booking_handle')
    .eq('booking_handle', handle.toLowerCase())
    .eq('tenant_id', tenantRow.id)
    .in('role', ['staff', 'admin', 'tenant_admin'])
    .is('deleted_at', null)
    .single()

  if (!staff) {
    logger.warn('⚠️ Staff handle not found:', handle, 'tenant:', tenant)
    throw createError({ statusCode: 404, statusMessage: 'Staff not found' })
  }

  logger.debug('✅ Resolved handle:', handle, '→', staff.first_name, staff.last_name)

  return {
    success: true,
    staff_id: staff.id,
    name: `${staff.first_name} ${staff.last_name}`,
    handle: staff.booking_handle
  }
})
