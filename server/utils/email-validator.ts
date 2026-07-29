/**
 * Email validation utilities for registration / onboarding flows.
 */

// Local fallback list — used when the remote disposable check is unavailable.
// Keep small; the Kickbox open API covers rotating temp-mail domains.
const disposableDomains = new Set([
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'sharklasers.com',
  'mailinator.com',
  'temp-mail.org',
  'temp-mail.io',
  'yopmail.com',
  'maildrop.cc',
  'trash-mail.com',
  'spam4.me',
  'trashmail.ws',
  'guerrillamail.com',
  'guerrillamail.net',
  'grr.la',
  'discard.email',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'emailondeck.com',
  'apdtax.com', // known temp-mail.org alias used in spam signup 2026-07-28
])

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  if (email.length > 254) return false
  const [localPart] = email.split('@')
  if (!localPart || localPart.length > 64) return false
  return true
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return disposableDomains.has(domain)
}

/**
 * Remote disposable-domain check.
 * Uses mailcheck.ai + debounce.io — Kickbox misses many rotating temp-mail aliases.
 * Fails open (returns false) on network errors so legitimate signups aren't blocked.
 */
export async function isDisposableEmailRemote(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  if (disposableDomains.has(domain)) return true

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const [mailcheckRes, debounceRes] = await Promise.allSettled([
      fetch(`https://api.mailcheck.ai/domain/${encodeURIComponent(domain)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).then(async (res) => {
        if (!res.ok) return false
        const data = await res.json() as { disposable?: boolean }
        return data.disposable === true
      }),
      fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email.toLowerCase())}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).then(async (res) => {
        if (!res.ok) return false
        const data = await res.json() as { disposable?: boolean | string }
        return data.disposable === true || data.disposable === 'true'
      }),
    ])

    if (mailcheckRes.status === 'fulfilled' && mailcheckRes.value) return true
    if (debounceRes.status === 'fulfilled' && debounceRes.value) return true
    return false
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function isSpamEmail(email: string): boolean {
  const lowercaseEmail = email.toLowerCase()
  const localPart = lowercaseEmail.split('@')[0] || ''

  // Only reject throwaway-looking local parts — not common mailboxes like
  // admin@ / info@ which many businesses legitimately use.
  const spamLocalParts = /^(test|spam|fake|xxx|zzz|aaa|bbb)(\d*)$/
  if (spamLocalParts.test(localPart)) {
    return true
  }

  if (/\d{6,}/.test(localPart) || /(.)\1{5,}/.test(localPart)) {
    return true
  }

  return false
}

export async function validateRegistrationEmail(
  email: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!isValidEmail(email)) {
    return { valid: false, reason: 'Ungültige E-Mail-Adresse' }
  }

  if (isDisposableEmail(email) || await isDisposableEmailRemote(email)) {
    return { valid: false, reason: 'Bitte verwenden Sie eine echte E-Mail-Adresse' }
  }

  if (isSpamEmail(email)) {
    return { valid: false, reason: 'E-Mail-Adresse scheint ungültig zu sein' }
  }

  return { valid: true }
}
