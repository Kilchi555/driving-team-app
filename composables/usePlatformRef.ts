/**
 * usePlatformRef — tenant→tenant Simy invite code from localStorage.
 * Separate from client affiliate (useAffiliateRef / affiliate_ref).
 */
export const PLATFORM_REF_CLIENT_STORAGE_KEY = 'platform_ref'

export function usePlatformRef() {
  function getStoredPlatformRefCode(): string | null {
    if (import.meta.server) return null
    try {
      const raw = localStorage.getItem(PLATFORM_REF_CLIENT_STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.code || !parsed?.expires) return null
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(PLATFORM_REF_CLIENT_STORAGE_KEY)
        return null
      }
      return String(parsed.code).trim().toUpperCase()
    } catch {
      return null
    }
  }

  function clearPlatformRefCode(): void {
    if (import.meta.server) return
    try {
      localStorage.removeItem(PLATFORM_REF_CLIENT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { getStoredPlatformRefCode, clearPlatformRefCode }
}
