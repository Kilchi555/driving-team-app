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

/**
 * Exact-match domains that must not be rejected by disposable checks.
 * bluemail.ch: Swisscom-operated NS (dns*.swisscom.com) and Bluewin MX
 * (mx*.p.bluenet.ch, same as bluewin.ch). Debounce.io falsely classifies it;
 * mailcheck/debounce OR policy is unchanged for every other domain.
 */
const ALLOWED_NON_DISPOSABLE_DOMAINS = new Set([
  'bluemail.ch',
])

export type DisposableRejectionSignal = 'local' | 'mailcheck' | 'debounce'

export const REGISTRATION_DISPOSABLE_EMAIL_REASON =
  'Bitte verwenden Sie eine echte E-Mail-Adresse'

function emailDomain(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain || null
}

function isAllowedNonDisposableDomain(domain: string): boolean {
  return ALLOWED_NON_DISPOSABLE_DOMAINS.has(domain)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  if (email.length > 254) return false
  const [localPart] = email.split('@')
  if (!localPart || localPart.length > 64) return false
  return true
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  if (isAllowedNonDisposableDomain(domain)) return false
  return disposableDomains.has(domain)
}

/**
 * Remote disposable providers only (mailcheck.ai + debounce.io).
 * Same OR semantics as before: either confirmed disposable → signal.
 * Fails open (returns null) on network / non-OK responses.
 */
async function remoteDisposableSignal(
  email: string
): Promise<'mailcheck' | 'debounce' | null> {
  const domain = emailDomain(email)
  if (!domain) return null

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

    if (mailcheckRes.status === 'fulfilled' && mailcheckRes.value) return 'mailcheck'
    if (debounceRes.status === 'fulfilled' && debounceRes.value) return 'debounce'
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Remote disposable-domain check.
 * Uses mailcheck.ai + debounce.io — Kickbox misses many rotating temp-mail aliases.
 * Fails open (returns false) on network errors so legitimate signups aren't blocked.
 */
export async function isDisposableEmailRemote(email: string): Promise<boolean> {
  const domain = emailDomain(email)
  if (!domain) return false
  if (isAllowedNonDisposableDomain(domain)) return false
  if (disposableDomains.has(domain)) return true
  return (await remoteDisposableSignal(email)) !== null
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

  // Same character six or more times (aaaaaa). Digit runs are legitimate:
  // birth dates, phone-like locals, and invoice-style mailboxes must pass.
  if (/(.)\1{5,}/.test(localPart)) {
    return true
  }

  return false
}

export const REGISTRATION_SPAM_EMAIL_REASON = 'E-Mail-Adresse scheint ungültig zu sein'

export async function validateRegistrationEmail(
  email: string
): Promise<{
  valid: boolean
  reason?: string
  /** Present only on disposable rejection — domain + signal, never the full address. */
  disposableRejection?: { domain: string, signal: DisposableRejectionSignal }
}> {
  if (!isValidEmail(email)) {
    return { valid: false, reason: 'Ungültige E-Mail-Adresse' }
  }

  const domain = emailDomain(email)
  if (domain && !isAllowedNonDisposableDomain(domain)) {
    if (isDisposableEmail(email)) {
      return {
        valid: false,
        reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
        disposableRejection: { domain, signal: 'local' },
      }
    }

    const remoteSignal = await remoteDisposableSignal(email)
    if (remoteSignal) {
      return {
        valid: false,
        reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
        disposableRejection: { domain, signal: remoteSignal },
      }
    }
  }

  if (isSpamEmail(email)) {
    return { valid: false, reason: REGISTRATION_SPAM_EMAIL_REASON }
  }

  return { valid: true }
}
