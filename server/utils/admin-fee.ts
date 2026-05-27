/**
 * Server-side utility for determining the admin fee for an upcoming
 * (driving lesson) appointment.
 *
 * Mirrors the logic of `composables/usePricing.ts → shouldApplyAdminFee` and
 * the staff endpoints `check-admin-fee-paid` / `get-appointment-count`, but
 * exposes a single in-process function so it can also be called from
 * non-staff contexts (customer booking flow).
 *
 * Rules summary:
 *   - Motorcycle categories (A, A1, A35kW) never charge an admin fee.
 *   - Admin fee applies starting at the 2nd appointment in a category group.
 *   - Admin fee is charged at most once per category group — if a previous
 *     payment for the same group already includes admin_fee_rappen > 0, no
 *     new admin fee is added.
 *   - Category groups:
 *       * B-group:    'B' | 'B Schaltung' | 'B Automatik' (share fee + count)
 *       * Boot-group: 'Boot' | 'Motorboot' (share fee + count)
 *       * All others: standalone
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const MOTORCYCLE_CATEGORIES = new Set(['A', 'A1', 'A35kW'])
const B_CATEGORY_GROUP = new Set(['B', 'B Schaltung', 'B Automatik'])
const BOOT_CATEGORY_GROUP = new Set(['Boot', 'Motorboot'])

export type AdminFeeReason =
  | 'no_user'
  | 'motorcycle'
  | 'no_rule'
  | 'first_appointment'
  | 'already_paid'
  | 'applied'

export interface AdminFeeResult {
  adminFeeRappen: number
  applies: boolean
  reason: AdminFeeReason
  appointmentNumber: number
  alreadyPaid: boolean
  isMotorcycle: boolean
}

interface CalculateAdminFeeInput {
  supabase: SupabaseClient
  userId: string | null
  tenantId: string
  categoryCode: string
  /**
   * Optional pre-loaded pricing rule. If absent, the function fetches the
   * `admin_fee` rule itself.
   */
  adminFeeRappenFromRule?: number
}

/**
 * Categories used for COUNTING active appointments. Mirrors
 * `server/api/staff/get-appointment-count.get.ts` exactly: only Boot/Motorboot
 * are grouped, B-categories are counted independently.
 */
function getCountCategoryGroup(categoryCode: string): string[] {
  if (BOOT_CATEGORY_GROUP.has(categoryCode)) return [...BOOT_CATEGORY_GROUP]
  return [categoryCode]
}

/**
 * Categories used for the "admin fee already paid" check. Mirrors
 * `server/api/staff/check-admin-fee-paid.get.ts`: both B-group and Boot-group
 * are treated as a single shared group for fee-already-paid purposes.
 */
function getPaidCategoryGroup(categoryCode: string): string[] {
  if (B_CATEGORY_GROUP.has(categoryCode)) return [...B_CATEGORY_GROUP]
  if (BOOT_CATEGORY_GROUP.has(categoryCode)) return [...BOOT_CATEGORY_GROUP]
  return [categoryCode]
}

async function fetchAdminFeeFromRule(
  supabase: SupabaseClient,
  tenantId: string,
  categoryCode: string,
): Promise<number> {
  // Same fallback chain as get-pricing.post.ts: try category-specific first,
  // then any tenant rule.
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('admin_fee_rappen')
    .eq('tenant_id', tenantId)
    .eq('category_code', categoryCode)
    .eq('rule_type', 'admin_fee')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return 0
  return Number(data.admin_fee_rappen) || 0
}

async function countActiveAppointments(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  categoriesToCheck: string[],
): Promise<number> {
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'aborted')
    .in('type', categoriesToCheck)

  if (error) return 0
  return count || 0
}

async function hasAdminFeeBeenPaid(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  categoriesToCheck: string[],
): Promise<boolean> {
  // Mirrors logic of server/api/staff/check-admin-fee-paid.get.ts:
  // - Look at payments with admin_fee_rappen > 0 in active states
  // - Match by appointment.type (reliable) OR metadata.category (fallback)
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, admin_fee_rappen, payment_status, metadata, appointment_id, appointments!inner(type)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .gt('admin_fee_rappen', 0)
    .in('payment_status', ['pending', 'completed', 'authorized'])

  if (error || !payments) return false

  const groupSet = new Set(categoriesToCheck)

  return payments.some((payment: any) => {
    const appointmentType = payment.appointments?.type
    if (appointmentType && groupSet.has(appointmentType)) return true

    // Fallback: payment.metadata.category for newer entries
    let metadataObj: any = {}
    try {
      if (typeof payment.metadata === 'string') {
        metadataObj = JSON.parse(payment.metadata)
      } else if (payment.metadata && typeof payment.metadata === 'object') {
        metadataObj = payment.metadata
      }
    } catch {
      /* ignore */
    }
    return Boolean(metadataObj?.category && groupSet.has(metadataObj.category))
  })
}

/**
 * Calculate the admin fee that should be applied to the upcoming appointment.
 *
 * Returns 0 (no fee) for any of the following cases:
 *   - Anonymous booking (no userId)
 *   - Motorcycle categories
 *   - No admin_fee rule configured
 *   - First appointment in the category group
 *   - Admin fee already paid in this category group
 */
export async function calculateAdminFee(
  input: CalculateAdminFeeInput,
): Promise<AdminFeeResult> {
  const { supabase, userId, tenantId, categoryCode, adminFeeRappenFromRule } = input

  const isMotorcycle = MOTORCYCLE_CATEGORIES.has(categoryCode)

  // Anonymous bookings: cannot count history, cannot charge fee.
  if (!userId) {
    return {
      adminFeeRappen: 0,
      applies: false,
      reason: 'no_user',
      appointmentNumber: 1,
      alreadyPaid: false,
      isMotorcycle,
    }
  }

  if (isMotorcycle) {
    return {
      adminFeeRappen: 0,
      applies: false,
      reason: 'motorcycle',
      appointmentNumber: 0,
      alreadyPaid: false,
      isMotorcycle,
    }
  }

  const ruleAdminFeeRappen =
    adminFeeRappenFromRule ?? (await fetchAdminFeeFromRule(supabase, tenantId, categoryCode))

  if (!ruleAdminFeeRappen || ruleAdminFeeRappen <= 0) {
    return {
      adminFeeRappen: 0,
      applies: false,
      reason: 'no_rule',
      appointmentNumber: 0,
      alreadyPaid: false,
      isMotorcycle,
    }
  }

  const [activeCount, alreadyPaid] = await Promise.all([
    countActiveAppointments(supabase, userId, tenantId, getCountCategoryGroup(categoryCode)),
    hasAdminFeeBeenPaid(supabase, userId, tenantId, getPaidCategoryGroup(categoryCode)),
  ])

  // Match `usePricing.ts → shouldApplyAdminFee` exactly:
  // appointmentNumber = activeCount + 1 (the upcoming one)
  // applies if appointmentNumber >= 2 && !alreadyPaid
  const appointmentNumber = activeCount + 1
  const applies = appointmentNumber >= 2 && !alreadyPaid

  if (alreadyPaid) {
    return {
      adminFeeRappen: 0,
      applies: false,
      reason: 'already_paid',
      appointmentNumber,
      alreadyPaid: true,
      isMotorcycle,
    }
  }

  if (!applies) {
    return {
      adminFeeRappen: 0,
      applies: false,
      reason: 'first_appointment',
      appointmentNumber,
      alreadyPaid: false,
      isMotorcycle,
    }
  }

  return {
    adminFeeRappen: ruleAdminFeeRappen,
    applies: true,
    reason: 'applied',
    appointmentNumber,
    alreadyPaid: false,
    isMotorcycle,
  }
}
