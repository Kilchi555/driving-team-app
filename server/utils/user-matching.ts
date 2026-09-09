// ============================================
// Guest/Course-Enrollment User Matching
// ============================================
// Used by public course-enrollment flows (Wallee, cash, webhook) to find an
// already-existing account for a customer who signs up WITHOUT logging in.
// Prevents duplicate `users` rows when the provided email differs only in
// casing/whitespace (e.g. SARI-returned email vs. account email) or when the
// phone number is formatted differently (07x... vs +41...).

import { normalizePhoneNumber } from './sms'
import { escapeLikePattern } from './sql-helpers'

interface FindUserParams {
  email?: string | null
  phone?: string | null
  tenantId: string
  /**
   * When set, only return users whose role is in this list.
   * Public course enroll should pass customer roles so staff/admin autofill
   * emails are not reused as the participant account.
   */
  roles?: string[]
}

export type MatchedUser = { id: string; role: string | null }

/**
 * Finds an existing user within a tenant by normalized email (case-insensitive,
 * trimmed), falling back to a normalized phone number match if no email match
 * is found. Returns null if neither is found.
 */
export async function findExistingUserByContact(
  supabase: any,
  { email, phone, tenantId, roles }: FindUserParams
): Promise<MatchedUser | null> {
  const normalizedEmail = email ? email.trim().toLowerCase() : null

  if (normalizedEmail) {
    let q = supabase
      .from('users')
      .select('id, role')
      .ilike('email', escapeLikePattern(normalizedEmail))
      .eq('tenant_id', tenantId)
    if (roles?.length) q = q.in('role', roles)
    const { data } = await q.limit(1).maybeSingle()
    if (data) return data
  }

  const normalizedPhone = normalizePhoneNumber(phone || '')
  if (normalizedPhone) {
    // Stored numbers may be in E.164 (+41...) or local Swiss format (0...) —
    // try both since historical rows were never normalized on write.
    const localFormat = normalizedPhone.replace(/^\+41/, '0')
    const candidates = [...new Set([normalizedPhone, localFormat])]

    let q = supabase
      .from('users')
      .select('id, role')
      .in('phone', candidates)
      .eq('tenant_id', tenantId)
    if (roles?.length) q = q.in('role', roles)
    const { data } = await q.limit(1).maybeSingle()
    if (data) return data
  }

  return null
}

/** True when an email is already used by a non-customer account in this tenant. */
export async function findStaffOrAdminByEmail(
  supabase: any,
  { email, tenantId }: { email: string; tenantId: string }
): Promise<MatchedUser | null> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null
  const { data } = await supabase
    .from('users')
    .select('id, role')
    .ilike('email', escapeLikePattern(normalizedEmail))
    .eq('tenant_id', tenantId)
    .in('role', ['admin', 'staff', 'tenant_admin'])
    .limit(1)
    .maybeSingle()
  return data || null
}

/**
 * True when a phone is already used by a non-customer account in this tenant.
 * School-device autofill often keeps the owner's phone after swapping the email —
 * that used to crash guest-user insert on users_phone_tenant_unique (opaque 500).
 */
export async function findStaffOrAdminByPhone(
  supabase: any,
  { phone, tenantId }: { phone: string; tenantId: string }
): Promise<MatchedUser | null> {
  const normalizedPhone = normalizePhoneNumber(phone || '')
  if (!normalizedPhone) return null
  const localFormat = normalizedPhone.replace(/^\+41/, '0')
  const candidates = [...new Set([normalizedPhone, localFormat])]
  const { data } = await supabase
    .from('users')
    .select('id, role')
    .in('phone', candidates)
    .eq('tenant_id', tenantId)
    .in('role', ['admin', 'staff', 'tenant_admin'])
    .limit(1)
    .maybeSingle()
  return data || null
}
