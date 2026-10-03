/**
 * Public inquiry staff assignment.
 *
 * staff_id on POST /api/booking/submit-general-inquiry is caller input.
 * Only an active, non-deleted bookable user of the same tenant may be stored.
 * When a location id is present, that user must also have an active
 * staff_locations row for that location and tenant.
 * Anything else is stored as null so the inquiry itself still succeeds.
 */

export const PUBLIC_INQUIRY_ASSIGNABLE_ROLES = ['staff', 'admin', 'tenant_admin'] as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type InquiryStaffLookup = {
  from: (table: 'users' | 'staff_locations') => InquiryStaffQuery
}

type InquiryStaffResult = {
  data: { id?: string; staff_id?: string } | null
  error: { message: string } | null
}

type InquiryStaffQuery = {
  select: (columns: string) => InquiryStaffQuery
  eq: (column: string, value: unknown) => InquiryStaffQuery
  is: (column: string, value: null) => InquiryStaffQuery
  in: (column: string, values: readonly string[]) => InquiryStaffQuery
  maybeSingle: () => Promise<InquiryStaffResult>
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!UUID_RE.test(trimmed)) return null
  return trimmed.toLowerCase()
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * One read. Location assignment and the user row are confirmed together
 * when locationId is set. Without a location, only the user row is read.
 */
export async function resolveAssignableInquiryStaff(
  supabase: InquiryStaffLookup,
  input: { tenantId: string; staffId: unknown; locationId: unknown },
): Promise<string | null> {
  const staffId = normalizeUuid(input.staffId)
  if (!staffId) return null

  // A location was sent, but it is not an id we can match. Do not keep the staff.
  if (hasText(input.locationId) && !normalizeUuid(input.locationId)) return null
  const locationId = normalizeUuid(input.locationId)

  if (locationId) {
    const { data, error } = await supabase
      .from('staff_locations')
      .select('staff_id, users!inner(id)')
      .eq('tenant_id', input.tenantId)
      .eq('location_id', locationId)
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .eq('users.tenant_id', input.tenantId)
      .eq('users.is_active', true)
      .is('users.deleted_at', null)
      .in('users.role', PUBLIC_INQUIRY_ASSIGNABLE_ROLES)
      .maybeSingle()

    if (error) throw error
    return data?.staff_id === staffId ? staffId : null
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', staffId)
    .eq('tenant_id', input.tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('role', PUBLIC_INQUIRY_ASSIGNABLE_ROLES)
    .maybeSingle()

  if (error) throw error
  return data?.id === staffId ? staffId : null
}
