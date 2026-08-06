/**
 * Solo-tenant gate for dual staff+admin notification flows.
 *
 * Rule: only notify assigned staff when the tenant has 2+ active registered
 * staff members. Solo tenants (0 or 1 staff) get the admin/contact email only.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Active registered staff: role=staff, active, not soft-deleted. */
export async function countActiveStaff(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<number> {
  if (!tenantId) return 0

  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error) return 0
  return count ?? 0
}

/** True when the tenant has 2+ active staff (multi-staff → dual emails). */
export async function shouldNotifyAssignedStaff(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  return (await countActiveStaff(supabase, tenantId)) >= 2
}

/**
 * Batch: returns tenant IDs that have 2+ active staff.
 * Useful for crons to avoid N count queries.
 */
export async function getTenantsWithMultipleStaff(
  supabase: SupabaseClient,
  tenantIds: string[],
): Promise<Set<string>> {
  const result = new Set<string>()
  const unique = [...new Set(tenantIds.filter(Boolean))]
  if (unique.length === 0) return result

  const { data, error } = await supabase
    .from('users')
    .select('tenant_id')
    .in('tenant_id', unique)
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error || !data) return result

  const counts = new Map<string, number>()
  for (const row of data as Array<{ tenant_id: string }>) {
    counts.set(row.tenant_id, (counts.get(row.tenant_id) || 0) + 1)
  }
  for (const [tenantId, count] of counts) {
    if (count >= 2) result.add(tenantId)
  }
  return result
}
