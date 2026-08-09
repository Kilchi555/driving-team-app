/**
 * GET /api/admin/booking-readiness
 * Live probe that mirrors the public booking flow slot path.
 */
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { probeBookingSlots } from '~/server/utils/booking-slot-probe'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  const supabase = getSupabaseAdmin()
  const result = await probeBookingSlots(supabase, profile.tenant_id, { days: 28 })

  // Prefer relative booking URL — client can prefix origin
  if (result.tenantSlug) {
    result.bookingUrl = `/booking/availability/${result.tenantSlug}`
  }

  return { success: true, ...result }
})
