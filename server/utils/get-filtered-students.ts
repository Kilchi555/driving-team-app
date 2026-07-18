// server/utils/get-filtered-students.ts
//
// Single source of truth for "which students does this user see" used by
// both /api/admin/get-students (EventModal -> StudentSelector) and
// pages/customers.vue. Keep this logic in one place so both UIs always
// show exactly the same list.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GetFilteredStudentsOptions {
  tenantId: string
  userId: string
  userRole: string
  showAllStudents: boolean
  showInactive: boolean
}

// Normalizes both sides: "B Automatik" -> "B" to match exam_passed_categories
const isCategoryPassed = (student: any, cat: string): boolean => {
  const passed: string[] = student.exam_passed_categories || []
  if (!passed.length) return false
  const normalizedCat = cat.trim().split(' ')[0]
  return passed.some((p: string) => p === cat || p === normalizedCat)
}

// A student is "completed" if they have enrolled categories and ALL are passed
const isStudentCompleted = (student: any): boolean => {
  const categories: string[] = student.category || []
  if (!categories.length) return false
  return categories.every((cat: string) => isCategoryPassed(student, cat))
}

// ✅ Explicit allowlist of fields the client is actually allowed to see.
//
// The `users` table also has highly sensitive columns that must NEVER reach the
// browser, most importantly `onboarding_token` (the secret that lets anyone use a
// customer's activation/login link) plus payroll, MFA/account-lockout and
// marketing-attribution data that has nothing to do with "which students can I
// see". Rather than fetching everything (`select('*')`) and hoping to strip the
// dangerous bits before responding, we scope the DB query itself to exactly this
// allowlist (see SELECT_COLUMNS below) - sensitive columns then never even leave
// the database - and additionally re-assert the allowlist on the result as a
// defense-in-depth safety net.
//
// Keep this in sync with the fields actually consumed by StudentSelector.vue,
// pages/customers.vue and components/EnhancedStudentModal.vue.
const CLIENT_SAFE_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'category',
  'exam_passed_categories',
  'is_active',
  'auth_user_id',
  'onboarding_status',
  'assigned_staff_id',
  'assigned_staff_ids',
  'preferred_location_id',
  'street',
  'street_nr',
  'zip',
  'city',
  'birthdate',
  'profession',
  'faberid',
  'tenant_id',
  'payment_provider_customer_id',
] as const

const sanitizeStudentForClient = (student: any): any => {
  const safe: Record<string, any> = {}
  for (const field of CLIENT_SAFE_FIELDS) {
    safe[field] = student[field]
  }
  return safe
}

// Every column the filtering logic below needs (category, exam_passed_categories,
// is_active, auth_user_id, assigned_staff_id(s), first_name for sorting) happens to
// already be on the client-safe allowlist, so we can select exactly that instead of
// `select('*')` - sensitive columns (onboarding_token, payroll, MFA/lockout state,
// marketing attribution, ...) then never even leave the database.
const SELECT_COLUMNS = CLIENT_SAFE_FIELDS.join(', ')

/**
 * Returns the students a given user is allowed/expected to see, applying
 * the exact same assignment- and active/inactive-rules everywhere.
 *
 * - Staff with showAllStudents=false: only students assigned to them
 *   (old-style single field OR new-style array field).
 * - Everyone else (staff with showAllStudents=true, admin, tenant_admin,
 *   super_admin): all clients in the tenant.
 * - showInactive=false (default): active, not-yet-completed students, plus
 *   users still in onboarding (auth_user_id === null).
 * - showInactive=true: deactivated students OR students who completed all
 *   their enrolled categories.
 *
 * Deliberately does NOT fall back to appointment history - a student only
 * shows up here because of their current assignment, never because of a
 * past lesson.
 */
export async function getFilteredStudents(
  supabase: SupabaseClient,
  { tenantId, userId, userRole, showAllStudents, showInactive }: GetFilteredStudentsOptions
): Promise<any[]> {
  const restrictToAssigned = userRole === 'staff' && !showAllStudents

  let students: any[] = []

  if (restrictToAssigned) {
    // Old-style: single assigned_staff_id field
    const { data: oldAssigned, error: oldError } = await supabase
      .from('users')
      .select(SELECT_COLUMNS)
      .eq('role', 'client')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('assigned_staff_id', userId)

    if (oldError) throw oldError

    // New-style: assigned_staff_ids array field.
    // Supabase can't filter "array contains value" server-side in a simple
    // way here, so we load all candidates with a non-null array and filter
    // in JS.
    const { data: arrayCandidates, error: arrayError } = await supabase
      .from('users')
      .select(SELECT_COLUMNS)
      .eq('role', 'client')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('assigned_staff_ids', 'is', null)

    if (arrayError) throw arrayError

    const newAssigned = (arrayCandidates || []).filter((s: any) =>
      Array.isArray(s.assigned_staff_ids) && s.assigned_staff_ids.includes(userId)
    )

    const byId: Record<string, any> = {}
    for (const s of [...(oldAssigned || []), ...newAssigned]) {
      byId[s.id] = s
    }
    students = Object.values(byId)
  } else {
    const { data, error } = await supabase
      .from('users')
      .select(SELECT_COLUMNS)
      .eq('role', 'client')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw error
    students = data || []
  }

  // ✅ One single active/inactive/completed rule, applied once to the
  // combined list - no more inconsistent per-query filters.
  const filtered = students.filter((student: any) => {
    if (showInactive) {
      const deactivated = student.is_active === false && student.auth_user_id !== null
      const completed = student.is_active === true && isStudentCompleted(student)
      return deactivated || completed
    }
    if (student.auth_user_id === null) return true // always show pending onboarding
    return student.is_active === true && !isStudentCompleted(student)
  })

  filtered.sort((a: any, b: any) =>
    (a.first_name || '').localeCompare(b.first_name || '', 'de-CH', { sensitivity: 'base' })
  )

  // ✅ Strip everything not on the allowlist before this ever leaves the server
  return filtered.map(sanitizeStudentForClient)
}
