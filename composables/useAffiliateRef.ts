/**
 * useAffiliateRef
 *
 * Reads and clears the affiliate referral code stored by the
 * affiliate-referral.global middleware.
 */
export function useAffiliateRef() {
  /**
   * Returns the stored referral code if it exists and has not expired.
   * Returns null otherwise.
   */
  function getStoredRefCode(): string | null {
    if (import.meta.server) return null
    try {
      const raw = localStorage.getItem('affiliate_ref')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.code || !parsed?.expires) return null
      if (Date.now() > parsed.expires) {
        localStorage.removeItem('affiliate_ref')
        return null
      }
      return parsed.code as string
    } catch {
      return null
    }
  }

  /**
   * Clears the stored referral code after it has been used during signup.
   */
  function clearRefCode(): void {
    if (import.meta.server) return
    try {
      localStorage.removeItem('affiliate_ref')
    } catch {
      // ignore
    }
  }

  return { getStoredRefCode, clearRefCode }
}
