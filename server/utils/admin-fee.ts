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
 *   - Categories with a very high `admin_fee_applies_from` (e.g. motorcycles)
 *     never reach the fee threshold in practice — no separate category list.
 *   - Admin fee applies starting at the rule's `admin_fee_applies_from`'th
 *     appointment in a category group.
 *   - Admin fee is charged at most once per category group — if a previous
 *     payment for the same group already includes admin_fee_rappen > 0, no
 *     new admin fee is added.
 *   - Category groups are resolved from `categories.parent_category_id`
 *     (see `./category-groups`), e.g. 'B' + 'B Schaltung' + 'B Automatik'
 *     share fee + count. Boot/Motorboot is a documented alias exception.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCategoryGroup, isAdminFeeExempt, BOOT_ALIASES } from './category-groups'

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
   * Optional pre-loaded pricing rule fields. If absent, the function fetches
   * the `admin_fee` rule itself.
   */
  adminFeeRappenFromRule?: number
  adminFeeAppliesFromRule?: number | null
}

/**
 * Categories used for COUNTING active appointments. Mirrors
 * `server/api/staff/get-appointment-count.get.ts` exactly: only Boot/Motorboot
 * are grouped, B-categories are counted independently.
 */
function getCountCategoryGroup(categoryCode: string): string[] {
  if (BOOT_ALIASES.includes(categoryCode)) return [...BOOT_ALIASES]
  return [categoryCode]
}

/**
 * Categories used for the "admin fee already paid" check. Mirrors
 * `server/api/staff/check-admin-fee-paid.get.ts`: both B-group and Boot-group
 * are treated as a single shared group for fee-already-paid purposes.
 */
async function getPaidCategoryGroup(
  supabase: SupabaseClient,
  tenantId: string,
  categoryCode: string,
): Promise<string[]> {
  return resolveCategoryGroup(supabase, tenantId, categoryCode)
}

async function fetchAdminFeeRuleFromDb(
  supabase: SupabaseClient,
  tenantId: string,
  categoryCode: string,
): Promise<{ adminFeeRappen: number; adminFeeAppliesFrom: number | null }> {
  // Same fallback chain as get-pricing.post.ts: try category-specific first,
  // then any tenant rule.
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('admin_fee_rappen, admin_fee_applies_from')
    .eq('tenant_id', tenantId)
    .eq('category_code', categoryCode)
    .eq('rule_type', 'admin_fee')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return { adminFeeRappen: 0, adminFeeAppliesFrom: null }
  return {
    adminFeeRappen: Number(data.admin_fee_rappen) || 0,
    adminFeeAppliesFrom: data.admin_fee_applies_from != null ? Number(data.admin_fee_applies_from) : null,
  }
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
 *   - Category exempt via admin_fee_applies_from (e.g. motorcycles)
 *   - No admin_fee rule configured
 *   - First appointment(s) below the rule's admin_fee_applies_from threshold
 *   - Admin fee already paid in this category group
 */
export async function calculateAdminFee(
  input: CalculateAdminFeeInput,
): Promise<AdminFeeResult> {
  const { supabase, userId, tenantId, categoryCode, adminFeeRappenFromRule, adminFeeAppliesFromRule } = input

  let ruleAdminFeeRappen = adminFeeRappenFromRule
  let adminFeeAppliesFrom = adminFeeAppliesFromRule

  if (ruleAdminFeeRappen === undefined || adminFeeAppliesFrom === undefined) {
    const fetched = await fetchAdminFeeRuleFromDb(supabase, tenantId, categoryCode)
    ruleAdminFeeRappen = ruleAdminFeeRappen ?? fetched.adminFeeRappen
    adminFeeAppliesFrom = adminFeeAppliesFrom ?? fetched.adminFeeAppliesFrom
  }

  const isMotorcycle = isAdminFeeExempt(adminFeeAppliesFrom)

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
    hasAdminFeeBeenPaid(supabase, userId, tenantId, await getPaidCategoryGroup(supabase, tenantId, categoryCode)),
  ])

  // Match `usePricing.ts → shouldApplyAdminFee` exactly:
  // appointmentNumber = activeCount + 1 (the upcoming one)
  const appointmentNumber = activeCount + 1
  const threshold = adminFeeAppliesFrom ?? 2
  const applies = appointmentNumber >= threshold && !alreadyPaid

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
