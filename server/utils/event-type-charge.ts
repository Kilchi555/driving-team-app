// server/utils/event-type-charge.ts
//
// Server-side counterpart to the client-side isChargeableEventType() helper
// in composables/useEventModalForm.ts. Both read the same source of truth
// (event_types.require_payment) so a tenant's own custom chargeable event
// types (added via tenant registration, or later the admin dashboard) get
// full payment handling in server/api/appointments/save.post.ts too —
// without touching the previously hardcoded ['lesson','exam','theory']
// array every time a new type is added.

import { logger } from '~/utils/logger'

type SupabaseAdmin = ReturnType<typeof import('~/utils/supabase').getSupabaseAdmin>

const LEGACY_CHARGEABLE_TYPES = ['lesson', 'exam', 'theory']

/**
 * Resolves whether `code` should be treated as a chargeable (payable)
 * event type for `tenantId`. Falls back to the legacy hardcoded set if the
 * tenant has no matching event_types row (e.g. race during tenant setup) or
 * on any lookup error, so existing behavior for the three built-in types
 * never regresses.
 */
export async function isChargeableEventType(
  supabase: SupabaseAdmin,
  tenantId: string | null | undefined,
  code: string | null | undefined
): Promise<boolean> {
  const normalized = (code || 'lesson').toLowerCase()
  if (!tenantId) return LEGACY_CHARGEABLE_TYPES.includes(normalized)

  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('require_payment')
      .eq('tenant_id', tenantId)
      .eq('code', normalized)
      .maybeSingle()

    if (error || !data) return LEGACY_CHARGEABLE_TYPES.includes(normalized)
    return !!data.require_payment
  } catch (err) {
    logger.warn('⚠️ isChargeableEventType lookup failed, using legacy fallback:', err)
    return LEGACY_CHARGEABLE_TYPES.includes(normalized)
  }
}
