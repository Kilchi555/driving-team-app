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
}

/**
 * Finds an existing user within a tenant by normalized email (case-insensitive,
 * trimmed), falling back to a normalized phone number match if no email match
 * is found. Returns null if neither is found.
 */
export async function findExistingUserByContact(
  supabase: any,
  { email, phone, tenantId }: FindUserParams
): Promise<{ id: string } | null> {
  const normalizedEmail = email ? email.trim().toLowerCase() : null

  if (normalizedEmail) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .ilike('email', escapeLikePattern(normalizedEmail))
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()
    if (data) return data
  }

  const normalizedPhone = normalizePhoneNumber(phone || '')
  if (normalizedPhone) {
    // Stored numbers may be in E.164 (+41...) or local Swiss format (0...) —
    // try both since historical rows were never normalized on write.
    const localFormat = normalizedPhone.replace(/^\+41/, '0')
    const candidates = [...new Set([normalizedPhone, localFormat])]

    const { data } = await supabase
      .from('users')
      .select('id')
      .in('phone', candidates)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()
    if (data) return data
  }

  return null
}
