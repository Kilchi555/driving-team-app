/**
 * Cross-platform credential saving for iOS, Android, and native apps.
 *
 * Uses the Credential Management API (Chrome / Android / Edge) when available.
 * On iOS Safari the form-based approach (hidden mirror inputs + type="submit")
 * is the primary mechanism; this function is a no-op there but still safe to call.
 *
 * Call this AFTER a successful registration + login, before navigating away.
 */
export async function saveCredentials(
  username: string,
  password: string,
  displayName?: string
): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !username ||
    !password
  ) return

  try {
    // Credential Management API – supported on Chrome 51+, Edge, Samsung Internet
    // and partially on Safari 15+ (password-only, no PasswordCredential yet)
    if (
      'credentials' in navigator &&
      typeof (window as any).PasswordCredential !== 'undefined'
    ) {
      const cred = new (window as any).PasswordCredential({
        id: username,
        password,
        name: displayName || username,
      })
      await navigator.credentials.store(cred)
    }
  } catch {
    // Non-fatal: some browsers block or ignore this call
  }
}
