/**
 * Tenant ownership verification for locations chosen during staff registration.
 *
 * `selectedLocationIds` / `selectedExamLocationIds` are client-controlled and
 * the registration endpoint writes them with service_role, so RLS does not
 * apply. Ownership must therefore be proven by the query itself.
 *
 * Standard locations: must belong to the invitation tenant.
 * Exam locations:     shared catalogue, `tenant_id IS NULL` + `location_type = 'exam'`
 *                     (same rule `/api/staff/get-invitation` uses to offer them).
 *
 * Verification runs before the invitation is consumed, so a rejected request
 * leaves no Auth user, no staff row and no consumed invitation behind.
 */

export type LocationReader = {
  from: (table: string) => any
}

export type VerifiedStaffLocations = {
  standardLocationIds: string[]
  examLocationIds: string[]
}

export type StaffLocationVerification =
  | ({ ok: true } & VerifiedStaffLocations)
  | { ok: false; scope: 'standard' | 'exam'; reason: 'malformed' | 'not_owned' }

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Bounds the `.in(...)` filter below. Far above any real tenant's location
 * count, so it only trips on abuse.
 */
const MAX_LOCATION_IDS = 200

/**
 * Rejects instead of dropping bad entries: silently skipping one id would
 * still assign the rest, which is the partial state we must not create.
 */
function normalizeLocationIds(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) return null
  if (raw.length > MAX_LOCATION_IDS) return null

  const ids: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') return null
    const id = value.trim()
    if (!UUID_PATTERN.test(id)) return null
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

async function selectOwnedIds(
  supabase: LocationReader,
  requestedIds: string[],
  applyScope: (query: any) => any,
): Promise<string[] | null> {
  const { data, error } = await applyScope(
    supabase.from('locations').select('id').in('id', requestedIds),
  )
  if (error || !data) return null
  return (data as Array<{ id: string }>).map((row) => row.id)
}

export async function verifyStaffRegistrationLocations(
  supabase: LocationReader,
  tenantId: string,
  selectedLocationIds: unknown,
  selectedExamLocationIds: unknown,
): Promise<StaffLocationVerification> {
  if (!tenantId) return { ok: false, scope: 'standard', reason: 'not_owned' }

  const standardIds = normalizeLocationIds(selectedLocationIds)
  if (!standardIds) return { ok: false, scope: 'standard', reason: 'malformed' }

  const examIds = normalizeLocationIds(selectedExamLocationIds)
  if (!examIds) return { ok: false, scope: 'exam', reason: 'malformed' }

  if (standardIds.length > 0) {
    const owned = await selectOwnedIds(supabase, standardIds, (query) =>
      query.eq('tenant_id', tenantId),
    )
    if (!owned || owned.length !== standardIds.length) {
      return { ok: false, scope: 'standard', reason: 'not_owned' }
    }
    if (standardIds.some((id) => !owned.includes(id))) {
      return { ok: false, scope: 'standard', reason: 'not_owned' }
    }
  }

  if (examIds.length > 0) {
    const owned = await selectOwnedIds(supabase, examIds, (query) =>
      query.is('tenant_id', null).eq('location_type', 'exam'),
    )
    if (!owned || owned.length !== examIds.length) {
      return { ok: false, scope: 'exam', reason: 'not_owned' }
    }
    if (examIds.some((id) => !owned.includes(id))) {
      return { ok: false, scope: 'exam', reason: 'not_owned' }
    }
  }

  return { ok: true, standardLocationIds: standardIds, examLocationIds: examIds }
}
