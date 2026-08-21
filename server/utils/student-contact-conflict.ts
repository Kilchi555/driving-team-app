export type ContactConflictUser = {
  first_name?: string | null
  last_name?: string | null
  is_active?: boolean | null
  deleted_at?: string | null
  onboarding_status?: string | null
}

export function formatPersonName(user?: ContactConflictUser | null): string {
  const name = [user?.first_name, user?.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
  return name || 'einem anderen Konto'
}

function accountHint(user?: ContactConflictUser | null): string {
  if (!user) return ''
  if (user.deleted_at || user.is_active === false) return ' (deaktiviertes Konto)'
  if (user.onboarding_status === 'pending') return ' (Onboarding noch offen)'
  return ''
}

export function duplicatePhoneMessage(existing?: ContactConflictUser | null): string {
  if (!existing) return 'Diese Telefonnummer ist bereits einem anderen Kunden zugeordnet.'
  return `Diese Telefonnummer ist bereits bei ${formatPersonName(existing)}${accountHint(existing)} hinterlegt.`
}

export function duplicateEmailMessage(existing?: ContactConflictUser | null): string {
  if (!existing) return 'Diese E-Mail-Adresse ist bereits einem anderen Kunden zugeordnet.'
  return `Diese E-Mail-Adresse ist bereits bei ${formatPersonName(existing)}${accountHint(existing)} hinterlegt.`
}

export function messageForUniqueConstraint(
  errorMessage: string,
  existing?: ContactConflictUser | null
): string | null {
  const msg = errorMessage || ''
  if (msg.includes('users_phone_tenant_unique') || msg.includes('(phone, tenant_id)')) {
    return duplicatePhoneMessage(existing)
  }
  if (msg.includes('users_email_tenant_unique') || msg.includes('(email, tenant_id)')) {
    return duplicateEmailMessage(existing)
  }
  return null
}
